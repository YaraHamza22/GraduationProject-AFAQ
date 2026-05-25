import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class StudentDashboardService {
  const StudentDashboardService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getDashboard({String locale = 'en'}) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.studentDashboard,
      options: Options(
        headers: {
          'Accept-Language': locale,
          'X-Locale': locale,
        },
      ),
    );
  }
}
