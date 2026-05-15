import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class StudentDashboardService {
  const StudentDashboardService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getDashboard() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.studentDashboard);
  }
}
