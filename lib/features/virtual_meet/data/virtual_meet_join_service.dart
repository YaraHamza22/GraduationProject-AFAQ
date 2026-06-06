import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class VirtualMeetJoinService {
  const VirtualMeetJoinService({ApiClient? apiClient})
    : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getSessions({bool isStudent = false}) {
    return _client.get<Map<String, dynamic>>(
      isStudent ? ApiEndpoints.studentVirtualSessions : ApiEndpoints.virtualSessions,
    );
  }
}
