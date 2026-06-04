import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../offline/data/offline_quiz_sync_service.dart';
import '../data/quiz_attempt_service.dart';
import 'student_page_shared.dart';

class StudentQuizGradePage extends StatefulWidget {
  const StudentQuizGradePage({
    super.key,
    required this.quizId,
    required this.courseId,
    required this.attemptId,
    required this.quizTitle,
    this.pendingReview = false,
    this.hasPendingOfflineSync = false,
  });

  final int quizId;
  final int courseId;
  final int attemptId;
  final String quizTitle;
  final bool pendingReview;
  final bool hasPendingOfflineSync;

  @override
  State<StudentQuizGradePage> createState() => _StudentQuizGradePageState();
}

class _StudentQuizGradePageState extends State<StudentQuizGradePage> {
  final _attemptService = const QuizAttemptService();
  final _offlineSyncService = const OfflineQuizSyncService();

  bool _loading = true;
  String? _error;
  _GradeSnapshot? _grade;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<_GradeSnapshot?> _loadAttemptFallback() async {
    final attemptResponse = await _attemptService.getAttempt(widget.attemptId);
    return _GradeSnapshot.fromAttempt(unwrapDataMap(attemptResponse.data));
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      _GradeSnapshot? snapshot;
      final hasPendingOfflineSync = widget.hasPendingOfflineSync ||
          await _offlineSyncService.hasPendingSubmit(widget.attemptId);

      if (hasPendingOfflineSync) {
        snapshot = _GradeSnapshot.pending(
          'Your attempt is stored offline and will be submitted after sync.',
        );
      }

      try {
        final response = await _attemptService.getGrade(widget.attemptId);
        snapshot = _GradeSnapshot.fromGrade(unwrapDataMap(response.data));
      } catch (_) {
        snapshot ??= await _loadAttemptFallback();
      }

      snapshot ??= _GradeSnapshot.pending();

      if (!snapshot.gradeAvailable) {
        try {
          final fallback = await _loadAttemptFallback();
          if (fallback != null) snapshot = fallback;
        } catch (_) {
          // Keep pending snapshot.
        }
      }

      if (!mounted) return;
      setState(() {
        _grade = snapshot;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  String _formatDate(String? value) {
    if (value == null || value.isEmpty) return '--';
    final date = DateTime.tryParse(value);
    if (date == null) return value;
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final grade = _grade;
    final percentage = grade?.percentage;
    final passed = grade != null &&
        grade.score != null &&
        grade.passingScore != null &&
        grade.score! >= grade.passingScore!;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.quizTitle),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Padding(
                  padding: const EdgeInsets.all(24),
                  child: StudentErrorPanel(message: _error!, onRetry: _load),
                )
              : grade == null
                  ? const SizedBox.shrink()
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AfaqPanel(
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Grade Snapshot',
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineSmall
                                            ?.copyWith(fontWeight: FontWeight.w900),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        'Attempt #${widget.attemptId}',
                                        style: const TextStyle(
                                          color: AfaqColors.slate500,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 10,
                                  ),
                                  decoration: BoxDecoration(
                                    color: (grade.gradeAvailable
                                            ? (passed
                                                ? AfaqColors.emerald500
                                                : AfaqColors.rose500)
                                            : AfaqColors.amber500)
                                        .withValues(alpha: .12),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                      color: (grade.gradeAvailable
                                              ? (passed
                                                  ? AfaqColors.emerald500
                                                  : AfaqColors.rose500)
                                              : AfaqColors.amber500)
                                          .withValues(alpha: .18),
                                    ),
                                  ),
                                  child: Text(
                                    !grade.gradeAvailable
                                        ? 'Pending Review'
                                        : passed
                                            ? 'Passed'
                                            : 'Not Passed',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      color: grade.gradeAvailable
                                          ? (passed
                                              ? AfaqColors.emerald600
                                              : AfaqColors.rose600)
                                          : AfaqColors.amber500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!grade.gradeAvailable) ...[
                            const SizedBox(height: 16),
                            AfaqPanel(
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.hourglass_top_rounded,
                                    color: AfaqColors.amber500,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      grade.message ??
                                          'Your quiz will be graded and you will be notified when grading is complete.',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          GridView.count(
                            crossAxisCount: MediaQuery.sizeOf(context).width >= 900 ? 4 : 2,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            childAspectRatio: 1.2,
                            children: [
                              _GradeMetricCard(
                                label: 'Score',
                                value: grade.gradeAvailable
                                    ? '${grade.score ?? '--'} / ${grade.maxScore ?? '--'}'
                                    : '-- / --',
                              ),
                              _GradeMetricCard(
                                label: 'Passing Score',
                                value: grade.gradeAvailable
                                    ? '${grade.passingScore ?? '--'}'
                                    : '--',
                              ),
                              _GradeMetricCard(
                                label: 'Percentage',
                                value: grade.gradeAvailable && percentage != null
                                    ? '$percentage%'
                                    : '--',
                              ),
                              _GradeMetricCard(
                                label: 'Status',
                                value: grade.gradeAvailable
                                    ? grade.status
                                    : 'pending_review',
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          AfaqPanel(
                            child: Wrap(
                              spacing: 16,
                              runSpacing: 12,
                              children: [
                                Text(
                                  'Submitted: ${_formatDate(grade.submittedAt)}',
                                  style: const TextStyle(
                                    color: AfaqColors.slate500,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  'Graded: ${_formatDate(grade.gradedAt)}',
                                  style: const TextStyle(
                                    color: AfaqColors.slate500,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  'Updated: ${_formatDate(grade.updatedAt)}',
                                  style: const TextStyle(
                                    color: AfaqColors.slate500,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
    );
  }
}

class _GradeMetricCard extends StatelessWidget {
  const _GradeMetricCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AfaqColors.slate500,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _GradeSnapshot {
  const _GradeSnapshot({
    required this.score,
    required this.maxScore,
    required this.passingScore,
    required this.percentage,
    required this.status,
    required this.gradeAvailable,
    required this.message,
    required this.submittedAt,
    required this.gradedAt,
    required this.updatedAt,
  });

  final int? score;
  final int? maxScore;
  final int? passingScore;
  final int? percentage;
  final String status;
  final bool gradeAvailable;
  final String? message;
  final String? submittedAt;
  final String? gradedAt;
  final String? updatedAt;

  factory _GradeSnapshot.fromGrade(Map<String, dynamic> map) {
    final score = map['score'] == null ? null : readInt(map['score']);
    final maxScore = map['max_score'] == null ? null : readInt(map['max_score']);
    return _GradeSnapshot(
      score: score,
      maxScore: maxScore,
      passingScore: map['passing_score'] == null
          ? null
          : readInt(map['passing_score']),
      percentage: map['percentage'] == null
          ? null
          : readInt(map['percentage']),
      status: readString(map['status'], fallback: 'unknown'),
      gradeAvailable: map['grade_available'] is bool
          ? map['grade_available'] as bool
          : score != null,
      message: readString(map['message']),
      submittedAt: readString(map['submitted_at']),
      gradedAt: readString(map['graded_at']),
      updatedAt: readString(map['updated_at']),
    );
  }

  factory _GradeSnapshot.fromAttempt(Map<String, dynamic> map) {
    final quiz = asMap(map['quiz']);
    final score = map['score'] == null ? null : readInt(map['score']);
    final maxScore = quiz == null || quiz['max_score'] == null
        ? null
        : readInt(quiz['max_score']);
    final passingScore = quiz == null || quiz['passing_score'] == null
        ? null
        : readInt(quiz['passing_score']);
    final percentage = score != null && maxScore != null && maxScore > 0
        ? ((score / maxScore) * 100).round()
        : null;
    final status = readString(map['status'], fallback: 'unknown');
    final gradeAvailable = status == 'graded' ||
        status == 'passed' ||
        status == 'completed' ||
        score != null;

    return _GradeSnapshot(
      score: score,
      maxScore: maxScore,
      passingScore: passingScore,
      percentage: percentage,
      status: status,
      gradeAvailable: gradeAvailable,
      message: gradeAvailable
          ? null
          : 'Your quiz will be graded and you will be notified when grading is complete.',
      submittedAt: readString(map['submitted_at']),
      gradedAt: readString(map['graded_at']),
      updatedAt: readString(map['updated_at']),
    );
  }

  factory _GradeSnapshot.pending([
    String message =
        'Your quiz will be graded and you will be notified when grading is complete.',
  ]) {
    return _GradeSnapshot(
      score: null,
      maxScore: null,
      passingScore: null,
      percentage: null,
      status: 'submitted',
      gradeAvailable: false,
      message: message,
      submittedAt: null,
      gradedAt: null,
      updatedAt: null,
    );
  }
}
