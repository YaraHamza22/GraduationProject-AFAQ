import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class InstructorDashboardService {
  const InstructorDashboardService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getDashboard() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.instructorDashboard);
  }

  Future<Response<Map<String, dynamic>>> getMyCourses() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.myCourses);
  }

  Future<Response<Map<String, dynamic>>> getStudents({int perPage = 200}) {
    return _client.get<Map<String, dynamic>>(
      '/instructor/students',
      queryParameters: {'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> getAssessmentProgress({
    required int courseId,
    required int studentId,
  }) {
    return _client.get<Map<String, dynamic>>(
      '/my-courses/$courseId/assessment-progress',
      queryParameters: {'student_id': studentId},
    );
  }
}
