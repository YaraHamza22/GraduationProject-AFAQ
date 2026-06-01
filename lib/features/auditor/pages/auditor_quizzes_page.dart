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
  bool _detailsLoading = false;
  String? _error;
  int _quizzesPage = 1;
  int _quizzesTotalPages = 1;
  int _questionsPage = 1;
  final int _quizzesPerPage = 12;
  final int _questionsPerPage = 8;
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

  Future<void> _load({bool preserveQuiz = false}) async {
    final selectedQuizId = preserveQuiz ? _selectedQuiz?.id : null;
    final selectedQuestionId = preserveQuiz ? _selectedQuestion?.id : null;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _service.getQuizzes(
        perPage: _quizzesPerPage,
        page: _quizzesPage,
      );
      final quizzes = unwrapAuditorList(response.data)
          .map(_AuditorQuiz.fromMap)
          .toList(growable: false);
      final pagination = auditorPaginationOf(response.data);

      _AuditorQuiz? selectedQuiz = quizzes.isNotEmpty ? quizzes.first : null;
      if (selectedQuizId != null) {
        for (final quiz in quizzes) {
          if (quiz.id == selectedQuizId) {
            selectedQuiz = quiz;
            break;
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _quizzes = quizzes;
        _selectedQuiz = selectedQuiz;
        _quizzesTotalPages =
            auditorInt(pagination['total_pages'], fallback: 1).clamp(1, 9999);
        _loading = false;
      });

      if (selectedQuiz != null) {
        await _loadQuizDetail(
          selectedQuiz,
          preferredQuestionId: selectedQuestionId,
        );
      } else if (mounted) {
        setState(() {
          _questions = const [];
          _selectedQuestion = null;
          _questionsPage = 1;
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

  Future<void> _loadQuizDetail(
    _AuditorQuiz quiz, {
    int? preferredQuestionId,
  }) async {
    setState(() {
      _selectedQuiz = quiz;
      _detailsLoading = true;
      _questionsPage = 1;
      _error = null;
    });

    try {
      final response = await _service.getQuiz(quiz.id);
      final payload = unwrapAuditorMap(response.data);
      final detailedQuiz = _AuditorQuiz.fromMap(payload);
      final questions = auditorList(payload['questions'])
          .map(_AuditorQuestion.fromMap)
          .toList(growable: false);

      _AuditorQuestion? selectedQuestion =
          questions.isNotEmpty ? questions.first : null;
      if (preferredQuestionId != null) {
        for (final question in questions) {
          if (question.id == preferredQuestionId) {
            selectedQuestion = question;
            break;
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _selectedQuiz = detailedQuiz;
        _questions = questions;
        _selectedQuestion = selectedQuestion;
        _detailsLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _questions = const [];
        _selectedQuestion = null;
        _detailsLoading = false;
        _error = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final query = _searchController.text.trim().toLowerCase();
    final filteredQuestions = query.isEmpty
        ? _questions
        : _questions
            .where((question) => question.text.toLowerCase().contains(query))
            .toList(growable: false);
    final questionsTotalPages = filteredQuestions.isEmpty
        ? 1
        : ((filteredQuestions.length + _questionsPerPage - 1) ~/ _questionsPerPage);
    final normalizedQuestionsPage = _questionsPage > questionsTotalPages
        ? questionsTotalPages
        : _questionsPage < 1
            ? 1
            : _questionsPage;
    final start = filteredQuestions.isEmpty
        ? 0
        : (normalizedQuestionsPage - 1) * _questionsPerPage;
    final end = filteredQuestions.isEmpty
        ? 0
        : (start + _questionsPerPage > filteredQuestions.length
            ? filteredQuestions.length
            : start + _questionsPerPage);
    final pagedQuestions = filteredQuestions.isEmpty
        ? const <_AuditorQuestion>[]
        : filteredQuestions.sublist(start, end);

    return AuditorPageScaffold(
      title: auditorText('quizzes', lang),
      subtitle: auditorText('quizzes_subtitle', lang),
      onRefresh: () => _load(preserveQuiz: true),
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && _quizzes.isEmpty
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final stacked = constraints.maxWidth < 1000;
                    final workspace = _QuestionWorkspace(
                      controller: _searchController,
                      questions: pagedQuestions,
                      selectedQuestion: _selectedQuestion,
                      questionsPage: normalizedQuestionsPage,
                      questionsTotalPages: questionsTotalPages,
                      detailsLoading: _detailsLoading,
                      onSearchChanged: () => setState(() => _questionsPage = 1),
                      onQuestionSelected: (question) =>
                          setState(() => _selectedQuestion = question),
                      onPreviousPage: normalizedQuestionsPage > 1
                          ? () => setState(() => _questionsPage -= 1)
                          : null,
                      onNextPage: normalizedQuestionsPage < questionsTotalPages
                          ? () => setState(() => _questionsPage += 1)
                          : null,
                    );

                    final rail = _QuizRail(
                      quizzes: _quizzes,
                      selectedQuiz: _selectedQuiz,
                      currentPage: _quizzesPage,
                      totalPages: _quizzesTotalPages,
                      onSelect: (quiz) => _loadQuizDetail(quiz),
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
                    );

                    if (stacked) {
                      return Column(
                        children: [
                          rail,
                          const SizedBox(height: 16),
                          workspace,
                        ],
                      );
                    }

                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(flex: 2, child: rail),
                        const SizedBox(width: 16),
                        Expanded(flex: 3, child: workspace),
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
      questionsCount: auditorInt(
        map['questions_count'],
        fallback: auditorList(map['questions']).length,
      ),
    );
  }
}

class _AuditorQuestion {
  const _AuditorQuestion({
    required this.id,
    required this.text,
    required this.type,
    required this.points,
    required this.required,
    required this.options,
  });

  final int id;
  final String text;
  final String type;
  final int points;
  final bool required;
  final List<_QuestionOption> options;

  factory _AuditorQuestion.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _AuditorQuestion(
      id: auditorInt(map['id']),
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
    required this.detailsLoading,
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
  final bool detailsLoading;
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
          if (detailsLoading) const LinearProgressIndicator(),
          if (detailsLoading) const SizedBox(height: 16),
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

    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: .05)
            : AfaqColors.slate100.withValues(alpha: .45),
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
                  color: isDark
                      ? Colors.white.withValues(alpha: .08)
                      : Colors.white,
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
