import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import 'auditor_locale_options.dart';

class AuditorCoursesService {
  const AuditorCoursesService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getCategories() {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.courseCategories,
      options: auditorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getCourses({
    String? status = 'review',
    int perPage = 15,
    int page = 1,
  }) {
    final normalizedStatus = status == 'all' ? null : status;

    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.auditorCourses,
      queryParameters: {
        if (normalizedStatus != null && normalizedStatus.isNotEmpty)
          'status': normalizedStatus,
        'per_page': perPage,
        'page': page,
      },
      options: auditorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getCourse(String courseKey) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.auditorCourse(courseKey),
      options: auditorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getCourseUnits(String courseKey) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.auditorCourseUnits(courseKey),
      options: auditorLocaleOptions(),
    );
  }
}
