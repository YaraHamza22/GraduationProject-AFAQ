import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class QuizService {
  const QuizService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getQuizzes({
    int? courseId,
    int? perPage,
    bool includeQuestions = false,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.quizzes,
      queryParameters: {
        if (courseId != null) 'course_id': courseId,
        if (perPage != null) 'per_page': perPage,
        'include_questions': includeQuestions,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> getQuiz(int quizId) {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.quiz(quizId));
  }

  Future<Response<Map<String, dynamic>>> getQuizAvailability(int courseId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.courseQuizAvailability(courseId),
    );
  }

  Future<Response<Map<String, dynamic>>> getMeWithQuizzes() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.meWithQuizzes);
  }

  Future<Response<Map<String, dynamic>>> getAssessmentProgress(int courseId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.courseAssessmentProgress(courseId),
    );
  }
}
