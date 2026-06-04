import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/errors/app_exception.dart';
import '../../student/data/quiz_attempt_service.dart';
import 'offline_package_models.dart';
import 'offline_package_service.dart';

class OfflineQuizSyncService {
  const OfflineQuizSyncService({
    QuizAttemptService? attemptService,
    OfflinePackageService? packageService,
  }) : _attemptService = attemptService,
       _packageService = packageService;

  static const _queueKey = 'offline_quiz_sync_queue_v1';
  static const _logQueueKey = 'offline_quiz_sync_log_queue_v1';
  static const _draftPrefix = 'offline_quiz_drafts_v1_';
  static const _attemptPayloadPrefix = 'offline_quiz_attempt_payload_v1_';
  static const _quizPayloadPrefix = 'offline_quiz_payload_v1_';
  static const _quizAttemptIdPrefix = 'offline_quiz_attempt_id_v1_';

  final QuizAttemptService? _attemptService;
  final OfflinePackageService? _packageService;

  QuizAttemptService get _attempts => _attemptService ?? const QuizAttemptService();
  OfflinePackageService get _packages => _packageService ?? const OfflinePackageService();

  Future<void> cacheAttemptPayload({
    required int quizId,
    required int attemptId,
    required Map<String, dynamic> payload,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      '$_attemptPayloadPrefix$attemptId',
      jsonEncode(payload),
    );
    await preferences.setString(
      '$_quizPayloadPrefix$quizId',
      jsonEncode(payload['quiz'] is Map ? payload['quiz'] : payload),
    );
    await preferences.setInt('$_quizAttemptIdPrefix$quizId', attemptId);
  }

  Future<void> cacheQuizPayload({
    required int quizId,
    required int attemptId,
    required Map<String, dynamic> payload,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('$_quizPayloadPrefix$quizId', jsonEncode(payload));
    await preferences.setInt('$_quizAttemptIdPrefix$quizId', attemptId);
  }

  Future<Map<String, dynamic>?> getCachedAttemptPayload(int attemptId) async {
    final preferences = await SharedPreferences.getInstance();
    return _decodeMap(preferences.getString('$_attemptPayloadPrefix$attemptId'));
  }

  Future<Map<String, dynamic>?> getCachedQuizPayload(int quizId) async {
    final preferences = await SharedPreferences.getInstance();
    return _decodeMap(preferences.getString('$_quizPayloadPrefix$quizId'));
  }

  Future<int?> getCachedAttemptId(int quizId) async {
    final preferences = await SharedPreferences.getInstance();
    final value = preferences.getInt('$_quizAttemptIdPrefix$quizId');
    return value != null && value > 0 ? value : null;
  }

  Future<void> saveDraftAnswer({
    required int attemptId,
    required int questionId,
    required Map<String, dynamic> answerPayload,
  }) async {
    final preferences = await SharedPreferences.getInstance();
    final key = '$_draftPrefix$attemptId';
    final draftMap = _decodeMap(preferences.getString(key)) ?? <String, dynamic>{};
    draftMap['$questionId'] = answerPayload;
    await preferences.setString(key, jsonEncode(draftMap));
  }

  Future<Map<int, Map<String, dynamic>>> getDraftAnswers(int attemptId) async {
    final preferences = await SharedPreferences.getInstance();
    final decoded = _decodeMap(preferences.getString('$_draftPrefix$attemptId')) ?? <String, dynamic>{};
    final result = <int, Map<String, dynamic>>{};
    decoded.forEach((key, value) {
      final questionId = int.tryParse(key);
      final payload = value is Map<String, dynamic>
          ? value
          : value is Map
          ? value.map((entryKey, entryValue) => MapEntry(entryKey.toString(), entryValue))
          : null;
      if (questionId != null && payload != null) {
        result[questionId] = payload;
      }
    });
    return result;
  }

  Future<void> clearDrafts(int attemptId) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove('$_draftPrefix$attemptId');
  }

  Future<void> queueSaveAnswer({
    required int quizId,
    required int courseId,
    required int attemptId,
    required int questionId,
    required Map<String, dynamic> answerPayload,
  }) async {
    final queue = await _readQueue();
    queue.removeWhere(
      (item) =>
          item.type == _OfflineQuizActionType.saveAnswer &&
          item.attemptId == attemptId &&
          item.questionId == questionId,
    );
    queue.add(
      _OfflineQuizAction(
        clientEventId: _clientEventId(
          'save-$attemptId-$questionId',
          answerPayload,
        ),
        type: _OfflineQuizActionType.saveAnswer,
        quizId: quizId,
        courseId: courseId,
        attemptId: attemptId,
        questionId: questionId,
        payload: answerPayload,
        occurredAt: DateTime.now().toUtc().toIso8601String(),
      ),
    );
    await _writeQueue(queue);
  }

  Future<void> queueSubmitAttempt({
    required int quizId,
    required int courseId,
    required int attemptId,
    required List<Map<String, dynamic>> answers,
  }) async {
    final queue = await _readQueue();
    queue.removeWhere((item) => item.attemptId == attemptId);
    queue.add(
      _OfflineQuizAction(
        clientEventId: _clientEventId(
          'submit-$attemptId',
          {'answers': answers},
        ),
        type: _OfflineQuizActionType.submitAttempt,
        quizId: quizId,
        courseId: courseId,
        attemptId: attemptId,
        payload: {'answers': answers},
        occurredAt: DateTime.now().toUtc().toIso8601String(),
      ),
    );
    await _writeQueue(queue);
  }

  Future<int> pendingActionCountForAttempt(int attemptId) async {
    final queue = await _readQueue();
    return queue.where((item) => item.attemptId == attemptId).length;
  }

  Future<bool> hasPendingSubmit(int attemptId) async {
    final queue = await _readQueue();
    return queue.any(
      (item) =>
          item.attemptId == attemptId &&
          item.type == _OfflineQuizActionType.submitAttempt,
    );
  }

  Future<OfflineQuizSyncResult> syncPendingActions() async {
    final queue = await _readQueue();
    if (queue.isEmpty) {
      final syncedLogs = await _flushPendingLogs();
      return OfflineQuizSyncResult(
        syncedActions: 0,
        remainingActions: 0,
        syncedLogs: syncedLogs,
      );
    }

    final remaining = <_OfflineQuizAction>[];
    final completedLogs = <OfflineSyncLogEntry>[];
    var syncedActions = 0;

    for (final action in queue) {
      try {
        await _replay(action);
        completedLogs.add(await _buildSyncLog(action));
        syncedActions++;
      } catch (error) {
        remaining.add(action);
        if (_isOfflineError(error)) {
          remaining.addAll(
            queue.skip(queue.indexOf(action) + 1),
          );
          break;
        }
      }
    }

    await _writeQueue(remaining);
    if (completedLogs.isNotEmpty) {
      await _appendPendingLogs(completedLogs);
    }
    final syncedLogs = await _flushPendingLogs();

    return OfflineQuizSyncResult(
      syncedActions: syncedActions,
      remainingActions: remaining.length,
      syncedLogs: syncedLogs,
    );
  }

  Future<void> _replay(_OfflineQuizAction action) async {
    switch (action.type) {
      case _OfflineQuizActionType.saveAnswer:
        try {
          await _attempts.saveAttempt(
            attemptId: action.attemptId,
            body: {
              'status': 'in_progress',
              'answers': [action.payload],
            },
          );
        } catch (_) {
          await _attempts.saveAttempt(
            attemptId: action.attemptId,
            body: {
              'attempt_id': action.attemptId,
              'status': 'in_progress',
            ...action.payload,
          },
        );
        }
        return;
      case _OfflineQuizActionType.submitAttempt:
        await _attempts.submitAttempt(
          attemptId: action.attemptId,
          answers: _readAnswerList(action.payload['answers']),
        );
        await clearDrafts(action.attemptId);
        return;
    }
  }

  Future<OfflineSyncLogEntry> _buildSyncLog(_OfflineQuizAction action) async {
    return OfflineSyncLogEntry(
      action: action.type.logAction,
      clientEventId: action.clientEventId,
      deviceId: await _packages.getDeviceId(),
      occurredAt: action.occurredAt,
      payload: {
        'quiz_id': action.quizId,
        'course_id': action.courseId,
        'attempt_id': action.attemptId,
        if (action.questionId != null) 'question_id': action.questionId,
        ...action.payload,
      },
    );
  }

  Future<void> _appendPendingLogs(List<OfflineSyncLogEntry> entries) async {
    if (entries.isEmpty) return;
    final queue = await _readLogQueue();
    final byId = {
      for (final item in queue) item.clientEventId: item,
    };
    for (final entry in entries) {
      byId[entry.clientEventId] = entry;
    }
    await _writeLogQueue(byId.values.toList(growable: false));
  }

  Future<int> _flushPendingLogs() async {
    final queue = await _readLogQueue();
    if (queue.isEmpty) return 0;

    try {
      await _packages.submitSyncLogsBatch(queue);
      await _writeLogQueue(<OfflineSyncLogEntry>[]);
      return queue.length;
    } catch (_) {
      return 0;
    }
  }

  Future<List<_OfflineQuizAction>> _readQueue() async {
    final preferences = await SharedPreferences.getInstance();
    final decoded = _decodeList(preferences.getString(_queueKey));
    return decoded
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .map(_OfflineQuizAction.fromMap)
        .toList(growable: false);
  }

  Future<void> _writeQueue(List<_OfflineQuizAction> items) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _queueKey,
      jsonEncode(items.map((item) => item.toMap()).toList(growable: false)),
    );
  }

  Future<List<OfflineSyncLogEntry>> _readLogQueue() async {
    final preferences = await SharedPreferences.getInstance();
    final decoded = _decodeList(preferences.getString(_logQueueKey));
    return decoded
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .map(
          (item) => OfflineSyncLogEntry(
            action: _readString(item['action']),
            clientEventId: _readString(item['client_event_id']),
            deviceId: _readString(item['device_id']),
            occurredAt: _readString(item['occurred_at']),
            offlinePackageId: _readNullableInt(item['offline_package_id']),
            payload: _decodePayloadMap(item['payload']),
          ),
        )
        .toList(growable: false);
  }

  Future<void> _writeLogQueue(List<OfflineSyncLogEntry> items) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _logQueueKey,
      jsonEncode(items.map((item) => item.toMap()).toList(growable: false)),
    );
  }

  bool _isOfflineError(Object error) {
    return error is AppException &&
        (error.message == 'No connection. Check your internet and try again.' ||
            error.message == 'The server took too long to respond.');
  }

  String _clientEventId(String prefix, Map<String, dynamic> payload) {
    final checksum = jsonEncode(payload).hashCode.toUnsigned(32);
    return '$prefix-$checksum';
  }
}

class OfflineQuizSyncResult {
  const OfflineQuizSyncResult({
    required this.syncedActions,
    required this.remainingActions,
    required this.syncedLogs,
  });

  final int syncedActions;
  final int remainingActions;
  final int syncedLogs;
}

enum _OfflineQuizActionType {
  saveAnswer('quiz_answer_saved'),
  submitAttempt('quiz_attempt_submitted');

  const _OfflineQuizActionType(this.logAction);

  final String logAction;
}

class _OfflineQuizAction {
  const _OfflineQuizAction({
    required this.clientEventId,
    required this.type,
    required this.quizId,
    required this.courseId,
    required this.attemptId,
    required this.payload,
    required this.occurredAt,
    this.questionId,
  });

  final String clientEventId;
  final _OfflineQuizActionType type;
  final int quizId;
  final int courseId;
  final int attemptId;
  final int? questionId;
  final Map<String, dynamic> payload;
  final String occurredAt;

  factory _OfflineQuizAction.fromMap(Map<String, dynamic> map) {
    return _OfflineQuizAction(
      clientEventId: _readString(map['client_event_id']),
      type: _readString(map['type']) == 'submit_attempt'
          ? _OfflineQuizActionType.submitAttempt
          : _OfflineQuizActionType.saveAnswer,
      quizId: _readInt(map['quiz_id']),
      courseId: _readInt(map['course_id']),
      attemptId: _readInt(map['attempt_id']),
      questionId: _readNullableInt(map['question_id']),
      payload: _decodePayloadMap(map['payload']),
      occurredAt: _readString(map['occurred_at']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'client_event_id': clientEventId,
      'type': type == _OfflineQuizActionType.submitAttempt ? 'submit_attempt' : 'save_answer',
      'quiz_id': quizId,
      'course_id': courseId,
      'attempt_id': attemptId,
      'question_id': questionId,
      'payload': payload,
      'occurred_at': occurredAt,
    };
  }
}

Map<String, dynamic>? _decodeMap(String? raw) {
  if (raw == null || raw.trim().isEmpty) return null;
  final decoded = jsonDecode(raw);
  if (decoded is Map<String, dynamic>) return decoded;
  if (decoded is Map) {
    return decoded.map((key, value) => MapEntry(key.toString(), value));
  }
  return null;
}

List<dynamic> _decodeList(String? raw) {
  if (raw == null || raw.trim().isEmpty) return const [];
  final decoded = jsonDecode(raw);
  return decoded is List ? decoded : const [];
}

Map<String, dynamic> _decodePayloadMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return <String, dynamic>{};
}

List<Map<String, dynamic>> _readAnswerList(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((item) => item.map((key, itemValue) => MapEntry(key.toString(), itemValue)))
      .toList(growable: false);
}

String _readString(dynamic value) {
  if (value is String && value.trim().isNotEmpty) {
    return value.trim();
  }
  if (value is num) {
    return value.toString();
  }
  return '';
}

int _readInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

int? _readNullableInt(dynamic value) {
  final result = _readInt(value);
  return result > 0 ? result : null;
}
