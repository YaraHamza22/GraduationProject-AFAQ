import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class InstructorVirtualMeetService {
  const InstructorVirtualMeetService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getCourseChoices({
    bool fallback = false,
  }) {
    return _client.get<Map<String, dynamic>>(
      fallback ? ApiEndpoints.courses : ApiEndpoints.myCourses,
    );
  }

  Future<Response<Map<String, dynamic>>> getIntegrations() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.externalIntegrations);
  }

  Future<Response<Map<String, dynamic>>> getSessions() {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.virtualSessions);
  }

  Future<Response<Map<String, dynamic>>> createIntegration({
    required Map<String, dynamic> body,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.externalIntegrations,
      data: body,
    );
  }

  Future<Response<Map<String, dynamic>>> updateIntegration({
    required int integrationId,
    required Map<String, dynamic> body,
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.externalIntegration(integrationId),
      data: body,
    );
  }

  Future<Response<void>> deleteIntegration(int integrationId) {
    return _client.delete<void>(
      ApiEndpoints.externalIntegration(integrationId),
    );
  }

  Future<Response<Map<String, dynamic>>> getOAuthUrl(String provider) {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.oauthUrl(provider));
  }

  Future<Response<Map<String, dynamic>>> exchangeOAuthCode({
    required String provider,
    required String code,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.exchangeOAuthCode(provider),
      data: {'code': code},
    );
  }

  Future<Response<Map<String, dynamic>>> createSession({
    required Map<String, dynamic> body,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.virtualSessions,
      data: body,
    );
  }

  Future<Response<Map<String, dynamic>>> updateSession({
    required int sessionId,
    required Map<String, dynamic> body,
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.virtualSession(sessionId),
      data: body,
    );
  }

  Future<Response<void>> deleteSession(int sessionId) {
    return _client.delete<void>(ApiEndpoints.virtualSession(sessionId));
  }

  Future<Response<Map<String, dynamic>>> publishSession(int sessionId) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.publishVirtualSession(sessionId),
      data: const {},
    );
  }

  Future<Response<Map<String, dynamic>>> cancelSession(int sessionId) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.cancelVirtualSession(sessionId),
      data: const {},
    );
  }

  Future<Response<Map<String, dynamic>>> saveAttendance({
    required int sessionId,
    required Map<String, dynamic> body,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.virtualSessionAttendance(sessionId),
      data: body,
    );
  }

  Future<Response<Map<String, dynamic>>> getSessionStudents(int sessionId) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.virtualSessionStudents(sessionId),
    );
  }
}
