import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/certificate_service.dart';
import '../data/courses_service.dart';
import 'student_page_shared.dart';

class StudentCertificatesPage extends StatefulWidget {
  const StudentCertificatesPage({super.key});

  @override
  State<StudentCertificatesPage> createState() => _StudentCertificatesPageState();
}

class _StudentCertificatesPageState extends State<StudentCertificatesPage> {
  final _coursesService = const CoursesService();
  final _certificateService = const CertificateService();

  bool _loading = true;
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
      _loading = true;
      _error = null;
    });

    try {
      final response = await _coursesService.getEnrollments();
      final rows = unwrapDataList(response.data)
          .map(_CertificateCourse.fromEnrollmentMap)
          .where((item) => item.id != 0)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _courses = {
          for (final course in rows) course.id: course,
        }.values.toList(growable: false);
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

  Future<void> _checkCertificate(_CertificateCourse course) async {
    setState(() {
      _states[course.id] = const _CertificateState.loading();
    });

    try {
      final response = await _certificateService.getCertificatePdf(courseId: course.id);
      final bytes = response.data ?? const <int>[];
      if (!mounted) return;
      setState(() {
        _states[course.id] = _CertificateState.available(bytes.length);
      });
      AfaqToast.show(
        context,
        message: 'Certificate fetched for ${course.title}.',
        type: AfaqToastType.success,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _states[course.id] = _CertificateState.unavailable(error.toString());
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

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
                  : GridView.builder(
                      itemCount: _courses.length,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 420,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 1.02,
                      ),
                      itemBuilder: (context, index) {
                        final course = _courses[index];
                        final state = _states[course.id] ?? const _CertificateState.idle();
                        final color = switch (state.kind) {
                          _CertificateKind.available => AfaqColors.emerald500,
                          _CertificateKind.unavailable => AfaqColors.amber500,
                          _CertificateKind.loading => AfaqColors.primary,
                          _CertificateKind.idle => AfaqColors.slate500,
                        };

                        return AfaqPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                course.title,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: .12),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Text(
                                  state.message,
                                  style: TextStyle(
                                    color: color,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              FilledButton.icon(
                                onPressed: state.kind == _CertificateKind.loading
                                    ? null
                                    : () => _checkCertificate(course),
                                icon: state.kind == _CertificateKind.loading
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.download_outlined),
                                label: Text(studentText('check', lang)),
                              ),
                            ],
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
}

enum _CertificateKind { idle, loading, available, unavailable }

class _CertificateState {
  const _CertificateState._({
    required this.kind,
    required this.message,
  });

  const _CertificateState.idle()
      : this._(
          kind: _CertificateKind.idle,
          message: 'Check certificate eligibility for this course.',
        );

  const _CertificateState.loading()
      : this._(
          kind: _CertificateKind.loading,
          message: 'Checking certificate...',
        );

  _CertificateState.available(int bytes)
      : this._(
          kind: _CertificateKind.available,
          message: 'Certificate is available (${(bytes / 1024).toStringAsFixed(1)} KB).',
        );

  _CertificateState.unavailable(String raw)
      : this._(
          kind: _CertificateKind.unavailable,
          message: raw,
        );

  final _CertificateKind kind;
  final String message;
}
