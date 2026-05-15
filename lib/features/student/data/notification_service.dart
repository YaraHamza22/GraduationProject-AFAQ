import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class NotificationService {
  const NotificationService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getUnreadCount() {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.notificationsUnreadCount,
    );
  }

  Future<Response<Map<String, dynamic>>> getNotifications({
    bool unreadOnly = false,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.notifications,
      queryParameters: {'unread_only': unreadOnly.toString()},
    );
  }

  Future<Response<Map<String, dynamic>>> markAllRead() {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.readAllNotifications,
      data: const {},
    );
  }

  Future<Response<Map<String, dynamic>>> markRead(int notificationId) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.readNotification(notificationId),
      data: const {},
    );
  }
}
