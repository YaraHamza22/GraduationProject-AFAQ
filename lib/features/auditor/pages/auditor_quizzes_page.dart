import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/auditor_quiz_service.dart';
import 'auditor_page_shared.dart';

class AuditorQuizzesPage extends StatefulWidget {
  const AuditorQuizzesPage({super.key});

  @override
  State<AuditorQuizzesPage> createState() => _AuditorQuizzesPageState();
}

class _AuditorQuizzesPageState extends State<AuditorQuizzesPage> {
  final _service = const AuditorQuizService();
  final _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  int _quizzesPage = 1;
  int _quizzesTotalPages = 1;
  int _questionsPage = 1;
  int _questionsTotalPages = 1;
  final int _quizzesPerPage = 12;
  final int _questionsPerPage = 24;
  List<_AuditorQuiz> _quizzes = const [];
  List<_AuditorQuestion> _questions = const [];
  _AuditorQuiz? _selectedQuiz;
  _AuditorQuestion? _selectedQuestion;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  _AuditorQuestion? _firstQuestionForQuiz(
    List<_AuditorQuestion> questions,
    _AuditorQuiz? quiz,
  ) {
    if (quiz == null) {
      return questions.isNotEmpty ? questions.first : null;
    }
    for (final question in questions) {
      if (question.quizId == quiz.id) return question;
    }
    return null;
  }

  Future<void> _load({bool preserveQuiz = false}) async {
    final selectedQuizId = preserveQuiz ? _selectedQuiz?.id : null;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.getQuizzes(perPage: _quizzesPerPage, page: _quizzesPage),
        _service.getQuestions(perPage: _questionsPerPage, page: _questionsPage),
      ]);
      final quizzes = unwrapAuditorList(results[0].data)
          .map(_AuditorQuiz.fromMap)
          .toList(growable: false);
      final questions = unwrapAuditorList(results[1].data)
          .map(_AuditorQuestion.fromMap)
          .toList(growable: false);
      final quizzesPagination = auditorPaginationOf(results[0].data);
      final questionsPagination = auditorPaginationOf(results[1].data);

      _AuditorQuiz? nextQuiz = quizzes.isNotEmpty ? quizzes.first : null;
      if (selectedQuizId != null) {
        for (final quiz in quizzes) {
          if (quiz.id == selectedQuizId) {
            nextQuiz = quiz;
            break;
          }
        }
      }
      if (!mounted) return;
      setState(() {
        _quizzes = quizzes;
        _questions = questions;
        _selectedQuiz = nextQuiz;
        _selectedQuestion = _firstQuestionForQuiz(questions, nextQuiz);
        _quizzesTotalPages =
            auditorInt(quizzesPagination['total_pages'], fallback: 1).clamp(1, 9999);
        _questionsTotalPages =
            auditorInt(questionsPagination['total_pages'], fallback: 1).clamp(1, 9999);
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

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final query = _searchController.text.trim().toLowerCase();
    final quizScopedQuestions = _selectedQuiz == null
        ? _questions
        : _questions
            .where((question) => question.quizId == _selectedQuiz!.id)
            .toList(growable: false);
    final filteredQuestions = query.isEmpty
        ? quizScopedQuestions
        : quizScopedQuestions
            .where((question) => question.text.toLowerCase().contains(query))
            .toList(growable: false);

    return AuditorPageScaffold(
      title: auditorText('quizzes', lang),
      subtitle: auditorText('quizzes_subtitle', lang),
      onRefresh: () => _load(preserveQuiz: true),
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final stacked = constraints.maxWidth < 1000;
                    if (stacked) {
                      return Column(
                        children: [
                          _QuizRail(
                            quizzes: _quizzes,
                            selectedQuiz: _selectedQuiz,
                            currentPage: _quizzesPage,
                            totalPages: _quizzesTotalPages,
                            onSelect: (quiz) => setState(() {
                              _selectedQuiz = quiz;
                              _selectedQuestion = _firstQuestionForQuiz(_questions, quiz);
                            }),
                            onPreviousPage: _quizzesPage > 1
                                ? () {
                                    setState(() => _quizzesPage -= 1);
                                    _load(preserveQuiz: true);
                                  }
                                : null,
                            onNextPage: _quizzesPage < _quizzesTotalPages
                                ? () {
                                    setState(() => _quizzesPage += 1);
                                    _load(preserveQuiz: true);
                                  }
                                : null,
                          ),
                          const SizedBox(height: 16),
                          _QuestionWorkspace(
                            controller: _searchController,
                            questions: filteredQuestions,
                            selectedQuestion: _selectedQuestion,
                            questionsPage: _questionsPage,
                            questionsTotalPages: _questionsTotalPages,
                            onSearchChanged: () => setState(() {}),
                            onQuestionSelected: (question) =>
                                setState(() => _selectedQuestion = question),
                            onPreviousPage: _questionsPage > 1
                                ? () {
                                    setState(() => _questionsPage -= 1);
                                    _load(preserveQuiz: true);
                                  }
                                : null,
                            onNextPage: _questionsPage < _questionsTotalPages
                                ? () {
                                    setState(() => _questionsPage += 1);
                                    _load(preserveQuiz: true);
                                  }
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
                          child: _QuizRail(
                            quizzes: _quizzes,
                            selectedQuiz: _selectedQuiz,
                            currentPage: _quizzesPage,
                            totalPages: _quizzesTotalPages,
                            onSelect: (quiz) => setState(() {
                              _selectedQuiz = quiz;
                              _selectedQuestion = _firstQuestionForQuiz(_questions, quiz);
                            }),
                            onPreviousPage: _quizzesPage > 1
                                ? () {
                                    setState(() => _quizzesPage -= 1);
                                    _load(preserveQuiz: true);
                                  }
                                : null,
                            onNextPage: _quizzesPage < _quizzesTotalPages
                                ? () {
                                    setState(() => _quizzesPage += 1);
                                    _load(preserveQuiz: true);
                                  }
                                : null,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          flex: 3,
                          child: _QuestionWorkspace(
                            controller: _searchController,
                            questions: filteredQuestions,
                            selectedQuestion: _selectedQuestion,
                            questionsPage: _questionsPage,
                            questionsTotalPages: _questionsTotalPages,
                            onSearchChanged: () => setState(() {}),
                            onQuestionSelected: (question) =>
                                setState(() => _selectedQuestion = question),
                            onPreviousPage: _questionsPage > 1
                                ? () {
                                    setState(() => _questionsPage -= 1);
                                    _load(preserveQuiz: true);
                                  }
                                : null,
                            onNextPage: _questionsPage < _questionsTotalPages
                                ? () {
                                    setState(() => _questionsPage += 1);
                                    _load(preserveQuiz: true);
                                  }
                                : null,
                          ),
                        ),
                      ],
                    );
                  },
                ),
    );
  }
}

class _AuditorQuiz {
  const _AuditorQuiz({
    required this.id,
    required this.title,
    required this.status,
    required this.questionsCount,
  });

  final int id;
  final String title;
  final String status;
  final int questionsCount;

  factory _AuditorQuiz.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _AuditorQuiz(
      id: auditorInt(map['id']),
      title: auditorTextOf(
        map['title'],
        fallback: auditorText('quizzes', lang),
      ),
      status: auditorStatus(map['status']),
      questionsCount: auditorList(map['questions']).length,
    );
  }
}

class _AuditorQuestion {
  const _AuditorQuestion({
    required this.id,
    required this.quizId,
    required this.text,
    required this.type,
    required this.points,
    required this.required,
    required this.options,
  });

  final int id;
  final int quizId;
  final String text;
  final String type;
  final int points;
  final bool required;
  final List<_QuestionOption> options;

  factory _AuditorQuestion.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _AuditorQuestion(
      id: auditorInt(map['id']),
      quizId: auditorInt(map['quiz_id']),
      text: auditorTextOf(
        map['question_text'] ?? map['text'],
        fallback: auditorText('select_question', lang),
      ),
      type: auditorStatus(map['type']),
      points: auditorInt(map['point']),
      required: auditorBool(map['is_required']),
      options: auditorList(map['options'])
          .map(_QuestionOption.fromMap)
          .toList(growable: false),
    );
  }
}

class _QuestionOption {
  const _QuestionOption({
    required this.id,
    required this.text,
    required this.correct,
  });

  final int id;
  final String text;
  final bool correct;

  factory _QuestionOption.fromMap(Map<String, dynamic> map) {
    return _QuestionOption(
      id: auditorInt(map['id']),
      text: auditorTextOf(map['option_text'], fallback: 'Option'),
      correct: auditorBool(map['is_correct']),
    );
  }
}

class _QuizRail extends StatelessWidget {
  const _QuizRail({
    required this.quizzes,
    required this.selectedQuiz,
    required this.currentPage,
    required this.totalPages,
    required this.onSelect,
    required this.onPreviousPage,
    required this.onNextPage,
  });

  final List<_AuditorQuiz> quizzes;
  final _AuditorQuiz? selectedQuiz;
  final int currentPage;
  final int totalPages;
  final ValueChanged<_AuditorQuiz> onSelect;
  final VoidCallback? onPreviousPage;
  final VoidCallback? onNextPage;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            auditorText('quizzes', lang),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 16),
          if (quizzes.isEmpty)
            AuditorEmptyPanel(
              message: auditorText('empty', lang),
              icon: Icons.rule_folder_outlined,
            )
          else
            for (final quiz in quizzes)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () => onSelect(quiz),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: selectedQuiz?.id == quiz.id
                          ? const Color(0xFF111827)
                          : AfaqColors.slate100.withValues(alpha: .55),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          quiz.title,
                          style: TextStyle(
                            color: selectedQuiz?.id == quiz.id
                                ? Colors.white
                                : AfaqColors.foregroundLight,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            AuditorStatusChip(
                              label: quiz.status,
                              tone: AuditorStatusTone.hot,
                            ),
                            AuditorStatusChip(
                              label: auditorFormatText(
                                'question_count',
                                lang,
                                values: {'count': '${quiz.questionsCount}'},
                              ),
                              tone: AuditorStatusTone.info,
                            ),
                          ],
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

class _QuestionWorkspace extends StatelessWidget {
  const _QuestionWorkspace({
    required this.controller,
    required this.questions,
    required this.selectedQuestion,
    required this.questionsPage,
    required this.questionsTotalPages,
    required this.onSearchChanged,
    required this.onQuestionSelected,
    required this.onPreviousPage,
    required this.onNextPage,
  });

  final TextEditingController controller;
  final List<_AuditorQuestion> questions;
  final _AuditorQuestion? selectedQuestion;
  final int questionsPage;
  final int questionsTotalPages;
  final VoidCallback onSearchChanged;
  final ValueChanged<_AuditorQuestion> onQuestionSelected;
  final VoidCallback? onPreviousPage;
  final VoidCallback? onNextPage;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: controller,
            decoration: InputDecoration(
              hintText: auditorText('search_questions', lang),
              prefixIcon: const Icon(Icons.search),
            ),
            onChanged: (_) => onSearchChanged(),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final stacked = constraints.maxWidth < 760;
              if (stacked) {
                return Column(
                  children: [
                    _QuestionsList(
                      questions: questions,
                      selectedQuestion: selectedQuestion,
                      onQuestionSelected: onQuestionSelected,
                    ),
                    const SizedBox(height: 16),
                    _QuestionDetail(selectedQuestion: selectedQuestion),
                  ],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _QuestionsList(
                      questions: questions,
                      selectedQuestion: selectedQuestion,
                      onQuestionSelected: onQuestionSelected,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: _QuestionDetail(selectedQuestion: selectedQuestion)),
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          AuditorPaginationBar(
            currentPage: questionsPage,
            totalPages: questionsTotalPages,
            onPrevious: onPreviousPage,
            onNext: onNextPage,
          ),
        ],
      ),
    );
  }
}

class _QuestionsList extends StatelessWidget {
  const _QuestionsList({
    required this.questions,
    required this.selectedQuestion,
    required this.onQuestionSelected,
  });

  final List<_AuditorQuestion> questions;
  final _AuditorQuestion? selectedQuestion;
  final ValueChanged<_AuditorQuestion> onQuestionSelected;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    if (questions.isEmpty) {
      return AuditorEmptyPanel(
        message: auditorText('no_questions', lang),
        icon: Icons.help_outline,
      );
    }
    return Column(
      children: [
        for (final question in questions)
          InkWell(
            onTap: () => onQuestionSelected(question),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: selectedQuestion?.id == question.id
                    ? AfaqColors.slate950
                    : AfaqColors.slate100.withValues(alpha: .55),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                question.text,
                style: TextStyle(
                  color: selectedQuestion?.id == question.id ? Colors.white : null,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _QuestionDetail extends StatelessWidget {
  const _QuestionDetail({required this.selectedQuestion});

  final _AuditorQuestion? selectedQuestion;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    if (selectedQuestion == null) {
      return AuditorEmptyPanel(
        message: auditorText('select_question', lang),
        icon: Icons.help_outline,
      );
    }
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AfaqColors.slate100.withValues(alpha: .45),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            selectedQuestion!.text,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AuditorStatusChip(label: selectedQuestion!.type),
              AuditorStatusChip(
                label: auditorFormatText(
                  'points',
                  lang,
                  values: {'count': '${selectedQuestion!.points}'},
                ),
                tone: AuditorStatusTone.good,
              ),
              AuditorStatusChip(
                label: selectedQuestion!.required
                    ? auditorText('required', lang)
                    : auditorText('optional', lang),
                tone: selectedQuestion!.required
                    ? AuditorStatusTone.warn
                    : AuditorStatusTone.neutral,
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (selectedQuestion!.options.isEmpty)
            Text(auditorText('no_questions', lang))
          else
            for (final option in selectedQuestion!.options)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Expanded(child: Text(option.text)),
                    if (option.correct)
                      AuditorStatusChip(
                        label: auditorText('correct', lang),
                        tone: AuditorStatusTone.good,
                      ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
