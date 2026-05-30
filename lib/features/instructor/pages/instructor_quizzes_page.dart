import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_courses_service.dart';
import '../data/instructor_grading_service.dart';
import '../data/instructor_quiz_service.dart';
import 'instructor_page_shared.dart';

class InstructorQuizzesPage extends StatefulWidget {
  const InstructorQuizzesPage({super.key});

  @override
  State<InstructorQuizzesPage> createState() => _InstructorQuizzesPageState();
}

class _InstructorQuizzesPageState extends State<InstructorQuizzesPage> {
  final _quizService = const InstructorQuizService();
  final _coursesService = const InstructorCoursesService();
  final _gradingService = const InstructorGradingService();

  bool _loading = true;
  bool _submitting = false;
  String? _error;
  List<_QuizCourse> _courses = const [];
  List<_InstructorQuiz> _quizzes = const [];
  List<_QuizAttempt> _attempts = const [];
  _InstructorQuiz? _expandedQuiz;

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
        _coursesService.getMyCourses(),
        _quizService.listQuizzes(),
        _gradingService.getAttempts(),
      ]);

      final courses = unwrapInstructorList(results[0].data)
          .map(_QuizCourse.fromMap)
          .toList(growable: false);
      final courseIds = courses.map((item) => item.id).toSet();
      final quizzes = unwrapInstructorList(results[1].data)
          .map(_InstructorQuiz.fromMap)
          .where((quiz) => quiz.courseId == 0 || courseIds.contains(quiz.courseId))
          .toList(growable: false);
      final attempts = unwrapInstructorList(results[2].data)
          .map(_QuizAttempt.fromMap)
          .where((attempt) => attempt.quizId != 0)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _courses = courses;
        _quizzes = quizzes;
        _attempts = attempts;
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

  Future<void> _openCreateQuiz() async {
    if (_courses.isEmpty) {
      AfaqToast.show(context, message: 'Create a course first.', type: AfaqToastType.warning);
      return;
    }

    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    int selectedCourseId = _courses.first.id;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Create Quiz'),
              content: SizedBox(
                width: 420,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButton<int>(
                      value: selectedCourseId,
                      isExpanded: true,
                      items: _courses
                          .map((course) => DropdownMenuItem<int>(
                                value: course.id,
                                child: Text(course.title),
                              ))
                          .toList(growable: false),
                      onChanged: (value) {
                        if (value == null) return;
                        setDialogState(() => selectedCourseId = value);
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Title'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Description'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(dialogContext).pop(true),
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );

    if (confirmed != true) return;

    setState(() => _submitting = true);
    try {
      await _quizService.createQuiz({
        'title': titleController.text.trim(),
        'title_translations': {
          'en': titleController.text.trim(),
          'ar': titleController.text.trim(),
        },
        'description': descriptionController.text.trim(),
        'description_translations': {
          'en': descriptionController.text.trim(),
          'ar': descriptionController.text.trim(),
        },
        'max_score': 100,
        'passing_score': 60,
        'type': 'quiz',
        'status': 'draft',
        'quizable_type': 'course',
        'quizable_id': selectedCourseId,
        'auto_grade_enabled': true,
        'duration_minutes': 30,
      });
      await _load();
      if (!mounted) return;
      AfaqToast.show(context, message: 'Quiz created.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _openAddQuestion(_InstructorQuiz quiz) async {
    final promptController = TextEditingController();
    final optionAController = TextEditingController();
    final optionBController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Add Question'),
          content: SizedBox(
            width: 460,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: promptController,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Question'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: optionAController,
                  decoration: const InputDecoration(labelText: 'Correct option'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: optionBController,
                  decoration: const InputDecoration(labelText: 'Another option'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    try {
      await _quizService.createQuestion({
        'quiz_id': quiz.id,
        'question_text': promptController.text.trim(),
        'question_text_translations': {
          'en': promptController.text.trim(),
          'ar': promptController.text.trim(),
        },
        'type': 'multiple_choice',
        'point': 5,
        'order_index': (quiz.questions.length + 1),
        'is_required': true,
        'options': [
          {
            'option_text': {
              'en': optionAController.text.trim(),
              'ar': optionAController.text.trim(),
            },
            'is_correct': true,
          },
          {
            'option_text': {
              'en': optionBController.text.trim(),
              'ar': optionBController.text.trim(),
            },
            'is_correct': false,
          },
        ],
      });
      await _load();
      if (!mounted) return;
      AfaqToast.show(context, message: 'Question created.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    }
  }

  Future<void> _deleteQuiz(_InstructorQuiz quiz) async {
    try {
      await _quizService.deleteQuiz(quiz.id);
      if (_expandedQuiz?.id == quiz.id) {
        setState(() => _expandedQuiz = null);
      }
      await _load();
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return InstructorPageScaffold(
      title: instructorText('quizzes', lang),
      subtitle: instructorText('quizzes_subtitle', lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FilledButton.icon(
            onPressed: _submitting ? null : _openCreateQuiz,
            icon: _submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.add),
            label: const Text('Create Quiz'),
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            InstructorErrorPanel(message: _error!, onRetry: _load)
          else if (_quizzes.isEmpty)
            InstructorEmptyPanel(message: instructorText('empty', lang), icon: Icons.quiz_outlined)
          else
            ListView.separated(
              itemCount: _quizzes.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final quiz = _quizzes[index];
                final expanded = _expandedQuiz?.id == quiz.id;
                final attempts = _attempts.where((item) => item.quizId == quiz.id).toList(growable: false);
                final courseTitle = _courses
                    .where((item) => item.id == quiz.courseId)
                    .map((item) => item.title)
                    .cast<String?>()
                    .firstWhere((item) => item != null, orElse: () => 'Course')
                    ?? 'Course';

                return AfaqPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(courseTitle, style: const TextStyle(color: AfaqColors.slate500)),
                                const SizedBox(height: 6),
                                Text(
                                  quiz.title,
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () {
                              setState(() {
                                _expandedQuiz = expanded ? null : quiz;
                              });
                            },
                            icon: Icon(expanded ? Icons.expand_less : Icons.expand_more),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _QuizMetaChip(label: quiz.status),
                          _QuizMetaChip(label: '${quiz.questions.length} questions'),
                          _QuizMetaChip(label: '${attempts.length} attempts'),
                        ],
                      ),
                      if (expanded) ...[
                        const SizedBox(height: 16),
                        Text(
                          quiz.description,
                          style: const TextStyle(color: AfaqColors.slate500),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            FilledButton.icon(
                              onPressed: () => _openAddQuestion(quiz),
                              icon: const Icon(Icons.add_task_outlined),
                              label: const Text('Add Question'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _deleteQuiz(quiz),
                              icon: const Icon(Icons.delete_outline),
                              label: const Text('Delete Quiz'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (quiz.questions.isEmpty)
                          const Text('No questions yet.')
                        else
                          for (final question in quiz.questions)
                            Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AfaqColors.slate100.withValues(alpha: .55),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(question.text),
                            ),
                        const SizedBox(height: 16),
                        Text(
                          'Attempts',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (attempts.isEmpty)
                          const Text('No attempts yet.')
                        else
                          for (final attempt in attempts.take(8))
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
                                        Text(attempt.studentName),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${attempt.status} - score ${attempt.scoreLabel}',
                                          style: const TextStyle(color: AfaqColors.slate500),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                      ],
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _QuizCourse {
  const _QuizCourse({required this.id, required this.title});

  final int id;
  final String title;

  factory _QuizCourse.fromMap(Map<String, dynamic> map) {
    return _QuizCourse(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Course'),
      ),
    );
  }
}

class _InstructorQuiz {
  const _InstructorQuiz({
    required this.id,
    required this.courseId,
    required this.title,
    required this.description,
    required this.status,
    required this.questions,
  });

  final int id;
  final int courseId;
  final String title;
  final String description;
  final String status;
  final List<_InstructorQuestion> questions;

  factory _InstructorQuiz.fromMap(Map<String, dynamic> map) {
    return _InstructorQuiz(
      id: instructorInt(map['quiz_id'] ?? map['id']),
      courseId: instructorInt(map['course_id'] ?? map['quizable_id']),
      title: instructorLocalized(
        map['title'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Untitled Quiz'),
      ),
      description: instructorLocalized(
        map['description'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['description'], fallback: 'No description'),
      ),
      status: instructorString(map['status'], fallback: 'draft'),
      questions: instructorList(map['questions'])
          .map(_InstructorQuestion.fromMap)
          .toList(growable: false),
    );
  }
}

class _InstructorQuestion {
  const _InstructorQuestion({required this.id, required this.text});

  final int id;
  final String text;

  factory _InstructorQuestion.fromMap(Map<String, dynamic> map) {
    return _InstructorQuestion(
      id: instructorInt(map['id']),
      text: instructorLocalized(
        map['question_text'] ?? map['text'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['question_text'] ?? map['text'], fallback: 'Question'),
      ),
    );
  }
}

class _QuizAttempt {
  const _QuizAttempt({
    required this.id,
    required this.quizId,
    required this.status,
    required this.studentName,
    required this.scoreLabel,
  });

  final int id;
  final int quizId;
  final String status;
  final String studentName;
  final String scoreLabel;

  factory _QuizAttempt.fromMap(Map<String, dynamic> map) {
    final student = instructorMap(map['student']);
    return _QuizAttempt(
      id: instructorInt(map['id']),
      quizId: instructorInt(map['quiz_id']),
      status: instructorString(map['status'], fallback: 'unknown'),
      studentName: instructorString(
        student?['name'] ?? map['student_name'],
        fallback: 'Student',
      ),
      scoreLabel: instructorString(map['score'], fallback: '--'),
    );
  }
}

class _QuizMetaChip extends StatelessWidget {
  const _QuizMetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AfaqColors.slate100.withValues(alpha: .8),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }
}
