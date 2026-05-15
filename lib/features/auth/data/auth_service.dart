import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
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
    bool demoMode = true,
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
    final token = response.data?['access_token'] as String?;
    _store.save(accessToken: token ?? '', userRole: role);
  }

  Future<void> logout() async {
    await _client.post(ApiEndpoints.logout);
    _store.clear();
  }
}
