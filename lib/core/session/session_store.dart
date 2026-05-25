import 'package:shared_preferences/shared_preferences.dart';

import '../widgets/afaq_sidebar.dart';

class SessionStore {
  SessionStore._();

  static final instance = SessionStore._();

  static const _tokenKey = 'auth_token';
  static const _roleKey = 'auth_role';
  static const _userIdKey = 'auth_user_id';

  String? token;
  AfaqRole? role;
  int? userId;

  bool get isLoggedIn => token != null && token!.isNotEmpty;

  Future<void> initialize() async {
    final preferences = await SharedPreferences.getInstance();
    token = preferences.getString(_tokenKey);

    final rawRole = preferences.getString(_roleKey);
    role = switch (rawRole) {
      'student' => AfaqRole.student,
      'instructor' => AfaqRole.instructor,
      'auditor' => AfaqRole.auditor,
      _ => null,
    };

    userId = preferences.getInt(_userIdKey);
  }

  Future<void> save({
    required String accessToken,
    required AfaqRole userRole,
    int? currentUserId,
  }) async {
    token = accessToken;
    role = userRole;
    userId = currentUserId;

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_tokenKey, accessToken);
    await preferences.setString(_roleKey, userRole.name);
    if (currentUserId != null) {
      await preferences.setInt(_userIdKey, currentUserId);
    } else {
      await preferences.remove(_userIdKey);
    }
  }

  Future<void> clear() async {
    token = null;
    role = null;
    userId = null;

    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_tokenKey);
    await preferences.remove(_roleKey);
    await preferences.remove(_userIdKey);
  }
}
