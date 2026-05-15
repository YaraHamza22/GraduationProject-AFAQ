import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class AuditorQuizService {
  const AuditorQuizService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getQuizzes() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.quizzes);
  }

  Future<Response<Map<String, dynamic>>> getQuiz(int quizId) {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.quiz(quizId));
  }

  Future<Response<Map<String, dynamic>>> getQuestions() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.questions);
  }
}
