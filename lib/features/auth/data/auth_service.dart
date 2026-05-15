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
      _store.save(accessToken: 'demo-token-${role.name}', userRole: role);
      return;
    }

    final response = await _client.post<Map<String, dynamic>>(
      ApiEndpoints.login,
      data: {
        'email': email,
        'password': password,
        'role': role.name,
      },
    );

    final token = _readToken(response.data);
    if (token == null || token.isEmpty) {
      throw const AppException('Login succeeded but no access token was returned.');
    }

    _store.save(accessToken: token, userRole: role);
  }

  Future<void> logout() async {
    await _client.post(ApiEndpoints.logout);
    _store.clear();
  }

  String? _readToken(Map<String, dynamic>? data) {
    if (data == null) return null;

    final directToken = data['access_token'] ?? data['token'];
    if (directToken is String) return directToken;

    final nestedData = data['data'];
    if (nestedData is Map<String, dynamic>) {
      final nestedToken = nestedData['access_token'] ?? nestedData['token'];
      if (nestedToken is String) return nestedToken;
    }

    return null;
  }
}
