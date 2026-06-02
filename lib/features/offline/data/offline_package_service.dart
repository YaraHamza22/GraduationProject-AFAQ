import 'dart:convert';
import 'dart:io';

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
  }) : _apiClient = apiClient,
       _sessionStore = sessionStore;

  static const _deviceIdKey = 'offline_device_id';
  static const _versionPrefix = 'offline_course_version_';
  static const _downloadPrefix = 'offline_course_download_';
  static const _manifestPrefix = 'offline_course_manifest_';
  static const _tokenPrefix = 'offline_course_token_';

  final ApiClient? _apiClient;
  final SessionStore? _sessionStore;

  ApiClient get _client => _apiClient ?? ApiClient.instance;
  SessionStore get _store => _sessionStore ?? SessionStore.instance;

  Future<OfflineDeltaSnapshot> getCourseDelta({required int courseId}) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiEndpoints.offlineDelta(courseId),
      queryParameters: {'version': await getStoredVersion(courseId)},
    );
    return OfflineDeltaSnapshot.fromMap(unwrapDataMap(response.data));
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

  Future<String?> getStoredToken(int courseId) async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString('$_tokenPrefix$courseId');
  }

  Future<String> issueDownloadToken({required int packageId}) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiEndpoints.offlinePackageTokens(packageId),
      data: {
        'user_id': _store.userId,
        'device_id': await getDeviceId(),
      },
    );

    final payload = unwrapDataMap(response.data);
    final token = readString(payload['token']);
    if (token.isEmpty) {
      throw Exception('Backend did not return an offline download token.');
    }
    return token;
  }

  Future<OfflineDownloadAccess> validateDownloadToken({
    required String token,
  }) async {
    final response = await _client.get<Map<String, dynamic>>(
      ApiEndpoints.offlineDownload(token),
      queryParameters: {'device_id': await getDeviceId()},
    );
    return OfflineDownloadAccess.fromMap(unwrapDataMap(response.data));
  }

  Future<OfflinePackageDownload> downloadPackage({
    required int courseId,
    required OfflineDownloadAccess access,
    required String token,
  }) async {
    final directory = await getApplicationDocumentsDirectory();
    final offlineRoot = Directory('${directory.path}${Platform.pathSeparator}offline_packages');
    if (!await offlineRoot.exists()) {
      await offlineRoot.create(recursive: true);
    }

    final targetDirectory = Directory(
      '${offlineRoot.path}${Platform.pathSeparator}course_$courseId${Platform.pathSeparator}${access.version}',
    );
    if (!await targetDirectory.exists()) {
      await targetDirectory.create(recursive: true);
    }

    final uri = Uri.tryParse(access.fileUrl);
    final fileName = uri != null && uri.pathSegments.isNotEmpty
        ? uri.pathSegments.last
        : 'offline-package-$courseId.bin';
    final packagePath = '${targetDirectory.path}${Platform.pathSeparator}$fileName';
    final manifestPath = '${targetDirectory.path}${Platform.pathSeparator}manifest.json';

    final headers = <String, dynamic>{'Accept': 'application/octet-stream'};
    final authToken = _store.token;
    if (authToken != null && authToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $authToken';
    }

    final dio = Dio();
    await dio.download(
      access.fileUrl,
      packagePath,
      options: Options(headers: headers),
    );

    await File(manifestPath).writeAsString(
      const JsonEncoder.withIndent('  ').convert(access.manifest),
    );

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('$_versionPrefix$courseId', access.version);
    await preferences.setString('$_downloadPrefix$courseId', packagePath);
    await preferences.setString('$_manifestPrefix$courseId', manifestPath);
    await preferences.setString('$_tokenPrefix$courseId', token);

    return OfflinePackageDownload(
      localFilePath: packagePath,
      manifestPath: manifestPath,
      deviceId: await getDeviceId(),
      version: access.version,
    );
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
}

