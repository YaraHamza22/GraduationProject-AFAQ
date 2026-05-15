import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class ChatService {
  const ChatService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getUnreadCount() {
    return client.get<Map<String, dynamic>>(ApiEndpoints.chatUnreadCount);
  }

  Future<Response<Map<String, dynamic>>> getThreads({
    int page = 1,
    int perPage = 15,
  }) {
    return client.get<Map<String, dynamic>>(
      ApiEndpoints.chatThreads,
      queryParameters: {'page': page, 'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> createThread({
    required String title,
    int? courseId,
  }) {
    return client.post<Map<String, dynamic>>(
      ApiEndpoints.chatThreads,
      data: {'title': title, 'course_id': courseId},
    );
  }

  Future<Response<Map<String, dynamic>>> getParticipants(int threadId) {
    return client.get<Map<String, dynamic>>(
      ApiEndpoints.chatParticipants(threadId),
    );
  }

  Future<Response<Map<String, dynamic>>> addParticipant({
    required int threadId,
    required int userId,
    String role = 'member',
  }) {
    return client.post<Map<String, dynamic>>(
      ApiEndpoints.chatParticipants(threadId),
      data: {'user_id': userId, 'role': role},
    );
  }

  Future<Response<void>> removeParticipant({
    required int threadId,
    required int userId,
  }) {
    return client.delete<void>(
      ApiEndpoints.chatParticipant(threadId, userId),
    );
  }

  Future<Response<Map<String, dynamic>>> getMessages({
    required int threadId,
    int page = 1,
    int perPage = 30,
  }) {
    return client.get<Map<String, dynamic>>(
      ApiEndpoints.chatMessagesForThread(threadId),
      queryParameters: {'page': page, 'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> sendMessage({
    required int threadId,
    required String body,
  }) {
    return client.post<Map<String, dynamic>>(
      ApiEndpoints.chatMessagesForThread(threadId),
      data: {'body': body},
    );
  }

  Future<Response<Map<String, dynamic>>> archiveThread(int threadId) {
    return client.post<Map<String, dynamic>>(
      ApiEndpoints.archiveChatThread(threadId),
      data: const {},
    );
  }

  Future<Response<Map<String, dynamic>>> markMessageRead(int messageId) {
    return client.post<Map<String, dynamic>>(
      ApiEndpoints.readChatMessage(messageId),
      data: const {},
    );
  }

  Future<Response<void>> deleteMessage(int messageId) {
    return client.delete<void>(ApiEndpoints.chatMessage(messageId));
  }

  Future<Response<Map<String, dynamic>>> getInstructorContacts({
    int perPage = 200,
    bool useUsersEndpoint = false,
    bool superAdmin = false,
  }) {
    final endpoint = switch ((useUsersEndpoint, superAdmin)) {
      (false, false) => ApiEndpoints.instructors,
      (true, false) => ApiEndpoints.users,
      (false, true) => ApiEndpoints.superAdminInstructors,
      (true, true) => ApiEndpoints.superAdminUsers,
    };

    return client.get<Map<String, dynamic>>(
      endpoint,
      queryParameters: {
        'per_page': perPage,
        if (useUsersEndpoint) 'role': 'instructor',
      },
    );
  }
}
