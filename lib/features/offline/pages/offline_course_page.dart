import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/offline_package_models.dart';
import '../data/offline_package_service.dart';
import 'offline_file_viewer_page.dart';

class OfflineCoursePage extends StatefulWidget {
  const OfflineCoursePage({
    super.key,
    required this.courseId,
    required this.courseTitle,
  });

  final int courseId;
  final String courseTitle;

  @override
  State<OfflineCoursePage> createState() => _OfflineCoursePageState();
}

class _OfflineCoursePageState extends State<OfflineCoursePage> {
  final _service = const OfflinePackageService();

  bool _loadingLocal = true;
  bool _refreshingRemote = false;
  bool _downloading = false;
  bool _openingFile = false;

  String? _error;
  String? _remoteError;

  OfflineDeltaSnapshot? _delta;
  String? _storedVersion;
  String? _storedPath;
  String? _manifestPath;
  String? _extractedDirectoryPath;
  String? _deviceId;
  String? _storedToken;
  OfflineInstalledPackage? _installedPackage;
  String? _selectedUnitId;
  String? _selectedLessonId;

  final Map<String, Future<String?>> _resolvedPathFutures = {};
  final Map<String, String?> _resolvedPathCache = {};

  OfflineCourseOutline get _outline =>
      _installedPackage?.outline ??
      const OfflineCourseOutline(units: <OfflineCourseUnit>[], totalFiles: 0);

  OfflineCourseUnit? get _selectedUnit {
    final units = _outline.units;
    if (units.isEmpty) return null;

    return units.firstWhere(
      (unit) => unit.id == _selectedUnitId,
      orElse: () => units.first,
    );
  }

  OfflineCourseLesson? get _selectedLesson {
    final unit = _selectedUnit;
    if (unit == null || unit.lessons.isEmpty) return null;

    return unit.lessons.firstWhere(
      (lesson) => lesson.id == _selectedLessonId,
      orElse: () => unit.lessons.first,
    );
  }

  bool get _hasInstalledPackage => _installedPackage != null;
  bool get _hasRemotePackage => _delta?.package != null;
  bool get _hasUpdate => _delta?.hasUpdate == true;
  bool get _canDownload => _hasRemotePackage && !_downloading;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool forceRemote = false}) async {
    setState(() {
      _loadingLocal = _installedPackage == null;
      _error = null;
      _remoteError = null;
    });

    try {
      final localResults = await Future.wait<dynamic>([
        _service.getStoredVersion(widget.courseId),
        _service.getStoredDownloadPath(widget.courseId),
        _service.getStoredManifestPath(widget.courseId),
        _service.getStoredExtractedDirectoryPath(widget.courseId),
        _service.getStoredToken(widget.courseId),
        _service.getDeviceId(),
        _service.getInstalledPackage(
          courseId: widget.courseId,
          forceRefresh: forceRemote,
        ),
      ]);

      final installedPackage = localResults[6] as OfflineInstalledPackage?;

      if (!mounted) return;
      setState(() {
        _storedVersion = localResults[0] as String;
        _storedPath = localResults[1] as String?;
        _manifestPath = localResults[2] as String?;
        _extractedDirectoryPath = localResults[3] as String?;
        _storedToken = localResults[4] as String?;
        _deviceId = localResults[5] as String;
        _installedPackage = installedPackage;
        _loadingLocal = false;
      });

      _ensureSelection(installedPackage?.outline);

      unawaited(_refreshDelta(forceRefresh: forceRemote));
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _friendlyError(error);
        _loadingLocal = false;
      });
    }
  }

  Future<void> _refreshDelta({bool forceRefresh = false}) async {
    if (_refreshingRemote) return;

    setState(() {
      _refreshingRemote = true;
      _remoteError = null;
    });

    try {
      final delta = await _service.getCourseDelta(
        courseId: widget.courseId,
        forceRefresh: forceRefresh,
      );

      if (!mounted) return;
      setState(() => _delta = delta);
    } catch (error) {
      if (!mounted) return;
      setState(() => _remoteError = _friendlyError(error));
    } finally {
      if (mounted) {
        setState(() => _refreshingRemote = false);
      }
    }
  }

  void _ensureSelection([OfflineCourseOutline? outline]) {
    final nextOutline = outline ?? _outline;

    if (nextOutline.units.isEmpty) {
      _selectedUnitId = null;
      _selectedLessonId = null;
      return;
    }

    final unit = nextOutline.units.firstWhere(
      (item) => item.id == _selectedUnitId,
      orElse: () => nextOutline.units.first,
    );

    final lesson = unit.lessons.isEmpty
        ? null
        : unit.lessons.firstWhere(
            (item) => item.id == _selectedLessonId,
            orElse: () => unit.lessons.first,
          );

    if (!mounted) {
      _selectedUnitId = unit.id;
      _selectedLessonId = lesson?.id;
      return;
    }

    setState(() {
      _selectedUnitId = unit.id;
      _selectedLessonId = lesson?.id;
    });
  }

  Future<void> _downloadLatestPackage() async {
    final package = _delta?.package;

    if (package == null) {
      _showToast(
        'No offline package is published for this course yet.',
        AfaqToastType.error,
      );
      return;
    }

    setState(() {
      _downloading = true;
      _error = null;
      _remoteError = null;
    });

    try {
      final token = await _service.ensureDownloadToken(
        courseId: widget.courseId,
        packageId: package.id,
      );
      final download = await _service.downloadPackageByToken(
        courseId: widget.courseId,
        token: token,
        forceDownload: true,
      );

      final installedPackage = await _service.getInstalledPackage(
        courseId: widget.courseId,
        forceRefresh: true,
      );

      _resolvedPathCache.clear();
      _resolvedPathFutures.clear();

      if (!mounted) return;
      setState(() {
        _storedVersion = download.version;
        _storedPath = download.localFilePath;
        _manifestPath = download.manifestPath;
        _extractedDirectoryPath = download.extractedDirectoryPath;
        _deviceId = download.deviceId;
        _storedToken = token;
        _installedPackage = installedPackage;
      });

      _ensureSelection(installedPackage?.outline);
      _showToast('Offline package downloaded successfully.', AfaqToastType.success);

      unawaited(_refreshDelta(forceRefresh: true));
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
      _showToast(_friendlyError(error), AfaqToastType.error);
    } finally {
      if (mounted) {
        setState(() => _downloading = false);
      }
    }
  }

  Future<void> _promptDownloadByToken() async {
    final controller = TextEditingController(text: _storedToken ?? '');
    final token = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Download with token'),
          content: SizedBox(
            width: 520,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Paste the offline package token, then the app will call the backend download API and install the package on this device.',
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: controller,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Token',
                    hintText: 'offline-packages/download/{token}',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(controller.text.trim()),
              child: const Text('Download'),
            ),
          ],
        );
      },
    );

    controller.dispose();

    if (token == null || token.trim().isEmpty || !mounted) {
      return;
    }

    await _downloadPackageWithToken(token);
  }

  Future<void> _downloadPackageWithToken(String token) async {
    setState(() {
      _downloading = true;
      _error = null;
      _remoteError = null;
    });

    try {
      final normalizedToken = token.trim();
      final download = await _service.downloadPackageByToken(
        courseId: widget.courseId,
        token: normalizedToken,
        forceDownload: true,
      );

      final installedPackage = await _service.getInstalledPackage(
        courseId: widget.courseId,
        forceRefresh: true,
      );

      _resolvedPathCache.clear();
      _resolvedPathFutures.clear();

      if (!mounted) return;
      setState(() {
        _storedVersion = download.version;
        _storedPath = download.localFilePath;
        _manifestPath = download.manifestPath;
        _extractedDirectoryPath = download.extractedDirectoryPath;
        _deviceId = download.deviceId;
        _storedToken = normalizedToken;
        _installedPackage = installedPackage;
      });

      _ensureSelection(installedPackage?.outline);
      _showToast('Offline package downloaded successfully.', AfaqToastType.success);

      unawaited(_refreshDelta(forceRefresh: true));
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
      _showToast(_friendlyError(error), AfaqToastType.error);
    } finally {
      if (mounted) {
        setState(() => _downloading = false);
      }
    }
  }

  void _selectUnit(OfflineCourseUnit unit) {
    setState(() {
      _selectedUnitId = unit.id;
      _selectedLessonId = unit.lessons.isEmpty ? null : unit.lessons.first.id;
    });
  }

  void _selectLesson(OfflineCourseUnit unit, OfflineCourseLesson lesson) {
    setState(() {
      _selectedUnitId = unit.id;
      _selectedLessonId = lesson.id;
    });
  }

  Future<String?> _resolveFilePath(
    OfflineInstalledPackage installedPackage,
    OfflineManifestFile file,
  ) {
    final key = '${installedPackage.extractedDirectoryPath}|${file.path}';

    if (_resolvedPathCache.containsKey(key)) {
      return Future<String?>.value(_resolvedPathCache[key]);
    }

    return _resolvedPathFutures.putIfAbsent(key, () async {
      final resolved = await _service.resolveInstalledFilePath(
        installedPackage: installedPackage,
        manifestFile: file,
      );
      _resolvedPathCache[key] = resolved;
      return resolved;
    });
  }

  void _showToast(String message, AfaqToastType type) {
    if (!mounted) return;
    AfaqToast.show(context, message: message, type: type);
  }

  String _friendlyError(Object error) {
    final raw = error.toString();

    if (raw.contains('user id field is required') ||
        raw.contains('User id is missing')) {
      return 'User session is missing. Please log in again before downloading offline content.';
    }

    if (raw.contains('SocketException') || raw.contains('Connection refused')) {
      return 'Cannot reach the server. Check your connection or use 10.0.2.2 for Android emulator URLs.';
    }

    final normalized = raw.toLowerCase();

    if (normalized.contains('401') ||
        normalized.contains('unauthorized') ||
        normalized.contains('unauthenticated')) {
      return 'Your session expired. Please log in again, then try the offline download again.';
    }

    if (normalized.contains('403') ||
        normalized.contains('forbidden') ||
        normalized.contains('this action is unauthorized')) {
      return 'You are not allowed to download this offline package. Make sure you are actively enrolled in this course.';
    }

    if (normalized.contains('invalid download token') ||
        normalized.contains('download token has expired') ||
        normalized.contains('download token is revoked')) {
      return 'The offline token is no longer valid. The app will request a fresh token automatically the next time you download.';
    }

    if (raw.startsWith('Exception: ')) {
      return raw.replaceFirst('Exception: ', '');
    }

    return raw;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF0F172A) : Colors.white;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF020617) : const Color(0xFFF6F8FC),
      appBar: AppBar(
        elevation: 0,
        title: const Text('Offline Course'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _refreshingRemote || _downloading
                ? null
                : () => _load(forceRemote: true),
            icon: _refreshingRemote
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _loadingLocal
          ? _buildLoadingState()
          : RefreshIndicator(
              onRefresh: () => _load(forceRemote: true),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final wide = constraints.maxWidth >= 980;

                  return SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1320),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildHero(titleColor, secondary, surface),
                            const SizedBox(height: 18),
                            if (_error != null) ...[
                              _ErrorBanner(message: _error!, onRetry: () => _load(forceRemote: true)),
                              const SizedBox(height: 18),
                            ],
                            if (_remoteError != null) ...[
                              _ErrorBanner(
                                message: _remoteError!,
                                onRetry: () => _refreshDelta(forceRefresh: true),
                                soft: true,
                              ),
                              const SizedBox(height: 18),
                            ],
                            _buildStatusGrid(wide),
                            const SizedBox(height: 18),
                            _buildPackageCard(surface),
                            const SizedBox(height: 18),
                            _buildOfflineLibrary(),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text(
            'Preparing offline library...',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }

  Widget _buildHero(Color titleColor, Color secondary, Color surface) {
    final statusLabel = _downloading
        ? 'Downloading'
        : _hasInstalledPackage
            ? 'Available offline'
            : _hasRemotePackage
                ? 'Ready to download'
                : 'No package yet';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFEEF2FF),
            Color(0xFFF8FAFC),
            Color(0xFFECFDF5),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(34),
        border: Border.all(color: AfaqColors.primary.withValues(alpha: .10)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .04),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 720;

          final textBlock = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 10,
                runSpacing: 10,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _GlowBadge(
                    icon: Icons.offline_bolt_rounded,
                    label: 'Smart Offline Learning',
                    color: AfaqColors.primary,
                  ),
                  _GlowBadge(
                    icon: _hasInstalledPackage
                        ? Icons.verified_rounded
                        : Icons.cloud_download_rounded,
                    label: statusLabel,
                    color: _hasInstalledPackage ? Colors.green : AfaqColors.primary,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                widget.courseTitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: titleColor,
                      height: 1.05,
                    ),
              ),
              const SizedBox(height: 10),
              Text(
                'Download once, then open lessons, notes, images, videos, and package files directly from this device.',
                style: TextStyle(
                  color: secondary,
                  fontWeight: FontWeight.w700,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _MetaPill(label: 'Units ${_outline.units.length}'),
                  _MetaPill(label: 'Lessons ${_outline.totalLessons}'),
                  _MetaPill(label: 'Files ${_outline.totalFiles}'),
                  _MetaPill(label: _hasUpdate ? 'Update ready' : 'Latest checked'),
                ],
              ),
            ],
          );

          final actions = Column(
            crossAxisAlignment:
                compact ? CrossAxisAlignment.stretch : CrossAxisAlignment.end,
            children: [
              FilledButton.icon(
                onPressed: _canDownload ? _downloadLatestPackage : null,
                icon: _downloading
                    ? const SizedBox(
                        width: 17,
                        height: 17,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(_hasInstalledPackage
                        ? Icons.system_update_alt_rounded
                        : Icons.download_rounded),
                label: Text(
                  _downloading
                      ? 'Downloading...'
                      : _hasInstalledPackage && _hasUpdate
                          ? 'Update package'
                          : _hasInstalledPackage
                              ? 'Re-download'
                              : 'Download package',
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _refreshingRemote ? null : () => _load(forceRemote: true),
                icon: _refreshingRemote
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.sync_rounded),
                label: const Text('Check latest'),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _downloading ? null : _promptDownloadByToken,
                icon: const Icon(Icons.key_rounded),
                label: const Text('Use token'),
              ),
            ],
          );

          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                textBlock,
                const SizedBox(height: 18),
                actions,
              ],
            );
          }

          return Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(child: textBlock),
              const SizedBox(width: 24),
              actions,
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatusGrid(bool wide) {
    final items = [
      _StatusMetric(
        icon: Icons.devices_rounded,
        title: 'Device',
        value: _deviceId ?? '-',
        subtitle: 'Bound to this installation',
      ),
      _StatusMetric(
        icon: Icons.inventory_2_rounded,
        title: 'Installed',
        value: _storedVersion?.isNotEmpty == true ? _storedVersion! : 'none',
        subtitle: _storedPath == null ? 'No local ZIP yet' : 'Saved on device',
      ),
      _StatusMetric(
        icon: Icons.cloud_done_rounded,
        title: 'Backend',
        value: _delta?.latestVersion.isNotEmpty == true ? _delta!.latestVersion : 'none',
        subtitle: _hasRemotePackage ? 'Published package found' : 'No active package',
      ),
      _StatusMetric(
        icon: Icons.folder_copy_rounded,
        title: 'Library',
        value: '${_outline.totalFiles}',
        subtitle: '${_outline.units.length} units • ${_outline.totalLessons} lessons',
      ),
    ];

    return GridView.builder(
      itemCount: items.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: wide ? 4 : 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: wide ? 2.65 : 1.65,
      ),
      itemBuilder: (context, index) => _MetricCard(metric: items[index]),
    );
  }

  Widget _buildPackageCard(Color surface) {
    final package = _delta?.package;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            icon: Icons.cloud_download_rounded,
            title: 'Backend Package',
            subtitle: 'Active package metadata used for download tokens and local installation.',
            trailing: _refreshingRemote
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : null,
          ),
          const SizedBox(height: 16),
          if (package == null)
            _EmptyCallout(
              icon: Icons.inventory_2_outlined,
              title: 'No active package found',
              message:
                  'Create an active offline package from the admin panel. After that, this page can issue a token and download it.',
            )
          else ...[
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _MetaPill(label: 'Version ${package.version}'),
                _MetaPill(label: _hasUpdate ? 'Update available' : 'Available'),
                _MetaPill(label: '${package.files.length} manifest files'),
              ],
            ),
            const SizedBox(height: 14),
            _InfoStrip(label: 'Download URL', value: package.fileUrl),
            const SizedBox(height: 10),
            _InfoStrip(
              label: 'Checksum',
              value: package.manifestChecksum.isEmpty ? '-' : package.manifestChecksum,
            ),
            const SizedBox(height: 10),
            _InfoStrip(
              label: 'Updated',
              value: package.updatedAt.isEmpty ? '-' : package.updatedAt,
            ),
            if ((_storedToken ?? '').trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              _InfoStrip(
                label: 'Stored token',
                value: _maskToken(_storedToken!),
              ),
            ],
            if ((_manifestPath ?? '').trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              _InfoStrip(
                label: 'Local manifest',
                value: _manifestPath!,
              ),
            ],
            if ((_extractedDirectoryPath ?? '').trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              _InfoStrip(
                label: 'Extracted content',
                value: _extractedDirectoryPath!,
              ),
            ],
            const SizedBox(height: 18),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton.icon(
                  onPressed: _canDownload ? _downloadLatestPackage : null,
                  icon: _downloading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.download_rounded),
                  label: Text(
                    _downloading ? 'Downloading package...' : 'Download to this device',
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: _downloading ? null : _promptDownloadByToken,
                  icon: const Icon(Icons.vpn_key_rounded),
                  label: const Text('Download by token'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _maskToken(String token) {
    final normalized = token.trim();
    if (normalized.length <= 12) return normalized;
    return '${normalized.substring(0, 6)}...${normalized.substring(normalized.length - 6)}';
  }

  Widget _buildOfflineLibrary() {
    final installedPackage = _installedPackage;

    if (installedPackage == null) {
      return const _EmptyCallout(
        icon: Icons.download_for_offline_outlined,
        title: 'Offline library locked',
        message: 'Download the published package first. Then units, lessons, and files will appear instantly from local storage.',
      );
    }

    if (_outline.isEmpty) {
      return const _EmptyCallout(
        icon: Icons.folder_off_outlined,
        title: 'Installed package has no readable manifest files',
        message: 'The ZIP was downloaded, but the manifest does not include a valid files array.',
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 1050;
        final navigation = _buildLessonNavigator();
        final detail = _buildLessonDetail(installedPackage);

        if (wide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 390, child: navigation),
              const SizedBox(width: 18),
              Expanded(child: detail),
            ],
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            navigation,
            const SizedBox(height: 18),
            detail,
          ],
        );
      },
    );
  }

  Widget _buildLessonNavigator() {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(
            icon: Icons.account_tree_rounded,
            title: 'Offline Course Map',
            subtitle: 'Choose a unit and lesson bundle.',
          ),
          const SizedBox(height: 18),
          ..._outline.units.map(_buildUnitCard),
        ],
      ),
    );
  }

  Widget _buildUnitCard(OfflineCourseUnit unit) {
    final active = unit.id == _selectedUnitId;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: active
            ? AfaqColors.primary.withValues(alpha: .09)
            : AfaqColors.slate100.withValues(alpha: .70),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: active
              ? AfaqColors.primary.withValues(alpha: .24)
              : Colors.transparent,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => _selectUnit(unit),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: active
                        ? AfaqColors.primary.withValues(alpha: .15)
                        : Colors.white.withValues(alpha: .86),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: const Icon(
                    Icons.folder_copy_outlined,
                    color: AfaqColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    unit.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AfaqColors.slate900,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _MetaPill(label: '${unit.lessons.length}'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: unit.lessons.map((lesson) {
              final selected = lesson.id == _selectedLessonId;

              return ChoiceChip(
                label: Text(
                  lesson.title,
                  overflow: TextOverflow.ellipsis,
                ),
                selected: selected,
                onSelected: (_) => _selectLesson(unit, lesson),
              );
            }).toList(growable: false),
          ),
        ],
      ),
    );
  }

  Widget _buildLessonDetail(OfflineInstalledPackage installedPackage) {
    final lesson = _selectedLesson;
    final unit = _selectedUnit;

    if (lesson == null || unit == null) {
      return const _EmptyCallout(
        icon: Icons.auto_stories_outlined,
        title: 'Select a lesson',
        message: 'Choose a lesson bundle to open its offline files.',
      );
    }

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _GlowBadge(
                icon: Icons.school_rounded,
                label: unit.title,
                color: AfaqColors.primary,
              ),
              _MetaPill(label: '${lesson.files.length} files'),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            lesson.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AfaqColors.slate900,
                ),
          ),
          if (lesson.subtitle.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              lesson.subtitle,
              style: const TextStyle(
                color: AfaqColors.slate500,
                fontWeight: FontWeight.w700,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 18),
          if (lesson.files.isEmpty)
            const _EmptyCallout(
              icon: Icons.insert_drive_file_outlined,
              title: 'No files in this lesson',
              message: 'The manifest defines this lesson, but no file paths were attached to it.',
            )
          else
            ...lesson.files.map(
              (file) => _buildInstalledFileTile(installedPackage, file),
            ),
        ],
      ),
    );
  }

  Widget _buildInstalledFileTile(
    OfflineInstalledPackage installedPackage,
    OfflineManifestFile manifestFile,
  ) {
    return FutureBuilder<String?>(
      future: _resolveFilePath(installedPackage, manifestFile),
      builder: (context, snapshot) {
        final resolvedPath = snapshot.data;
        final isReady = resolvedPath != null && resolvedPath.trim().isNotEmpty;
        final checking = snapshot.connectionState == ConnectionState.waiting;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white.withValues(alpha: .05)
                : Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AfaqColors.slate200.withValues(alpha: .75)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _FileIcon(file: manifestFile),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          manifestFile.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AfaqColors.slate900,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          manifestFile.path,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AfaqColors.slate500,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  if (checking)
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  else
                    Icon(
                      isReady ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                      color: isReady ? Colors.green : Colors.orange,
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MetaPill(label: manifestFile.extension.isEmpty ? 'file' : manifestFile.extension),
                  _MetaPill(label: manifestFile.directoryLabel),
                  _MetaPill(label: isReady ? 'Ready locally' : 'Missing locally'),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  FilledButton.icon(
                    onPressed: !isReady || _openingFile
                        ? null
                        : () => _openInstalledFile(
                              manifestFile: manifestFile,
                              filePath: resolvedPath,
                            ),
                    icon: const Icon(Icons.open_in_new_rounded),
                    label: Text(
                      manifestFile.isImage || manifestFile.isTextLike
                          ? 'Open in app'
                          : 'Open file',
                    ),
                  ),
                  if (resolvedPath != null)
                    OutlinedButton.icon(
                      onPressed: () => _showToast(resolvedPath, AfaqToastType.info),
                      icon: const Icon(Icons.folder_open_rounded),
                      label: const Text('Path'),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openInstalledFile({
    required OfflineManifestFile manifestFile,
    required String? filePath,
  }) async {
    if (filePath == null || filePath.trim().isEmpty) return;

    setState(() => _openingFile = true);

    try {
      if (manifestFile.isImage || manifestFile.isTextLike) {
        if (!mounted) return;

        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => OfflineFileViewerPage(
              filePath: filePath,
              title: manifestFile.label,
              isTextLike: manifestFile.isTextLike,
            ),
          ),
        );
      } else {
        final launched = await launchUrl(Uri.file(filePath));
        if (!launched) {
          throw Exception('Could not open this offline file.');
        }
      }
    } catch (error) {
      _showToast(_friendlyError(error), AfaqToastType.error);
    } finally {
      if (mounted) {
        setState(() => _openingFile = false);
      }
    }
  }
}

class _StatusMetric {
  const _StatusMetric({
    required this.icon,
    required this.title,
    required this.value,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String value;
  final String subtitle;
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.metric});

  final _StatusMetric metric;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AfaqColors.primary.withValues(alpha: .09),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(metric.icon, color: AfaqColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  metric.title,
                  style: const TextStyle(
                    color: AfaqColors.slate500,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  metric.value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  metric.subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AfaqColors.slate500,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AfaqColors.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(
                  color: AfaqColors.slate500,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

class _EmptyCallout extends StatelessWidget {
  const _EmptyCallout({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
        decoration: BoxDecoration(
          color: AfaqColors.slate100.withValues(alpha: .55),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AfaqColors.slate200.withValues(alpha: .85)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 34, color: AfaqColors.slate500),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AfaqColors.slate500,
                fontWeight: FontWeight.w700,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({
    required this.message,
    required this.onRetry,
    this.soft = false,
  });

  final String message;
  final VoidCallback onRetry;
  final bool soft;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: soft
            ? Colors.orange.withValues(alpha: .09)
            : Colors.red.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: soft
              ? Colors.orange.withValues(alpha: .18)
              : Colors.red.withValues(alpha: .18),
        ),
      ),
      child: Row(
        children: [
          Icon(
            soft ? Icons.info_outline_rounded : Icons.error_outline_rounded,
            color: soft ? Colors.orange : Colors.red,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: soft ? Colors.orange.shade800 : Colors.red.shade700,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _InfoStrip extends StatelessWidget {
  const _InfoStrip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: .06)
            : AfaqColors.slate100.withValues(alpha: .75),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AfaqColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          SelectableText(
            value,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: .08)
            : AfaqColors.slate100.withValues(alpha: .80),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _GlowBadge extends StatelessWidget {
  const _GlowBadge({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: .18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 7),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w900,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _FileIcon extends StatelessWidget {
  const _FileIcon({required this.file});

  final OfflineManifestFile file;

  @override
  Widget build(BuildContext context) {
    final icon = file.isImage
        ? Icons.image_outlined
        : file.isTextLike
            ? Icons.description_outlined
            : file.extension == 'pdf'
                ? Icons.picture_as_pdf_outlined
                : file.extension == 'mp4' || file.extension == 'mov'
                    ? Icons.video_file_outlined
                    : Icons.insert_drive_file_outlined;

    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        color: AfaqColors.primary.withValues(alpha: .09),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, color: AfaqColors.primary),
    );
  }
}
