import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../offline/pages/offline_course_page.dart';
import '../data/courses_service.dart';
import 'student_page_shared.dart';

class StudentCoursesPage extends StatefulWidget {
  const StudentCoursesPage({super.key});

  @override
  State<StudentCoursesPage> createState() => _StudentCoursesPageState();
}

class _StudentCoursesPageState extends State<StudentCoursesPage> {
  final _service = const CoursesService();

  bool _loading = true;
  bool _discoverTab = false;
  int? _joiningCourseId;
  String? _error;
  List<_EnrollmentRow> _enrollments = const [];
  List<_CourseCardData> _discoverCourses = const [];
  final Map<int, _EnrollmentProgress> _progressByEnrollment = {};
  final Set<int> _loadingProgress = {};

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
      final results = await Future.wait([
        _service.getEnrollments(),
        _service.getCourses(),
      ]);

      final enrollments = unwrapDataList(results[0].data)
          .map(_EnrollmentRow.fromMap)
          .toList(growable: false);
      final allCourses = unwrapDataList(results[1].data)
          .map((item) => _CourseCardData.fromMap(item, localeNotifier.value.languageCode))
          .toList(growable: false);
      final enrolledIds = enrollments.map((item) => item.courseId).toSet();

      if (!mounted) return;
      setState(() {
        _enrollments = enrollments;
        _discoverCourses = allCourses.where((item) => !enrolledIds.contains(item.id)).toList(growable: false);
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

  Future<void> _joinCourse(_CourseCardData course) async {
    setState(() => _joiningCourseId = course.id);
    try {
      await _service.enroll(courseId: course.id);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'You joined ${course.title}.',
        type: AfaqToastType.success,
      );
      await _load();
      if (mounted) {
        setState(() => _discoverTab = false);
      }
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) {
        setState(() => _joiningCourseId = null);
      }
    }
  }

  Future<void> _loadProgress(_EnrollmentRow enrollment) async {
    if (_progressByEnrollment.containsKey(enrollment.enrollmentId) ||
        _loadingProgress.contains(enrollment.enrollmentId)) {
      return;
    }

    setState(() => _loadingProgress.add(enrollment.enrollmentId));
    try {
      final response = await _service.getEnrollmentProgress(
        enrollmentId: enrollment.enrollmentId,
      );
      final data = _EnrollmentProgress.fromMap(unwrapDataMap(response.data));
      if (!mounted) return;
      setState(() {
        _progressByEnrollment[enrollment.enrollmentId] = data;
      });
    } catch (_) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Unable to load progress details right now.',
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) {
        setState(() => _loadingProgress.remove(enrollment.enrollmentId));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final activeRows = _discoverTab ? _discoverCourses : _enrollments;

    return StudentPageScaffold(
      title: studentText('courses', lang),
      subtitle: studentText('courses_subtitle', lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AfaqColors.slate100.withValues(alpha: .7),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _TabButton(
                  label: studentText('my_learning', lang),
                  active: !_discoverTab,
                  onTap: () => setState(() => _discoverTab = false),
                ),
                _TabButton(
                  label: studentText('discover', lang),
                  active: _discoverTab,
                  onTap: () => setState(() => _discoverTab = true),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            StudentErrorPanel(message: _error!, onRetry: _load)
          else if (activeRows.isEmpty)
            StudentEmptyPanel(
              message: studentText('empty', lang),
              icon: Icons.school_outlined,
            )
          else
            GridView.builder(
              itemCount: activeRows.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 420,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: .97,
              ),
              itemBuilder: (context, index) {
                if (_discoverTab) {
                  final course = _discoverCourses[index];
                  return _DiscoverCourseCard(
                    course: course,
                    joining: _joiningCourseId == course.id,
                    onJoin: () => _joinCourse(course),
                  );
                }

                final enrollment = _enrollments[index];
                return _EnrollmentCard(
                  enrollment: enrollment,
                  progress: _progressByEnrollment[enrollment.enrollmentId],
                  loadingProgress: _loadingProgress.contains(enrollment.enrollmentId),
                  onProgress: () => _loadProgress(enrollment),
                  onOffline: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => OfflineCoursePage(
                        courseId: enrollment.courseId,
                        courseTitle: enrollment.title,
                      ),
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _EnrollmentRow {
  const _EnrollmentRow({
    required this.enrollmentId,
    required this.courseId,
    required this.title,
    required this.description,
    required this.category,
    required this.durationHours,
    required this.progress,
    required this.completed,
  });

  final int enrollmentId;
  final int courseId;
  final String title;
  final String description;
  final String category;
  final int durationHours;
  final double progress;
  final bool completed;

  factory _EnrollmentRow.fromMap(Map<String, dynamic> map) {
    final course = asMap(map['course']) ?? map;
    return _EnrollmentRow(
      enrollmentId: readInt(map['id']),
      courseId: readInt(course['id'] ?? map['course_id']),
      title: readString(course['title'], fallback: 'Untitled Course'),
      description: readString(course['description'], fallback: 'No description provided.'),
      category: readString(course['course_category_name'] ?? course['category'], fallback: 'Course'),
      durationHours: readInt(course['actual_duration_hours']),
      progress: readDouble(map['progress_percentage']).clamp(0, 100),
      completed: map['is_completed'] == true,
    );
  }
}

class _CourseCardData {
  const _CourseCardData({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.durationHours,
    required this.instructor,
  });

  final int id;
  final String title;
  final String description;
  final String category;
  final int durationHours;
  final String instructor;

  factory _CourseCardData.fromMap(Map<String, dynamic> map, String lang) {
    final categoryMap = asMap(map['course_category']);
    final creator = asMap(map['creator']);
    return _CourseCardData(
      id: readInt(map['id']),
      title: localizedValue(
        map['title_translations'],
        lang,
        fallback: readString(map['title'], fallback: 'Untitled Course'),
      ),
      description: localizedValue(
        map['description_translations'],
        lang,
        fallback: readString(map['description'], fallback: 'No description provided.'),
      ),
      category: localizedValue(
        categoryMap?['name'],
        lang,
        fallback: readString(categoryMap?['name'], fallback: 'Course'),
      ),
      durationHours: readInt(map['actual_duration_hours']),
      instructor: readString(creator?['name'], fallback: 'Afaq'),
    );
  }
}

class _EnrollmentProgress {
  const _EnrollmentProgress({
    required this.totalUnits,
    required this.totalLessons,
    required this.completedLessons,
    required this.remainingLessons,
  });

  final int totalUnits;
  final int totalLessons;
  final int completedLessons;
  final int remainingLessons;

  factory _EnrollmentProgress.fromMap(Map<String, dynamic> map) {
    return _EnrollmentProgress(
      totalUnits: readInt(map['total_units']),
      totalLessons: readInt(map['total_lessons']),
      completedLessons: readInt(map['completed_lessons']),
      remainingLessons: readInt(map['remaining_lessons']),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: active
              ? (isDark ? Colors.white.withValues(alpha: .12) : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: active
                ? (isDark ? AfaqColors.foregroundDark : AfaqColors.slate900)
                : (isDark ? AfaqColors.slate300 : AfaqColors.slate500),
          ),
        ),
      ),
    );
  }
}

class _EnrollmentCard extends StatelessWidget {
  const _EnrollmentCard({
    required this.enrollment,
    required this.progress,
    required this.loadingProgress,
    required this.onProgress,
    required this.onOffline,
  });

  final _EnrollmentRow enrollment;
  final _EnrollmentProgress? progress;
  final bool loadingProgress;
  final VoidCallback onProgress;
  final VoidCallback onOffline;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            enrollment.category,
            style: const TextStyle(
              color: AfaqColors.primary,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            enrollment.title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            enrollment.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: secondary),
          ),
          const Spacer(),
          Text(
            'Progress ${enrollment.progress.toStringAsFixed(1)}%',
            style: TextStyle(
              color: titleColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: enrollment.progress / 100,
            minHeight: 8,
            borderRadius: BorderRadius.circular(999),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MetaChip(label: '${enrollment.durationHours}h'),
              _MetaChip(label: enrollment.completed ? 'Completed' : 'Active'),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              OutlinedButton.icon(
                onPressed: onProgress,
                icon: loadingProgress
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.insights_outlined),
                label: const Text('Progress Details'),
              ),
              FilledButton.icon(
                onPressed: onOffline,
                icon: const Icon(Icons.download_for_offline_rounded),
                label: const Text('Offline Package'),
              ),
            ],
          ),
          if (progress != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MetaChip(label: 'Units ${progress!.totalUnits}'),
                _MetaChip(label: 'Lessons ${progress!.totalLessons}'),
                _MetaChip(label: 'Done ${progress!.completedLessons}'),
                _MetaChip(label: 'Left ${progress!.remainingLessons}'),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _DiscoverCourseCard extends StatelessWidget {
  const _DiscoverCourseCard({
    required this.course,
    required this.joining,
    required this.onJoin,
  });

  final _CourseCardData course;
  final bool joining;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            course.category,
            style: const TextStyle(
              color: AfaqColors.primary,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            course.title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            course.description,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: secondary),
          ),
          const Spacer(),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _MetaChip(label: '${course.durationHours}h'),
              _MetaChip(label: course.instructor),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: joining ? null : onJoin,
            icon: joining
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.play_circle_fill_rounded),
            label: const Text('Join Course'),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: .10)
            : AfaqColors.slate100.withValues(alpha: .8),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
