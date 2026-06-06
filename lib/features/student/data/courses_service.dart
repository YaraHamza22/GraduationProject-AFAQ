import 'dart:convert';
import 'dart:developer' as developer;

import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/session/session_store.dart';

class CoursesService {
  const CoursesService({
    ApiClient? apiClient,
    SessionStore? sessionStore,
  })  : _apiClient = apiClient,
        _sessionStore = sessionStore;

  final ApiClient? _apiClient;
  final SessionStore? _sessionStore;

  ApiClient get _client => _apiClient ?? ApiClient.instance;
  SessionStore get _store => _sessionStore ?? SessionStore.instance;

  Future<Response<Map<String, dynamic>>> getEnrollments({
    int perPage = 100,
  }) {
    final userId = _store.userId;

    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.enrollments,
      queryParameters: {
        'per_page': perPage,
        if (userId != null && userId > 0) 'learner_id': userId,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> getCourses({
    int perPage = 100,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.courses,
      queryParameters: {
        'per_page': perPage,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> enroll({
    required int courseId,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.enrollments,
      data: {
        'course_id': courseId,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> getEnrollmentProgress({
    required int enrollmentId,
  }) {
    return _client.get<Map<String, dynamic>>(
      '/enrollments/$enrollmentId/progress',
    );
  }

  Future<Response<Map<String, dynamic>>> getCourseContent({
    required int courseId,
  }) {
    return _client.get<Map<String, dynamic>>(
      '/courses/$courseId',
    );
  }

  Future<Response<Map<String, dynamic>>> getLessonsByUnit({
    required int unitId,
    int perPage = 100,
  }) {
    return _client.get<Map<String, dynamic>>(
      '/lessons',
      queryParameters: {
        'unit_id': unitId,
        'per_page': perPage,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> getLesson({
    required int lessonId,
  }) {
    return _client.get<Map<String, dynamic>>(
      '/lessons/$lessonId',
    );
  }

  Future<Response<Map<String, dynamic>>> completeLesson({
    required int enrollmentId,
    required int lessonId,
  }) async {
    final path = '/enrollments/$enrollmentId/lessons/$lessonId/complete';

    developer.log(
      'POST $path',
      name: 'CoursesService.completeLesson',
    );

    try {
      final response = await _client.post<Map<String, dynamic>>(
        path,
        data: {
          // Keep this empty for now.
          // The debug log below will show what the backend validation requires.
        },
      );

      developer.log(
        'Complete lesson success: ${_safeJson(response.data)}',
        name: 'CoursesService.completeLesson',
      );

      return response;
    } on DioException catch (error) {
      developer.log(
        '''
Complete lesson failed
Status Code: ${error.response?.statusCode}
Request Path: $path
Request Data: {}
Response Data: ${_safeJson(error.response?.data)}
Response Headers: ${error.response?.headers}
''',
        name: 'CoursesService.completeLesson',
        error: error,
        stackTrace: error.stackTrace,
      );

      rethrow;
    } catch (error, stackTrace) {
      developer.log(
        '''
Complete lesson failed with unexpected error
Request Path: $path
Error: $error
''',
        name: 'CoursesService.completeLesson',
        error: error,
        stackTrace: stackTrace,
      );

      rethrow;
    }
  }

  static String _safeJson(dynamic value) {
    try {
      return const JsonEncoder.withIndent('  ').convert(value);
    } catch (_) {
      return value.toString();
    }
  }
}
