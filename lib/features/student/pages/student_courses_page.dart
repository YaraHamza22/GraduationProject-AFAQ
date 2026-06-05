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
  final Set<int> _completingLesson = {}; 
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
Future<void> _openLessonsAndUnitsSheet(_EnrollmentRow enrollment) async {
  Future<_CourseContent> loadContent() async {
  final response = await _service.getCourseContent(
    courseId: enrollment.courseId,
  );

  final data = unwrapDataMap(response.data);
  final courseMap = asMap(data['course']) ?? data;

  final baseContent = _CourseContent.fromMap(
    courseMap,
    localeNotifier.value.languageCode,
  );

  final enrichedUnits = <_CourseUnit>[];

  for (final unit in baseContent.units) {
    if (unit.lessons.isNotEmpty) {
      enrichedUnits.add(unit);
      continue;
    }

    final lessonsResponse = await _service.getLessonsByUnit(
      unitId: unit.id,
    );

    final lessonItems = unwrapDataList(lessonsResponse.data);

    final lessons = lessonItems
        .where((item) {
          final map = asMap(item);
          return map != null && readInt(map['unit_id']) == unit.id;
        })
        .map((item) => _CourseLesson.fromMap(item, localeNotifier.value.languageCode))
        .toList(growable: false);

    enrichedUnits.add(
      unit.copyWith(lessons: lessons),
    );
  }

  return _CourseContent(units: enrichedUnits);
}

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (sheetContext) {
      Future<_CourseContent> contentFuture = loadContent();
      final completingLessons = <int>{};

      return StatefulBuilder(
        builder: (context, sheetSetState) {
          Future<void> completeLesson(_CourseLesson lesson) async {
            if (completingLessons.contains(lesson.id)) return;

            sheetSetState(() => completingLessons.add(lesson.id));

            try {
              await _service.completeLesson(
                enrollmentId: enrollment.enrollmentId,
                lessonId: lesson.id,
              );

              if (!mounted) return;

              AfaqToast.show(
                context,
                message: 'Lesson completed successfully.',
                type: AfaqToastType.success,
              );

              _progressByEnrollment.remove(enrollment.enrollmentId);

              sheetSetState(() {
                completingLessons.remove(lesson.id);
                contentFuture = loadContent();
              });

              await _load();
            } catch (error) {
              sheetSetState(() => completingLessons.remove(lesson.id));

              if (!mounted) return;

              AfaqToast.show(
                context,
                message: error.toString(),
                type: AfaqToastType.error,
              );
            }
          }

          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.82,
            minChildSize: 0.45,
            maxChildSize: 0.95,
            builder: (context, scrollController) {
              return Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: FutureBuilder<_CourseContent>(
                  future: contentFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    if (snapshot.hasError) {
                      return StudentErrorPanel(
                        message: snapshot.error.toString(),
                        onRetry: () async {
  sheetSetState(() {
    contentFuture = loadContent();
  });
},
                      );
                    }

                    final content = snapshot.data;

                    if (content == null || content.units.isEmpty) {
                      return const StudentEmptyPanel(
                        message: 'No units or lessons were found for this course.',
                        icon: Icons.menu_book_outlined,
                      );
                    }

                    return ListView(
                      controller: scrollController,
                      children: [
                        Text(
                          enrollment.title,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Units and lessons',
                          style: TextStyle(
                            color: Theme.of(context).brightness == Brightness.dark
                                ? AfaqColors.slate300
                                : AfaqColors.slate500,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 18),

                        for (final unit in content.units)
                          Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ExpansionTile(
                              initiallyExpanded: true,
                              title: Text(
                                unit.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              subtitle: Text('${unit.lessons.length} lessons'),
                              children: [
                                if (unit.lessons.isEmpty)
                                  const ListTile(
                                    title: Text('No lessons in this unit.'),
                                  )
                                else
                                  for (final lesson in unit.lessons)
                                    ListTile(
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 6,
                                      ),
                                      leading: Icon(
                                        lesson.completed
                                            ? Icons.check_circle_rounded
                                            : Icons.play_circle_outline_rounded,
                                        color: lesson.completed
                                            ? Colors.green
                                            : AfaqColors.primary,
                                      ),
                                      title: Text(
                                        lesson.title,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      subtitle: lesson.description.isEmpty
                                          ? null
                                          : Text(
                                              lesson.description,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                      trailing: lesson.completed
                                          ? const Text(
                                              'Done',
                                              style: TextStyle(
                                                color: Colors.green,
                                                fontWeight: FontWeight.w900,
                                              ),
                                            )
                                          : FilledButton(
                                              onPressed: completingLessons.contains(lesson.id)
                                                  ? null
                                                  : () => completeLesson(lesson),
                                              child: completingLessons.contains(lesson.id)
                                                  ? const SizedBox(
                                                      width: 16,
                                                      height: 16,
                                                      child: CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                        color: Colors.white,
                                                      ),
                                                    )
                                                  : const Text('Complete'),
                                            ),
                                    ),
                              ],
                            ),
                          ),
                      ],
                    );
                  },
                ),
              );
            },
          );
        },
      );
    },
  );
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

  Future<_EnrollmentProgress?> _fetchProgress(
  _EnrollmentRow enrollment, {
  bool showErrorToast = true,
}) async {
  if (_progressByEnrollment.containsKey(enrollment.enrollmentId)) {
    return _progressByEnrollment[enrollment.enrollmentId];
  }

  if (_loadingProgress.contains(enrollment.enrollmentId)) {
    return null;
  }

  setState(() => _loadingProgress.add(enrollment.enrollmentId));

  try {
    final response = await _service.getEnrollmentProgress(
      enrollmentId: enrollment.enrollmentId,
    );

    final data = _EnrollmentProgress.fromMap(unwrapDataMap(response.data));

    if (!mounted) return data;

    setState(() {
      _progressByEnrollment[enrollment.enrollmentId] = data;
    });

    return data;
  } catch (_) {
    if (!mounted) return null;

    if (showErrorToast) {
      AfaqToast.show(
        context,
        message: 'Unable to load progress details right now.',
        type: AfaqToastType.error,
      );
    }

    return null;
  } finally {
    if (mounted) {
      setState(() => _loadingProgress.remove(enrollment.enrollmentId));
    }
  }
}

Future<void> _loadProgress(_EnrollmentRow enrollment) async {
  await _fetchProgress(enrollment);
}
Future<void> _completeNextLesson(_EnrollmentRow enrollment) async {
  final progress = await _fetchProgress(enrollment);

  if (!mounted) return;

  if (progress?.nextLessonId == null) {
    AfaqToast.show(
      context,
      message: 'Open Progress Details and complete a specific lesson from there.',
      type: AfaqToastType.error,
    );
    return;
  }

  try {
    await _service.completeLesson(
      enrollmentId: enrollment.enrollmentId,
      lessonId: progress!.nextLessonId!,
    );

    if (!mounted) return;

    AfaqToast.show(
      context,
      message: 'Lesson completed successfully.',
      type: AfaqToastType.success,
    );

    _progressByEnrollment.remove(enrollment.enrollmentId);
    await _load();
  } catch (error) {
    if (!mounted) return;

    AfaqToast.show(
      context,
      message: error.toString(),
      type: AfaqToastType.error,
    );
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
                childAspectRatio: .72,
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
  completingLesson: _completingLesson.contains(enrollment.enrollmentId),
  onProgress: () => _loadProgress(enrollment),
  onCompleteLesson: () => _openLessonsAndUnitsSheet(enrollment),
  onOffline: () {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => OfflineCoursePage(
          courseId: enrollment.courseId,
          courseTitle: enrollment.title,
        ),
      ),
    );
  },
);
   } ),
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
    required this.nextLessonId,
    required this.nextLessonTitle,
  });

  final int totalUnits;
  final int totalLessons;
  final int completedLessons;
  final int remainingLessons;
  final int? nextLessonId;
  final String? nextLessonTitle;

  factory _EnrollmentProgress.fromMap(Map<String, dynamic> map) {
    final explicitNextLesson = asMap(map['next_lesson'] ?? map['nextLesson']);
    final lessons = _extractLessons(map);

    Map<String, dynamic>? nextLesson;

    for (final lesson in lessons) {
      if (!_isLessonCompleted(lesson)) {
        nextLesson = lesson;
        break;
      }
    }

    final nextId = _readNullableInt(
          map['next_lesson_id'] ??
              map['nextLessonId'] ??
              explicitNextLesson?['id'] ??
              explicitNextLesson?['lesson_id'],
        ) ??
        _readNullableInt(nextLesson?['id'] ?? nextLesson?['lesson_id']);

    final nextTitle = readString(
      explicitNextLesson?['title'] ?? nextLesson?['title'],
      fallback: '',
    );

    return _EnrollmentProgress(
      totalUnits: readInt(map['total_units']),
      totalLessons: readInt(map['total_lessons']),
      completedLessons: readInt(map['completed_lessons']),
      remainingLessons: readInt(map['remaining_lessons']),
      nextLessonId: nextId,
      nextLessonTitle: nextTitle.isEmpty ? null : nextTitle,
    );
  }

  static List<Map<String, dynamic>> _extractLessons(Map<String, dynamic> map) {
    final directLessons = unwrapDataList(map['lessons']);

    if (directLessons.isNotEmpty) {
      return directLessons;
    }

    final units = unwrapDataList(map['units']);
    final lessons = <Map<String, dynamic>>[];

    for (final unit in units) {
      final unitMap = asMap(unit);
      if (unitMap == null) continue;

      lessons.addAll(unwrapDataList(unitMap['lessons']));
    }

    return lessons;
  }

  static bool _isLessonCompleted(Map<String, dynamic> lesson) {
    final progress = asMap(lesson['progress']);
    final pivot = asMap(lesson['pivot']);

    return lesson['is_completed'] == true ||
        lesson['completed'] == true ||
        lesson['completed_at'] != null ||
        progress?['is_completed'] == true ||
        progress?['completed'] == true ||
        pivot?['is_completed'] == true ||
        pivot?['completed'] == true;
  }

  static int? _readNullableInt(dynamic value) {
    final parsed = readInt(value);
    return parsed <= 0 ? null : parsed;
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
  required this.completingLesson,
  required this.onProgress,
  required this.onCompleteLesson,
  required this.onOffline,
});

  final _EnrollmentRow enrollment;
  final _EnrollmentProgress? progress;
  final bool loadingProgress;
  final VoidCallback onProgress;
  final VoidCallback onOffline;
  final bool completingLesson;
  final VoidCallback onCompleteLesson;

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
          const SizedBox(height: 12),
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
      onPressed: enrollment.completed || completingLesson ? null : onCompleteLesson,
      icon: completingLesson
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : const Icon(Icons.check_circle_outline_rounded),
      label: const Text('Complete Next Lesson'),
    ),
    OutlinedButton.icon(
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
class _CourseContent {
  const _CourseContent({
    required this.units,
  });

  final List<_CourseUnit> units;

  factory _CourseContent.fromMap(Map<String, dynamic> map, String lang) {
    final unitItems = unwrapDataList(
      map['units'] ??
          map['course_units'] ??
          map['courseUnits'],
    );

    if (unitItems.isNotEmpty) {
      return _CourseContent(
        units: unitItems
            .map((item) => _CourseUnit.fromMap(item, lang))
            .toList(growable: false),
      );
    }

    final directLessons = unwrapDataList(
      map['lessons'] ??
          map['course_lessons'] ??
          map['courseLessons'],
    );

    if (directLessons.isNotEmpty) {
      return _CourseContent(
        units: [
          _CourseUnit(
            id: 0,
            title: 'Lessons',
            lessons: directLessons
                .map((item) => _CourseLesson.fromMap(item, lang))
                .toList(growable: false),
          ),
        ],
      );
    }

    return const _CourseContent(units: []);
  }
}

class _CourseUnit {
  const _CourseUnit({
    required this.id,
    required this.title,
    required this.lessons,
  });

  final int id;
  final String title;
  final List<_CourseLesson> lessons;

  _CourseUnit copyWith({
    List<_CourseLesson>? lessons,
  }) {
    return _CourseUnit(
      id: id,
      title: title,
      lessons: lessons ?? this.lessons,
    );
  }

  factory _CourseUnit.fromMap(Map<String, dynamic> map, String lang) {
    final lessons = unwrapDataList(
      map['lessons'] ??
          map['course_lessons'] ??
          map['courseLessons'],
    );

    return _CourseUnit(
      id: readInt(map['id']),
      title: localizedValue(
        map['title_translations'] ?? map['name_translations'],
        lang,
        fallback: readString(
          map['title'] ?? map['name'],
          fallback: 'Unit',
        ),
      ),
      lessons: lessons
          .map((item) => _CourseLesson.fromMap(item, lang))
          .toList(growable: false),
    );
  }
}

class _CourseLesson {
  const _CourseLesson({
    required this.id,
    required this.title,
    required this.description,
    required this.completed,
  });

  final int id;
  final String title;
  final String description;
  final bool completed;

  factory _CourseLesson.fromMap(Map<String, dynamic> map, String lang) {
    final progress = asMap(map['progress']);
    final pivot = asMap(map['pivot']);
    final enrollmentLesson = asMap(map['enrollment_lesson']);

    return _CourseLesson(
      id: readInt(map['id'] ?? map['lesson_id']),
      title: localizedValue(
        map['title_translations'],
        lang,
        fallback: readString(
          map['title'] ?? map['name'],
          fallback: 'Lesson',
        ),
      ),
      description: localizedValue(
        map['description_translations'],
        lang,
        fallback: readString(
          map['description'],
          fallback: '',
        ),
      ),
      completed: map['is_completed'] == true ||
          map['completed'] == true ||
          map['completed_at'] != null ||
          progress?['is_completed'] == true ||
          progress?['completed'] == true ||
          pivot?['is_completed'] == true ||
          pivot?['completed'] == true ||
          enrollmentLesson?['is_completed'] == true ||
          enrollmentLesson?['completed'] == true,
    );
  }
}