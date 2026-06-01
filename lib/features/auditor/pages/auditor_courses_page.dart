import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/auditor_content_review_service.dart';
import '../data/auditor_courses_service.dart';
import 'auditor_page_shared.dart';

class AuditorCoursesPage extends StatefulWidget {
  const AuditorCoursesPage({super.key});

  @override
  State<AuditorCoursesPage> createState() => _AuditorCoursesPageState();
}

class _AuditorCoursesPageState extends State<AuditorCoursesPage> {
  final _coursesService = const AuditorCoursesService();
  final _reviewService = const AuditorContentReviewService();
  final _notesController = TextEditingController();

  bool _loading = true;
  bool _detailsLoading = false;
  bool _submitting = false;
  String? _error;
  String _statusFilter = 'review';
  int _coursesPage = 1;
  int _coursesTotalPages = 1;
  int _reviewsPage = 1;
  int _reviewsTotalPages = 1;
  final int _coursesPerPage = 8;
  final int _reviewsPerPage = 6;

  List<_AuditorCourse> _courses = const [];
  List<_AuditorUnitBlock> _units = const [];
  List<_CourseReviewRecord> _reviews = const [];
  _AuditorCourse? _selectedCourse;
  _AuditorLesson? _selectedLesson;
  AuditorReviewVerdict _verdict = AuditorReviewVerdict.changesRequested;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _load({bool preserveSelection = false}) async {
    final selectedCourseId = preserveSelection ? _selectedCourse?.id : null;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _coursesService.getCourses(
        status: _statusFilter,
        perPage: _coursesPerPage,
        page: _coursesPage,
      );
      final courses = unwrapAuditorList(response.data)
          .map(_AuditorCourse.fromMap)
          .toList(growable: false);
      final pagination = auditorPaginationOf(response.data);
      var nextSelectedCourse = courses.isNotEmpty ? courses.first : null;
      if (selectedCourseId != null) {
        for (final course in courses) {
          if (course.id == selectedCourseId) {
            nextSelectedCourse = course;
            break;
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _courses = courses;
        _coursesTotalPages =
            auditorInt(pagination['total_pages'], fallback: 1).clamp(1, 9999);
        _selectedCourse = nextSelectedCourse;
        _loading = false;
      });

      if (_selectedCourse != null) {
        await _selectCourse(_selectedCourse!, preserveLesson: preserveSelection);
      } else if (mounted) {
        setState(() {
          _units = const [];
          _reviews = const [];
          _selectedLesson = null;
          _reviewsPage = 1;
          _reviewsTotalPages = 1;
        });
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _selectCourse(
    _AuditorCourse course, {
    bool preserveLesson = false,
  }) async {
    final previousLessonId = preserveLesson ? _selectedLesson?.id : null;
    setState(() {
      _selectedCourse = course;
      _detailsLoading = true;
      _error = null;
      _reviewsPage = 1;
    });

    try {
      final courseKey = course.slug.isNotEmpty ? course.slug : course.id.toString();
      final results = await Future.wait([
        _coursesService.getCourseUnits(courseKey),
        _reviewService.getReviews(
          courseId: course.id,
          page: _reviewsPage,
          perPage: _reviewsPerPage,
        ),
      ]);

      final units = unwrapAuditorList(results[0].data)
          .map(_AuditorUnitBlock.fromMap)
          .toList(growable: false);
      final reviewRows = unwrapAuditorList(results[1].data)
          .map(_CourseReviewRecord.fromMap)
          .toList(growable: false);
      final reviewsPagination = auditorPaginationOf(results[1].data);

      _AuditorLesson? lesson;
      final allLessons = units.expand((unit) => unit.lessons);
      for (final item in allLessons) {
        if (item.id == previousLessonId) {
          lesson = item;
          break;
        }
      }
      lesson ??= allLessons.isNotEmpty ? allLessons.first : null;

      if (!mounted) return;
      setState(() {
        _units = units;
        _reviews = reviewRows;
        _selectedLesson = lesson;
        _reviewsTotalPages = auditorInt(
          reviewsPagination['total_pages'],
          fallback: 1,
        ).clamp(1, 9999);
        _detailsLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _units = const [];
        _reviews = const [];
        _selectedLesson = null;
        _detailsLoading = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _loadReviewsPage(int page) async {
    final course = _selectedCourse;
    if (course == null || page < 1 || page > _reviewsTotalPages) return;

    setState(() {
      _detailsLoading = true;
      _reviewsPage = page;
    });

    try {
      final response = await _reviewService.getReviews(
        courseId: course.id,
        page: page,
        perPage: _reviewsPerPage,
      );
      final reviews = unwrapAuditorList(response.data)
          .map(_CourseReviewRecord.fromMap)
          .toList(growable: false);
      final pagination = auditorPaginationOf(response.data);

      if (!mounted) return;
      setState(() {
        _reviews = reviews;
        _reviewsTotalPages =
            auditorInt(pagination['total_pages'], fallback: 1).clamp(1, 9999);
        _detailsLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _detailsLoading = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _submitReview() async {
    final course = _selectedCourse;
    if (course == null || _submitting) return;
    final lang = localeNotifier.value.languageCode;

    setState(() => _submitting = true);
    try {
      await _reviewService.submitLessonReview(
        courseId: course.id,
        lessonId: _selectedLesson?.id,
        verdict: _verdict,
        notes: _notesController.text.trim(),
      );
      _notesController.clear();
      await _loadReviewsPage(1);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: auditorText('review_sent', lang),
        type: AfaqToastType.success,
      );
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return AuditorPageScaffold(
      title: auditorText('courses', lang),
      subtitle: auditorText('courses_subtitle', lang),
      onRefresh: () => _load(preserveSelection: true),
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _courses.isEmpty
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : Column(
                  children: [
                    _CourseSummaryHero(
                      coursesCount: _courses.length,
                      unitsCount: _units.length,
                      lessonsCount: _units.fold<int>(
                        0,
                        (sum, unit) => sum + unit.lessons.length,
                      ),
                      selectedCourse: _selectedCourse,
                    ),
                    const SizedBox(height: 18),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final stacked = constraints.maxWidth < 1100;
                        if (stacked) {
                          return Column(
                            children: [
                              _CourseQueuePanel(
                                courses: _courses,
                                selectedCourse: _selectedCourse,
                                statusFilter: _statusFilter,
                                currentPage: _coursesPage,
                                totalPages: _coursesTotalPages,
                                onStatusChanged: (value) {
                                  setState(() {
                                    _statusFilter = value;
                                    _coursesPage = 1;
                                  });
                                  _load();
                                },
                                onPreviousPage: _coursesPage > 1
                                    ? () {
                                        setState(() => _coursesPage -= 1);
                                        _load(preserveSelection: true);
                                      }
                                    : null,
                                onNextPage: _coursesPage < _coursesTotalPages
                                    ? () {
                                        setState(() => _coursesPage += 1);
                                        _load(preserveSelection: true);
                                      }
                                    : null,
                                onSelect: (course) => _selectCourse(course),
                              ),
                              const SizedBox(height: 16),
                              _ReviewWorkspacePanel(
                                course: _selectedCourse,
                                units: _units,
                                selectedLesson: _selectedLesson,
                                verdict: _verdict,
                                notesController: _notesController,
                                submitting: _submitting,
                                detailsLoading: _detailsLoading,
                                reviews: _reviews,
                                reviewsPage: _reviewsPage,
                                reviewsTotalPages: _reviewsTotalPages,
                                onLessonSelected: (lesson) =>
                                    setState(() => _selectedLesson = lesson),
                                onVerdictSelected: (verdict) =>
                                    setState(() => _verdict = verdict),
                                onSubmit: _submitReview,
                                onPreviousReviews: _reviewsPage > 1
                                    ? () => _loadReviewsPage(_reviewsPage - 1)
                                    : null,
                                onNextReviews: _reviewsPage < _reviewsTotalPages
                                    ? () => _loadReviewsPage(_reviewsPage + 1)
                                    : null,
                              ),
                            ],
                          );
                        }

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 2,
                              child: _CourseQueuePanel(
                                courses: _courses,
                                selectedCourse: _selectedCourse,
                                statusFilter: _statusFilter,
                                currentPage: _coursesPage,
                                totalPages: _coursesTotalPages,
                                onStatusChanged: (value) {
                                  setState(() {
                                    _statusFilter = value;
                                    _coursesPage = 1;
                                  });
                                  _load();
                                },
                                onPreviousPage: _coursesPage > 1
                                    ? () {
                                        setState(() => _coursesPage -= 1);
                                        _load(preserveSelection: true);
                                      }
                                    : null,
                                onNextPage: _coursesPage < _coursesTotalPages
                                    ? () {
                                        setState(() => _coursesPage += 1);
                                        _load(preserveSelection: true);
                                      }
                                    : null,
                                onSelect: (course) => _selectCourse(course),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              flex: 3,
                              child: _ReviewWorkspacePanel(
                                course: _selectedCourse,
                                units: _units,
                                selectedLesson: _selectedLesson,
                                verdict: _verdict,
                                notesController: _notesController,
                                submitting: _submitting,
                                detailsLoading: _detailsLoading,
                                reviews: _reviews,
                                reviewsPage: _reviewsPage,
                                reviewsTotalPages: _reviewsTotalPages,
                                onLessonSelected: (lesson) =>
                                    setState(() => _selectedLesson = lesson),
                                onVerdictSelected: (verdict) =>
                                    setState(() => _verdict = verdict),
                                onSubmit: _submitReview,
                                onPreviousReviews: _reviewsPage > 1
                                    ? () => _loadReviewsPage(_reviewsPage - 1)
                                    : null,
                                onNextReviews: _reviewsPage < _reviewsTotalPages
                                    ? () => _loadReviewsPage(_reviewsPage + 1)
                                    : null,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
    );
  }
}

class _AuditorCourse {
  const _AuditorCourse({
    required this.id,
    required this.slug,
    required this.title,
    required this.status,
    required this.description,
  });

  final int id;
  final String slug;
  final String title;
  final String status;
  final String description;

  factory _AuditorCourse.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _AuditorCourse(
      id: auditorInt(map['id']),
      slug: auditorString(map['slug']),
      title: auditorTextOf(
        map['title_translations'] ?? map['title'],
        fallback: auditorText('course_label', lang),
      ),
      status: auditorStatus(map['status']),
      description: auditorTextOf(
        map['description_translations'] ?? map['description'],
        fallback: auditorText('queue_empty_hint', lang),
      ),
    );
  }
}

class _AuditorUnitBlock {
  const _AuditorUnitBlock({
    required this.id,
    required this.title,
    required this.lessons,
  });

  final int id;
  final String title;
  final List<_AuditorLesson> lessons;

  factory _AuditorUnitBlock.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    final unitTitle = auditorTextOf(
      map['title_translations'] ?? map['title'],
      fallback: auditorText('unit_label', lang),
    );
    return _AuditorUnitBlock(
      id: auditorInt(map['id']),
      title: unitTitle,
      lessons: auditorList(map['lessons'])
          .map((lesson) => _AuditorLesson.fromMap(lesson, unitTitle))
          .toList(growable: false),
    );
  }
}

class _AuditorLesson {
  const _AuditorLesson({
    required this.id,
    required this.title,
    required this.unitTitle,
  });

  final int id;
  final String title;
  final String unitTitle;

  factory _AuditorLesson.fromMap(Map<String, dynamic> map, String unitTitle) {
    final lang = localeNotifier.value.languageCode;
    return _AuditorLesson(
      id: auditorInt(map['id']),
      title: auditorTextOf(
        map['title_translations'] ?? map['title'],
        fallback: auditorFormatText(
          'lesson_label',
          lang,
          values: {'id': '${auditorInt(map['id'])}'},
        ),
      ),
      unitTitle: unitTitle,
    );
  }
}

class _CourseReviewRecord {
  const _CourseReviewRecord({
    required this.id,
    required this.lessonId,
    required this.verdict,
    required this.notes,
    required this.createdAt,
    required this.auditorName,
  });

  final int id;
  final int lessonId;
  final String verdict;
  final String notes;
  final String createdAt;
  final String auditorName;

  factory _CourseReviewRecord.fromMap(Map<String, dynamic> map) {
    final auditor = auditorMap(map['auditor']);
    final lang = localeNotifier.value.languageCode;
    return _CourseReviewRecord(
      id: auditorInt(map['id']),
      lessonId: auditorInt(map['lesson_id']),
      verdict: auditorString(map['verdict']),
      notes: auditorString(map['notes']),
      createdAt: auditorFormatDateTime(map['created_at']).isNotEmpty
          ? auditorFormatDateTime(map['created_at'])
          : auditorString(map['created_at']),
      auditorName: auditorString(
        auditor?['name'],
        fallback: auditorText('auditor', lang),
      ),
    );
  }
}

class _CourseSummaryHero extends StatelessWidget {
  const _CourseSummaryHero({
    required this.coursesCount,
    required this.unitsCount,
    required this.lessonsCount,
    required this.selectedCourse,
  });

  final int coursesCount;
  final int unitsCount;
  final int lessonsCount;
  final _AuditorCourse? selectedCourse;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF111827), Color(0xFF1D4ED8), Color(0xFF0F766E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            auditorText('workspace', lang),
            style: const TextStyle(
              color: Color(0xFFBFDBFE),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            selectedCourse?.title ?? auditorText('pick_course', lang),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _HeroChip(
                label: auditorText('review_courses', lang),
                value: '$coursesCount',
              ),
              _HeroChip(
                label: auditorText('units', lang),
                value: '$unitsCount',
              ),
              _HeroChip(
                label: auditorText('lessons', lang),
                value: '$lessonsCount',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFDBEAFE),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _CourseQueuePanel extends StatelessWidget {
  const _CourseQueuePanel({
    required this.courses,
    required this.selectedCourse,
    required this.statusFilter,
    required this.currentPage,
    required this.totalPages,
    required this.onStatusChanged,
    required this.onPreviousPage,
    required this.onNextPage,
    required this.onSelect,
  });

  final List<_AuditorCourse> courses;
  final _AuditorCourse? selectedCourse;
  final String statusFilter;
  final int currentPage;
  final int totalPages;
  final ValueChanged<String> onStatusChanged;
  final VoidCallback? onPreviousPage;
  final VoidCallback? onNextPage;
  final ValueChanged<_AuditorCourse> onSelect;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final statuses = [
      auditorText('review', lang),
      auditorText('published', lang),
      auditorText('draft', lang),
      auditorText('all', lang),
    ];
    final values = ['review', 'published', 'draft', 'all'];

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            auditorText('queue', lang),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            value: statusFilter,
            items: List.generate(
              values.length,
              (index) => DropdownMenuItem<String>(
                value: values[index],
                child: Text(statuses[index]),
              ),
            ),
            onChanged: (value) {
              if (value != null) onStatusChanged(value);
            },
          ),
          const SizedBox(height: 16),
          if (courses.isEmpty)
            AuditorEmptyPanel(
              message: auditorText('no_courses', lang),
              icon: Icons.fact_check_outlined,
            )
          else
            for (final course in courses)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () => onSelect(course),
                  borderRadius: BorderRadius.circular(22),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: selectedCourse?.id == course.id
                          ? const Color(0xFF0F172A)
                          : AfaqColors.slate100.withValues(alpha: .6),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          course.title,
                          style: TextStyle(
                            color: selectedCourse?.id == course.id
                                ? Colors.white
                                : AfaqColors.foregroundLight,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 10),
                        AuditorStatusChip(
                          label: course.status,
                          tone: course.status.toLowerCase().contains('review')
                              ? AuditorStatusTone.warn
                              : AuditorStatusTone.info,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          const SizedBox(height: 8),
          AuditorPaginationBar(
            currentPage: currentPage,
            totalPages: totalPages,
            onPrevious: onPreviousPage,
            onNext: onNextPage,
          ),
        ],
      ),
    );
  }
}

class _ReviewWorkspacePanel extends StatelessWidget {
  const _ReviewWorkspacePanel({
    required this.course,
    required this.units,
    required this.selectedLesson,
    required this.verdict,
    required this.notesController,
    required this.submitting,
    required this.detailsLoading,
    required this.reviews,
    required this.reviewsPage,
    required this.reviewsTotalPages,
    required this.onLessonSelected,
    required this.onVerdictSelected,
    required this.onSubmit,
    required this.onPreviousReviews,
    required this.onNextReviews,
  });

  final _AuditorCourse? course;
  final List<_AuditorUnitBlock> units;
  final _AuditorLesson? selectedLesson;
  final AuditorReviewVerdict verdict;
  final TextEditingController notesController;
  final bool submitting;
  final bool detailsLoading;
  final List<_CourseReviewRecord> reviews;
  final int reviewsPage;
  final int reviewsTotalPages;
  final ValueChanged<_AuditorLesson?> onLessonSelected;
  final ValueChanged<AuditorReviewVerdict> onVerdictSelected;
  final Future<void> Function() onSubmit;
  final VoidCallback? onPreviousReviews;
  final VoidCallback? onNextReviews;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    if (course == null) {
      return AuditorEmptyPanel(
        message: auditorText('pick_course', lang),
        icon: Icons.fact_check_outlined,
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor =
        isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;
    final lessonSurface = isDark
        ? Colors.white.withValues(alpha: .06)
        : Colors.white.withValues(alpha: .88);

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            course!.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            course!.description,
            style: TextStyle(color: secondary, height: 1.4),
          ),
          const SizedBox(height: 18),
          if (detailsLoading) const LinearProgressIndicator(),
          Text(
            auditorText('lessons', lang),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
          ),
          const SizedBox(height: 12),
          if (units.isEmpty)
            Text(
              auditorText('no_lessons', lang),
              style: TextStyle(color: secondary),
            )
          else
            for (final unit in units)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: .05)
                        : AfaqColors.slate100.withValues(alpha: .5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        unit.title,
                        style: TextStyle(
                          color: titleColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      for (final lesson in unit.lessons)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: InkWell(
                            onTap: () => onLessonSelected(lesson),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: selectedLesson?.id == lesson.id
                                    ? AfaqColors.primary.withValues(alpha: .10)
                                    : lessonSurface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: selectedLesson?.id == lesson.id
                                      ? AfaqColors.primary.withValues(alpha: .28)
                                      : Colors.transparent,
                                ),
                              ),
                              child: Text(
                                lesson.title,
                                style: TextStyle(
                                  color: titleColor,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
          const SizedBox(height: 10),
          Text(
            auditorText('review_scope', lang),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _VerdictButton(
                label: auditorText('approved', lang),
                selected: verdict == AuditorReviewVerdict.approved,
                onTap: () => onVerdictSelected(AuditorReviewVerdict.approved),
              ),
              _VerdictButton(
                label: auditorText('changes_requested', lang),
                selected: verdict == AuditorReviewVerdict.changesRequested,
                onTap: () =>
                    onVerdictSelected(AuditorReviewVerdict.changesRequested),
              ),
              _VerdictButton(
                label: auditorText('follow_up', lang),
                selected: verdict == AuditorReviewVerdict.followUp,
                onTap: () => onVerdictSelected(AuditorReviewVerdict.followUp),
              ),
            ],
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<int>(
            value: selectedLesson?.id ?? 0,
            hint: Text(auditorText('all_course_review', lang)),
            items: [
              DropdownMenuItem<int>(
                value: 0,
                child: Text(auditorText('all_course_review', lang)),
              ),
              ...units.expand(
                (unit) => unit.lessons.map(
                  (lesson) => DropdownMenuItem<int>(
                    value: lesson.id,
                    child: Text('${unit.title} - ${lesson.title}'),
                  ),
                ),
              ),
            ],
            onChanged: (value) {
              if (value == null || value == 0) {
                onLessonSelected(null);
                return;
              }
              for (final lesson in units.expand((unit) => unit.lessons)) {
                if (lesson.id == value) {
                  onLessonSelected(lesson);
                  break;
                }
              }
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: notesController,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: auditorText('review_notes', lang),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: submitting ? null : onSubmit,
            icon: submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_outlined),
            label: Text(auditorText('send_review', lang)),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Text(
                  auditorText('history', lang),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              AuditorPaginationBar(
                currentPage: reviewsPage,
                totalPages: reviewsTotalPages,
                onPrevious: onPreviousReviews,
                onNext: onNextReviews,
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (reviews.isEmpty)
            Text(
              auditorText('no_reviews', lang),
              style: TextStyle(color: secondary),
            )
          else
            for (final review in reviews)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: .05)
                        : AfaqColors.slate100.withValues(alpha: .55),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          AuditorStatusChip(
                            label: auditorStatus(review.verdict),
                            tone: review.verdict == 'approved'
                                ? AuditorStatusTone.good
                                : review.verdict == 'changes_requested'
                                    ? AuditorStatusTone.warn
                                    : AuditorStatusTone.info,
                          ),
                          if (review.lessonId != 0)
                            AuditorStatusChip(
                              label: auditorFormatText(
                                'lesson_label',
                                lang,
                                values: {'id': '${review.lessonId}'},
                              ),
                              tone: AuditorStatusTone.neutral,
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        review.notes.isEmpty
                            ? auditorText('review_recorded', lang)
                            : review.notes,
                        style: TextStyle(color: titleColor, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${review.auditorName} • ${review.createdAt}',
                        style: TextStyle(color: secondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _VerdictButton extends StatelessWidget {
  const _VerdictButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        backgroundColor: selected ? AfaqColors.primary.withValues(alpha: .10) : null,
      ),
      child: Text(label),
    );
  }
}
