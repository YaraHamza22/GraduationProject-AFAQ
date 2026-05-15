import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class CoursesService {
  const CoursesService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getEnrollments({int perPage = 100}) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.enrollments,
      queryParameters: {'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> getCourses({int perPage = 100}) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.courses,
      queryParameters: {'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> enroll({required int courseId}) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.enrollments,
      data: {'course_id': courseId},
    );
  }

  Future<Response<Map<String, dynamic>>> getEnrollmentProgress({
    required int enrollmentId,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.enrollmentProgress(enrollmentId),
    );
  }
}
