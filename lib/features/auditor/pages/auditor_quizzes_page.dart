import 'package:flutter/material.dart';

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

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.getQuizzes(),
        _service.getQuestions(),
      ]);
      final quizzes = unwrapAuditorList(results[0].data)
          .map(_AuditorQuiz.fromMap)
          .toList(growable: false);
      final questions = unwrapAuditorList(results[1].data)
          .map(_AuditorQuestion.fromMap)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _quizzes = quizzes;
        _questions = questions;
        _selectedQuiz = quizzes.isNotEmpty ? quizzes.first : null;
        _selectedQuestion = questions.isNotEmpty ? questions.first : null;
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
    final query = _searchController.text.trim().toLowerCase();
    final filteredQuestions = query.isEmpty
        ? _questions
        : _questions
            .where((question) => question.text.toLowerCase().contains(query))
            .toList(growable: false);

    return AuditorPageScaffold(
      title: 'Quizzes and Questions',
      subtitle: 'Scan assessments and question bank data from API.',
      onRefresh: _load,
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
                          _QuizzesPanel(
                            quizzes: _quizzes,
                            selectedQuiz: _selectedQuiz,
                            onSelect: (quiz) => setState(() => _selectedQuiz = quiz),
                          ),
                          const SizedBox(height: 16),
                          _QuestionsPanel(
                            controller: _searchController,
                            questions: filteredQuestions,
                            selectedQuestion: _selectedQuestion,
                            onSearchChanged: () => setState(() {}),
                            onQuestionSelected: (question) => setState(() => _selectedQuestion = question),
                          ),
                        ],
                      );
                    }
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 2,
                          child: _QuizzesPanel(
                            quizzes: _quizzes,
                            selectedQuiz: _selectedQuiz,
                            onSelect: (quiz) => setState(() => _selectedQuiz = quiz),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          flex: 3,
                          child: _QuestionsPanel(
                            controller: _searchController,
                            questions: filteredQuestions,
                            selectedQuestion: _selectedQuestion,
                            onSearchChanged: () => setState(() {}),
                            onQuestionSelected: (question) => setState(() => _selectedQuestion = question),
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
    return _AuditorQuiz(
      id: auditorInt(map['id']),
      title: auditorTextOf(map['title'], fallback: 'Quiz'),
      status: auditorStatus(map['status']),
      questionsCount: auditorList(map['questions']).length,
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
    return _AuditorQuestion(
      id: auditorInt(map['id']),
      text: auditorTextOf(map['question_text'], fallback: 'Question'),
      type: auditorStatus(map['type']),
      points: auditorInt(map['point']),
      required: auditorBool(map['is_required']),
      options: auditorList(map['options']).map(_QuestionOption.fromMap).toList(growable: false),
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

class _QuizzesPanel extends StatelessWidget {
  const _QuizzesPanel({
    required this.quizzes,
    required this.selectedQuiz,
    required this.onSelect,
  });

  final List<_AuditorQuiz> quizzes;
  final _AuditorQuiz? selectedQuiz;
  final ValueChanged<_AuditorQuiz> onSelect;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quizzes', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 16),
          if (quizzes.isEmpty)
            const Text('No quizzes found.')
          else
            for (final quiz in quizzes)
              InkWell(
                onTap: () => onSelect(quiz),
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: selectedQuiz?.id == quiz.id
                        ? AfaqColors.fuchsia500.withValues(alpha: .10)
                        : AfaqColors.slate100.withValues(alpha: .55),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(quiz.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          AuditorStatusChip(label: quiz.status, tone: AuditorStatusTone.hot),
                          AuditorStatusChip(label: '${quiz.questionsCount} questions'),
                        ],
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

class _QuestionsPanel extends StatelessWidget {
  const _QuestionsPanel({
    required this.controller,
    required this.questions,
    required this.selectedQuestion,
    required this.onSearchChanged,
    required this.onQuestionSelected,
  });

  final TextEditingController controller;
  final List<_AuditorQuestion> questions;
  final _AuditorQuestion? selectedQuestion;
  final VoidCallback onSearchChanged;
  final ValueChanged<_AuditorQuestion> onQuestionSelected;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: controller,
            decoration: const InputDecoration(
              hintText: 'Search questions',
              prefixIcon: Icon(Icons.search),
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
    if (questions.isEmpty) {
      return const AuditorEmptyPanel(message: 'No questions found.', icon: Icons.help_outline);
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
    if (selectedQuestion == null) {
      return const AuditorEmptyPanel(message: 'Select a question to inspect its details.', icon: Icons.help_outline);
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
          Text(selectedQuestion!.text, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AuditorStatusChip(label: selectedQuestion!.type),
              AuditorStatusChip(label: '${selectedQuestion!.points} points', tone: AuditorStatusTone.good),
              AuditorStatusChip(
                label: selectedQuestion!.required ? 'Required' : 'Optional',
                tone: selectedQuestion!.required ? AuditorStatusTone.warn : AuditorStatusTone.neutral,
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (selectedQuestion!.options.isEmpty)
            const Text('No options on this question.')
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
                      const AuditorStatusChip(label: 'Correct', tone: AuditorStatusTone.good),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
