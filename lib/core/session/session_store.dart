import '../widgets/afaq_sidebar.dart';

class SessionStore {
  SessionStore._();

  static final instance = SessionStore._();

  String? token;
  AfaqRole? role;

  bool get isLoggedIn => token != null && token!.isNotEmpty;

  void save({required String accessToken, required AfaqRole userRole}) {
    token = accessToken;
    role = userRole;
  }

  void clear() {
    token = null;
    role = null;
  }
}
