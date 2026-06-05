import 'dart:convert';
import 'dart:io';

import 'package:archive/archive_io.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/session/session_store.dart';
import '../../student/pages/student_page_shared.dart';
import 'offline_package_models.dart';

class OfflinePackageService {
  const OfflinePackageService({
    ApiClient? apiClient,
    SessionStore? sessionStore,
  })  : _apiClient = apiClient,
        _sessionStore = sessionStore;

  static const _deviceIdKey = 'offline_device_id';
  static const _versionPrefix = 'offline_course_version_';
  static const _downloadPrefix = 'offline_course_download_';
  static const _manifestPrefix = 'offline_course_manifest_';
  static const _extractPrefix = 'offline_course_extract_';
  static const _tokenPrefix = 'offline_course_token_';

  static final Map<int, OfflineDeltaSnapshot> _deltaMemoryCache =
      <int, OfflineDeltaSnapshot>{};
  static final Map<int, OfflineInstalledPackage?> _installedMemoryCache =
      <int, OfflineInstalledPackage?>{};
  static final Map<String, String?> _resolvedPathMemoryCache =
      <String, String?>{};

  final ApiClient? _apiClient;
  final SessionStore? _sessionStore;

  ApiClient get _client => _apiClient ?? ApiClient.instance;
  SessionStore get _store => _sessionStore ?? SessionStore.instance;

  Future<OfflineDeltaSnapshot> getCourseDelta({
    required int courseId,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && _deltaMemoryCache.containsKey(courseId)) {
      return _deltaMemoryCache[courseId]!;
    }

    final response = await _client.get<Map<String, dynamic>>(
      ApiEndpoints.offlineDelta(courseId),
      queryParameters: {
        'version': await getStoredVersion(courseId),
      },
    );

    final snapshot = OfflineDeltaSnapshot.fromMap(unwrapDataMap(response.data));
    _deltaMemoryCache[courseId] = snapshot;
    return snapshot;
  }

  Future<String> getDeviceId() async {
    final preferences = await SharedPreferences.getInstance();
    final existing = preferences.getString(_deviceIdKey);
    if (existing != null && existing.trim().isNotEmpty) {
      return existing.trim();
    }

    final userId = _store.userId ?? 0;
    final generated = 'afaaq-$userId-${DateTime.now().millisecondsSinceEpoch}';
    await preferences.setString(_deviceIdKey, generated);
    return generated;
  }

  Future<String> getStoredVersion(int courseId) async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString('$_versionPrefix$courseId') ?? '';
  }

  Future<String?> getStoredDownloadPath(int courseId) async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString('$_downloadPrefix$courseId');
  }

  Future<String?> getStoredManifestPath(int courseId) async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString('$_manifestPrefix$courseId');
  }

  Future<String?> getStoredExtractedDirectoryPath(int courseId) async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString('$_extractPrefix$courseId');
  }

  Future<String?> getStoredToken(int courseId) async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString('$_tokenPrefix$courseId');
  }

  Future<void> storeToken({
    required int courseId,
    required String token,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('$_tokenPrefix$courseId', _normalizeToken(token));
  }

  Future<String> issueDownloadToken({required int packageId}) async {
    final userId = _store.userId;

    if (userId == null || userId <= 0) {
      throw Exception('User id is missing. Please log in again before downloading offline content.');
    }

    final deviceId = await getDeviceId();
    final expiresAt = DateTime.now()
        .add(const Duration(days: 2))
        .toUtc()
        .toIso8601String();

    final response = await _client.post<Map<String, dynamic>>(
      ApiEndpoints.offlinePackageTokens(packageId),
      data: {
        // Required by the Laravel token FormRequest.
        'user_id': userId,
        'device_id': deviceId,
        'expires_at': expiresAt,
      },
      options: Options(
        headers: {
          'X-Device-Id': deviceId,
        },
      ),
    );

    final payload = unwrapDataMap(response.data);
    final token = readString(payload['token']);
    if (token.isEmpty) {
      throw Exception('Backend did not return an offline download token.');
    }

    return token;
  }

  Future<String> ensureDownloadToken({
    required int courseId,
    required int packageId,
  }) async {
    final storedToken = await getStoredToken(courseId);
    if (storedToken != null && storedToken.trim().isNotEmpty) {
      try {
        await validateDownloadToken(token: storedToken);
        return _normalizeToken(storedToken);
      } catch (error) {
        if (!_isRecoverableStoredTokenError(error)) {
          rethrow;
        }
      }
    }

    final freshToken = await issueDownloadToken(packageId: packageId);
    await storeToken(courseId: courseId, token: freshToken);
    return _normalizeToken(freshToken);
  }

  Future<OfflineDownloadAccess> validateDownloadToken({
    required String token,
  }) async {
    final normalizedToken = _normalizeToken(token);
    final deviceId = await getDeviceId();

    final response = await _client.get<Map<String, dynamic>>(
      ApiEndpoints.offlineDownload(normalizedToken),
      queryParameters: {
        'token': normalizedToken,
        'device_id': deviceId,
      },
      options: Options(
        headers: {
          'X-Device-Id': deviceId,
        },
      ),
    );

    return OfflineDownloadAccess.fromMap(unwrapDataMap(response.data));
  }

  Future<OfflinePackageDownload> downloadPackageByToken({
    required int courseId,
    required String token,
    bool forceDownload = false,
  }) async {
    final normalizedToken = _normalizeToken(token);
    final access = await validateDownloadToken(token: normalizedToken);
    return downloadPackage(
      courseId: courseId,
      access: access,
      token: normalizedToken,
      forceDownload: forceDownload,
    );
  }

  Future<OfflinePackageDownload> downloadPackage({
    required int courseId,
    required OfflineDownloadAccess access,
    required String token,
    bool forceDownload = false,
  }) async {
    if (access.fileUrl.trim().isEmpty) {
      throw Exception('Offline package file URL is missing.');
    }

    if (!forceDownload) {
      final installed = await getInstalledPackage(courseId: courseId);
      final storedPath = await getStoredDownloadPath(courseId);
      final manifestPath = await getStoredManifestPath(courseId);
      final extractedPath = await getStoredExtractedDirectoryPath(courseId);
      final deviceId = await getDeviceId();

      if (installed != null &&
          installed.version == access.version &&
          storedPath != null &&
          manifestPath != null &&
          extractedPath != null &&
          await File(storedPath).exists() &&
          await File(manifestPath).exists()) {
        return OfflinePackageDownload(
          localFilePath: storedPath,
          manifestPath: manifestPath,
          extractedDirectoryPath: extractedPath,
          deviceId: deviceId,
          version: access.version,
        );
      }
    }

    final directory = await getApplicationDocumentsDirectory();
    final offlineRoot = Directory(
      '${directory.path}${Platform.pathSeparator}offline_packages',
    );

    if (!await offlineRoot.exists()) {
      await offlineRoot.create(recursive: true);
    }

    final targetDirectory = Directory(
      '${offlineRoot.path}${Platform.pathSeparator}course_$courseId${Platform.pathSeparator}${access.version}',
    );

    if (!await targetDirectory.exists()) {
      await targetDirectory.create(recursive: true);
    }

    final safeUrl = _androidEmulatorSafeUrl(access.fileUrl);
    final uri = Uri.tryParse(safeUrl);
    final fileName = uri != null && uri.pathSegments.isNotEmpty
        ? uri.pathSegments.last
        : 'offline-package-$courseId.zip';

    final packagePath = '${targetDirectory.path}${Platform.pathSeparator}$fileName';
    final manifestPath = '${targetDirectory.path}${Platform.pathSeparator}manifest.json';
    final extractedRootPath = '${targetDirectory.path}${Platform.pathSeparator}content';

    final deviceId = await getDeviceId();
    final headers = <String, dynamic>{
      'Accept': 'application/octet-stream',
      'X-Device-Id': deviceId,
    };

    final authToken = _store.token;
    if (authToken != null && authToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $authToken';
    }

    final dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(minutes: 4),
        sendTimeout: const Duration(seconds: 20),
      ),
    );

    await dio.download(
      safeUrl,
      packagePath,
      options: Options(headers: headers),
    );

    final extractedDirectoryPath = await _extractPackageIfNeeded(
      packagePath: packagePath,
      extractedRootPath: extractedRootPath,
    );

    await File(manifestPath).writeAsString(
      const JsonEncoder.withIndent('  ').convert(access.manifest),
    );

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('$_versionPrefix$courseId', access.version);
    await preferences.setString('$_downloadPrefix$courseId', packagePath);
    await preferences.setString('$_manifestPrefix$courseId', manifestPath);
    await preferences.setString('$_extractPrefix$courseId', extractedDirectoryPath);
    await preferences.setString('$_tokenPrefix$courseId', token);

    _installedMemoryCache.remove(courseId);
    _resolvedPathMemoryCache.clear();

    return OfflinePackageDownload(
      localFilePath: packagePath,
      manifestPath: manifestPath,
      extractedDirectoryPath: extractedDirectoryPath,
      deviceId: deviceId,
      version: access.version,
    );
  }

  Future<String> _extractPackageIfNeeded({
    required String packagePath,
    required String extractedRootPath,
  }) async {
    final lowerPath = packagePath.toLowerCase();

    if (!lowerPath.endsWith('.zip')) {
      return File(packagePath).parent.path;
    }

    final extractedRoot = Directory(extractedRootPath);
    if (await extractedRoot.exists()) {
      await extractedRoot.delete(recursive: true);
    }

    await extractedRoot.create(recursive: true);
    extractFileToDisk(packagePath, extractedRoot.path);
    return extractedRoot.path;
  }

  Future<OfflineInstalledPackage?> getInstalledPackage({
    required int courseId,
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && _installedMemoryCache.containsKey(courseId)) {
      return _installedMemoryCache[courseId];
    }

    final version = await getStoredVersion(courseId);
    final packagePath = await getStoredDownloadPath(courseId);
    final manifestPath = await getStoredManifestPath(courseId);
    final extractedDirectoryPath = await getStoredExtractedDirectoryPath(courseId);

    if (version.isEmpty || packagePath == null || manifestPath == null) {
      _installedMemoryCache[courseId] = null;
      return null;
    }

    final manifestFile = File(manifestPath);
    if (!await manifestFile.exists()) {
      _installedMemoryCache[courseId] = null;
      return null;
    }

    final manifest = jsonDecode(await manifestFile.readAsString());
    final manifestMap = manifest is Map<String, dynamic>
        ? manifest
        : manifest is Map
            ? manifest.map((key, value) => MapEntry(key.toString(), value))
            : <String, dynamic>{};

    final extractedRoot = extractedDirectoryPath == null ||
            extractedDirectoryPath.trim().isEmpty
        ? File(packagePath).parent.path
        : extractedDirectoryPath;

    final installed = OfflineInstalledPackage(
      version: version,
      packagePath: packagePath,
      manifestPath: manifestPath,
      extractedDirectoryPath: extractedRoot,
      manifest: manifestMap,
    );

    _installedMemoryCache[courseId] = installed;
    return installed;
  }

  Future<String?> resolveInstalledFilePath({
    required OfflineInstalledPackage installedPackage,
    required OfflineManifestFile manifestFile,
  }) async {
    final key =
        '${installedPackage.extractedDirectoryPath}|${installedPackage.packagePath}|${manifestFile.path}';

    if (_resolvedPathMemoryCache.containsKey(key)) {
      return _resolvedPathMemoryCache[key];
    }

    final normalizedPath = manifestFile.path.replaceAll('/', Platform.pathSeparator);

    final direct = File(
      '${installedPackage.extractedDirectoryPath}${Platform.pathSeparator}$normalizedPath',
    );

    if (await direct.exists()) {
      _resolvedPathMemoryCache[key] = direct.path;
      return direct.path;
    }

    final fallback = File(
      '${File(installedPackage.packagePath).parent.path}${Platform.pathSeparator}$normalizedPath',
    );

    if (await fallback.exists()) {
      _resolvedPathMemoryCache[key] = fallback.path;
      return fallback.path;
    }

    _resolvedPathMemoryCache[key] = null;
    return null;
  }

  Future<void> submitSyncLog(OfflineSyncLogEntry entry) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.offlineSyncLogs,
      data: entry.toMap(),
    );
  }

  Future<void> submitSyncLogsBatch(List<OfflineSyncLogEntry> entries) async {
    if (entries.isEmpty) return;

    await _client.post<Map<String, dynamic>>(
      ApiEndpoints.offlineSyncLogsBatch,
      data: {
        'device_id': entries.first.deviceId,
        'entries': entries.map((item) => item.toMap()).toList(growable: false),
      },
    );
  }

  static void clearMemoryCaches() {
    _deltaMemoryCache.clear();
    _installedMemoryCache.clear();
    _resolvedPathMemoryCache.clear();
  }

  String _androidEmulatorSafeUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return url;

    final isLocalhost = uri.host == 'localhost' || uri.host == '127.0.0.1';
    if (!Platform.isAndroid || !isLocalhost) return url;

    return uri.replace(host: '10.0.2.2').toString();
  }

  String _normalizeToken(String token) {
    return token.trim().replaceFirst(RegExp(r'^:+'), '');
  }

  bool _isRecoverableStoredTokenError(Object error) {
    final raw = error.toString().toLowerCase();
    return raw.contains('invalid download token') ||
        raw.contains('download token has expired') ||
        raw.contains('download token is revoked') ||
        raw.contains('token is restricted to another device');
  }
}
