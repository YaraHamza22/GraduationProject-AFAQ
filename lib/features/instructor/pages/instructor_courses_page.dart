import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_courses_service.dart';
import '../data/instructor_lessons_service.dart';
import '../data/instructor_profile_service.dart';
import 'instructor_page_shared.dart';

class InstructorCoursesPage extends StatefulWidget {
  const InstructorCoursesPage({super.key});

  @override
  State<InstructorCoursesPage> createState() => _InstructorCoursesPageState();
}

class _InstructorCoursesPageState extends State<InstructorCoursesPage> {
  final _coursesService = const InstructorCoursesService();
  final _lessonsService = const InstructorLessonsService();
  final _profileService = const InstructorProfileService();

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
  final _unitTitleController = TextEditingController();
  final _lessonTitleController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _unitTitleController.dispose();
    _lessonTitleController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _selectedCourse = null;
      _selectedUnit = null;
      _units = const [];
      _lessons = const [];
    });

    try {
      final profileResponse = await _profileService.getProfile();
      final profile = instructorMap(profileResponse.data) ?? const <String, dynamic>{};
      final instructorId = instructorInt(
        profile['id'] ?? profile['user_id'] ?? profile['instructor_id'],
      );

      final response = instructorId > 0
          ? await _coursesService.getAssignedCourses(instructorId)
          : await _coursesService.getMyCourses();
      if (!mounted) return;
      setState(() {
        _courses = unwrapInstructorList(response.data)
            .map(_InstructorCourseItem.fromMap)
            .toList(growable: false);
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

  Future<void> _selectCourse(_InstructorCourseItem course) async {
    setState(() {
      _selectedCourse = course;
      _selectedUnit = null;
      _unitsLoading = true;
      _lessons = const [];
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
      final response = await _lessonsService.getLessons(courseId: course.id, unitId: unit.id);
      if (!mounted) return;
      setState(() {
        _lessons = unwrapInstructorList(response.data)
            .map(_InstructorLessonItem.fromMap)
            .toList(growable: false);
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
    if (course == null || title.isEmpty) return;

    setState(() => _submitting = true);
    try {
      await _coursesService.createUnit(
        courseId: course.id,
        body: {
          'title': title,
          'title_translations': {
            'en': title,
            'ar': title,
          },
          'description': '',
          'description_translations': {
            'en': '',
            'ar': '',
          },
          'unit_order': _units.length + 1,
          'actual_duration_minutes': 0,
        },
      );
      _unitTitleController.clear();
      await _selectCourse(course);
      if (!mounted) return;
      AfaqToast.show(context, message: 'Unit created.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _deleteUnit(_InstructorUnitItem unit) async {
    final course = _selectedCourse;
    if (course == null) return;
    try {
      await _coursesService.deleteUnit(courseId: course.id, unitId: unit.id);
      if (_selectedUnit?.id == unit.id) {
        setState(() {
          _selectedUnit = null;
          _lessons = const [];
        });
      }
      await _selectCourse(course);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    }
  }

  Future<void> _createLesson() async {
    final course = _selectedCourse;
    final unit = _selectedUnit;
    final title = _lessonTitleController.text.trim();
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
          'title_translations': {
            'en': title,
            'ar': title,
          },
          'description': '',
          'description_translations': {
            'en': '',
            'ar': '',
          },
          'lesson_order': _lessons.length + 1,
          'lesson_type': 'lecture',
          'is_required': true,
          'actual_duration_minutes': 0,
        },
      );
      _lessonTitleController.clear();
      await _selectUnit(unit);
      if (!mounted) return;
      AfaqToast.show(context, message: 'Lesson created.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _deleteLesson(_InstructorLessonItem lesson) async {
    final course = _selectedCourse;
    final unit = _selectedUnit;
    if (course == null || unit == null) return;
    try {
      await _lessonsService.deleteLesson(
        courseId: course.id,
        unitId: unit.id,
        lessonId: lesson.id,
      );
      await _selectUnit(unit);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
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
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final stacked = constraints.maxWidth < 1100;
                    if (stacked) {
                      return Column(
                        children: [
                          _CoursesListPanel(
                            courses: _courses,
                            selectedCourse: _selectedCourse,
                            onSelect: _selectCourse,
                          ),
                          const SizedBox(height: 16),
                          _UnitsLessonsPanel(
                            selectedCourse: _selectedCourse,
                            units: _units,
                            lessons: _lessons,
                            selectedUnit: _selectedUnit,
                            unitsLoading: _unitsLoading,
                            lessonsLoading: _lessonsLoading,
                            unitTitleController: _unitTitleController,
                            lessonTitleController: _lessonTitleController,
                            submitting: _submitting,
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
                          child: _CoursesListPanel(
                            courses: _courses,
                            selectedCourse: _selectedCourse,
                            onSelect: _selectCourse,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          flex: 3,
                          child: _UnitsLessonsPanel(
                            selectedCourse: _selectedCourse,
                            units: _units,
                            lessons: _lessons,
                            selectedUnit: _selectedUnit,
                            unitsLoading: _unitsLoading,
                            lessonsLoading: _lessonsLoading,
                            unitTitleController: _unitTitleController,
                            lessonTitleController: _lessonTitleController,
                            submitting: _submitting,
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
    );
  }
}

class _InstructorCourseItem {
  const _InstructorCourseItem({
    required this.id,
    required this.title,
    required this.status,
  });

  final int id;
  final String title;
  final String status;

  factory _InstructorCourseItem.fromMap(Map<String, dynamic> map) {
    return _InstructorCourseItem(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Untitled Course'),
      ),
      status: instructorString(map['status'], fallback: 'draft'),
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
    return _InstructorUnitItem(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'] ?? map['title'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Unit'),
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
    return _InstructorLessonItem(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Lesson'),
      ),
      type: instructorString(map['lesson_type'], fallback: 'lecture'),
    );
  }
}

class _CoursesListPanel extends StatelessWidget {
  const _CoursesListPanel({
    required this.courses,
    required this.selectedCourse,
    required this.onSelect,
  });

  final List<_InstructorCourseItem> courses;
  final _InstructorCourseItem? selectedCourse;
  final ValueChanged<_InstructorCourseItem> onSelect;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Courses',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          if (courses.isEmpty)
            const Text('No courses found.')
          else
            for (final course in courses)
              InkWell(
                onTap: () => onSelect(course),
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: selectedCourse?.id == course.id
                        ? AfaqColors.primary.withValues(alpha: .12)
                        : AfaqColors.slate100.withValues(alpha: .55),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(course.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text(course.status, style: const TextStyle(color: AfaqColors.slate500)),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _UnitsLessonsPanel extends StatelessWidget {
  const _UnitsLessonsPanel({
    required this.selectedCourse,
    required this.units,
    required this.lessons,
    required this.selectedUnit,
    required this.unitsLoading,
    required this.lessonsLoading,
    required this.unitTitleController,
    required this.lessonTitleController,
    required this.submitting,
    required this.onCreateUnit,
    required this.onDeleteUnit,
    required this.onSelectUnit,
    required this.onCreateLesson,
    required this.onDeleteLesson,
  });

  final _InstructorCourseItem? selectedCourse;
  final List<_InstructorUnitItem> units;
  final List<_InstructorLessonItem> lessons;
  final _InstructorUnitItem? selectedUnit;
  final bool unitsLoading;
  final bool lessonsLoading;
  final TextEditingController unitTitleController;
  final TextEditingController lessonTitleController;
  final bool submitting;
  final Future<void> Function() onCreateUnit;
  final Future<void> Function(_InstructorUnitItem unit) onDeleteUnit;
  final ValueChanged<_InstructorUnitItem> onSelectUnit;
  final Future<void> Function() onCreateLesson;
  final Future<void> Function(_InstructorLessonItem lesson) onDeleteLesson;

  @override
  Widget build(BuildContext context) {
    if (selectedCourse == null) {
      return const InstructorEmptyPanel(
        message: 'Select a course to load units and lessons.',
        icon: Icons.menu_book_outlined,
      );
    }

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            selectedCourse!.title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: unitTitleController,
            decoration: InputDecoration(
              hintText: 'New unit title',
              suffixIcon: IconButton(
                onPressed: submitting ? null : () => onCreateUnit(),
                icon: submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Units',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          if (unitsLoading)
            const Center(child: CircularProgressIndicator())
          else if (units.isEmpty)
            const Text('No units yet.')
          else
            for (final unit in units)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: selectedUnit?.id == unit.id
                      ? AfaqColors.secondary.withValues(alpha: .12)
                      : AfaqColors.slate100.withValues(alpha: .55),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => onSelectUnit(unit),
                        child: Text(unit.title),
                      ),
                    ),
                    IconButton(
                      onPressed: () => onDeleteUnit(unit),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ],
                ),
              ),
          const SizedBox(height: 16),
          if (selectedUnit != null) ...[
            TextField(
              controller: lessonTitleController,
              decoration: InputDecoration(
                hintText: 'New lesson title',
                suffixIcon: IconButton(
                  onPressed: submitting ? null : () => onCreateLesson(),
                  icon: const Icon(Icons.add),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Lessons',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 12),
            if (lessonsLoading)
              const Center(child: CircularProgressIndicator())
            else if (lessons.isEmpty)
              const Text('No lessons in this unit.')
            else
              for (final lesson in lessons)
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AfaqColors.slate100.withValues(alpha: .55),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(lesson.title),
                            const SizedBox(height: 4),
                            Text(lesson.type, style: const TextStyle(color: AfaqColors.slate500)),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => onDeleteLesson(lesson),
                        icon: const Icon(Icons.delete_outline),
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
