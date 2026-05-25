import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/courses_service.dart';
import '../data/quiz_attempt_service.dart';
import '../data/quiz_service.dart';
import 'student_page_shared.dart';

class StudentQuizzesPage extends StatefulWidget {
  const StudentQuizzesPage({super.key});

  @override
  State<StudentQuizzesPage> createState() => _StudentQuizzesPageState();
}

class _StudentQuizzesPageState extends State<StudentQuizzesPage> {
  final _coursesService = const CoursesService();
  final _quizService = const QuizService();
  final _attemptService = const QuizAttemptService();

  bool _loading = true;
  int? _busyQuizId;
  String? _error;
  List<_QuizRow> _quizzes = const [];

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
      final enrollmentsResponse = await _coursesService.getEnrollments();
      final enrollments = unwrapDataList(enrollmentsResponse.data);
      final quizzes = <_QuizRow>[];

      for (final enrollment in enrollments) {
        final course = asMap(enrollment['course']);
        final courseId = readInt(course?['id'] ?? enrollment['course_id']);
        if (courseId == 0) continue;
        final courseTitle = readString(
          course?['title'],
          fallback: 'Course #$courseId',
        );

        try {
          final availability = await _quizService.getQuizAvailability(courseId);
          final availabilityMap = unwrapDataMap(availability.data);
          final hasQuiz = availabilityMap['has_quiz'] == true;
          if (!hasQuiz) continue;

          final progress = await _quizService.getAssessmentProgress(courseId);
          final progressMap = unwrapDataMap(progress.data);
          final rows = asListOfMaps(progressMap['quizzes']);

          for (final row in rows) {
            final quizId = readInt(row['quiz_id'] ?? asMap(row['quiz'])?['id']);
            if (quizId == 0) continue;

            try {
              final details = await _quizService.getQuiz(quizId);
              final detailsMap = unwrapDataMap(details.data);
              quizzes.add(
                _QuizRow(
                  id: quizId,
                  title: localizedValue(
                    detailsMap['title'],
                    localeNotifier.value.languageCode,
                    fallback: 'Quiz #$quizId',
                  ),
                  description: localizedValue(
                    detailsMap['description'],
                    localeNotifier.value.languageCode,
                    fallback: 'No description.',
                  ),
                  courseId: courseId,
                  courseTitle: courseTitle,
                  durationMinutes: readInt(detailsMap['duration_minutes']),
                  attemptsLeft: readInt(row['attempts_left'], fallback: -1),
                  isPassed: row['is_passed'] == true,
                  attemptId: readInt(row['attempt_id'], fallback: 0),
                  isTaken: readString(row['status']).toLowerCase() == 'submitted' ||
                      row['is_passed'] == true,
                ),
              );
            } catch (_) {
              continue;
            }
          }
        } catch (_) {
          continue;
        }
      }

      if (!mounted) return;
      setState(() {
        _quizzes = {
          for (final quiz in quizzes) quiz.id: quiz,
        }.values.toList(growable: false);
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

  Future<void> _startQuiz(_QuizRow quiz) async {
    setState(() => _busyQuizId = quiz.id);
    try {
      final response = await _attemptService.createAttempt(quizId: quiz.id);
      final attempt = unwrapDataMap(response.data);
      final attemptId = readInt(attempt['id']);
      if (attemptId != 0) {
        await _attemptService.startAttempt(attemptId);
      }
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Attempt #$attemptId is ready for ${quiz.title}.',
        type: AfaqToastType.success,
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) {
        setState(() => _busyQuizId = null);
      }
    }
  }

  Future<void> _showGrade(_QuizRow quiz) async {
    if (quiz.attemptId == 0) {
      AfaqToast.show(
        context,
        message: 'No attempt found for this quiz.',
        type: AfaqToastType.error,
      );
      return;
    }

    try {
      final response = await _attemptService.getGrade(quiz.attemptId);
      final grade = unwrapDataMap(response.data);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: Text(quiz.title),
            content: Text(
              'Score: ${readString(grade['score'], fallback: '--')}\n'
              'Status: ${readString(grade['status'], fallback: 'graded')}',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Close'),
              ),
            ],
          );
        },
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

    return StudentPageScaffold(
      title: studentText('quizzes', lang),
      subtitle: studentText('quizzes_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? StudentErrorPanel(message: _error!, onRetry: _load)
              : _quizzes.isEmpty
                  ? StudentEmptyPanel(
                      message: studentText('empty', lang),
                      icon: Icons.quiz_outlined,
                    )
                  : GridView.builder(
                      itemCount: _quizzes.length,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 420,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 1.08,
                      ),
                      itemBuilder: (context, index) {
                        final quiz = _quizzes[index];
                        return AfaqPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                quiz.courseTitle,
                                style: const TextStyle(
                                  color: AfaqColors.slate500,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                quiz.title,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                quiz.description,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AfaqColors.slate500),
                              ),
                              const Spacer(),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _QuizChip(label: '${quiz.durationMinutes} min'),
                                  _QuizChip(
                                    label: quiz.attemptsLeft >= 0
                                        ? 'Left ${quiz.attemptsLeft}'
                                        : 'Open',
                                  ),
                                  _QuizChip(
                                    label: quiz.isPassed ? 'Passed' : 'Pending',
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                onPressed: _busyQuizId == quiz.id
                                    ? null
                                    : quiz.isTaken
                                        ? () => _showGrade(quiz)
                                        : () => _startQuiz(quiz),
                                icon: _busyQuizId == quiz.id
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Icon(
                                        quiz.isTaken
                                            ? Icons.workspace_premium_outlined
                                            : Icons.play_circle_fill_rounded,
                                      ),
                                label: Text(
                                  quiz.isTaken
                                      ? studentText('view_grade', lang)
                                      : studentText('start_quiz', lang),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
    );
  }
}

class _QuizRow {
  const _QuizRow({
    required this.id,
    required this.title,
    required this.description,
    required this.courseId,
    required this.courseTitle,
    required this.durationMinutes,
    required this.attemptsLeft,
    required this.isPassed,
    required this.attemptId,
    required this.isTaken,
  });

  final int id;
  final String title;
  final String description;
  final int courseId;
  final String courseTitle;
  final int durationMinutes;
  final int attemptsLeft;
  final bool isPassed;
  final int attemptId;
  final bool isTaken;
}

class _QuizChip extends StatelessWidget {
  const _QuizChip({required this.label});

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
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
