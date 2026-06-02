import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../student/pages/student_page_shared.dart';
import '../data/offline_package_models.dart';
import '../data/offline_package_service.dart';

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
  String? _error;
  OfflineDeltaSnapshot? _delta;
  String? _storedVersion;
  String? _storedPath;
  String? _manifestPath;
  String? _deviceId;

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
        _service.getDeviceId(),
      ]);

      if (!mounted) return;
      setState(() {
        _delta = results[0] as OfflineDeltaSnapshot;
        _storedVersion = results[1] as String;
        _storedPath = results[2] as String?;
        _manifestPath = results[3] as String?;
        _deviceId = results[4] as String;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
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
      appBar: AppBar(
        title: const Text('Offline Package'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.courseTitle,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w900,
                color: titleColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Check offline availability, download the latest package, and keep track of the local copy for this course.',
              style: TextStyle(color: secondary, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 24),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_error != null)
              StudentErrorPanel(message: _error!, onRetry: _load)
            else ...[
              _buildSummaryCard(),
              const SizedBox(height: 20),
              _buildPackageCard(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard() {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Device & Local Copy',
            style: TextStyle(
              color: AfaqColors.primary,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaPill(label: 'Device ${_deviceId ?? '-'}'),
              _MetaPill(label: 'Installed ${_storedVersion?.isNotEmpty == true ? _storedVersion! : 'none'}'),
              _MetaPill(label: _storedPath == null ? 'No local file' : 'Package saved'),
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
            style: TextStyle(
              color: AfaqColors.primary,
              fontWeight: FontWeight.w900,
            ),
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
          Text(
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
