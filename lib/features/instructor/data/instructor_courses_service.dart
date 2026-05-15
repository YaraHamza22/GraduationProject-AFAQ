import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import 'instructor_locale_options.dart';

class InstructorCoursesService {
  const InstructorCoursesService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getMyCourses() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.myCourses);
  }

  Future<Response<Map<String, dynamic>>> getCourse(int courseId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myCourse(courseId),
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getUnits(int courseId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myCourseUnits(courseId),
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getUnit({
    required int courseId,
    required int unitId,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myCourseUnit(courseId, unitId),
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> createUnit({
    required int courseId,
    required Map<String, dynamic> body,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.myCourseUnits(courseId),
      data: body,
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> updateUnit({
    required int courseId,
    required int unitId,
    required Map<String, dynamic> body,
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.myCourseUnit(courseId, unitId),
      data: body,
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<void>> deleteUnit({
    required int courseId,
    required int unitId,
  }) {
    return _client.delete<void>(
      ApiEndpoints.myCourseUnit(courseId, unitId),
      options: instructorLocaleOptions(),
    );
  }
}
