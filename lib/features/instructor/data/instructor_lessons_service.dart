import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import 'instructor_locale_options.dart';

class InstructorLessonsService {
  const InstructorLessonsService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getLessons({
    required int courseId,
    required int unitId,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myCourseLessons(courseId, unitId),
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getLessonsCount({
    required int courseId,
    required int unitId,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myCourseLessonsCount(courseId, unitId),
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> getLesson({
    required int courseId,
    required int unitId,
    required int lessonId,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myCourseLesson(courseId, unitId, lessonId),
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> createLesson({
    required int courseId,
    required int unitId,
    required Map<String, dynamic> body,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.myCourseLessons(courseId, unitId),
      data: body,
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> updateLesson({
    required int courseId,
    required int unitId,
    required int lessonId,
    required Map<String, dynamic> body,
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.myCourseLesson(courseId, unitId, lessonId),
      data: body,
      options: instructorLocaleOptions(),
    );
  }

  Future<Response<void>> deleteLesson({
    required int courseId,
    required int unitId,
    required int lessonId,
  }) {
    return _client.delete<void>(
      ApiEndpoints.myCourseLesson(courseId, unitId, lessonId),
      options: instructorLocaleOptions(),
    );
  }
}
