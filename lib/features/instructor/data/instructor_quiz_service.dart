import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class InstructorQuizService {
  const InstructorQuizService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> listQuizzes({int perPage = 200}) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.quizzes,
      queryParameters: {
        'quizable_type': 'course',
        'type': 'quiz',
        'per_page': perPage,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> getQuiz(int quizId) {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.quiz(quizId));
  }

  Future<Response<Map<String, dynamic>>> createQuiz(Map<String, dynamic> body) {
    return _client.post<Map<String, dynamic>>(ApiEndpoints.quizzes, data: body);
  }

  Future<Response<Map<String, dynamic>>> updateQuiz({
    required int quizId,
    required Map<String, dynamic> body,
  }) {
    return _client.put<Map<String, dynamic>>(ApiEndpoints.quiz(quizId), data: body);
  }

  Future<Response<void>> deleteQuiz(int quizId) {
    return _client.delete<void>(ApiEndpoints.quiz(quizId));
  }

  Future<Response<Map<String, dynamic>>> getQuizResults({
    required int quizId,
    String status = 'submitted',
    int page = 1,
  }) {
    return _client.get<Map<String, dynamic>>(
      '/quizzes/$quizId/results',
      queryParameters: {
        'status': status,
        'page': page,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> createQuestion(Map<String, dynamic> body) {
    return _client.post<Map<String, dynamic>>(ApiEndpoints.questions, data: body);
  }

  Future<Response<Map<String, dynamic>>> updateQuestion({
    required int questionId,
    required Map<String, dynamic> body,
  }) {
    return _client.put<Map<String, dynamic>>('/questions/$questionId', data: body);
  }

  Future<Response<void>> deleteQuestion(int questionId) {
    return _client.delete<void>('/questions/$questionId');
  }
}
