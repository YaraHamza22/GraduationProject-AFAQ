import 'package:dio/dio.dart';
import 'dart:convert';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/session/session_store.dart';
import '../../../core/widgets/afaq_sidebar.dart';

class AuthService {
  const AuthService({ApiClient? apiClient, SessionStore? sessionStore})
      : _apiClient = apiClient,
        _sessionStore = sessionStore;

  final ApiClient? _apiClient;
  final SessionStore? _sessionStore;

  ApiClient get _client => _apiClient ?? ApiClient.instance;
  SessionStore get _store => _sessionStore ?? SessionStore.instance;

  Future<void> login({
    required String email,
    required String password,
    required AfaqRole role,
    bool demoMode = false,
  }) async {
    if (demoMode) {
      await Future<void>.delayed(const Duration(milliseconds: 700));
      await _store.save(accessToken: 'demo-token-${role.name}', userRole: role);
      return;
    }

    final body = {
      'email': email,
      'password': password,
      if (role != AfaqRole.instructor) 'role': role.name,
    };
    final response = await _loginWithFallback(body: body, role: role);

    final token = _readToken(response.data);
    if (token == null || token.isEmpty) {
      throw const AppException('Login succeeded but no access token was returned.');
    }

    await _store.save(
      accessToken: token,
      userRole: role,
      currentUserId: _readUserId(response.data, token: token),
    );

    if (role == AfaqRole.instructor) {
      await _client.get<Map<String, dynamic>>(ApiEndpoints.instructorDashboard);
    }
  }

  Future<void> logout() async {
    await _client.post(ApiEndpoints.logout);
    await _store.clear();
  }

  Future<Response<Map<String, dynamic>>> _loginWithFallback({
    required Map<String, dynamic> body,
    required AfaqRole role,
  }) async {
    try {
      return await _client.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: body,
      );
    } on AppException {
      if (role != AfaqRole.instructor) rethrow;
      return _client.post<Map<String, dynamic>>(
        ApiEndpoints.loginFallback,
        data: {
          'email': body['email'],
          'password': body['password'],
        },
      );
    }
  }

  String? _readToken(Map<String, dynamic>? data) {
    if (data == null) return null;

    final directToken = data['access_token'] ?? data['token'];
    if (directToken is String) return directToken;

    final directAccessToken = data['accessToken'];
    if (directAccessToken is String) return directAccessToken;

    final nestedData = data['data'];
    if (nestedData is Map<String, dynamic>) {
      final nestedToken =
          nestedData['access_token'] ??
          nestedData['token'] ??
          nestedData['accessToken'];
      if (nestedToken is String) return nestedToken;
    }

    final authorization = data['authorisation'] ?? data['authorization'];
    if (authorization is Map<String, dynamic>) {
      final authToken =
          authorization['access_token'] ??
          authorization['token'] ??
          authorization['accessToken'];
      if (authToken is String) return authToken;
    }

    return null;
  }

  int? _readUserId(Map<String, dynamic>? data, {String? token}) {
    final candidates = <dynamic>[
      data?['user_id'],
      data?['id'],
      data?['user'],
      data?['data'],
      data?['authorization'],
      data?['authorisation'],
    ];

    for (final candidate in candidates) {
      final userId = _extractUserId(candidate);
      if (userId != null) return userId;
    }

    return _readUserIdFromJwt(token);
  }

  int? _extractUserId(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    if (value is String) return int.tryParse(value);
    if (value is! Map<String, dynamic>) return null;

    final direct = value['id'] ?? value['user_id'] ?? value['sub'];
    final directId = _extractUserId(direct);
    if (directId != null) return directId;

    final nestedUser = value['user'];
    final nestedUserId = _extractUserId(nestedUser);
    if (nestedUserId != null) return nestedUserId;

    final nestedData = value['data'];
    return _extractUserId(nestedData);
  }

  int? _readUserIdFromJwt(String? token) {
    if (token == null || token.isEmpty) return null;

    final segments = token.split('.');
    if (segments.length < 2) return null;

    try {
      final normalized = base64Url.normalize(segments[1]);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(decoded);
      if (payload is! Map<String, dynamic>) return null;
      return _extractUserId(payload['sub'] ?? payload['id'] ?? payload['user_id']);
    } catch (_) {
      return null;
    }
  }
}
