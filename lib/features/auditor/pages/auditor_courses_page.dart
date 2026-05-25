import 'package:flutter/material.dart';

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
  bool _submitting = false;
  String? _error;
  String _statusFilter = 'review';
  List<_AuditorCourse> _courses = const [];
  List<_AuditorLesson> _lessons = const [];
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

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _coursesService.getCourses(status: _statusFilter);
      final courses = unwrapAuditorList(response.data)
          .map(_AuditorCourse.fromMap)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _courses = courses;
        _selectedCourse = courses.isNotEmpty ? courses.first : null;
        _loading = false;
      });

      if (_selectedCourse != null) {
        await _selectCourse(_selectedCourse!);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _selectCourse(_AuditorCourse course) async {
    try {
      final courseKey = course.slug.isNotEmpty ? course.slug : course.id.toString();
      final response = await _coursesService.getCourseUnits(courseKey);
      final lessons = unwrapAuditorList(response.data)
          .expand((unit) {
            final unitTitle = auditorTextOf(unit['title'], fallback: 'Unit');
            return auditorList(unit['lessons']).map((lesson) => _AuditorLesson.fromMap(lesson, unitTitle));
          })
          .toList(growable: false);
      if (!mounted) return;
      setState(() {
        _selectedCourse = course;
        _lessons = lessons;
        _selectedLesson = lessons.isNotEmpty ? lessons.first : null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _selectedCourse = course;
        _lessons = const [];
        _selectedLesson = null;
        _error = error.toString();
      });
    }
  }

  Future<void> _submitReview() async {
    final course = _selectedCourse;
    final lesson = _selectedLesson;
    if (course == null || lesson == null || _submitting) return;

    setState(() => _submitting = true);
    try {
      await _reviewService.submitLessonReview(
        courseId: course.id,
        lessonId: lesson.id,
        verdict: _verdict,
        notes: _notesController.text.trim().isEmpty ? 'Reviewed by auditor.' : _notesController.text.trim(),
      );
      _notesController.clear();
      if (!mounted) return;
      AfaqToast.show(context, message: 'Content review submitted.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuditorPageScaffold(
      title: 'Content Review',
      subtitle: 'Review courses and submit lesson verdicts using the same API flow as web.',
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _courses.isEmpty
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final stacked = constraints.maxWidth < 1100;
                    if (stacked) {
                      return Column(
                        children: [
                          _CoursesList(
                            courses: _courses,
                            selectedCourse: _selectedCourse,
                            statusFilter: _statusFilter,
                            onStatusChanged: (value) {
                              setState(() => _statusFilter = value);
                              _load();
                            },
                            onSelect: _selectCourse,
                          ),
                          const SizedBox(height: 16),
                          _CourseReviewPanel(
                            course: _selectedCourse,
                            lessons: _lessons,
                            selectedLesson: _selectedLesson,
                            notesController: _notesController,
                            verdict: _verdict,
                            submitting: _submitting,
                            onLessonSelected: (lesson) => setState(() => _selectedLesson = lesson),
                            onVerdictSelected: (verdict) => setState(() => _verdict = verdict),
                            onSubmit: _submitReview,
                          ),
                        ],
                      );
                    }
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 2,
                          child: _CoursesList(
                            courses: _courses,
                            selectedCourse: _selectedCourse,
                            statusFilter: _statusFilter,
                            onStatusChanged: (value) {
                              setState(() => _statusFilter = value);
                              _load();
                            },
                            onSelect: _selectCourse,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          flex: 3,
                          child: _CourseReviewPanel(
                            course: _selectedCourse,
                            lessons: _lessons,
                            selectedLesson: _selectedLesson,
                            notesController: _notesController,
                            verdict: _verdict,
                            submitting: _submitting,
                            onLessonSelected: (lesson) => setState(() => _selectedLesson = lesson),
                            onVerdictSelected: (verdict) => setState(() => _verdict = verdict),
                            onSubmit: _submitReview,
                          ),
                        ),
                      ],
                    );
                  },
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
    return _AuditorCourse(
      id: auditorInt(map['id']),
      slug: auditorString(map['slug']),
      title: auditorTextOf(map['title'], fallback: 'Course'),
      status: auditorStatus(map['status']),
      description: auditorString(map['description'], fallback: 'No description available.'),
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
    return _AuditorLesson(
      id: auditorInt(map['id']),
      title: auditorTextOf(map['title'], fallback: 'Lesson'),
      unitTitle: unitTitle,
    );
  }
}

class _CoursesList extends StatelessWidget {
  const _CoursesList({
    required this.courses,
    required this.selectedCourse,
    required this.statusFilter,
    required this.onStatusChanged,
    required this.onSelect,
  });

  final List<_AuditorCourse> courses;
  final _AuditorCourse? selectedCourse;
  final String statusFilter;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<_AuditorCourse> onSelect;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Courses',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
              ),
              DropdownButton<String>(
                value: statusFilter,
                items: const [
                  DropdownMenuItem(value: 'review', child: Text('Review')),
                  DropdownMenuItem(value: 'published', child: Text('Published')),
                  DropdownMenuItem(value: 'draft', child: Text('Draft')),
                  DropdownMenuItem(value: 'all', child: Text('All')),
                ],
                onChanged: (value) {
                  if (value != null) onStatusChanged(value);
                },
              ),
            ],
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
                        ? AfaqColors.slate950
                        : AfaqColors.slate100.withValues(alpha: .55),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.title,
                        style: TextStyle(
                          color: selectedCourse?.id == course.id ? Colors.white : null,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      AuditorStatusChip(
                        label: course.status,
                        tone: course.status.toLowerCase().contains('review')
                            ? AuditorStatusTone.warn
                            : AuditorStatusTone.neutral,
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

class _CourseReviewPanel extends StatelessWidget {
  const _CourseReviewPanel({
    required this.course,
    required this.lessons,
    required this.selectedLesson,
    required this.notesController,
    required this.verdict,
    required this.submitting,
    required this.onLessonSelected,
    required this.onVerdictSelected,
    required this.onSubmit,
  });

  final _AuditorCourse? course;
  final List<_AuditorLesson> lessons;
  final _AuditorLesson? selectedLesson;
  final TextEditingController notesController;
  final AuditorReviewVerdict verdict;
  final bool submitting;
  final ValueChanged<_AuditorLesson> onLessonSelected;
  final ValueChanged<AuditorReviewVerdict> onVerdictSelected;
  final Future<void> Function() onSubmit;

  @override
  Widget build(BuildContext context) {
    if (course == null) {
      return const AuditorEmptyPanel(
        message: 'Select a course to review its lessons.',
        icon: Icons.fact_check_outlined,
      );
    }

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            course!.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(course!.description, style: const TextStyle(color: AfaqColors.slate500)),
          const SizedBox(height: 16),
          Text('Lessons', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          if (lessons.isEmpty)
            const Text('No lessons returned for this course.')
          else
            for (final lesson in lessons)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: selectedLesson?.id == lesson.id
                      ? AfaqColors.primary.withValues(alpha: .12)
                      : AfaqColors.slate100.withValues(alpha: .55),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ListTile(
                  onTap: () => onLessonSelected(lesson),
                  title: Text(lesson.title),
                  subtitle: Text(lesson.unitTitle),
                ),
              ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _VerdictButton(
                label: 'Approved',
                selected: verdict == AuditorReviewVerdict.approved,
                onTap: () => onVerdictSelected(AuditorReviewVerdict.approved),
              ),
              _VerdictButton(
                label: 'Changes',
                selected: verdict == AuditorReviewVerdict.changesRequested,
                onTap: () => onVerdictSelected(AuditorReviewVerdict.changesRequested),
              ),
              _VerdictButton(
                label: 'Rejected',
                selected: verdict == AuditorReviewVerdict.rejected,
                onTap: () => onVerdictSelected(AuditorReviewVerdict.rejected),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: notesController,
            maxLines: 5,
            decoration: const InputDecoration(
              hintText: 'Review notes',
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: submitting ? null : onSubmit,
            icon: submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.send_outlined),
            label: const Text('Send Review'),
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
        backgroundColor: selected ? AfaqColors.primary.withValues(alpha: .08) : null,
      ),
      child: Text(label),
    );
  }
}
