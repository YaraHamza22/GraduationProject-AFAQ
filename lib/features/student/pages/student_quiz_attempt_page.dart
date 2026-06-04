import 'dart:async';

import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/session/session_store.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../offline/data/offline_quiz_sync_service.dart';
import '../data/quiz_attempt_service.dart';
import '../data/quiz_service.dart';
import 'student_page_shared.dart';
import 'student_quiz_grade_page.dart';

class StudentQuizAttemptPage extends StatefulWidget {
  const StudentQuizAttemptPage({
    super.key,
    required this.quizId,
    required this.courseId,
    required this.attemptId,
    required this.quizTitle,
  });

  final int quizId;
  final int courseId;
  final int attemptId;
  final String quizTitle;

  @override
  State<StudentQuizAttemptPage> createState() => _StudentQuizAttemptPageState();
}

class _StudentQuizAttemptPageState extends State<StudentQuizAttemptPage> {
  final _attemptService = const QuizAttemptService();
  final _quizService = const QuizService();
  final _offlineSyncService = const OfflineQuizSyncService();

  bool _loading = true;
  bool _submitting = false;
  bool _syncingPending = false;
  String? _error;
  String? _offlineNotice;
  _AttemptDetails? _attempt;
  int? _remainingSeconds;
  Timer? _timer;
  int _pendingSyncCount = 0;

  final Map<int, _AnswerDraft> _drafts = {};
  final Map<int, bool> _savingByQuestion = {};
  final Map<int, bool> _savedByQuestion = {};
  final Map<int, String?> _questionErrors = {};

  String get _currentLanguageCode =>
      localeNotifier.value.languageCode.toLowerCase() == 'ar' ? 'ar' : 'en';

  @override
  void initState() {
    super.initState();
    _loadAttempt();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  bool get _isAttemptReadOnly {
    final status = _attempt?.status.toLowerCase() ?? '';
    return status.isNotEmpty && status != 'pending' && status != 'in_progress';
  }

  bool get _isTimeUp => (_attempt?.isTimeUp ?? false) || ((_remainingSeconds ?? 1) <= 0);

  void _startTimer() {
    _timer?.cancel();
    if (_remainingSeconds == null) return;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if ((_remainingSeconds ?? 0) <= 0) {
        timer.cancel();
        return;
      }
      setState(() => _remainingSeconds = (_remainingSeconds ?? 1) - 1);
    });
  }

  List<Map<String, dynamic>> _progressRows(Map<String, dynamic> payload) {
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

  bool _shouldQueueOffline(Object error) {
    final message = error.toString();
    return message == 'No connection. Check your internet and try again.' ||
        message == 'The server took too long to respond.';
  }

  Future<int> _resolveAttemptId() async {
    if (widget.attemptId > 0) return widget.attemptId;

    try {
      final createResponse = await _attemptService.createAttempt(
        quizId: widget.quizId,
        studentId: SessionStore.instance.userId,
      );
      final createdId = readInt(unwrapDataMap(createResponse.data)['id']);
      if (createdId > 0) {
        try {
          await _attemptService.startAttempt(createdId);
        } catch (_) {
          // Ignore already-started responses.
        }
        return createdId;
      }
    } catch (_) {
      // Keep fallback flow.
    }

    if (widget.courseId > 0) {
      try {
        final progressResponse = await _quizService.getAssessmentProgress(
          widget.courseId,
        );
        final rows = _progressRows(unwrapDataMap(progressResponse.data));
        for (final row in rows) {
          final quizId = readInt(row['quiz_id'] ?? asMap(row['quiz'])?['id']);
          if (quizId == widget.quizId) {
            final attemptId = _attemptIdFromProgress(row);
            if (attemptId > 0) return attemptId;
          }
        }
      } catch (_) {
        // Continue to attempts list.
      }
    }

    final attemptsResponse = await _attemptService.getAttempts(
      studentId: SessionStore.instance.userId,
      quizId: widget.quizId,
      perPage: 50,
    );
    final attempts = unwrapDataList(attemptsResponse.data);
    for (final item in attempts) {
      if (readString(item['status']) == 'in_progress') {
        final id = readInt(item['id']);
        if (id > 0) return id;
      }
    }

    if (attempts.isNotEmpty) {
      return readInt(attempts.first['id']);
    }

    final cachedAttemptId = await _offlineSyncService.getCachedAttemptId(widget.quizId);
    if (cachedAttemptId != null && cachedAttemptId > 0) {
      return cachedAttemptId;
    }

    throw StateError('Could not open quiz attempt. Please refresh and try again.');
  }

  void _hydrateDrafts(_AttemptDetails details) {
    final answerMap = {
      for (final answer in details.answers) answer.questionId: answer,
    };

    _drafts
      ..clear()
      ..addEntries(
        details.quiz.questions.map((question) {
          final answer = answerMap[question.id];
          return MapEntry(
            question.id,
            _AnswerDraft(
              selectedOptionId: answer?.selectedOptionId,
              booleanAnswer: answer?.booleanAnswer,
              answerText: answer?.answerText ?? '',
            ),
          );
        }),
      );
  }

  Future<void> _mergeOfflineDrafts(int attemptId) async {
    final attempt = _attempt;
    if (attempt == null) return;

    final draftPayloads = await _offlineSyncService.getDraftAnswers(attemptId);
    if (draftPayloads.isEmpty || !mounted) return;

    setState(() {
      for (final question in attempt.quiz.questions) {
        final payload = draftPayloads[question.id];
        if (payload == null) continue;
        _drafts[question.id] = _AnswerDraft.fromAnswerPayload(payload);
        _savedByQuestion[question.id] = true;
      }
    });
  }

  Future<void> _refreshPendingSyncState([int? attemptId]) async {
    final resolvedAttemptId = attemptId ?? _attempt?.id;
    if (resolvedAttemptId == null || resolvedAttemptId <= 0) return;
    final count = await _offlineSyncService.pendingActionCountForAttempt(resolvedAttemptId);
    if (!mounted) return;
    setState(() => _pendingSyncCount = count);
  }

  Future<void> _syncPendingActions() async {
    if (_syncingPending) return;

    setState(() => _syncingPending = true);
    try {
      final result = await _offlineSyncService.syncPendingActions();
      await _refreshPendingSyncState();
      if (!mounted || result.syncedActions == 0) return;
      setState(() {
        _offlineNotice = result.remainingActions == 0
            ? 'Offline quiz changes synced successfully.'
            : 'Some offline quiz changes synced, but a few are still pending.';
      });
      await _loadAttempt(silent: true);
    } catch (_) {
      // Keep the queued changes and let the user continue.
    } finally {
      if (mounted) {
        setState(() => _syncingPending = false);
      }
    }
  }

  Future<void> _loadAttempt({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      await _syncPendingActions();
      final resolvedAttemptId = await _resolveAttemptId();
      _AttemptDetails? details;

      try {
        final attemptResponse = await _attemptService.getAttempt(resolvedAttemptId);
        final payload = unwrapDataMap(attemptResponse.data);
        await _offlineSyncService.cacheAttemptPayload(
          quizId: widget.quizId,
          attemptId: resolvedAttemptId,
          payload: payload,
        );
        details = _AttemptDetails.fromPayload(payload);
      } catch (_) {
        try {
          final quizResponse = await _quizService.getQuiz(widget.quizId);
          final payload = unwrapDataMap(quizResponse.data);
          await _offlineSyncService.cacheQuizPayload(
            quizId: widget.quizId,
            attemptId: resolvedAttemptId,
            payload: payload,
          );
          details = _AttemptDetails.fromQuizPayload(
            payload,
            resolvedAttemptId,
          );
        } catch (_) {
          final cachedAttempt = await _offlineSyncService.getCachedAttemptPayload(
            resolvedAttemptId,
          );
          if (cachedAttempt != null) {
            details = _AttemptDetails.fromPayload(cachedAttempt);
          } else {
            final cachedQuiz = await _offlineSyncService.getCachedQuizPayload(widget.quizId);
            if (cachedQuiz != null) {
              details = _AttemptDetails.fromQuizPayload(cachedQuiz, resolvedAttemptId);
              _offlineNotice ??=
                  'You are viewing a cached quiz copy. Your pending changes will sync later.';
            }
          }
        }
      }

      if (details == null) {
        throw StateError('Could not open quiz attempt. Please refresh and try again.');
      }

      final resolvedDetails = details;
      _hydrateDrafts(resolvedDetails);
      if (!mounted) return;
      setState(() {
        _attempt = resolvedDetails;
        _remainingSeconds = resolvedDetails.remainingSeconds;
        _loading = false;
      });
      _startTimer();
      await _refreshPendingSyncState(resolvedAttemptId);
      await _mergeOfflineDrafts(resolvedAttemptId);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Bad state: ', '');
        _loading = false;
      });
    }
  }

  String _questionLabel(_AttemptQuestion question, int index) {
    final lang = localeNotifier.value.languageCode;
    return localizedValue(
      question.text,
      lang,
      fallback: 'Question ${index + 1}',
    );
  }

  String _optionLabel(_AttemptOption option) {
    return localizedValue(
      option.text,
      localeNotifier.value.languageCode,
      fallback: 'Option ${option.id}',
    );
  }

  Future<void> _saveAnswer(_AttemptQuestion question) async {
    final attempt = _attempt;
    if (attempt == null) return;

    final draft = _drafts[question.id] ?? const _AnswerDraft();
    Map<String, dynamic>? answerPayload;

    if (question.type == 'multiple_choice') {
      if ((draft.selectedOptionId ?? 0) == 0) {
        setState(() => _questionErrors[question.id] = 'Select one option first.');
        return;
      }
      answerPayload = {
        'question_id': question.id,
        'selected_option_id': draft.selectedOptionId,
      };
    } else if (question.type == 'true_false') {
      if (draft.booleanAnswer == null) {
        setState(() => _questionErrors[question.id] = 'Choose True or False first.');
        return;
      }
      answerPayload = {
        'question_id': question.id,
        'boolean_answer': draft.booleanAnswer,
      };
    } else {
      if (draft.answerText.trim().isEmpty) {
        setState(() => _questionErrors[question.id] = 'Write an answer first.');
        return;
      }
      answerPayload = {
        'question_id': question.id,
        'answer_text': {_currentLanguageCode: draft.answerText.trim()},
      };
    }

    setState(() {
      _savingByQuestion[question.id] = true;
      _savedByQuestion[question.id] = false;
      _questionErrors[question.id] = null;
    });

    await _offlineSyncService.saveDraftAnswer(
      attemptId: attempt.id,
      questionId: question.id,
      answerPayload: answerPayload,
    );

    try {
      await _attemptService.saveAttempt(
        attemptId: attempt.id,
        body: {
          'status': 'in_progress',
          'answers': [answerPayload],
        },
      );

      if (!mounted) return;
      setState(() => _savedByQuestion[question.id] = true);
    } catch (error) {
      try {
        await _attemptService.saveAttempt(
          attemptId: attempt.id,
          body: {
            'attempt_id': attempt.id,
            'status': 'in_progress',
            ...answerPayload,
          },
        );
        if (!mounted) return;
        setState(() => _savedByQuestion[question.id] = true);
      } catch (fallbackError) {
        if (_shouldQueueOffline(fallbackError)) {
          await _offlineSyncService.queueSaveAnswer(
            quizId: widget.quizId,
            courseId: widget.courseId,
            attemptId: attempt.id,
            questionId: question.id,
            answerPayload: answerPayload,
          );
          await _refreshPendingSyncState(attempt.id);
          if (!mounted) return;
          setState(() {
            _savedByQuestion[question.id] = true;
            _offlineNotice = 'Answer saved offline. It will sync when you reconnect.';
          });
          return;
        }
        if (!mounted) return;
        setState(() {
          _questionErrors[question.id] = fallbackError.toString().replaceFirst(
            'Exception: ',
            '',
          );
        });
      }
    } finally {
      if (mounted) {
        setState(() => _savingByQuestion[question.id] = false);
      }
    }
  }

  Future<void> _submitAttempt() async {
    final attempt = _attempt;
    if (attempt == null) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      var queuedOffline = false;
      final answers = <Map<String, dynamic>>[];
      for (final question in attempt.quiz.questions) {
        final draft = _drafts[question.id];
        if (draft == null) continue;

        if (question.type == 'multiple_choice') {
          if ((draft.selectedOptionId ?? 0) == 0) continue;
          answers.add({
            'question_id': question.id,
            'selected_option_id': draft.selectedOptionId,
          });
          continue;
        }

        if (question.type == 'true_false') {
          if (draft.booleanAnswer == null) continue;
          answers.add({
            'question_id': question.id,
            'boolean_answer': draft.booleanAnswer,
          });
          continue;
        }

        final text = draft.answerText.trim();
        if (text.isEmpty) continue;
        answers.add({
          'question_id': question.id,
          'answer_text': {_currentLanguageCode: text},
        });
      }

      try {
        await _attemptService.submitAttempt(
          attemptId: attempt.id,
          answers: answers,
        );
        await _offlineSyncService.clearDrafts(attempt.id);
      } catch (error) {
        if (!_shouldQueueOffline(error)) rethrow;

        await _offlineSyncService.queueSubmitAttempt(
          quizId: widget.quizId,
          courseId: widget.courseId,
          attemptId: attempt.id,
          answers: answers,
        );
        queuedOffline = true;
        await _refreshPendingSyncState(attempt.id);
        if (!mounted) return;
        setState(() {
          _offlineNotice = 'Attempt queued offline. It will submit automatically after sync.';
        });
      }

      if (!mounted) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => StudentQuizGradePage(
            quizId: widget.quizId,
            courseId: widget.courseId,
            attemptId: attempt.id,
            quizTitle: widget.quizTitle,
            pendingReview: true,
            hasPendingOfflineSync: queuedOffline,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  String _formatDuration(int? seconds) {
    if (seconds == null) return '--';
    final minutes = seconds ~/ 60;
    final remainder = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainder.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.quizTitle),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Padding(
                  padding: const EdgeInsets.all(24),
                  child: StudentErrorPanel(message: _error!, onRetry: _loadAttempt),
                )
              : _attempt == null
                  ? const SizedBox.shrink()
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AfaqPanel(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  localizedValue(
                                    _attempt!.quiz.title,
                                    localeNotifier.value.languageCode,
                                    fallback: widget.quizTitle,
                                  ),
                                  style: theme.textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    _AttemptMetaChip(
                                      icon: Icons.workspace_premium_outlined,
                                      label: 'Attempt #${_attempt!.attemptNumber ?? _attempt!.id}',
                                    ),
                                    _AttemptMetaChip(
                                      icon: Icons.help_outline_rounded,
                                      label: '${_attempt!.quiz.questions.length} questions',
                                    ),
                                    _AttemptMetaChip(
                                      icon: Icons.timer_outlined,
                                      label: _remainingSeconds != null
                                          ? _formatDuration(_remainingSeconds)
                                          : '${_attempt!.quiz.durationMinutes ?? 0} min',
                                      tone: _isTimeUp
                                          ? AfaqColors.rose500
                                          : AfaqColors.primary,
                                    ),
                                    _AttemptMetaChip(
                                      icon: Icons.flag_outlined,
                                      label: _attempt!.status.isEmpty
                                          ? 'in_progress'
                                          : _attempt!.status,
                                    ),
                                  ],
                                ),
                                if (_isTimeUp && !_isAttemptReadOnly) ...[
                                  const SizedBox(height: 14),
                                  const Text(
                                    'The timer has ended, but this attempt is still open, so you can finish and submit your answers.',
                                    style: TextStyle(
                                      color: AfaqColors.rose500,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                                if (_offlineNotice != null || _pendingSyncCount > 0) ...[
                                  const SizedBox(height: 14),
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: AfaqColors.amber500.withValues(alpha: .10),
                                      borderRadius: BorderRadius.circular(18),
                                      border: Border.all(
                                        color: AfaqColors.amber500.withValues(alpha: .18),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _offlineNotice ??
                                              '$_pendingSyncCount offline change${_pendingSyncCount == 1 ? '' : 's'} waiting to sync.',
                                          style: const TextStyle(fontWeight: FontWeight.w800),
                                        ),
                                        const SizedBox(height: 10),
                                        OutlinedButton.icon(
                                          onPressed: _syncingPending ? null : _syncPendingActions,
                                          icon: _syncingPending
                                              ? const SizedBox(
                                                  width: 16,
                                                  height: 16,
                                                  child: CircularProgressIndicator(strokeWidth: 2),
                                                )
                                              : const Icon(Icons.sync_rounded),
                                          label: Text(
                                            _syncingPending ? 'Syncing...' : 'Sync Pending Changes',
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),
                          for (var index = 0; index < _attempt!.quiz.questions.length; index++) ...[
                            _QuestionCard(
                              question: _attempt!.quiz.questions[index],
                              index: index,
                              label: _questionLabel(_attempt!.quiz.questions[index], index),
                              optionLabel: _optionLabel,
                              draft: _drafts[_attempt!.quiz.questions[index].id] ??
                                  const _AnswerDraft(),
                              saving: _savingByQuestion[_attempt!.quiz.questions[index].id] == true,
                              saved: _savedByQuestion[_attempt!.quiz.questions[index].id] == true,
                              error: _questionErrors[_attempt!.quiz.questions[index].id],
                              readOnly: _isAttemptReadOnly,
                              onChanged: (draft) {
                                setState(() {
                                  _drafts[_attempt!.quiz.questions[index].id] = draft;
                                  _savedByQuestion[_attempt!.quiz.questions[index].id] = false;
                                });
                              },
                              onSave: () => _saveAnswer(_attempt!.quiz.questions[index]),
                            ),
                            const SizedBox(height: 16),
                          ],
                          AfaqPanel(
                            child: Row(
                              children: [
                                Expanded(
                                  child: FilledButton.icon(
                                    onPressed: _submitting ||
                                            _isAttemptReadOnly ||
                                            _attempt!.quiz.questions.isEmpty
                                        ? null
                                        : _submitAttempt,
                                    icon: _submitting
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white,
                                            ),
                                          )
                                        : const Icon(Icons.send_rounded),
                                    label: Text(
                                      _submitting ? 'Submitting...' : 'Submit Attempt',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  _attempt!.status.isEmpty ? 'in_progress' : _attempt!.status,
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

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({
    required this.question,
    required this.index,
    required this.label,
    required this.optionLabel,
    required this.draft,
    required this.saving,
    required this.saved,
    required this.error,
    required this.readOnly,
    required this.onChanged,
    required this.onSave,
  });

  final _AttemptQuestion question;
  final int index;
  final String label;
  final String Function(_AttemptOption option) optionLabel;
  final _AnswerDraft draft;
  final bool saving;
  final bool saved;
  final String? error;
  final bool readOnly;
  final ValueChanged<_AnswerDraft> onChanged;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Question ${index + 1}',
            style: const TextStyle(
              color: AfaqColors.slate500,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _AttemptMetaChip(
                icon: Icons.category_outlined,
                label: question.type,
              ),
              _AttemptMetaChip(
                icon: Icons.stars_outlined,
                label: '${question.point ?? 0} points',
              ),
              _AttemptMetaChip(
                icon: question.isRequired ? Icons.priority_high_rounded : Icons.low_priority_rounded,
                label: question.isRequired ? 'Required' : 'Optional',
                tone: question.isRequired ? AfaqColors.amber500 : AfaqColors.slate500,
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (question.type == 'multiple_choice')
            for (final option in question.options)
              _ChoiceTile(
                label: optionLabel(option),
                selected: draft.selectedOptionId == option.id,
                enabled: !readOnly,
                onTap: () => onChanged(
                  draft.copyWith(
                    selectedOptionId: option.id,
                    booleanAnswer: null,
                    clearBoolean: true,
                  ),
                ),
              )
          else if (question.type == 'true_false')
            Column(
              children: [
                _ChoiceTile(
                  label: 'True',
                  selected: draft.booleanAnswer == true,
                  enabled: !readOnly,
                  onTap: () => onChanged(
                    draft.copyWith(
                      booleanAnswer: true,
                      selectedOptionId: null,
                      clearOption: true,
                    ),
                  ),
                ),
                _ChoiceTile(
                  label: 'False',
                  selected: draft.booleanAnswer == false,
                  enabled: !readOnly,
                  onTap: () => onChanged(
                    draft.copyWith(
                      booleanAnswer: false,
                      selectedOptionId: null,
                      clearOption: true,
                    ),
                  ),
                ),
              ],
            )
          else
            TextFormField(
              initialValue: draft.answerText,
              minLines: 4,
              maxLines: 8,
              readOnly: readOnly,
              onChanged: (value) => onChanged(
                draft.copyWith(
                  answerText: value,
                  selectedOptionId: null,
                  booleanAnswer: null,
                  clearOption: true,
                  clearBoolean: true,
                ),
              ),
              decoration: const InputDecoration(
                hintText: 'Write your answer...',
                border: OutlineInputBorder(),
              ),
            ),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(
              error!,
              style: const TextStyle(
                color: AfaqColors.rose500,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              FilledButton.icon(
                onPressed: readOnly || saving ? null : onSave,
                icon: saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save_outlined),
                label: const Text('Save Answer'),
              ),
              const SizedBox(width: 12),
              if (saved)
                const Text(
                  'Saved',
                  style: TextStyle(
                    color: AfaqColors.emerald600,
                    fontWeight: FontWeight.w800,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChoiceTile extends StatelessWidget {
  const _ChoiceTile({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tone = selected ? AfaqColors.primary : AfaqColors.slate300;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: selected
                ? AfaqColors.primary.withValues(alpha: .10)
                : AfaqColors.slate100.withValues(alpha: .55),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: tone.withValues(alpha: .35)),
          ),
          child: Row(
            children: [
              Icon(
                selected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: tone,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: enabled ? null : AfaqColors.slate400,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AttemptMetaChip extends StatelessWidget {
  const _AttemptMetaChip({
    required this.icon,
    required this.label,
    this.tone = AfaqColors.slate500,
  });

  final IconData icon;
  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: .18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: tone),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: tone,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _AttemptDetails {
  const _AttemptDetails({
    required this.id,
    required this.quizId,
    required this.attemptNumber,
    required this.status,
    required this.remainingSeconds,
    required this.isTimeUp,
    required this.quiz,
    required this.answers,
  });

  final int id;
  final int quizId;
  final int? attemptNumber;
  final String status;
  final int? remainingSeconds;
  final bool isTimeUp;
  final _AttemptQuiz quiz;
  final List<_AttemptAnswer> answers;

  static _AttemptDetails? fromPayload(Map<String, dynamic> record) {
    final quiz = asMap(record['quiz']);
    if (quiz == null) return null;
    return _AttemptDetails(
      id: readInt(record['id']),
      quizId: readInt(record['quiz_id']),
      attemptNumber: readInt(record['attempt_number']) == 0
          ? null
          : readInt(record['attempt_number']),
      status: readString(record['status']),
      remainingSeconds: record['remaining_seconds'] == null
          ? null
          : readInt(record['remaining_seconds']),
      isTimeUp: record['is_time_up'] == true,
      quiz: _AttemptQuiz.fromMap(quiz),
      answers: asListOfMaps(record['answers'])
          .map(_AttemptAnswer.fromMap)
          .where((answer) => answer.questionId != 0)
          .toList(growable: false),
    );
  }

  static _AttemptDetails? fromQuizPayload(
    Map<String, dynamic> quiz,
    int attemptId,
  ) {
    final quizId = readInt(quiz['id'] ?? quiz['quiz_id']);
    if (quizId == 0) return null;
    return _AttemptDetails(
      id: attemptId,
      quizId: quizId,
      attemptNumber: null,
      status: 'in_progress',
      remainingSeconds: null,
      isTimeUp: false,
      quiz: _AttemptQuiz.fromMap(quiz),
      answers: const [],
    );
  }
}

class _AttemptQuiz {
  const _AttemptQuiz({
    required this.id,
    required this.title,
    required this.durationMinutes,
    required this.questions,
  });

  final int id;
  final dynamic title;
  final int? durationMinutes;
  final List<_AttemptQuestion> questions;

  factory _AttemptQuiz.fromMap(Map<String, dynamic> map) {
    final questions = asListOfMaps(map['questions'])
        .map(_AttemptQuestion.fromMap)
        .where((question) => question.id != 0)
        .toList(growable: false)
      ..sort((a, b) => (a.orderIndex ?? 999999).compareTo(b.orderIndex ?? 999999));

    return _AttemptQuiz(
      id: readInt(map['id']),
      title: map['title'],
      durationMinutes: map['duration_minutes'] == null
          ? null
          : readInt(map['duration_minutes']),
      questions: questions,
    );
  }
}

class _AttemptQuestion {
  const _AttemptQuestion({
    required this.id,
    required this.type,
    required this.text,
    required this.point,
    required this.isRequired,
    required this.orderIndex,
    required this.options,
  });

  final int id;
  final String type;
  final dynamic text;
  final int? point;
  final bool isRequired;
  final int? orderIndex;
  final List<_AttemptOption> options;

  factory _AttemptQuestion.fromMap(Map<String, dynamic> map) {
    return _AttemptQuestion(
      id: readInt(map['id']),
      type: readString(map['type']),
      text: map['question_text'],
      point: map['point'] == null ? null : readInt(map['point']),
      isRequired: map['is_required'] == true,
      orderIndex: map['order_index'] == null
          ? null
          : readInt(map['order_index']),
      options: asListOfMaps(map['options'])
          .map(_AttemptOption.fromMap)
          .where((option) => option.id != 0)
          .toList(growable: false),
    );
  }
}

class _AttemptOption {
  const _AttemptOption({
    required this.id,
    required this.text,
  });

  final int id;
  final dynamic text;

  factory _AttemptOption.fromMap(Map<String, dynamic> map) {
    return _AttemptOption(
      id: readInt(map['id']),
      text: map['option_text'],
    );
  }
}

class _AttemptAnswer {
  const _AttemptAnswer({
    required this.questionId,
    required this.selectedOptionId,
    required this.booleanAnswer,
    required this.answerText,
  });

  final int questionId;
  final int? selectedOptionId;
  final bool? booleanAnswer;
  final String? answerText;

  factory _AttemptAnswer.fromMap(Map<String, dynamic> map) {
    return _AttemptAnswer(
      questionId: readInt(map['question_id']),
      selectedOptionId: readInt(map['selected_option_id']) == 0 &&
              map['selected_option_id'] == null
          ? null
          : readInt(map['selected_option_id']),
      booleanAnswer: map['boolean_answer'] is bool
          ? map['boolean_answer'] as bool
          : null,
      answerText: localizedValue(
        map['answer_text'],
        localeNotifier.value.languageCode,
      ),
    );
  }
}

class _AnswerDraft {
  const _AnswerDraft({
    this.selectedOptionId,
    this.booleanAnswer,
    this.answerText = '',
  });

  final int? selectedOptionId;
  final bool? booleanAnswer;
  final String answerText;

  factory _AnswerDraft.fromAnswerPayload(Map<String, dynamic> payload) {
    final localized = payload['answer_text'];
    final answerText = localized is Map
        ? localizedValue(localized, localeNotifier.value.languageCode)
        : readString(localized);

    return _AnswerDraft(
      selectedOptionId: readInt(payload['selected_option_id']) == 0
          ? null
          : readInt(payload['selected_option_id']),
      booleanAnswer: payload['boolean_answer'] is bool
          ? payload['boolean_answer'] as bool
          : null,
      answerText: answerText,
    );
  }

  _AnswerDraft copyWith({
    int? selectedOptionId,
    bool? booleanAnswer,
    String? answerText,
    bool clearOption = false,
    bool clearBoolean = false,
  }) {
    return _AnswerDraft(
      selectedOptionId: clearOption
          ? selectedOptionId
          : (selectedOptionId ?? this.selectedOptionId),
      booleanAnswer: clearBoolean
          ? booleanAnswer
          : (booleanAnswer ?? this.booleanAnswer),
      answerText: answerText ?? this.answerText,
    );
  }
}
