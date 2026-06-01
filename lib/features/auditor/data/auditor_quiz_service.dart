import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import 'auditor_locale_options.dart';

class AuditorQuizService {
  const AuditorQuizService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getQuizzes({
    int perPage = 30,
    int page = 1,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.auditorQuizzes,
      queryParameters: {
        'per_page': perPage,
        'page': page,
        'include_questions': false,
      },
      options: auditorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getQuiz(int quizId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.auditorQuiz(quizId),
      options: auditorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getQuestions({
    int perPage = 60,
    int page = 1,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.questions,
      queryParameters: {
        'per_page': perPage,
        'page': page,
      },
      options: auditorLocaleOptions(),
    );
  }
}
