import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../student/data/chat_realtime_service.dart';
import '../../student/data/chat_service.dart';

class InstructorChatService extends ChatService {
  const InstructorChatService({super.apiClient});

  Future<Response<Map<String, dynamic>>> getStudentContacts({
    int perPage = 200,
    bool useUsersEndpoint = false,
    bool superAdmin = false,
  }) {
    final endpoint = switch ((useUsersEndpoint, superAdmin)) {
      (false, false) => ApiEndpoints.students,
      (true, false) => ApiEndpoints.users,
      (false, true) => ApiEndpoints.superAdminStudents,
      (true, true) => ApiEndpoints.superAdminUsers,
    };

    return client.get<Map<String, dynamic>>(
      endpoint,
      queryParameters: {
        'per_page': perPage,
        if (useUsersEndpoint) 'role': 'student',
      },
    );
  }
}

typedef InstructorChatRealtimeService = ChatRealtimeService;
