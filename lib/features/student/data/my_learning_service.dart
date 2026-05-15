import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class MyLearningService {
  const MyLearningService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getMyLearning() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.myLearning);
  }

  Future<Response<Map<String, dynamic>>> getUnits(String courseSlug) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myLearningUnits(courseSlug),
    );
  }

  Future<Response<Map<String, dynamic>>> getLessons({
    required String courseSlug,
    required int unitId,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.myLearningLessons(courseSlug, unitId),
    );
  }
}
