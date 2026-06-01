import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/session/session_store.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/courses_service.dart';
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

  List<Map<String, dynamic>> _parseAssessmentProgressRows(
    Map<String, dynamic> payload,
  ) {
    final direct = asListOfMaps(payload['quizzes']);
    if (direct.isNotEmpty) return direct;
    final progress = asMap(payload['progress']);
    return asListOfMaps(progress?['quizzes']);
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

  Future<List<_QuizRow>> _loadCourseQuizzes(
    _CourseEntry course,
    String lang,
  ) async {
    try {
      final responses = await Future.wait([
        _quizService.getQuizAvailability(course.id),
        _quizService.getAssessmentProgress(course.id),
      ]);

      final availabilityMap = unwrapDataMap(responses[0].data);
      final hasQuiz = availabilityMap['has_quiz'] == true;
      final isEnrolled = availabilityMap['is_enrolled'] != false;
      final quizzesCount = readInt(availabilityMap['quizzes_count']);
      if (!isEnrolled || !hasQuiz || quizzesCount <= 0) {
        return const [];
      }

      final rows = _parseAssessmentProgressRows(
        unwrapDataMap(responses[1].data),
      );
      final quizFutures = rows.map((row) async {
        final quizId = readInt(row['quiz_id'] ?? asMap(row['quiz'])?['id']);
        if (quizId == 0) return null;

        try {
          final detailsResponse = await _quizService.getQuiz(quizId);
          final details = unwrapDataMap(detailsResponse.data);
          if (!_isPublishedQuiz(details)) return null;

          final attemptsLeft = readInt(row['attempts_left'], fallback: -1);
          final isPassed = row['is_passed'] == true;
          final attemptId = _attemptIdFromProgress(row);
          final status = readString(
            row['status'] ?? row['attempt_status'] ?? row['grading_status'],
          );

          return _QuizRow(
            id: readInt(details['id'], fallback: quizId),
            title: localizedValue(
              details['title'],
              lang,
              fallback: 'Quiz #$quizId',
            ),
            description: localizedValue(
              details['description'],
              lang,
              fallback: 'No description.',
            ),
            courseId: course.id,
            courseTitle: course.title,
            durationMinutes: readInt(details['duration_minutes']),
            attemptsLeft: attemptsLeft,
            isPassed: isPassed,
            attemptId: attemptId,
            isTaken: isPassed ||
                (attemptsLeft == 0 && attemptsLeft != -1) ||
                _isTakenStatus(status),
          );
        } catch (_) {
          return null;
        }
      });

      return (await Future.wait(quizFutures))
          .whereType<_QuizRow>()
          .toList(growable: false);
    } catch (_) {
      return const [];
    }
  }

  Future<List<_QuizRow>> _loadFallbackCourseQuizzes(
    _CourseEntry course,
    String lang,
  ) async {
    try {
      final response = await _quizService.getQuizzes(
        courseId: course.id,
        perPage: 100,
      );
      final rows = unwrapDataList(response.data);
      return rows
          .where(_isPublishedQuiz)
          .map((quiz) {
            final id = readInt(quiz['id']);
            if (id == 0) return null;
            return _QuizRow(
              id: id,
              title: localizedValue(
                quiz['title'],
                lang,
                fallback: 'Quiz #$id',
              ),
              description: localizedValue(
                quiz['description'],
                lang,
                fallback: 'No description.',
              ),
              courseId: course.id,
              courseTitle: course.title,
              durationMinutes: readInt(quiz['duration_minutes']),
              attemptsLeft: -1,
              isPassed: false,
              attemptId: 0,
              isTaken: false,
            );
          })
          .whereType<_QuizRow>()
          .toList(growable: false);
    } catch (_) {
      return const [];
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final lang = localeNotifier.value.languageCode;
      final enrollmentsResponse = await _coursesService.getEnrollments();
      final enrollments = unwrapDataList(enrollmentsResponse.data);

      final enrolledCourses = <_CourseEntry>[];
      for (final enrollment in enrollments) {
        final course = asMap(enrollment['course']);
        final courseId = readInt(course?['id'] ?? enrollment['course_id']);
        if (courseId == 0) continue;
        enrolledCourses.add(
          _CourseEntry(
            id: courseId,
            title: localizedValue(
              course?['title_translations'],
              lang,
              fallback: readString(course?['title'], fallback: 'Course #$courseId'),
            ),
          ),
        );
      }

      final uniqueCourses = {
        for (final course in enrolledCourses) course.id: course,
      }.values.toList(growable: false);

      final merged = (await Future.wait(
        uniqueCourses.map((course) => _loadCourseQuizzes(course, lang)),
      ))
          .expand((rows) => rows)
          .toList(growable: true);

      if (merged.isEmpty) {
        merged.addAll(
          (await Future.wait(
            uniqueCourses.map((course) => _loadFallbackCourseQuizzes(course, lang)),
          ))
              .expand((rows) => rows),
        );
      }

      if (merged.isEmpty) {
        try {
          final response = await _quizService.getQuizzes(perPage: 100);
          final rows = unwrapDataList(response.data);
          for (final quiz in rows) {
            if (!_isPublishedQuiz(quiz)) continue;
            final id = readInt(quiz['id']);
            if (id == 0) continue;
            final courseId = readInt(quiz['course_id'] ?? quiz['quizable_id']);
            merged.add(
              _QuizRow(
                id: id,
                title: localizedValue(
                  quiz['title'],
                  lang,
                  fallback: 'Quiz #$id',
                ),
                description: localizedValue(
                  quiz['description'],
                  lang,
                  fallback: 'No description.',
                ),
                courseId: courseId,
                courseTitle: courseId == 0 ? 'Course' : 'Course #$courseId',
                durationMinutes: readInt(quiz['duration_minutes']),
                attemptsLeft: -1,
                isPassed: false,
                attemptId: 0,
                isTaken: false,
              ),
            );
          }
        } catch (_) {
          // Keep empty state.
        }
      }

      var deduped = {
        for (final quiz in merged) quiz.id: quiz,
      }.values.toList(growable: false);

      try {
        final attemptsResponse = await _attemptService.getAttempts(
          studentId: SessionStore.instance.userId,
          perPage: 200,
        );
        final attempts = unwrapDataList(attemptsResponse.data);
        final latestByQuiz = <int, Map<String, dynamic>>{};

        for (final item in attempts) {
          final quizId = readInt(item['quiz_id'] ?? asMap(item['quiz'])?['id']);
          final attemptId = readInt(item['id']);
          if (quizId == 0 || attemptId == 0) continue;
          latestByQuiz.putIfAbsent(quizId, () => item);
        }

        deduped = deduped.map((quiz) {
          final latest = latestByQuiz[quiz.id];
          if (latest == null) return quiz;
          final status = readString(
            latest['status'] ??
                latest['attempt_status'] ??
                latest['grading_status'],
          );
          return quiz.copyWith(
            attemptId: quiz.attemptId != 0
                ? quiz.attemptId
                : readInt(latest['id']),
            isTaken: quiz.isTaken || _isTakenStatus(status),
          );
        }).toList(growable: false);
      } catch (_) {
        // Keep deduped values.
      }

      if (!mounted) return;
      setState(() {
        _quizzes = deduped;
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
      int attemptId = quiz.attemptId;

      if (attemptId == 0) {
        try {
          final createResponse = await _attemptService.createAttempt(
            quizId: quiz.id,
            studentId: SessionStore.instance.userId,
          );
          attemptId = readInt(unwrapDataMap(createResponse.data)['id']);
        } catch (_) {
          // Keep fallback flow.
        }
      }

      if (attemptId == 0 && quiz.courseId != 0) {
        try {
          final progressResponse = await _quizService.getAssessmentProgress(
            quiz.courseId,
          );
          final rows = _parseAssessmentProgressRows(
            unwrapDataMap(progressResponse.data),
          );
          Map<String, dynamic>? row;
          for (final item in rows) {
            final quizId = readInt(item['quiz_id'] ?? asMap(item['quiz'])?['id']);
            if (quizId == quiz.id) {
              row = item;
              break;
            }
          }

          if (row != null) {
            final attemptsLeft = readInt(row['attempts_left'], fallback: -1);
            final blocked = row['is_passed'] == true ||
                (attemptsLeft >= 0 && attemptsLeft <= 0) ||
                _isTakenStatus(readString(row['status']));
            if (blocked) {
              throw StateError(
                'This quiz is already completed and cannot be taken again.',
              );
            }
            attemptId = _attemptIdFromProgress(row);
          }
        } catch (error) {
          if (error is StateError) rethrow;
        }
      }

      if (attemptId == 0) {
        final attemptsResponse = await _attemptService.getAttempts(
          studentId: SessionStore.instance.userId,
          quizId: quiz.id,
          perPage: 50,
        );
        final attempts = unwrapDataList(attemptsResponse.data);
        for (final item in attempts) {
          final status = readString(
            item['status'] ??
                item['attempt_status'] ??
                item['grading_status'],
          );
          if (status == 'in_progress') {
            attemptId = readInt(item['id']);
            break;
          }
        }
        if (attemptId == 0 && attempts.isNotEmpty) {
          attemptId = readInt(attempts.first['id']);
        }
      }

      if (attemptId == 0) {
        throw StateError('Could not start quiz attempt.');
      }

      try {
        await _attemptService.startAttempt(attemptId);
      } catch (_) {
        // Ignore already-started state.
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
                        final isBusy = _busyQuizId == quiz.id;
                        final isDark =
                            Theme.of(context).brightness == Brightness.dark;
                        final titleColor = isDark
                            ? AfaqColors.foregroundDark
                            : AfaqColors.foregroundLight;
                        final secondary = isDark
                            ? AfaqColors.slate300
                            : AfaqColors.slate500;
                        return AfaqPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                quiz.courseTitle,
                                style: TextStyle(
                                  color: secondary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                quiz.title,
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(
                                      fontWeight: FontWeight.w900,
                                      color: titleColor,
                                    ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                quiz.description,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: secondary),
                              ),
                              const Spacer(),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  _QuizChip(
                                    label: '${quiz.durationMinutes} min',
                                  ),
                                  _QuizChip(
                                    label: quiz.attemptsLeft >= 0
                                        ? 'Left ${quiz.attemptsLeft}'
                                        : '--',
                                  ),
                                  _QuizChip(
                                    label: quiz.isTaken ? 'Taken' : 'Ready',
                                    tone: quiz.isTaken
                                        ? AfaqColors.emerald500
                                        : AfaqColors.primary,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              FilledButton.icon(
                                onPressed: isBusy
                                    ? null
                                    : quiz.isTaken
                                        ? () => _openGrade(quiz)
                                        : () => _startQuiz(quiz),
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
                                  quiz.isTaken ? 'Taken' : studentText('start_quiz', lang),
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

class _CourseEntry {
  const _CourseEntry({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;
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

  _QuizRow copyWith({
    int? attemptId,
    bool? isTaken,
  }) {
    return _QuizRow(
      id: id,
      title: title,
      description: description,
      courseId: courseId,
      courseTitle: courseTitle,
      durationMinutes: durationMinutes,
      attemptsLeft: attemptsLeft,
      isPassed: isPassed,
      attemptId: attemptId ?? this.attemptId,
      isTaken: isTaken ?? this.isTaken,
    );
  }
}

class _QuizChip extends StatelessWidget {
  const _QuizChip({
    required this.label,
    this.tone = AfaqColors.slate500,
  });

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: .18)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: tone,
        ),
      ),
    );
  }
}
