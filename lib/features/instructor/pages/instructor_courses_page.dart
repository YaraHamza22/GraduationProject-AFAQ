import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/session/session_store.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_courses_service.dart';
import '../data/instructor_lessons_service.dart';
import 'instructor_page_shared.dart';

class InstructorCoursesPage extends StatefulWidget {
  const InstructorCoursesPage({super.key});

  @override
  State<InstructorCoursesPage> createState() => _InstructorCoursesPageState();
}

class _InstructorCoursesPageState extends State<InstructorCoursesPage> {
  final _coursesService = const InstructorCoursesService();
  final _lessonsService = const InstructorLessonsService();

  bool _loading = true;
  bool _unitsLoading = false;
  bool _lessonsLoading = false;
  bool _submitting = false;
  String? _error;

  List<_InstructorCourseItem> _courses = const [];
  List<_InstructorUnitItem> _units = const [];
  List<_InstructorLessonItem> _lessons = const [];
  _InstructorCourseItem? _selectedCourse;
  _InstructorUnitItem? _selectedUnit;
  int _lessonsCount = 0;

  final _unitTitleController = TextEditingController();
  final _lessonTitleController = TextEditingController();
  late String _lastLocaleCode;

  int get _currentInstructorId => SessionStore.instance.userId ?? 0;

  @override
  void initState() {
    super.initState();
    _lastLocaleCode = localeNotifier.value.languageCode;
    localeNotifier.addListener(_handleLocaleChanged);
    _load();
  }

  @override
  void dispose() {
    localeNotifier.removeListener(_handleLocaleChanged);
    _unitTitleController.dispose();
    _lessonTitleController.dispose();
    super.dispose();
  }

  void _handleLocaleChanged() {
    final nextLocale = localeNotifier.value.languageCode;
    if (nextLocale == _lastLocaleCode) return;
    _lastLocaleCode = nextLocale;
    _reloadForLocaleChange();
  }

  bool _isMyCourse(Map<String, dynamic> map) {
    if (_currentInstructorId == 0) return true;

    final creator = instructorMap(map['creator']);
    if (instructorInt(creator?['id']) == _currentInstructorId) {
      return true;
    }

    final instructors = instructorList(map['instructors']);
    return instructors.any(
      (item) => instructorInt(item['id']) == _currentInstructorId,
    );
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _selectedCourse = null;
      _selectedUnit = null;
      _units = const [];
      _lessons = const [];
      _lessonsCount = 0;
    });

    try {
      final response = await _coursesService.getMyCourses();
      final courses = unwrapInstructorList(response.data)
          .where(_isMyCourse)
          .map(_InstructorCourseItem.fromMap)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _courses = courses;
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

  Future<void> _reloadForLocaleChange() async {
    final selectedCourseId = _selectedCourse?.id;
    final selectedUnitId = _selectedUnit?.id;
    await _load();

    _InstructorCourseItem? course;
    for (final item in _courses) {
      if (item.id == selectedCourseId) {
        course = item;
        break;
      }
    }
    if (course == null || !mounted) return;

    await _selectCourse(course);

    _InstructorUnitItem? unit;
    for (final item in _units) {
      if (item.id == selectedUnitId) {
        unit = item;
        break;
      }
    }
    if (unit == null || !mounted) return;
    await _selectUnit(unit);
  }

  Future<void> _selectCourse(_InstructorCourseItem course) async {
    setState(() {
      _selectedCourse = course;
      _selectedUnit = null;
      _unitsLoading = true;
      _lessonsLoading = false;
      _units = const [];
      _lessons = const [];
      _lessonsCount = 0;
      _error = null;
    });

    try {
      final response = await _coursesService.getUnits(course.id);
      if (!mounted) return;
      setState(() {
        _units = unwrapInstructorList(response.data)
            .map(_InstructorUnitItem.fromMap)
            .toList(growable: false);
        _unitsLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _unitsLoading = false;
      });
    }
  }

  Future<void> _selectUnit(_InstructorUnitItem unit) async {
    final course = _selectedCourse;
    if (course == null) return;

    setState(() {
      _selectedUnit = unit;
      _lessonsLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _lessonsService.getLessons(courseId: course.id, unitId: unit.id),
        _lessonsService.getLessonsCount(courseId: course.id, unitId: unit.id),
      ]);

      if (!mounted) return;
      setState(() {
        _lessons = unwrapInstructorList(results[0].data)
            .map(_InstructorLessonItem.fromMap)
            .toList(growable: false);
        _lessonsCount = instructorInt(
          unwrapInstructorMap(results[1].data)['lessons_count'],
          fallback: _lessons.length,
        );
        _lessonsLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _lessonsLoading = false;
      });
    }
  }

  Future<void> _createUnit() async {
    final course = _selectedCourse;
    final title = _unitTitleController.text.trim();
    final lang = localeNotifier.value.languageCode;
    if (course == null || title.isEmpty) return;

    setState(() => _submitting = true);
    try {
      await _coursesService.createUnit(
        courseId: course.id,
        body: {
          'title': title,
          'title_translations': {'en': title, 'ar': title},
          'description': '',
          'description_translations': {'en': '', 'ar': ''},
          'unit_order': _units.length + 1,
          'actual_duration_minutes': 0,
        },
      );
      _unitTitleController.clear();
      await _selectCourse(course);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: instructorText('unit_created', lang),
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

  Future<void> _deleteUnit(_InstructorUnitItem unit) async {
    final course = _selectedCourse;
    final lang = localeNotifier.value.languageCode;
    if (course == null) return;

    try {
      await _coursesService.deleteUnit(courseId: course.id, unitId: unit.id);
      if (_selectedUnit?.id == unit.id) {
        setState(() {
          _selectedUnit = null;
          _lessons = const [];
          _lessonsCount = 0;
        });
      }
      await _selectCourse(course);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: instructorText('unit_deleted', lang),
        type: AfaqToastType.success,
      );
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    }
  }

  Future<void> _createLesson() async {
    final course = _selectedCourse;
    final unit = _selectedUnit;
    final title = _lessonTitleController.text.trim();
    final lang = localeNotifier.value.languageCode;
    if (course == null || unit == null || title.isEmpty) return;

    setState(() => _submitting = true);
    try {
      await _lessonsService.createLesson(
        courseId: course.id,
        unitId: unit.id,
        body: {
          'course_id': course.id,
          'unit_id': unit.id,
          'title': title,
          'title_translations': {'en': title, 'ar': title},
          'description': '',
          'description_translations': {'en': '', 'ar': ''},
          'lesson_order': _lessons.length + 1,
          'lesson_type': 'lecture',
          'is_required': true,
          'actual_duration_minutes': 0,
        },
      );
      _lessonTitleController.clear();
      await _selectUnit(unit);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: instructorText('lesson_created', lang),
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

  Future<void> _deleteLesson(_InstructorLessonItem lesson) async {
    final course = _selectedCourse;
    final unit = _selectedUnit;
    final lang = localeNotifier.value.languageCode;
    if (course == null || unit == null) return;

    try {
      await _lessonsService.deleteLesson(
        courseId: course.id,
        unitId: unit.id,
        lessonId: lesson.id,
      );
      await _selectUnit(unit);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: instructorText('lesson_deleted', lang),
        type: AfaqToastType.success,
      );
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

    return InstructorPageScaffold(
      title: instructorText('courses', lang),
      subtitle: instructorText('courses_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? InstructorErrorPanel(message: _error!, onRetry: _load)
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _InstructorCoursesHero(
                      lang: lang,
                      coursesCount: _courses.length,
                      unitsCount: _units.length,
                      lessonsCount: _lessonsCount,
                      selectedCourseTitle: _selectedCourse?.title,
                    ),
                    const SizedBox(height: 20),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final stacked = constraints.maxWidth < 1120;
                        if (stacked) {
                          return Column(
                            children: [
                              _CoursesRail(
                                lang: lang,
                                courses: _courses,
                                selectedCourse: _selectedCourse,
                                onSelect: _selectCourse,
                              ),
                              const SizedBox(height: 16),
                              _CourseBuilderPanel(
                                lang: lang,
                                selectedCourse: _selectedCourse,
                                units: _units,
                                lessons: _lessons,
                                selectedUnit: _selectedUnit,
                                unitsLoading: _unitsLoading,
                                lessonsLoading: _lessonsLoading,
                                unitTitleController: _unitTitleController,
                                lessonTitleController: _lessonTitleController,
                                submitting: _submitting,
                                lessonsCount: _lessonsCount,
                                onCreateUnit: _createUnit,
                                onDeleteUnit: _deleteUnit,
                                onSelectUnit: _selectUnit,
                                onCreateLesson: _createLesson,
                                onDeleteLesson: _deleteLesson,
                              ),
                            ],
                          );
                        }

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 2,
                              child: _CoursesRail(
                                lang: lang,
                                courses: _courses,
                                selectedCourse: _selectedCourse,
                                onSelect: _selectCourse,
                              ),
                            ),
                            const SizedBox(width: 18),
                            Expanded(
                              flex: 3,
                              child: _CourseBuilderPanel(
                                lang: lang,
                                selectedCourse: _selectedCourse,
                                units: _units,
                                lessons: _lessons,
                                selectedUnit: _selectedUnit,
                                unitsLoading: _unitsLoading,
                                lessonsLoading: _lessonsLoading,
                                unitTitleController: _unitTitleController,
                                lessonTitleController: _lessonTitleController,
                                submitting: _submitting,
                                lessonsCount: _lessonsCount,
                                onCreateUnit: _createUnit,
                                onDeleteUnit: _deleteUnit,
                                onSelectUnit: _selectUnit,
                                onCreateLesson: _createLesson,
                                onDeleteLesson: _deleteLesson,
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

class _InstructorCourseItem {
  const _InstructorCourseItem({
    required this.id,
    required this.title,
    required this.status,
    required this.durationHours,
    required this.unitsCount,
  });

  final int id;
  final String title;
  final String status;
  final int durationHours;
  final int unitsCount;

  factory _InstructorCourseItem.fromMap(Map<String, dynamic> map) {
    final units = instructorList(map['units']);
    final lang = localeNotifier.value.languageCode;
    return _InstructorCourseItem(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        lang,
        fallback: instructorString(
          map['title'],
          fallback: instructorText('untitled_course', lang),
        ),
      ),
      status: instructorString(map['status'], fallback: 'draft'),
      durationHours: instructorInt(map['actual_duration_hours']),
      unitsCount: units.isNotEmpty
          ? units.length
          : instructorInt(map['units_count']),
    );
  }
}

class _InstructorUnitItem {
  const _InstructorUnitItem({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;

  factory _InstructorUnitItem.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _InstructorUnitItem(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'] ?? map['title'],
        lang,
        fallback: instructorString(
          map['title'],
          fallback: instructorText('unit_fallback', lang),
        ),
      ),
    );
  }
}

class _InstructorLessonItem {
  const _InstructorLessonItem({
    required this.id,
    required this.title,
    required this.type,
  });

  final int id;
  final String title;
  final String type;

  factory _InstructorLessonItem.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _InstructorLessonItem(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        lang,
        fallback: instructorString(
          map['title'],
          fallback: instructorText('lesson_fallback', lang),
        ),
      ),
      type: instructorString(map['lesson_type'], fallback: 'lecture'),
    );
  }
}

class _InstructorCoursesHero extends StatelessWidget {
  const _InstructorCoursesHero({
    required this.lang,
    required this.coursesCount,
    required this.unitsCount,
    required this.lessonsCount,
    required this.selectedCourseTitle,
  });

  final String lang;
  final int coursesCount;
  final int unitsCount;
  final int lessonsCount;
  final String? selectedCourseTitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E293B),
            Color(0xFF0F766E),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(34),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .14),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.auto_stories_rounded,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      instructorText('workspace', lang),
                      style: const TextStyle(
                        color: Color(0xFFA7F3D0),
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: .9,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      selectedCourseTitle ??
                          instructorText('workspace_subtitle', lang),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _HeroMetric(
                label: instructorText('courses_metric', lang),
                value: '$coursesCount',
              ),
              _HeroMetric(
                label: instructorText('units_metric', lang),
                value: '$unitsCount',
              ),
              _HeroMetric(
                label: instructorText('lessons_metric', lang),
                value: '$lessonsCount',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: .10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFBFDBFE),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _CoursesRail extends StatelessWidget {
  const _CoursesRail({
    required this.lang,
    required this.courses,
    required this.selectedCourse,
    required this.onSelect,
  });

  final String lang;
  final List<_InstructorCourseItem> courses;
  final _InstructorCourseItem? selectedCourse;
  final ValueChanged<_InstructorCourseItem> onSelect;

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
            instructorText('assigned_courses_title', lang),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            instructorText('assigned_courses_subtitle', lang),
            style: TextStyle(
              color: secondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 18),
          if (courses.isEmpty)
            Text(
              instructorText('no_instructor_courses', lang),
              style: TextStyle(color: secondary),
            )
          else
            for (final course in courses)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                  child: _CourseSpotlightCard(
                    lang: lang,
                    course: course,
                    active: selectedCourse?.id == course.id,
                    onTap: () => onSelect(course),
                ),
              ),
        ],
      ),
    );
  }
}

class _CourseSpotlightCard extends StatelessWidget {
  const _CourseSpotlightCard({
    required this.lang,
    required this.course,
    required this.active,
    required this.onTap,
  });

  final String lang;
  final _InstructorCourseItem course;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(26),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: active
              ? const LinearGradient(
                  colors: [
                    Color(0xFFE0F2FE),
                    Color(0xFFECFDF5),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: active
              ? null
              : isDark
                  ? Colors.white.withValues(alpha: .05)
                  : AfaqColors.slate100.withValues(alpha: .65),
          borderRadius: BorderRadius.circular(26),
          border: Border.all(
            color: active
                ? const Color(0xFF67E8F9)
                : isDark
                    ? Colors.white.withValues(alpha: .08)
                    : AfaqColors.slate200,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    course.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: titleColor,
                        ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: active
                        ? const Color(0xFF0F172A).withValues(alpha: .08)
                        : AfaqColors.emerald500.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    instructorStatusText(course.status, lang),
                    style: const TextStyle(
                      color: AfaqColors.emerald600,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _CourseMetaPill(
                  icon: Icons.schedule_rounded,
                  label: instructorFormatText(
                    'hours_short',
                    lang,
                    values: {'count': '${course.durationHours}'},
                  ),
                ),
                _CourseMetaPill(
                  icon: Icons.layers_outlined,
                  label: instructorFormatText(
                    'units_short',
                    lang,
                    values: {'count': '${course.unitsCount}'},
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              active
                  ? instructorText('selected_for_editing', lang)
                  : instructorText('tap_to_manage', lang),
              style: TextStyle(
                color: secondary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CourseMetaPill extends StatelessWidget {
  const _CourseMetaPill({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .75),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AfaqColors.primary),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: AfaqColors.slate700,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _CourseBuilderPanel extends StatelessWidget {
  const _CourseBuilderPanel({
    required this.lang,
    required this.selectedCourse,
    required this.units,
    required this.lessons,
    required this.selectedUnit,
    required this.unitsLoading,
    required this.lessonsLoading,
    required this.unitTitleController,
    required this.lessonTitleController,
    required this.submitting,
    required this.lessonsCount,
    required this.onCreateUnit,
    required this.onDeleteUnit,
    required this.onSelectUnit,
    required this.onCreateLesson,
    required this.onDeleteLesson,
  });

  final String lang;
  final _InstructorCourseItem? selectedCourse;
  final List<_InstructorUnitItem> units;
  final List<_InstructorLessonItem> lessons;
  final _InstructorUnitItem? selectedUnit;
  final bool unitsLoading;
  final bool lessonsLoading;
  final TextEditingController unitTitleController;
  final TextEditingController lessonTitleController;
  final bool submitting;
  final int lessonsCount;
  final Future<void> Function() onCreateUnit;
  final Future<void> Function(_InstructorUnitItem unit) onDeleteUnit;
  final ValueChanged<_InstructorUnitItem> onSelectUnit;
  final Future<void> Function() onCreateLesson;
  final Future<void> Function(_InstructorLessonItem lesson) onDeleteLesson;

  @override
  Widget build(BuildContext context) {
    if (selectedCourse == null) {
      return InstructorEmptyPanel(
        message: instructorText('select_course_manage', lang),
        icon: Icons.auto_stories_outlined,
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;
    final surface = isDark
        ? Colors.white.withValues(alpha: .05)
        : const Color(0xFFF8FAFC);

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            selectedCourse!.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            instructorText('builder_subtitle', lang),
            style: TextStyle(
              color: secondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _EditorMetric(
                label: instructorText('units_metric', lang),
                value: '${units.length}',
              ),
              _EditorMetric(
                label: instructorText('lessons_metric', lang),
                value: '$lessonsCount',
              ),
              _EditorMetric(
                label: instructorText('status', lang),
                value: instructorStatusText(selectedCourse!.status, lang),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _QuickCreateField(
            controller: unitTitleController,
            hintText: instructorText('new_unit_hint', lang),
            buttonLabel: instructorText('add_unit', lang),
            busy: submitting,
            onSubmit: onCreateUnit,
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: surface,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: .08)
                    : AfaqColors.slate200,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  instructorText('units', lang),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: titleColor,
                      ),
                ),
                const SizedBox(height: 12),
                if (unitsLoading)
                  const Center(child: CircularProgressIndicator())
                else if (units.isEmpty)
                  Text(
                    instructorText('no_units', lang),
                    style: TextStyle(color: secondary),
                  )
                else
                  for (final unit in units)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _UnitRowCard(
                        unit: unit,
                        active: selectedUnit?.id == unit.id,
                        onTap: () => onSelectUnit(unit),
                        onDelete: () => onDeleteUnit(unit),
                      ),
                    ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (selectedUnit != null) ...[
            _QuickCreateField(
              controller: lessonTitleController,
              hintText: instructorText('new_lesson_hint', lang),
              buttonLabel: instructorText('add_lesson', lang),
              busy: submitting,
              onSubmit: onCreateLesson,
            ),
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: surface,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: .08)
                      : AfaqColors.slate200,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    instructorFormatText(
                      'lessons_in_unit',
                      lang,
                      values: {'unit': selectedUnit!.title},
                    ),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: titleColor,
                        ),
                  ),
                  const SizedBox(height: 12),
                  if (lessonsLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (lessons.isEmpty)
                    Text(
                      instructorText('no_lessons', lang),
                      style: TextStyle(color: secondary),
                    )
                  else
                    for (final lesson in lessons)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _LessonRowCard(
                          lang: lang,
                          lesson: lesson,
                          onDelete: () => onDeleteLesson(lesson),
                        ),
                      ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EditorMetric extends StatelessWidget {
  const _EditorMetric({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: .06) : AfaqColors.slate100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
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
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickCreateField extends StatelessWidget {
  const _QuickCreateField({
    required this.controller,
    required this.hintText,
    required this.buttonLabel,
    required this.busy,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final String hintText;
  final String buttonLabel;
  final bool busy;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            decoration: InputDecoration(
              hintText: hintText,
              filled: true,
              fillColor: Theme.of(context).brightness == Brightness.dark
                  ? Colors.white.withValues(alpha: .05)
                  : const Color(0xFFF8FAFC),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        FilledButton.icon(
          onPressed: busy ? null : () => onSubmit(),
          icon: busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.add_rounded),
          label: Text(buttonLabel),
        ),
      ],
    );
  }
}

class _UnitRowCard extends StatelessWidget {
  const _UnitRowCard({
    required this.unit,
    required this.active,
    required this.onTap,
    required this.onDelete,
  });

  final _InstructorUnitItem unit;
  final bool active;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: active
              ? AfaqColors.secondary.withValues(alpha: .16)
              : isDark
                  ? Colors.white.withValues(alpha: .05)
                  : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active
                ? AfaqColors.secondary.withValues(alpha: .45)
                : isDark
                    ? Colors.white.withValues(alpha: .08)
                    : AfaqColors.slate200,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                unit.title,
                style: TextStyle(
                  color: isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline_rounded),
            ),
          ],
        ),
      ),
    );
  }
}

class _LessonRowCard extends StatelessWidget {
  const _LessonRowCard({
    required this.lang,
    required this.lesson,
    required this.onDelete,
  });

  final String lang;
  final _InstructorLessonItem lesson;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: .05) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: .08)
              : AfaqColors.slate200,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  lesson.title,
                  style: TextStyle(
                    color: titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  instructorLessonTypeText(lesson.type, lang),
                  style: TextStyle(
                    color: secondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline_rounded),
          ),
        ],
      ),
    );
  }
}
