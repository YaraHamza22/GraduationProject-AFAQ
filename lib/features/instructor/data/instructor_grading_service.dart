import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class InstructorGradingService {
  const InstructorGradingService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getAttempts({int perPage = 200}) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.attempts,
      queryParameters: {'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> getGradingSheet(int attemptId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.gradingSheet(attemptId),
    );
  }

  Future<Response<Map<String, dynamic>>> submitInstructorGrade({
    required int attemptId,
    required List<Map<String, dynamic>> answers,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.instructorGrade(attemptId),
      data: {'answers': answers},
    );
  }
}
