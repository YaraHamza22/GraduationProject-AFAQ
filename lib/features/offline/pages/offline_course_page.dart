import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../student/pages/student_page_shared.dart';
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

  bool _loading = true;
  bool _downloading = false;
  bool _openingFile = false;
  String? _error;
  OfflineDeltaSnapshot? _delta;
  String? _storedVersion;
  String? _storedPath;
  String? _manifestPath;
  String? _extractedDirectoryPath;
  String? _deviceId;
  OfflineInstalledPackage? _installedPackage;
  String? _selectedUnitId;
  String? _selectedLessonId;

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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        _service.getCourseDelta(courseId: widget.courseId),
        _service.getStoredVersion(widget.courseId),
        _service.getStoredDownloadPath(widget.courseId),
        _service.getStoredManifestPath(widget.courseId),
        _service.getStoredExtractedDirectoryPath(widget.courseId),
        _service.getDeviceId(),
        _service.getInstalledPackage(courseId: widget.courseId),
      ]);

      final installedPackage = results[6] as OfflineInstalledPackage?;
      if (!mounted) return;
      setState(() {
        _delta = results[0] as OfflineDeltaSnapshot;
        _storedVersion = results[1] as String;
        _storedPath = results[2] as String?;
        _manifestPath = results[3] as String?;
        _extractedDirectoryPath = results[4] as String?;
        _deviceId = results[5] as String;
        _installedPackage = installedPackage;
        _loading = false;
      });
      _ensureSelection(installedPackage?.outline);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  void _ensureSelection([OfflineCourseOutline? outline]) {
    final nextOutline = outline ?? _outline;
    if (nextOutline.units.isEmpty) {
      _selectedUnitId = null;
      _selectedLessonId = null;
      return;
    }

    final currentUnit = nextOutline.units.where((unit) => unit.id == _selectedUnitId);
    final unit = currentUnit.isNotEmpty ? currentUnit.first : nextOutline.units.first;
    final currentLesson = unit.lessons.where((lesson) => lesson.id == _selectedLessonId);
    final lesson = currentLesson.isNotEmpty ? currentLesson.first : unit.lessons.first;

    if (!mounted) {
      _selectedUnitId = unit.id;
      _selectedLessonId = lesson.id;
      return;
    }

    setState(() {
      _selectedUnitId = unit.id;
      _selectedLessonId = lesson.id;
    });
  }

  Future<void> _downloadLatestPackage() async {
    final package = _delta?.package;
    if (package == null) {
      _showToast('No offline package is published for this course yet.', AfaqToastType.error);
      return;
    }

    setState(() {
      _downloading = true;
      _error = null;
    });

    try {
      final token = await _service.issueDownloadToken(packageId: package.id);
      final access = await _service.validateDownloadToken(token: token);
      final download = await _service.downloadPackage(
        courseId: widget.courseId,
        access: access,
        token: token,
      );

      if (!mounted) return;
      setState(() {
        _storedVersion = download.version;
        _storedPath = download.localFilePath;
        _manifestPath = download.manifestPath;
        _extractedDirectoryPath = download.extractedDirectoryPath;
        _deviceId = download.deviceId;
      });
      _showToast('Offline package downloaded successfully.', AfaqToastType.success);
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
      _showToast(error.toString(), AfaqToastType.error);
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

  void _showToast(String message, AfaqToastType type) {
    if (!mounted) return;
    AfaqToast.show(context, message: message, type: type);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return Scaffold(
      appBar: AppBar(title: const Text('Offline Course')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHero(titleColor, secondary),
            const SizedBox(height: 20),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_error != null)
              StudentErrorPanel(message: _error!, onRetry: _load)
            else ...[
              _buildSummaryCard(),
              const SizedBox(height: 20),
              _buildPackageCard(),
              const SizedBox(height: 20),
              _buildOfflineLibrary(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHero(Color titleColor, Color secondary) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEEF4FF), Color(0xFFF4F7FF), Color(0xFFE9FFF4)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AfaqColors.primary.withValues(alpha: .08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .78),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'Smart Offline Learning',
              style: TextStyle(
                color: AfaqColors.primary,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            widget.courseTitle,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Download once, then browse the package as a structured offline course with lessons and local files that open directly inside the app.',
            style: TextStyle(color: secondary, fontWeight: FontWeight.w600, height: 1.5),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaPill(label: 'Units ${_outline.units.length}'),
              _MetaPill(label: 'Lessons ${_outline.totalLessons}'),
              _MetaPill(label: 'Files ${_outline.totalFiles}'),
              _MetaPill(label: _delta?.hasUpdate == true ? 'Update ready' : 'Latest installed'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Device & Local Package',
            style: TextStyle(color: AfaqColors.primary, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaPill(label: 'Device ${_deviceId ?? '-'}'),
              _MetaPill(label: 'Installed ${_storedVersion?.isNotEmpty == true ? _storedVersion! : 'none'}'),
              _MetaPill(label: _storedPath == null ? 'No local file' : 'Saved on device'),
            ],
          ),
          if (_storedPath != null) ...[
            const SizedBox(height: 14),
            _InfoStrip(label: 'Package path', value: _storedPath!),
          ],
          if (_manifestPath != null) ...[
            const SizedBox(height: 12),
            _InfoStrip(label: 'Manifest path', value: _manifestPath!),
          ],
          if (_extractedDirectoryPath != null) ...[
            const SizedBox(height: 12),
            _InfoStrip(label: 'Extracted content', value: _extractedDirectoryPath!),
          ],
        ],
      ),
    );
  }

  Widget _buildPackageCard() {
    final package = _delta?.package;
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Backend Package Status',
            style: TextStyle(color: AfaqColors.primary, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaPill(label: _delta?.hasUpdate == true ? 'Update available' : 'Up to date'),
              _MetaPill(label: 'Current ${_delta?.currentVersion.isNotEmpty == true ? _delta!.currentVersion : 'none'}'),
              _MetaPill(label: 'Latest ${_delta?.latestVersion.isNotEmpty == true ? _delta!.latestVersion : 'none'}'),
            ],
          ),
          const SizedBox(height: 16),
          if (package == null)
            const StudentEmptyPanel(
              message: 'No offline package has been published for this course yet.',
              icon: Icons.inventory_2_outlined,
            )
          else ...[
            _InfoStrip(label: 'Version', value: package.version),
            const SizedBox(height: 10),
            _InfoStrip(label: 'File URL', value: package.fileUrl),
            const SizedBox(height: 10),
            _InfoStrip(label: 'Checksum', value: package.manifestChecksum.isEmpty ? '-' : package.manifestChecksum),
            const SizedBox(height: 10),
            _InfoStrip(label: 'Updated', value: package.updatedAt.isEmpty ? '-' : package.updatedAt),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: _downloading ? null : _downloadLatestPackage,
              icon: _downloading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.download_rounded),
              label: Text(_downloading ? 'Downloading...' : 'Download Latest Package'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOfflineLibrary() {
    final installedPackage = _installedPackage;
    if (installedPackage == null) {
      return const StudentEmptyPanel(
        message: 'Download the package first to unlock the offline course library.',
        icon: Icons.download_for_offline_outlined,
      );
    }

    if (_outline.isEmpty) {
      return const StudentEmptyPanel(
        message: 'The package is installed, but the manifest does not include readable file entries yet.',
        icon: Icons.folder_off_outlined,
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 1100;
        final navigation = _buildLessonNavigator();
        final detail = _buildLessonDetail(installedPackage);

        if (wide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 4, child: navigation),
              const SizedBox(width: 18),
              Expanded(flex: 7, child: detail),
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
          const Text(
            'Offline Course Map',
            style: TextStyle(color: AfaqColors.primary, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          const Text(
            'Choose a unit, then open any lesson bundle inside the downloaded package.',
            style: TextStyle(color: AfaqColors.slate500, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          ..._outline.units.map(_buildUnitCard),
        ],
      ),
    );
  }

  Widget _buildUnitCard(OfflineCourseUnit unit) {
    final active = unit.id == _selectedUnitId;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: active
            ? AfaqColors.primary.withValues(alpha: .08)
            : AfaqColors.slate100.withValues(alpha: .7),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: active
              ? AfaqColors.primary.withValues(alpha: .18)
              : Colors.transparent,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _selectUnit(unit),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: active
                          ? AfaqColors.primary.withValues(alpha: .14)
                          : Colors.white.withValues(alpha: .8),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.folder_copy_outlined, color: AfaqColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          unit.title,
                          style: const TextStyle(
                            color: AfaqColors.slate900,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${unit.lessons.length} lesson bundle${unit.lessons.length == 1 ? '' : 's'}',
                          style: const TextStyle(
                            color: AfaqColors.slate500,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: unit.lessons.map((lesson) {
              final lessonActive = lesson.id == _selectedLessonId;
              return ChoiceChip(
                label: Text(lesson.title),
                selected: lessonActive,
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
      return const StudentEmptyPanel(
        message: 'Select a lesson bundle to start reading offline content.',
        icon: Icons.auto_stories_outlined,
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AfaqColors.primary.withValues(alpha: .08),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  unit.title,
                  style: const TextStyle(
                    color: AfaqColors.primary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
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
                fontWeight: FontWeight.w600,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFF8FBFF), Color(0xFFFFFFFF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AfaqColors.slate200.withValues(alpha: .8)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Available lesson content',
                  style: TextStyle(
                    color: AfaqColors.slate900,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Text and images open directly in the app. Other local files can still be opened from the device.',
                  style: TextStyle(
                    color: AfaqColors.slate500,
                    fontWeight: FontWeight.w600,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                ...lesson.files.map((file) => _buildInstalledFileTile(installedPackage, file)),
              ],
            ),
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
      future: _service.resolveInstalledFilePath(
        installedPackage: installedPackage,
        manifestFile: manifestFile,
      ),
      builder: (context, snapshot) {
        final resolvedPath = snapshot.data;
        final isReady = resolvedPath != null && resolvedPath.trim().isNotEmpty;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AfaqColors.slate200.withValues(alpha: .8)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AfaqColors.primary.withValues(alpha: .08),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      manifestFile.isImage
                          ? Icons.image_outlined
                          : manifestFile.isTextLike
                          ? Icons.description_outlined
                          : Icons.insert_drive_file_outlined,
                      color: AfaqColors.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          manifestFile.label,
                          style: const TextStyle(
                            color: AfaqColors.slate900,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          manifestFile.path,
                          style: const TextStyle(
                            color: AfaqColors.slate500,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
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
                      manifestFile.isImage || manifestFile.isTextLike ? 'Open In App' : 'Open File',
                    ),
                  ),
                  if (resolvedPath != null)
                    OutlinedButton.icon(
                      onPressed: () => _showToast(resolvedPath, AfaqToastType.info),
                      icon: const Icon(Icons.folder_open_rounded),
                      label: const Text('Show Path'),
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
      _showToast(error.toString(), AfaqToastType.error);
    } finally {
      if (mounted) {
        setState(() => _openingFile = false);
      }
    }
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
        color: isDark ? Colors.white.withValues(alpha: .06) : AfaqColors.slate100.withValues(alpha: .75),
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
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
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
        color: isDark ? Colors.white.withValues(alpha: .08) : AfaqColors.slate100.withValues(alpha: .8),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
    );
  }
}
