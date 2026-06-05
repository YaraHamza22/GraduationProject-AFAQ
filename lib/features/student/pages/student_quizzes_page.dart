import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/quiz_attempt_service.dart';
import '../data/quiz_service.dart';
import 'student_page_shared.dart';
import 'student_quiz_attempt_page.dart';
import 'student_quiz_grade_page.dart';

class StudentQuizzesPage extends StatefulWidget {
  const StudentQuizzesPage({super.key});

  @override
  State<StudentQuizzesPage> createState() => _StudentQuizzesPageState();
}

class _StudentQuizzesPageState extends State<StudentQuizzesPage> {
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

  bool _isPublishedQuiz(Map<String, dynamic> quiz) {
    final status = readString(quiz['status']).toLowerCase();
    return status == 'published' || quiz['is_published'] == true;
  }

  bool _isTakenStatus(String status) {
    final normalized = status.toLowerCase();
    return normalized == 'submitted' ||
        normalized == 'graded' ||
        normalized == 'passed' ||
        normalized == 'completed' ||
        normalized == 'pending_review' ||
        normalized == 'under_review' ||
        normalized == 'awaiting_grading';
  }

  Map<String, dynamic> _parseAggregatePayload(Map<String, dynamic> payload) {
    final direct = unwrapDataMap(payload);
    if (direct.isNotEmpty) return direct;
    return const <String, dynamic>{};
  }

  int _readCourseId(Map<String, dynamic> quiz) {
    final directCourseId = readInt(quiz['course_id']);
    if (directCourseId > 0) return directCourseId;

    final quizableType = readString(quiz['quizable_type']).toLowerCase();
    if (quizableType == 'course') {
      final quizableId = readInt(quiz['quizable_id']);
      if (quizableId > 0) return quizableId;
    }

    final quizable = asMap(quiz['quizable']);
    if (quizableType == 'course') {
      return readInt(quizable?['id']);
    }
    return readInt(quizable?['course_id']);
  }

  int _attemptIdFromProgress(Map<String, dynamic> row) {
    final attempt = asMap(row['attempt']);
    for (final value in [
      row['attempt_id'],
      row['current_attempt_id'],
      row['active_attempt_id'],
      row['in_progress_attempt_id'],
      attempt?['id'],
    ]) {
      final parsed = readInt(value);
      if (parsed > 0) return parsed;
    }
    return 0;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final lang = localeNotifier.value.languageCode;
      final responses = await Future.wait([
        _quizService.getMeWithQuizzes(),
        _attemptService.getAttempts(perPage: 200),
      ]);

      final aggregate = _parseAggregatePayload(
        unwrapDataMap(responses[0].data),
      );
      final courses = asListOfMaps(aggregate['courses']);
      final quizzes = asListOfMaps(aggregate['quizzes']);
      final attempts = unwrapDataList(responses[1].data);

      final courseTitleById = <int, String>{};
      for (final course in courses) {
        final courseId = readInt(course['course_id'] ?? course['id']);
        if (courseId == 0) continue;
        courseTitleById[courseId] = localizedValue(
          course['title_translations'] ?? course['title'],
          lang,
          fallback: readString(course['title'], fallback: 'Course #$courseId'),
        );
      }

      final latestAttemptByQuizId = <int, _LatestAttempt>{};
      final sortedAttempts = attempts
          .map((item) => asMap(item))
          .whereType<Map<String, dynamic>>()
          .toList(growable: false)
        ..sort(
          (a, b) => readInt(b['id']).compareTo(readInt(a['id'])),
        );
      for (final attempt in sortedAttempts) {
        final quizId = readInt(attempt['quiz_id'] ?? asMap(attempt['quiz'])?['id']);
        final attemptId = readInt(attempt['id']);
        if (quizId == 0 || attemptId == 0 || latestAttemptByQuizId.containsKey(quizId)) {
          continue;
        }
        latestAttemptByQuizId[quizId] = _LatestAttempt(
          id: attemptId,
          status: readString(
            attempt['status'] ??
                attempt['attempt_status'] ??
                attempt['grading_status'],
          ),
          isPassed: attempt['is_passed'] == true,
        );
      }

      final dedupedByQuizId = <int, _QuizRow>{};
      for (final quiz in quizzes) {
        if (!_isPublishedQuiz(quiz)) continue;
        final quizId = readInt(quiz['id']);
        if (quizId == 0) continue;

        final courseId = _readCourseId(quiz);
        final latestAttempt = latestAttemptByQuizId[quizId];
        final attemptsLeft = quiz.containsKey('attempts_left')
            ? readInt(quiz['attempts_left'], fallback: -1)
            : -1;
        final isPassed = quiz['is_passed'] == true || (latestAttempt?.isPassed ?? false);
        final status = readString(
          quiz['status'] ??
              quiz['attempt_status'] ??
              quiz['grading_status'] ??
              latestAttempt?.status,
        );

        dedupedByQuizId[quizId] = _QuizRow(
          id: quizId,
          title: localizedValue(
            quiz['title'],
            lang,
            fallback: 'Quiz #$quizId',
          ),
          description: localizedValue(
            quiz['description'],
            lang,
            fallback: 'No description.',
          ),
          courseId: courseId,
          courseTitle: courseTitleById[courseId] ??
              (courseId == 0 ? 'Your course' : 'Course #$courseId'),
          durationMinutes: readInt(quiz['duration_minutes']),
          attemptsLeft: attemptsLeft,
          isPassed: isPassed,
          attemptId: latestAttempt?.id ?? _attemptIdFromProgress(quiz),
          isTaken: quiz['is_taken'] == true ||
              quiz['is_completed'] == true ||
              isPassed ||
              _isTakenStatus(status),
        );
      }

      final normalized = dedupedByQuizId.values.toList(growable: false);
      normalized.sort((a, b) {
        final readyCompare = a.isTaken == b.isTaken ? 0 : (a.isTaken ? 1 : -1);
        if (readyCompare != 0) return readyCompare;
        final courseCompare = a.courseTitle.compareTo(b.courseTitle);
        if (courseCompare != 0) return courseCompare;
        return a.id.compareTo(b.id);
      });

      if (!mounted) return;
      setState(() {
        _quizzes = normalized;
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
    if (quiz.isTaken ||
        quiz.isPassed ||
        (quiz.attemptsLeft >= 0 && quiz.attemptsLeft <= 0)) {
      AfaqToast.show(
        context,
        message: 'This quiz is already completed and cannot be taken again.',
        type: AfaqToastType.error,
      );
      return;
    }

    setState(() => _busyQuizId = quiz.id);
    try {
      final response = await _attemptService.getAttemptWorkspace(quiz.id);
      final workspace = unwrapDataMap(response.data);
      final attemptId = readInt(
        workspace['id'] ?? workspace['attempt_id'] ?? quiz.attemptId,
      );

      if (attemptId == 0) {
        throw StateError('Could not start quiz attempt.');
      }

      if (!mounted) return;
      final completed = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => StudentQuizAttemptPage(
            quizId: quiz.id,
            courseId: quiz.courseId,
            attemptId: attemptId,
            quizTitle: quiz.title,
          ),
        ),
      );

      if (completed == true && mounted) {
        await _load();
      }
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString().replaceFirst('Bad state: ', ''),
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) {
        setState(() => _busyQuizId = null);
      }
    }
  }

  Future<void> _openGrade(_QuizRow quiz) async {
    if (quiz.attemptId == 0) {
      AfaqToast.show(
        context,
        message: 'No attempt was found for this quiz grade.',
        type: AfaqToastType.error,
      );
      return;
    }

    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => StudentQuizGradePage(
          quizId: quiz.id,
          courseId: quiz.courseId,
          attemptId: quiz.attemptId,
          quizTitle: quiz.title,
        ),
      ),
    );
    if (mounted) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final width = MediaQuery.sizeOf(context).width;

    return StudentPageScaffold(
      title: studentText('quizzes', lang),
      subtitle: studentText('quizzes_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? StudentErrorPanel(message: _error!, onRetry: _load)
              : Column(
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
                            Color(0xFF1D4ED8),
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
                              'QUIZZES',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.6,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            'Course quizzes, loaded with one fast pass.',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Open attempts instantly, see remaining tries, and jump back into grades without extra screen-by-screen fetching.',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: .72),
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 18),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: [
                              _HeroMetric(label: 'Total', value: '${_quizzes.length}'),
                              _HeroMetric(
                                label: 'Ready',
                                value: '${_quizzes.where((quiz) => !quiz.isTaken).length}',
                              ),
                              _HeroMetric(
                                label: 'Taken',
                                value: '${_quizzes.where((quiz) => quiz.isTaken).length}',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    if (_quizzes.isEmpty)
                      StudentEmptyPanel(
                        message: studentText('empty', lang),
                        icon: Icons.quiz_outlined,
                      )
                    else
                      GridView.builder(
                        itemCount: _quizzes.length,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: width >= 1280 ? 420 : 520,
                          mainAxisSpacing: 16,
                          crossAxisSpacing: 16,
                          childAspectRatio: width >= 900 ? 1.08 : 1.0,
                        ),
                        itemBuilder: (context, index) {
                          final quiz = _quizzes[index];
                          final isBusy = _busyQuizId == quiz.id;
                          return AfaqPanel(
                            dark: true,
                            radius: 28,
                            padding: const EdgeInsets.all(22),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  quiz.courseTitle,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: .55),
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: .4,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  quiz.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                      ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  quiz.description,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: .70),
                                    height: 1.4,
                                  ),
                                ),
                                const Spacer(),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    _QuizChip(
                                      label: 'ID: ${quiz.id}',
                                      tone: Colors.white.withValues(alpha: .86),
                                    ),
                                    _QuizChip(
                                      label: '${quiz.durationMinutes} MIN',
                                      tone: const Color(0xFF67E8F9),
                                    ),
                                    _QuizChip(
                                      label: quiz.attemptsLeft >= 0
                                          ? 'LEFT: ${quiz.attemptsLeft}'
                                          : 'LEFT: --',
                                      tone: const Color(0xFF93C5FD),
                                    ),
                                    _QuizChip(
                                      label: quiz.isTaken ? 'STATUS: TAKEN' : 'STATUS: READY',
                                      tone: quiz.isTaken
                                          ? const Color(0xFF86EFAC)
                                          : const Color(0xFFFDE68A),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton.icon(
                                    onPressed: isBusy
                                        ? null
                                        : quiz.isTaken
                                            ? () => _openGrade(quiz)
                                            : () => _startQuiz(quiz),
                                    style: FilledButton.styleFrom(
                                      backgroundColor: quiz.isTaken
                                          ? AfaqColors.emerald600
                                          : AfaqColors.primaryButton,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 18,
                                        vertical: 14,
                                      ),
                                    ),
                                    icon: isBusy
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
                                      quiz.isTaken ? 'Open Grade' : studentText('start_quiz', lang),
                                    ),
                                  ),
                                ),
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

class _LatestAttempt {
  const _LatestAttempt({
    required this.id,
    required this.status,
    required this.isPassed,
  });

  final int id;
  final String status;
  final bool isPassed;
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
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: .10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: .60),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: .6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuizChip extends StatelessWidget {
  const _QuizChip({
    required this.label,
    this.tone = Colors.white,
  });

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: .25)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: tone,
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: .4,
        ),
      ),
    );
  }
}
