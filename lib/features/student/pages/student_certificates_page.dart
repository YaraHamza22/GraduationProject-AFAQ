import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/certificate_service.dart';
import '../data/courses_service.dart';
import '../data/my_learning_service.dart';
import '../data/quiz_service.dart';
import 'student_page_shared.dart';

class StudentCertificatesPage extends StatefulWidget {
  const StudentCertificatesPage({super.key});

  @override
  State<StudentCertificatesPage> createState() => _StudentCertificatesPageState();
}

class _StudentCertificatesPageState extends State<StudentCertificatesPage> {
  final _coursesService = const CoursesService();
  final _myLearningService = const MyLearningService();
  final _quizService = const QuizService();
  final _certificateService = const CertificateService();

  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  List<_CertificateCourse> _courses = const [];
  final Map<int, _CertificateState> _states = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _courses.isEmpty;
      _refreshing = _courses.isNotEmpty;
      _error = null;
    });

    try {
      final responses = await Future.wait([
        _coursesService.getEnrollments(),
        _myLearningService.getMyLearning(),
      ]);

      final enrollments = unwrapDataList(
        responses[0].data ?? const <String, dynamic>{},
      )
          .map(_CertificateCourse.fromEnrollmentMap);
      final learning = unwrapDataList(
        responses[1].data ?? const <String, dynamic>{},
      )
          .map(_CertificateCourse.fromLearningMap);
      final courses = {
        for (final course in [...enrollments, ...learning])
          if (course.id != 0) course.id: course,
      }.values.toList(growable: false);

      if (!mounted) return;
      setState(() {
        _courses = courses;
        _loading = false;
        _refreshing = false;
      });

      await Future.wait(courses.map(_probeCertificate));
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
        _refreshing = false;
      });
    }
  }

  Future<void> _probeCertificate(_CertificateCourse course) async {
    setState(() {
      _states[course.id] = const _CertificateState.loading();
    });

    try {
      final response = await _quizService.getAssessmentProgress(course.id);
      final payload = _AssessmentPayload.fromResponse(
        response.data ?? const <String, dynamic>{},
      );

      if (!mounted) return;
      setState(() {
        _states[course.id] = payload.eligible
            ? _CertificateState.available(
                message: payload.averagePercentage > 0
                    ? 'Certificate is ready. Current average: ${payload.averagePercentage.toStringAsFixed(2)}%.'
                    : 'Certificate is ready to download.',
                averagePercentage: payload.averagePercentage > 0
                    ? payload.averagePercentage
                    : null,
              )
            : _CertificateState.unavailable(
                payload.reason.isNotEmpty
                    ? payload.reason
                    : 'Certificate is not available yet. All required quizzes must be graded, and the course average score must be at least 60%.',
                averagePercentage: payload.averagePercentage > 0
                    ? payload.averagePercentage
                    : null,
              );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _states[course.id] = _CertificateState.error(error.toString());
      });
    }
  }

  Future<void> _downloadCertificate(_CertificateCourse course) async {
    final current = _states[course.id];
    if (current?.hasLocalFile == true) {
      await _shareCertificate(course, current!);
      return;
    }

    setState(() {
      _states[course.id] = const _CertificateState.loading(
        message: 'Preparing your certificate...',
      );
    });

    try {
      final response = await _certificateService.getCertificatePdf(courseId: course.id);
      final bytes = response.data ?? const <int>[];
      if (bytes.isEmpty) {
        await _probeCertificate(course);
        return;
      }

      final file = await _saveCertificateFile(course.id, bytes);
      final next = _CertificateState.available(
        message: 'Certificate downloaded successfully.',
        averagePercentage: current?.averagePercentage,
        filePath: file.path,
        fileName: file.uri.pathSegments.isNotEmpty
            ? file.uri.pathSegments.last
            : 'course-${course.id}-certificate.pdf',
        fileSizeBytes: bytes.length,
      );

      if (!mounted) return;
      setState(() {
        _states[course.id] = next;
      });

      AfaqToast.show(
        context,
        message: 'Saved to ${file.path}',
        type: AfaqToastType.success,
      );
      await _shareCertificate(course, next);
    } catch (_) {
      await _probeCertificate(course);
    }
  }

  Future<File> _saveCertificateFile(int courseId, List<int> bytes) async {
    final baseDir = await _resolveCertificateBaseDirectory();
    final dir = Directory(
      '${baseDir.path}${Platform.pathSeparator}afaq_certificates',
    );

    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }

    final file = File(
      '${dir.path}${Platform.pathSeparator}course-$courseId-certificate.pdf',
    );
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }

  Future<Directory> _resolveCertificateBaseDirectory() async {
    if (Platform.isAndroid) {
      final downloadDirs = await getExternalStorageDirectories(
        type: StorageDirectory.downloads,
      );
      final preferred = downloadDirs?.firstWhere(
        (dir) => dir.path.contains('Download'),
        orElse: () => downloadDirs.first,
      );
      if (preferred != null) {
        return preferred;
      }

      final external = await getExternalStorageDirectory();
      if (external != null) {
        return external;
      }
    }

    final downloads = await getDownloadsDirectory();
    if (downloads != null) {
      return downloads;
    }

    return getApplicationDocumentsDirectory();
  }

  Future<void> _shareCertificate(
    _CertificateCourse course,
    _CertificateState state,
  ) async {
    final filePath = state.filePath;
    if (filePath == null || filePath.isEmpty) return;

    final file = File(filePath);
    if (!await file.exists()) return;

    try {
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/pdf')],
          fileNameOverrides: [
            state.fileName ?? 'course-${course.id}-certificate.pdf',
          ],
          text: 'Certificate for ${course.title}',
          subject: course.title,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Certificate saved to ${file.path}.',
        type: AfaqToastType.success,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final availableCount = _states.values
        .where((state) => state.kind == _CertificateKind.available)
        .length;
    final pendingCount = _states.values
        .where((state) => state.kind == _CertificateKind.unavailable)
        .length;
    final scoredStates = _states.values
        .where((state) => state.averagePercentage != null)
        .toList(growable: false);
    final averageLabel = scoredStates.isEmpty
        ? 'No scores yet'
        : '${(scoredStates.fold<double>(0, (sum, state) => sum + state.averagePercentage!) / scoredStates.length).toStringAsFixed(1)}%';

    return StudentPageScaffold(
      title: studentText('certificates', lang),
      subtitle: studentText('certificates_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? StudentErrorPanel(message: _error!, onRetry: _load)
              : _courses.isEmpty
                  ? StudentEmptyPanel(
                      message: studentText('empty', lang),
                      icon: Icons.workspace_premium_outlined,
                    )
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final width = constraints.maxWidth;
                        final useStackedCards = width < 640;
                        final maxContentWidth = width >= 2200 ? 1760.0 : width >= 1600 ? 1560.0 : 1320.0;
                        final gridMaxExtent = width < 900 ? 420.0 : 440.0;
                        final cardHeight = width < 900 ? 360.0 : 320.0;

                        return Center(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(maxWidth: math.min(width, maxContentWidth)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _CertificatesHero(
                                  courseCount: _courses.length,
                                  availableCount: availableCount,
                                  pendingCount: pendingCount,
                                  averageLabel: averageLabel,
                                  refreshing: _refreshing,
                                ),
                                const SizedBox(height: 20),
                                if (useStackedCards)
                                  Column(
                                    children: [
                                      for (final course in _courses) ...[
                                        _CertificateCard(
                                          course: course,
                                          state: _states[course.id] ?? const _CertificateState.idle(),
                                          onCheck: () => _probeCertificate(course),
                                          onDownload: () => _downloadCertificate(course),
                                        ),
                                        if (course != _courses.last) const SizedBox(height: 16),
                                      ],
                                    ],
                                  )
                                else
                                  GridView.builder(
                                    itemCount: _courses.length,
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                                      maxCrossAxisExtent: gridMaxExtent,
                                      mainAxisSpacing: 16,
                                      crossAxisSpacing: 16,
                                      mainAxisExtent: cardHeight,
                                    ),
                                    itemBuilder: (context, index) {
                                      final course = _courses[index];
                                      final state =
                                          _states[course.id] ?? const _CertificateState.idle();
                                      return _CertificateCard(
                                        course: course,
                                        state: state,
                                        onCheck: () => _probeCertificate(course),
                                        onDownload: () => _downloadCertificate(course),
                                      );
                                    },
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}

class _CertificateCourse {
  const _CertificateCourse({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;

  factory _CertificateCourse.fromEnrollmentMap(Map<String, dynamic> map) {
    final course = asMap(map['course']) ?? map;
    return _CertificateCourse(
      id: readInt(course['id'] ?? map['course_id']),
      title: readString(course['title'], fallback: 'Course'),
    );
  }

  factory _CertificateCourse.fromLearningMap(Map<String, dynamic> map) {
    return _CertificateCourse(
      id: readInt(map['id']),
      title: readString(map['title'], fallback: 'Course'),
    );
  }
}

enum _CertificateKind { idle, loading, available, unavailable, error }

class _CertificateState {
  const _CertificateState._({
    required this.kind,
    required this.message,
    this.averagePercentage,
    this.filePath,
    this.fileName,
    this.fileSizeBytes,
  });

  const _CertificateState.idle()
      : this._(
          kind: _CertificateKind.idle,
          message: 'Check certificate eligibility for this course.',
        );

  const _CertificateState.loading({
    String message = 'Checking certificate...',
  }) : this._(
          kind: _CertificateKind.loading,
          message: message,
        );

  const _CertificateState.available({
    required String message,
    double? averagePercentage,
    String? filePath,
    String? fileName,
    int? fileSizeBytes,
  }) : this._(
          kind: _CertificateKind.available,
          message: message,
          averagePercentage: averagePercentage,
          filePath: filePath,
          fileName: fileName,
          fileSizeBytes: fileSizeBytes,
        );

  const _CertificateState.unavailable(
    String raw, {
    double? averagePercentage,
  }) : this._(
          kind: _CertificateKind.unavailable,
          message: raw,
          averagePercentage: averagePercentage,
        );

  const _CertificateState.error(String raw)
      : this._(
          kind: _CertificateKind.error,
          message: raw,
        );

  final _CertificateKind kind;
  final String message;
  final double? averagePercentage;
  final String? filePath;
  final String? fileName;
  final int? fileSizeBytes;

  bool get canDownload => kind == _CertificateKind.available;
  bool get hasLocalFile => filePath != null && filePath!.isNotEmpty;
}

class _AssessmentPayload {
  const _AssessmentPayload({
    required this.eligible,
    required this.reason,
    required this.averagePercentage,
  });

  final bool eligible;
  final String reason;
  final double averagePercentage;

  factory _AssessmentPayload.fromResponse(Map<String, dynamic> payload) {
    final data = unwrapDataMap(payload);
    final certificate = asMap(data['certificate']) ?? const <String, dynamic>{};
    final progress = asMap(data['progress']) ?? const <String, dynamic>{};

    return _AssessmentPayload(
      eligible: certificate['eligible'] == true || certificate['issued'] == true,
      reason: readString(certificate['reason']),
      averagePercentage: readDouble(
        certificate['average_percentage'] ?? progress['average_percentage'],
      ),
    );
  }
}

class _CertificatesHero extends StatelessWidget {
  const _CertificatesHero({
    required this.courseCount,
    required this.availableCount,
    required this.pendingCount,
    required this.averageLabel,
    required this.refreshing,
  });

  final int courseCount;
  final int availableCount;
  final int pendingCount;
  final String averageLabel;
  final bool refreshing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFE0F2FE),
            Color(0xFFECFDF5),
            Color(0xFFFEF3C7),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AfaqColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .88),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(
                  Icons.workspace_premium_rounded,
                  color: AfaqColors.emerald600,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Achievement Hub',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: AfaqColors.emerald600,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your certificates, eligibility, and PDF downloads in one polished view.',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AfaqColors.slate900,
                          ),
                    ),
                  ],
                ),
              ),
              if (refreshing)
                const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.4),
                ),
            ],
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _SummaryChip(
                icon: Icons.menu_book_rounded,
                label: 'Courses',
                value: '$courseCount',
                color: AfaqColors.blue500,
              ),
              _SummaryChip(
                icon: Icons.verified_rounded,
                label: 'Ready',
                value: '$availableCount',
                color: AfaqColors.emerald600,
              ),
              _SummaryChip(
                icon: Icons.schedule_rounded,
                label: 'Pending',
                value: '$pendingCount',
                color: AfaqColors.amber500,
              ),
              _SummaryChip(
                icon: Icons.percent_rounded,
                label: 'Average',
                value: averageLabel,
                color: AfaqColors.primary,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 140),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .88),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: AfaqColors.slate500,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  color: AfaqColors.slate900,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CertificateCard extends StatelessWidget {
  const _CertificateCard({
    required this.course,
    required this.state,
    required this.onCheck,
    required this.onDownload,
  });

  final _CertificateCourse course;
  final _CertificateState state;
  final VoidCallback onCheck;
  final VoidCallback onDownload;

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final compact = screenWidth < 420;

    final (badgeBg, badgeBorder, badgeText, badgeIcon, badgeLabel) = switch (state.kind) {
      _CertificateKind.available => (
          AfaqStatusColors.goodBg,
          AfaqStatusColors.goodBorder,
          AfaqStatusColors.goodText,
          Icons.verified_rounded,
          'Ready',
        ),
      _CertificateKind.unavailable => (
          AfaqStatusColors.warnBg,
          AfaqStatusColors.warnBorder,
          AfaqStatusColors.warnText,
          Icons.schedule_rounded,
          'Pending',
        ),
      _CertificateKind.error => (
          const Color(0xFFFFF1F2),
          const Color(0xFFFDA4AF),
          AfaqColors.rose600,
          Icons.error_outline_rounded,
          'Issue',
        ),
      _CertificateKind.loading => (
          const Color(0xFFEEF2FF),
          const Color(0xFFC7D2FE),
          AfaqColors.primary,
          Icons.hourglass_top_rounded,
          'Checking',
        ),
      _ => (
          AfaqStatusColors.neutralBg,
          AfaqStatusColors.neutralBorder,
          AfaqStatusColors.neutralText,
          Icons.shield_outlined,
          'Idle',
        ),
    };

    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = constraints.maxWidth;
        return AfaqPanel(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 12,
                runSpacing: 12,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: compact ? cardWidth : cardWidth * .58,
                    ),
                    child: Text(
                      course.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: badgeBg,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: badgeBorder),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(badgeIcon, size: 14, color: badgeText),
                        const SizedBox(width: 6),
                        Text(
                          badgeLabel,
                          style: TextStyle(
                            color: badgeText,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: badgeBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (state.kind == _CertificateKind.loading)
                      Row(
                        children: [
                          SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: badgeText,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              state.message,
                              style: TextStyle(
                                color: badgeText,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      Text(
                        state.message,
                        style: TextStyle(
                          color: badgeText,
                          fontWeight: FontWeight.w800,
                          height: 1.35,
                        ),
                      ),
                    if (state.averagePercentage != null) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Icon(Icons.bar_chart_rounded, size: 16, color: badgeText),
                          Text(
                            'Average score: ${state.averagePercentage!.toStringAsFixed(2)}%',
                            style: TextStyle(
                              color: badgeText,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (state.fileSizeBytes != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        'Saved PDF size: ${(state.fileSizeBytes! / 1024).toStringAsFixed(1)} KB',
                        style: const TextStyle(
                          color: AfaqColors.slate500,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  OutlinedButton.icon(
                    onPressed: state.kind == _CertificateKind.loading ? null : onCheck,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Check'),
                  ),
                  FilledButton.icon(
                    onPressed: state.kind == _CertificateKind.loading || !state.canDownload
                        ? null
                        : onDownload,
                    icon: Icon(
                      state.hasLocalFile
                          ? Icons.ios_share_rounded
                          : Icons.download_rounded,
                    ),
                    label: Text(state.hasLocalFile ? 'Share PDF' : 'Download PDF'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
