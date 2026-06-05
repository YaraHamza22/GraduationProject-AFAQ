import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/session/session_store.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_courses_service.dart';
import '../data/instructor_lessons_service.dart';
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
  final _lessonsService = const InstructorLessonsService();

  bool _loading = true;
  bool _submitting = false;
  String? _error;
  List<_QuizCourse> _courses = const [];
  List<_InstructorQuiz> _quizzes = const [];
  Map<int, _InstructorQuiz> _quizById = const {};
  Map<int, String> _courseTitleById = const {};
  Map<int, List<_QuizUnit>> _unitsByCourseId = const {};
  Map<int, List<_QuizLesson>> _lessonsByUnitId = const {};
  Map<int, _QuizResultsState> _resultsByQuizId = const {};
  _InstructorQuiz? _expandedQuiz;
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
    super.dispose();
  }

  void _handleLocaleChanged() {
    final nextLocale = localeNotifier.value.languageCode;
    if (nextLocale == _lastLocaleCode) return;
    _lastLocaleCode = nextLocale;
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
        _quizService.listQuizzes(instructorId: _currentInstructorId),
      ]);

      final courses = unwrapInstructorList(results[0].data)
          .map(_QuizCourse.fromMap)
          .toList(growable: false);
      final courseIds = courses.map((item) => item.id).toSet();
      final quizzes = unwrapInstructorList(results[1].data)
          .map(_InstructorQuiz.fromMap)
          .where((quiz) => quiz.courseId == 0 || courseIds.contains(quiz.courseId))
          .toList(growable: false);
      final courseTitleById = {
        for (final course in courses) course.id: course.title,
      };
      final quizById = {
        for (final quiz in quizzes) quiz.id: quiz,
      };

      if (!mounted) return;
      setState(() {
        _courses = courses;
        _quizzes = quizzes;
        _quizById = quizById;
        _courseTitleById = courseTitleById;
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

  Future<void> _expandQuiz(_InstructorQuiz quiz) async {
    setState(() {
      _expandedQuiz = _expandedQuiz?.id == quiz.id ? null : quiz;
    });
    if (_expandedQuiz?.id != quiz.id) return;

    await Future.wait([
      _ensureQuizDetails(quiz.id),
      _loadQuizResultsBundle(quiz.id),
    ]);
  }

  Future<void> _ensureQuizDetails(int quizId, {bool force = false}) async {
    final existing = _quizById[quizId];
    if (!force && existing != null && existing.questions.isNotEmpty) return;

    try {
      final response = await _quizService.getQuiz(quizId);
      final detailedQuiz = _InstructorQuiz.fromMap(unwrapInstructorMap(response.data));
      if (!mounted) return;
      setState(() {
        _quizById = {
          ..._quizById,
          quizId: detailedQuiz,
        };
        _quizzes = _quizzes
            .map((quiz) => quiz.id == quizId ? detailedQuiz : quiz)
            .toList(growable: false);
        if (_expandedQuiz?.id == quizId) {
          _expandedQuiz = detailedQuiz;
        }
      });
    } catch (_) {
      // Keep current summary card if details fail.
    }
  }

  Future<void> _loadQuizResultsBundle(int quizId, [bool force = false]) async {
    final current = _resultsByQuizId[quizId] ?? _QuizResultsState.initial();
    if (current.hydrated && !force) return;

    setState(() {
      _resultsByQuizId = {
        ..._resultsByQuizId,
        quizId: current.copyWith(loading: true, error: null),
      };
    });

    try {
      final responses = await Future.wait([
        _quizService.getQuizResults(quizId: quizId, status: 'submitted'),
        _quizService.getQuizResults(quizId: quizId, status: 'graded'),
      ]);

      final submitted = _QuizResultsEnvelope.fromPayload(unwrapInstructorMap(responses[0].data));
      final graded = _QuizResultsEnvelope.fromPayload(unwrapInstructorMap(responses[1].data));
      final next = _QuizResultsState(
        activeStatus: graded.attempts.isNotEmpty ? _QuizResultsTab.graded : _QuizResultsTab.submitted,
        submitted: submitted.attempts,
        graded: graded.attempts,
        submittedCount: submitted.total,
        gradedCount: graded.total,
        loading: false,
        hydrated: true,
        error: null,
      );

      if (!mounted) return;
      setState(() {
        _resultsByQuizId = {
          ..._resultsByQuizId,
          quizId: next,
        };
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _resultsByQuizId = {
          ..._resultsByQuizId,
          quizId: current.copyWith(
            loading: false,
            hydrated: true,
            error: error.toString(),
          ),
        };
      });
    }
  }

  Future<List<_QuizUnit>> _loadUnitsForCourse(int courseId, {bool force = false}) async {
    final existing = _unitsByCourseId[courseId];
    if (!force && existing != null) return existing;
    final response = await _coursesService.getUnits(courseId);
    final units = unwrapInstructorList(response.data)
        .map(_QuizUnit.fromMap)
        .where((unit) => unit.id != 0)
        .toList(growable: false);
    if (mounted) {
      setState(() {
        _unitsByCourseId = {
          ..._unitsByCourseId,
          courseId: units,
        };
      });
    }
    return units;
  }

  Future<List<_QuizLesson>> _loadLessonsForUnit({
    required int courseId,
    required int unitId,
    bool force = false,
  }) async {
    final existing = _lessonsByUnitId[unitId];
    if (!force && existing != null) return existing;
    final response = await _lessonsService.getLessons(courseId: courseId, unitId: unitId);
    final lessons = unwrapInstructorList(response.data)
        .map(_QuizLesson.fromMap)
        .where((lesson) => lesson.id != 0)
        .toList(growable: false);
    if (mounted) {
      setState(() {
        _lessonsByUnitId = {
          ..._lessonsByUnitId,
          unitId: lessons,
        };
      });
    }
    return lessons;
  }

  Future<void> _openCreateQuizDialog() async {
    final lang = localeNotifier.value.languageCode;
    if (_courses.isEmpty) {
      AfaqToast.show(
        context,
        message: instructorText('create_course_first', lang),
        type: AfaqToastType.warning,
      );
      return;
    }

    var form = _QuizFormState(courseId: _courses.first.id);
    var availableUnits = await _loadUnitsForCourse(form.courseId);
    var availableLessons = const <_QuizLesson>[];

    if (!mounted) return;
    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            Future<void> syncCourse(int courseId) async {
              final units = await _loadUnitsForCourse(courseId);
              if (!mounted) return;
              setDialogState(() {
                availableUnits = units;
                availableLessons = const [];
                form = form.copyWith(
                  courseId: courseId,
                  unitId: units.isNotEmpty ? units.first.id : 0,
                  lessonId: 0,
                );
              });
            }

            Future<void> syncUnit(int unitId) async {
              final lessons = unitId == 0
                  ? const <_QuizLesson>[]
                  : await _loadLessonsForUnit(
                      courseId: form.courseId,
                      unitId: unitId,
                    );
              if (!mounted) return;
              setDialogState(() {
                availableLessons = lessons;
                form = form.copyWith(
                  unitId: unitId,
                  lessonId: lessons.isNotEmpty ? lessons.first.id : 0,
                );
              });
            }

            return Dialog(
              backgroundColor: Colors.transparent,
              insetPadding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1080, maxHeight: 860),
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? const Color(0xFF0A0F1D)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(32),
                    border: Border.all(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.white.withValues(alpha: .08)
                          : AfaqColors.slate200,
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.fromLTRB(28, 24, 20, 24),
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                          gradient: Theme.of(context).brightness == Brightness.dark
                              ? const LinearGradient(
                                  colors: [Color(0xFF0B1120), Color(0xFF111827)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                )
                              : const LinearGradient(
                                  colors: [Color(0xFFFFFFFF), Color(0xFFF8FAFC)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'INSTRUCTOR QUIZ BUILDER',
                                    style: TextStyle(
                                      color: Color(0xFF6366F1),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'Create a polished quiz workspace',
                                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                          fontWeight: FontWeight.w900,
                                        ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Match the website flow: choose where the quiz belongs, add bilingual content, then set scoring and delivery.',
                                    style: const TextStyle(
                                      color: AfaqColors.slate500,
                                      height: 1.4,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => Navigator.of(dialogContext).pop(false),
                              icon: const Icon(Icons.close_rounded),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            children: [
                              LayoutBuilder(
                                builder: (context, constraints) {
                                  final stacked = constraints.maxWidth < 860;
                                  final content = [
                                    _QuizModalSection(
                                      title: 'Quiz Identity',
                                      eyebrow: 'CONTENT',
                                      child: Column(
                                        children: [
                                          DropdownButtonFormField<int>(
                                            initialValue: form.courseId,
                                            decoration: _quizInputDecoration('Course'),
                                            items: _courses
                                                .map(
                                                  (course) => DropdownMenuItem<int>(
                                                    value: course.id,
                                                    child: Text(course.title),
                                                  ),
                                                )
                                                .toList(growable: false),
                                            onChanged: (value) async {
                                              if (value == null) return;
                                              await syncCourse(value);
                                            },
                                          ),
                                          const SizedBox(height: 16),
                                          Wrap(
                                            spacing: 10,
                                            runSpacing: 10,
                                            children: _QuizOwnerType.values.map((type) {
                                              final active = form.ownerType == type;
                                              return ChoiceChip(
                                                label: Text(type.label.toUpperCase()),
                                                selected: active,
                                                onSelected: (_) async {
                                                  setDialogState(() {
                                                    form = form.copyWith(ownerType: type);
                                                  });
                                                  if (type != _QuizOwnerType.course && availableUnits.isEmpty) {
                                                    await syncCourse(form.courseId);
                                                  }
                                                  if (type == _QuizOwnerType.lesson &&
                                                      form.unitId != 0 &&
                                                      availableLessons.isEmpty) {
                                                    await syncUnit(form.unitId);
                                                  }
                                                },
                                              );
                                            }).toList(growable: false),
                                          ),
                                          if (form.ownerType != _QuizOwnerType.course) ...[
                                            const SizedBox(height: 16),
                                            DropdownButtonFormField<int>(
                                              initialValue: form.unitId == 0 && availableUnits.isNotEmpty
                                                  ? availableUnits.first.id
                                                  : (form.unitId == 0 ? null : form.unitId),
                                              decoration: _quizInputDecoration('Unit'),
                                              items: availableUnits
                                                  .map(
                                                    (unit) => DropdownMenuItem<int>(
                                                      value: unit.id,
                                                      child: Text(unit.title),
                                                    ),
                                                  )
                                                  .toList(growable: false),
                                              onChanged: (value) async {
                                                if (value == null) return;
                                                await syncUnit(value);
                                              },
                                            ),
                                          ],
                                          if (form.ownerType == _QuizOwnerType.lesson) ...[
                                            const SizedBox(height: 16),
                                            DropdownButtonFormField<int>(
                                              initialValue: form.lessonId == 0 && availableLessons.isNotEmpty
                                                  ? availableLessons.first.id
                                                  : (form.lessonId == 0 ? null : form.lessonId),
                                              decoration: _quizInputDecoration('Lesson'),
                                              items: availableLessons
                                                  .map(
                                                    (lesson) => DropdownMenuItem<int>(
                                                      value: lesson.id,
                                                      child: Text(lesson.title),
                                                    ),
                                                  )
                                                  .toList(growable: false),
                                              onChanged: (value) {
                                                if (value == null) return;
                                                setDialogState(() {
                                                  form = form.copyWith(lessonId: value);
                                                });
                                              },
                                            ),
                                          ],
                                          const SizedBox(height: 16),
                                          Row(
                                            children: [
                                              Expanded(
                                                child: TextField(
                                                  decoration: _quizInputDecoration('Title EN'),
                                                  onChanged: (value) => form = form.copyWith(titleEn: value),
                                                ),
                                              ),
                                              const SizedBox(width: 16),
                                              Expanded(
                                                child: TextField(
                                                  decoration: _quizInputDecoration('Title AR'),
                                                  onChanged: (value) => form = form.copyWith(titleAr: value),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 16),
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Expanded(
                                                child: TextField(
                                                  minLines: 5,
                                                  maxLines: 5,
                                                  decoration: _quizInputDecoration('Description EN'),
                                                  onChanged: (value) => form = form.copyWith(descriptionEn: value),
                                                ),
                                              ),
                                              const SizedBox(width: 16),
                                              Expanded(
                                                child: TextField(
                                                  minLines: 5,
                                                  maxLines: 5,
                                                  decoration: _quizInputDecoration('Description AR'),
                                                  onChanged: (value) => form = form.copyWith(descriptionAr: value),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    _QuizModalSection(
                                      title: 'Scoring and delivery',
                                      eyebrow: 'SETTINGS',
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            width: double.infinity,
                                            padding: const EdgeInsets.all(16),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFEEF2FF),
                                              borderRadius: BorderRadius.circular(24),
                                              border: Border.all(color: const Color(0xFFC7D2FE)),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'ABOUT TO CREATE QUIZ IN',
                                                  style: TextStyle(
                                                    color: Color(0xFF6366F1),
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w900,
                                                    letterSpacing: 1.4,
                                                  ),
                                                ),
                                                const SizedBox(height: 10),
                                                Wrap(
                                                  spacing: 8,
                                                  runSpacing: 8,
                                                  children: [
                                                    _PreviewPill(label: form.ownerType.label),
                                                    _PreviewPill(label: _selectedOwnerLabel(
                                                      form: form,
                                                      courses: _courses,
                                                      units: availableUnits,
                                                      lessons: availableLessons,
                                                    )),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(height: 16),
                                          TextField(
                                            keyboardType: TextInputType.number,
                                            decoration: _quizInputDecoration('Duration (minutes)'),
                                            onChanged: (value) => form = form.copyWith(durationMinutes: value),
                                          ),
                                          const SizedBox(height: 16),
                                          TextField(
                                            keyboardType: TextInputType.number,
                                            decoration: _quizInputDecoration('Max score'),
                                            onChanged: (value) => form = form.copyWith(maxScore: value),
                                          ),
                                          const SizedBox(height: 16),
                                          TextField(
                                            keyboardType: TextInputType.number,
                                            decoration: _quizInputDecoration('Passing score'),
                                            onChanged: (value) => form = form.copyWith(passingScore: value),
                                          ),
                                          const SizedBox(height: 16),
                                          DropdownButtonFormField<String>(
                                            initialValue: form.status,
                                            decoration: _quizInputDecoration('Status'),
                                            items: const [
                                              DropdownMenuItem(value: 'draft', child: Text('Draft')),
                                              DropdownMenuItem(value: 'published', child: Text('Published')),
                                              DropdownMenuItem(value: 'archived', child: Text('Archived')),
                                            ],
                                            onChanged: (value) {
                                              if (value == null) return;
                                              form = form.copyWith(status: value);
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                  ];

                                  if (stacked) {
                                    return Column(
                                      children: [
                                        content[0],
                                        const SizedBox(height: 16),
                                        content[1],
                                      ],
                                    );
                                  }

                                  return Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(child: content[0]),
                                      const SizedBox(width: 16),
                                      Expanded(child: content[1]),
                                    ],
                                  );
                                },
                              ),
                              const SizedBox(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  OutlinedButton(
                                    onPressed: () => Navigator.of(dialogContext).pop(false),
                                    child: const Text('Cancel'),
                                  ),
                                  const SizedBox(width: 12),
                                  FilledButton.icon(
                                    onPressed: () => Navigator.of(dialogContext).pop(true),
                                    icon: const Icon(Icons.save_outlined),
                                    label: const Text('Create Quiz'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (confirmed != true) return;
    if (!mounted) return;

    final ownerId = switch (form.ownerType) {
      _QuizOwnerType.course => form.courseId,
      _QuizOwnerType.unit => form.unitId,
      _QuizOwnerType.lesson => form.lessonId,
    };

    if (ownerId == 0 || form.titleEn.trim().isEmpty || form.titleAr.trim().isEmpty) {
      AfaqToast.show(
        context,
        message: 'Please complete the quiz target and required titles.',
        type: AfaqToastType.error,
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await _quizService.createQuiz({
        'title': {
          'en': form.titleEn.trim(),
          'ar': form.titleAr.trim(),
        },
        'title_translations': {
          'en': form.titleEn.trim(),
          'ar': form.titleAr.trim(),
        },
        'description': {
          'en': form.descriptionEn.trim(),
          'ar': form.descriptionAr.trim(),
        },
        'description_translations': {
          'en': form.descriptionEn.trim(),
          'ar': form.descriptionAr.trim(),
        },
        'max_score': int.tryParse(form.maxScore.trim()) ?? 100,
        'passing_score': int.tryParse(form.passingScore.trim()) ?? 60,
        'type': 'quiz',
        'status': form.status,
        'quizable_type': form.ownerType.apiValue,
        'quizable_id': ownerId,
        'auto_grade_enabled': true,
        'duration_minutes': int.tryParse(form.durationMinutes.trim()) ?? 30,
      });
      await _load();
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: instructorText('quiz_created', lang),
        type: AfaqToastType.success,
      );
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _openAddQuestion(_InstructorQuiz quiz) async {
    final lang = localeNotifier.value.languageCode;
    final promptController = TextEditingController();
    final optionAController = TextEditingController();
    final optionBController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(instructorText('add_question_title', lang)),
          content: SizedBox(
            width: 460,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: promptController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: instructorText('question_label', lang),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: optionAController,
                  decoration: InputDecoration(
                    labelText: instructorText('correct_option', lang),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: optionBController,
                  decoration: InputDecoration(
                    labelText: instructorText('another_option', lang),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(instructorText('cancel', lang)),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(instructorText('save', lang)),
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
      await _ensureQuizDetails(quiz.id, force: true);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: instructorText('question_created', lang),
        type: AfaqToastType.success,
      );
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

  void _openAttemptDetails(_InstructorQuiz quiz, _QuizAttemptResult attempt) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 980, maxHeight: 840),
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? const Color(0xFF0A0F1D)
                    : Colors.white,
                borderRadius: BorderRadius.circular(32),
                border: Border.all(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.white.withValues(alpha: .08)
                      : AfaqColors.slate200,
                ),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(28, 24, 20, 24),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'INSTRUCTOR GRADING DESK',
                                style: TextStyle(
                                  color: Color(0xFF0EA5E9),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.5,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                attempt.studentName,
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                      fontWeight: FontWeight.w900,
                                    ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Quiz: ${quiz.title} • Attempt #${attempt.id}',
                                style: const TextStyle(
                                  color: AfaqColors.slate500,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(dialogContext).pop(),
                          icon: const Icon(Icons.close_rounded),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                      child: Column(
                        children: [
                          GridView.count(
                            crossAxisCount: MediaQuery.sizeOf(context).width >= 820 ? 3 : 1,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 1.5,
                            children: [
                              _AttemptInfoCard(
                                label: 'Student',
                                value: attempt.studentName,
                                subtitle: attempt.studentEmail.isEmpty ? 'No email' : attempt.studentEmail,
                              ),
                              _AttemptInfoCard(
                                label: 'Attempt Status',
                                value: attempt.status.toUpperCase(),
                                subtitle: 'Submitted at ${_formatDateTime(attempt.submittedAt)}',
                              ),
                              _AttemptInfoCard(
                                label: 'Current Score',
                                value: attempt.scoreLabel,
                                subtitle: attempt.gradedByName.isEmpty
                                    ? 'Grader not set'
                                    : 'Graded by ${attempt.gradedByName}',
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),
                          for (var index = 0; index < quiz.questions.length; index++)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: _AttemptQuestionCard(
                                index: index,
                                question: quiz.questions[index],
                                answer: attempt.answerByQuestionId[quiz.questions[index].id],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
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
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF0F172A),
                  Color(0xFF172554),
                  Color(0xFF4C1D95),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(32),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .10),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'QUIZ WORKSPACE',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.3,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Build quizzes and review live attempt traffic.',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Fast summary cards first, then lazy details for questions, answers, and results exactly where the instructor needs them.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: .70),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _DashboardChip(label: 'QUIZZES: ${_quizzes.length}'),
                    _DashboardChip(
                      label: 'PUBLISHED: ${_quizzes.where((quiz) => quiz.status.toLowerCase() == 'published').length}',
                    ),
                    _DashboardChip(label: 'COURSES: ${_courses.length}'),
                  ],
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _submitting ? null : _openCreateQuizDialog,
                  icon: _submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.add),
                  label: Text(instructorText('create_quiz', lang)),
                ),
              ],
            ),
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
                final summary = _quizzes[index];
                final quiz = _quizById[summary.id] ?? summary;
                final expanded = _expandedQuiz?.id == quiz.id;
                final results = _resultsByQuizId[quiz.id] ?? _QuizResultsState.initial();
                final activeAttempts = results.activeAttempts;
                final courseTitle = _courseTitleById[quiz.courseId] ?? instructorText('course', lang);

                return AfaqPanel(
                  dark: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      InkWell(
                        onTap: () => _expandQuiz(quiz),
                        borderRadius: BorderRadius.circular(24),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    courseTitle,
                                    style: TextStyle(color: Colors.white.withValues(alpha: .56)),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    quiz.title,
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                          fontWeight: FontWeight.w900,
                                          color: Colors.white,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => _expandQuiz(quiz),
                              icon: Icon(expanded ? Icons.expand_less : Icons.expand_more),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _QuizMetaChip(label: instructorStatusText(quiz.status, lang)),
                          _QuizMetaChip(
                            label: instructorFormatText(
                              'questions_count',
                              lang,
                              values: {'count': '${quiz.questionsCount}'},
                            ),
                          ),
                          _QuizMetaChip(label: 'OWNER: ${quiz.ownerType.label.toUpperCase()}'),
                          _QuizMetaChip(label: 'DURATION: ${quiz.durationMinutes} MIN'),
                        ],
                      ),
                      if (expanded) ...[
                        const SizedBox(height: 18),
                        Text(
                          quiz.description,
                          style: TextStyle(color: Colors.white.withValues(alpha: .70)),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            FilledButton.icon(
                              onPressed: () => _openAddQuestion(quiz),
                              icon: const Icon(Icons.add_task_outlined),
                              label: Text(instructorText('add_question', lang)),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _deleteQuiz(quiz),
                              icon: const Icon(Icons.delete_outline),
                              label: Text(instructorText('delete_quiz', lang)),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _loadQuizResultsBundle(quiz.id, true),
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('Refresh Results'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        _SectionTitle(title: 'Questions & Answers'),
                        const SizedBox(height: 12),
                        if (quiz.questions.isEmpty)
                          Text(
                            instructorText('no_questions', lang),
                            style: TextStyle(color: Colors.white.withValues(alpha: .62)),
                          )
                        else
                          for (var questionIndex = 0; questionIndex < quiz.questions.length; questionIndex++)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _QuestionCard(
                                index: questionIndex,
                                question: quiz.questions[questionIndex],
                              ),
                            ),
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'QUIZ RESULTS',
                                          style: TextStyle(
                                            color: Color(0xFF6366F1),
                                            fontSize: 11,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 1.3,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          'Submitted, graded, and ready for results',
                                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                                fontWeight: FontWeight.w900,
                                              ),
                                        ),
                                        const SizedBox(height: 4),
                                        const Text(
                                          'Review submissions, inspect answers, and open a full attempt breakdown instantly.',
                                          style: TextStyle(
                                            color: AfaqColors.slate500,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _ResultPill(label: 'Submitted ${results.submittedCount}', color: AfaqColors.amber500),
                                      _ResultPill(label: 'Graded ${results.gradedCount}', color: AfaqColors.emerald500),
                                      _ResultPill(
                                        label: results.gradedCount > 0 ? 'Results Ready' : 'Awaiting Grades',
                                        color: results.gradedCount > 0 ? AfaqColors.blue500 : AfaqColors.slate500,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  ChoiceChip(
                                    label: const Text('Submitted'),
                                    selected: results.activeStatus == _QuizResultsTab.submitted,
                                    onSelected: (_) {
                                      setState(() {
                                        _resultsByQuizId = {
                                          ..._resultsByQuizId,
                                          quiz.id: results.copyWith(activeStatus: _QuizResultsTab.submitted),
                                        };
                                      });
                                    },
                                  ),
                                  ChoiceChip(
                                    label: const Text('Graded'),
                                    selected: results.activeStatus == _QuizResultsTab.graded,
                                    onSelected: (_) {
                                      setState(() {
                                        _resultsByQuizId = {
                                          ..._resultsByQuizId,
                                          quiz.id: results.copyWith(activeStatus: _QuizResultsTab.graded),
                                        };
                                      });
                                    },
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              if (results.error != null)
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF1F2),
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                  child: Text(
                                    results.error!,
                                    style: const TextStyle(
                                      color: AfaqColors.rose600,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                )
                              else if (results.loading)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 20),
                                  child: Center(child: CircularProgressIndicator()),
                                )
                              else if (activeAttempts.isEmpty)
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 28),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: AfaqColors.slate200),
                                  ),
                                  child: Text(
                                    results.activeStatus == _QuizResultsTab.submitted
                                        ? 'No submitted attempts yet.'
                                        : 'No graded results yet. Once a submission is graded, it will appear here immediately.',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: AfaqColors.slate500,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                )
                              else
                                Column(
                                  children: activeAttempts
                                      .map(
                                        (attempt) => Padding(
                                          padding: const EdgeInsets.only(bottom: 12),
                                          child: _AttemptSummaryCard(
                                            attempt: attempt,
                                            onOpen: () => _openAttemptDetails(quiz, attempt),
                                          ),
                                        ),
                                      )
                                      .toList(growable: false),
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
    final lang = localeNotifier.value.languageCode;
    return _QuizCourse(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        lang,
        fallback: instructorString(
          map['title'],
          fallback: instructorText('course', lang),
        ),
      ),
    );
  }
}

class _QuizUnit {
  const _QuizUnit({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;

  factory _QuizUnit.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _QuizUnit(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'] ?? map['title'],
        lang,
        fallback: instructorString(map['title'], fallback: 'Unit'),
      ),
    );
  }
}

class _QuizLesson {
  const _QuizLesson({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;

  factory _QuizLesson.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _QuizLesson(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'] ?? map['title'],
        lang,
        fallback: instructorString(map['title'], fallback: 'Lesson'),
      ),
    );
  }
}

enum _QuizOwnerType {
  course('course', 'Course'),
  unit('unit', 'Unit'),
  lesson('lesson', 'Lesson');

  const _QuizOwnerType(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static _QuizOwnerType fromValue(String value) {
    switch (value.toLowerCase()) {
      case 'unit':
        return _QuizOwnerType.unit;
      case 'lesson':
        return _QuizOwnerType.lesson;
      default:
        return _QuizOwnerType.course;
    }
  }
}

class _InstructorQuiz {
  const _InstructorQuiz({
    required this.id,
    required this.courseId,
    required this.ownerId,
    required this.ownerType,
    required this.title,
    required this.description,
    required this.status,
    required this.durationMinutes,
    required this.questions,
  });

  final int id;
  final int courseId;
  final int ownerId;
  final _QuizOwnerType ownerType;
  final String title;
  final String description;
  final String status;
  final int durationMinutes;
  final List<_InstructorQuestion> questions;

  int get questionsCount => questions.length;

  factory _InstructorQuiz.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    final quizable = instructorMap(map['quizable']);
    final ownerType = _QuizOwnerType.fromValue(
      instructorString(
        map['quizable_type'] ?? quizable?['quizable_type'],
        fallback: 'course',
      ),
    );
    final ownerId = instructorInt(map['quizable_id'] ?? quizable?['id']);
    final courseId = instructorInt(
      map['course_id'] ??
          quizable?['course_id'] ??
          (ownerType == _QuizOwnerType.course ? ownerId : 0),
    );
    return _InstructorQuiz(
      id: instructorInt(map['quiz_id'] ?? map['id']),
      courseId: courseId,
      ownerId: ownerId,
      ownerType: ownerType,
      title: instructorLocalized(
        map['title'],
        lang,
        fallback: instructorString(
          map['title'],
          fallback: instructorText('untitled_quiz', lang),
        ),
      ),
      description: instructorLocalized(
        map['description'],
        lang,
        fallback: instructorString(
          map['description'],
          fallback: instructorText('no_description', lang),
        ),
      ),
      status: instructorString(map['status'], fallback: 'draft'),
      durationMinutes: instructorInt(map['duration_minutes'], fallback: 30),
      questions: instructorList(map['questions'])
          .map(_InstructorQuestion.fromMap)
          .where((question) => question.id != 0)
          .toList(growable: false),
    );
  }
}

class _InstructorQuestion {
  const _InstructorQuestion({
    required this.id,
    required this.text,
    required this.type,
    required this.point,
    required this.isRequired,
    required this.orderIndex,
    required this.options,
  });

  final int id;
  final String text;
  final String type;
  final int point;
  final bool isRequired;
  final int orderIndex;
  final List<_QuestionOption> options;

  factory _InstructorQuestion.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _InstructorQuestion(
      id: instructorInt(map['id']),
      text: instructorLocalized(
        map['question_text'] ?? map['text'],
        lang,
        fallback: instructorString(
          map['question_text'] ?? map['text'],
          fallback: instructorText('question_label', lang),
        ),
      ),
      type: instructorString(map['type'], fallback: 'multiple_choice'),
      point: instructorInt(map['point'], fallback: 0),
      isRequired: map['is_required'] == true,
      orderIndex: instructorInt(map['order_index'], fallback: 9999),
      options: instructorList(map['options'])
          .map(_QuestionOption.fromMap)
          .where((option) => option.id != 0)
          .toList(growable: false),
    );
  }
}

class _QuestionOption {
  const _QuestionOption({
    required this.id,
    required this.text,
    required this.isCorrect,
  });

  final int id;
  final String text;
  final bool isCorrect;

  factory _QuestionOption.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _QuestionOption(
      id: instructorInt(map['id']),
      text: instructorLocalized(
        map['option_text'] ?? map['text'],
        lang,
        fallback: instructorString(map['option_text'] ?? map['text'], fallback: 'Option'),
      ),
      isCorrect: map['is_correct'] == true,
    );
  }
}

enum _QuizResultsTab { submitted, graded }

class _QuizResultsState {
  const _QuizResultsState({
    required this.activeStatus,
    required this.submitted,
    required this.graded,
    required this.submittedCount,
    required this.gradedCount,
    required this.loading,
    required this.hydrated,
    required this.error,
  });

  final _QuizResultsTab activeStatus;
  final List<_QuizAttemptResult> submitted;
  final List<_QuizAttemptResult> graded;
  final int submittedCount;
  final int gradedCount;
  final bool loading;
  final bool hydrated;
  final String? error;

  List<_QuizAttemptResult> get activeAttempts =>
      activeStatus == _QuizResultsTab.submitted ? submitted : graded;

  factory _QuizResultsState.initial() {
    return const _QuizResultsState(
      activeStatus: _QuizResultsTab.submitted,
      submitted: [],
      graded: [],
      submittedCount: 0,
      gradedCount: 0,
      loading: false,
      hydrated: false,
      error: null,
    );
  }

  _QuizResultsState copyWith({
    _QuizResultsTab? activeStatus,
    List<_QuizAttemptResult>? submitted,
    List<_QuizAttemptResult>? graded,
    int? submittedCount,
    int? gradedCount,
    bool? loading,
    bool? hydrated,
    String? error,
  }) {
    return _QuizResultsState(
      activeStatus: activeStatus ?? this.activeStatus,
      submitted: submitted ?? this.submitted,
      graded: graded ?? this.graded,
      submittedCount: submittedCount ?? this.submittedCount,
      gradedCount: gradedCount ?? this.gradedCount,
      loading: loading ?? this.loading,
      hydrated: hydrated ?? this.hydrated,
      error: error,
    );
  }
}

class _QuizResultsEnvelope {
  const _QuizResultsEnvelope({
    required this.attempts,
    required this.total,
  });

  final List<_QuizAttemptResult> attempts;
  final int total;

  factory _QuizResultsEnvelope.fromPayload(Map<String, dynamic> payload) {
    final root = instructorMap(payload['data']) ?? payload;
    final data = instructorMap(root['data']) ?? root;
    final attemptsSource = instructorList(data['attempts']).isNotEmpty
        ? instructorList(data['attempts'])
        : instructorList(data['results']).isNotEmpty
            ? instructorList(data['results'])
            : instructorList(data['data']);
    final summary = instructorMap(data['summary']) ?? instructorMap(root['summary']) ?? const {};
    final attempts = attemptsSource
        .map(_QuizAttemptResult.fromMap)
        .where((attempt) => attempt.id != 0)
        .toList(growable: false);
    return _QuizResultsEnvelope(
      attempts: attempts,
      total: instructorInt(summary['total'], fallback: attempts.length),
    );
  }
}

class _QuizAttemptResult {
  const _QuizAttemptResult({
    required this.id,
    required this.status,
    required this.score,
    required this.studentName,
    required this.studentEmail,
    required this.submittedAt,
    required this.gradedByName,
    required this.isPassed,
    required this.answers,
  });

  final int id;
  final String status;
  final int? score;
  final String studentName;
  final String studentEmail;
  final String? submittedAt;
  final String gradedByName;
  final bool? isPassed;
  final List<_QuizAttemptAnswer> answers;

  String get scoreLabel => score == null ? '--' : '$score';

  Map<int, _QuizAttemptAnswer> get answerByQuestionId => {
        for (final answer in answers) answer.questionId: answer,
      };

  factory _QuizAttemptResult.fromMap(Map<String, dynamic> map) {
    final student = instructorMap(map['student']);
    return _QuizAttemptResult(
      id: instructorInt(map['id']),
      status: instructorString(map['status'], fallback: 'unknown'),
      score: map['score'] == null ? null : instructorInt(map['score']),
      studentName: instructorString(student?['name'] ?? map['student_name'], fallback: 'Student'),
      studentEmail: instructorString(student?['email'] ?? map['student_email']),
      submittedAt: instructorString(map['submitted_at']).isEmpty
          ? null
          : instructorString(map['submitted_at']),
      gradedByName: instructorString(
        instructorMap(map['grader'])?['name'] ?? map['graded_by_name'],
      ),
      isPassed: map['is_passed'] is bool ? map['is_passed'] as bool : null,
      answers: instructorList(map['answers'])
          .map(_QuizAttemptAnswer.fromMap)
          .where((answer) => answer.questionId != 0)
          .toList(growable: false),
    );
  }
}

class _QuizAttemptAnswer {
  const _QuizAttemptAnswer({
    required this.questionId,
    required this.selectedOptionId,
    required this.booleanAnswer,
    required this.answerText,
    required this.questionScore,
    required this.isCorrect,
  });

  final int questionId;
  final int? selectedOptionId;
  final bool? booleanAnswer;
  final String answerText;
  final int? questionScore;
  final bool? isCorrect;

  factory _QuizAttemptAnswer.fromMap(Map<String, dynamic> map) {
    return _QuizAttemptAnswer(
      questionId: instructorInt(map['question_id']),
      selectedOptionId: map['selected_option_id'] == null
          ? null
          : instructorInt(map['selected_option_id']),
      booleanAnswer: map['boolean_answer'] is bool ? map['boolean_answer'] as bool : null,
      answerText: instructorLocalized(
        map['answer_text'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['answer_text']),
      ),
      questionScore: map['question_score'] == null ? null : instructorInt(map['question_score']),
      isCorrect: map['is_correct'] is bool ? map['is_correct'] as bool : null,
    );
  }
}

class _QuizFormState {
  const _QuizFormState({
    required this.courseId,
    this.ownerType = _QuizOwnerType.course,
    this.unitId = 0,
    this.lessonId = 0,
    this.titleEn = '',
    this.titleAr = '',
    this.descriptionEn = '',
    this.descriptionAr = '',
    this.durationMinutes = '30',
    this.maxScore = '100',
    this.passingScore = '60',
    this.status = 'draft',
  });

  final int courseId;
  final _QuizOwnerType ownerType;
  final int unitId;
  final int lessonId;
  final String titleEn;
  final String titleAr;
  final String descriptionEn;
  final String descriptionAr;
  final String durationMinutes;
  final String maxScore;
  final String passingScore;
  final String status;

  _QuizFormState copyWith({
    int? courseId,
    _QuizOwnerType? ownerType,
    int? unitId,
    int? lessonId,
    String? titleEn,
    String? titleAr,
    String? descriptionEn,
    String? descriptionAr,
    String? durationMinutes,
    String? maxScore,
    String? passingScore,
    String? status,
  }) {
    return _QuizFormState(
      courseId: courseId ?? this.courseId,
      ownerType: ownerType ?? this.ownerType,
      unitId: unitId ?? this.unitId,
      lessonId: lessonId ?? this.lessonId,
      titleEn: titleEn ?? this.titleEn,
      titleAr: titleAr ?? this.titleAr,
      descriptionEn: descriptionEn ?? this.descriptionEn,
      descriptionAr: descriptionAr ?? this.descriptionAr,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      maxScore: maxScore ?? this.maxScore,
      passingScore: passingScore ?? this.passingScore,
      status: status ?? this.status,
    );
  }
}

class _QuizModalSection extends StatelessWidget {
  const _QuizModalSection({
    required this.title,
    required this.eyebrow,
    required this.child,
  });

  final String title;
  final String eyebrow;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AfaqColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            eyebrow.toUpperCase(),
            style: const TextStyle(
              color: AfaqColors.slate500,
              fontSize: 11,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _PreviewPill extends StatelessWidget {
  const _PreviewPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFC7D2FE)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF4F46E5),
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
    );
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({
    required this.index,
    required this.question,
  });

  final int index;
  final _InstructorQuestion question;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _QuizMetaChip(label: 'QUESTION ${index + 1}'),
              _QuizMetaChip(label: '${question.point} PTS'),
              _QuizMetaChip(label: question.type.replaceAll('_', ' ').toUpperCase()),
              _QuizMetaChip(label: question.isRequired ? 'REQUIRED' : 'OPTIONAL'),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            question.text,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
          if (question.options.isNotEmpty) ...[
            const SizedBox(height: 12),
            for (final option in question.options)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: option.isCorrect
                        ? const Color(0xFF10B981).withValues(alpha: .12)
                        : Colors.white.withValues(alpha: .05),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: option.isCorrect
                          ? const Color(0xFF10B981).withValues(alpha: .35)
                          : Colors.white.withValues(alpha: .08),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          option.text,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (option.isCorrect)
                        const Icon(Icons.check_circle_rounded, color: Color(0xFF86EFAC), size: 18),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _AttemptSummaryCard extends StatelessWidget {
  const _AttemptSummaryCard({
    required this.attempt,
    required this.onOpen,
  });

  final _QuizAttemptResult attempt;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AfaqColors.slate200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _ResultPill(label: 'Attempt #${attempt.id}', color: AfaqColors.primary),
                    _ResultPill(label: attempt.status, color: AfaqColors.slate500),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  attempt.studentName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 4),
                if (attempt.studentEmail.isNotEmpty)
                  Text(
                    attempt.studentEmail,
                    style: const TextStyle(
                      color: AfaqColors.slate500,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    Text(
                      'Submitted: ${_formatDateTime(attempt.submittedAt)}',
                      style: const TextStyle(
                        color: AfaqColors.slate500,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Score: ${attempt.scoreLabel}',
                      style: const TextStyle(
                        color: AfaqColors.slate500,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (attempt.gradedByName.isNotEmpty)
                      Text(
                        'Graded by: ${attempt.gradedByName}',
                        style: const TextStyle(
                          color: AfaqColors.slate500,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          FilledButton.icon(
            onPressed: onOpen,
            icon: const Icon(Icons.visibility_outlined),
            label: Text(
              attempt.status.toLowerCase() == 'submitted' ? 'Review & Grade' : 'View Grade',
            ),
          ),
        ],
      ),
    );
  }
}

class _AttemptInfoCard extends StatelessWidget {
  const _AttemptInfoCard({
    required this.label,
    required this.value,
    required this.subtitle,
  });

  final String label;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AfaqColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: AfaqColors.slate500,
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AfaqColors.slate500,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _AttemptQuestionCard extends StatelessWidget {
  const _AttemptQuestionCard({
    required this.index,
    required this.question,
    required this.answer,
  });

  final int index;
  final _InstructorQuestion question;
  final _QuizAttemptAnswer? answer;

  @override
  Widget build(BuildContext context) {
    final answerText = _resolveAnswerText(question, answer);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: AfaqColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _ResultPill(label: 'Question ${index + 1}', color: AfaqColors.blue500),
              _ResultPill(label: 'Max ${question.point}', color: AfaqColors.emerald500),
              if (answer?.questionScore != null)
                _ResultPill(label: 'Earned ${answer!.questionScore}', color: AfaqColors.primary),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            question.text,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AfaqColors.slate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'STUDENT ANSWER',
                  style: TextStyle(
                    color: AfaqColors.slate500,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  answerText,
                  style: const TextStyle(
                    color: AfaqColors.foregroundLight,
                    fontWeight: FontWeight.w700,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          if (question.options.isNotEmpty) ...[
            const SizedBox(height: 12),
            for (final option in question.options)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: option.id == answer?.selectedOptionId
                        ? const Color(0xFFE0F2FE)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: option.id == answer?.selectedOptionId
                          ? const Color(0xFF38BDF8)
                          : AfaqColors.slate200,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          option.text,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      if (option.isCorrect)
                        const Icon(Icons.check_circle_rounded, color: AfaqColors.emerald600, size: 18),
                      if (option.id == answer?.selectedOptionId)
                        const Padding(
                          padding: EdgeInsets.only(left: 8),
                          child: Icon(Icons.person_pin_circle_rounded, color: AfaqColors.blue500, size: 18),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
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
        color: Colors.white.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: .10)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _DashboardChip extends StatelessWidget {
  const _DashboardChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: .10)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: .5,
        ),
      ),
    );
  }
}

class _ResultPill extends StatelessWidget {
  const _ResultPill({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: .20)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

InputDecoration _quizInputDecoration(String label) {
  return InputDecoration(
    labelText: label,
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: AfaqColors.slate200),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: AfaqColors.slate200),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: AfaqColors.primary, width: 1.3),
    ),
  );
}

String _selectedOwnerLabel({
  required _QuizFormState form,
  required List<_QuizCourse> courses,
  required List<_QuizUnit> units,
  required List<_QuizLesson> lessons,
}) {
  if (form.ownerType == _QuizOwnerType.lesson) {
    return lessons.firstWhere(
      (item) => item.id == form.lessonId,
      orElse: () => const _QuizLesson(id: 0, title: 'No lesson selected'),
    ).title;
  }
  if (form.ownerType == _QuizOwnerType.unit) {
    return units.firstWhere(
      (item) => item.id == form.unitId,
      orElse: () => const _QuizUnit(id: 0, title: 'No unit selected'),
    ).title;
  }
  return courses.firstWhere(
    (item) => item.id == form.courseId,
    orElse: () => const _QuizCourse(id: 0, title: 'No course selected'),
  ).title;
}

String _formatDateTime(String? value) {
  if (value == null || value.trim().isEmpty) return '--';
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  final local = parsed.toLocal();
  final date = '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
  final time = '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  return '$date $time';
}

String _resolveAnswerText(_InstructorQuestion question, _QuizAttemptAnswer? answer) {
  if (answer == null) return 'No answer submitted.';
  if (answer.answerText.trim().isNotEmpty) return answer.answerText.trim();
  if (answer.booleanAnswer != null) return answer.booleanAnswer! ? 'True' : 'False';
  if (answer.selectedOptionId != null) {
    for (final option in question.options) {
      if (option.id == answer.selectedOptionId) return option.text;
    }
  }
  return 'No answer submitted.';
}
