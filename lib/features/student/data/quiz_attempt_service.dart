import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class QuizAttemptService {
  const QuizAttemptService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getAttempts({
    int? studentId,
    int? quizId,
    int? perPage,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.attempts,
      queryParameters: {
        if (studentId != null) 'student_id': studentId,
        if (quizId != null) 'quiz_id': quizId,
        if (perPage != null) 'per_page': perPage,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> createAttempt({
    required int quizId,
    int? studentId,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.attempts,
      data: {
        'quiz_id': quizId,
        if (studentId != null) 'student_id': studentId,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> startAttempt(int attemptId) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.startAttempt(attemptId),
      data: const {},
    );
  }

  Future<Response<Map<String, dynamic>>> getAttempt(int attemptId) {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.attempt(attemptId));
  }

  Future<Response<Map<String, dynamic>>> saveAttempt({
    required int attemptId,
    required Map<String, dynamic> body,
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.attempt(attemptId),
      data: body,
    );
  }

  Future<Response<Map<String, dynamic>>> submitAttempt({
    required int attemptId,
    required List<Map<String, dynamic>> answers,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.submitAttempt(attemptId),
      data: {'answers': answers},
    );
  }

  Future<Response<Map<String, dynamic>>> getGrade(int attemptId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.attemptGrade(attemptId),
    );
  }
}
