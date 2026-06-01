import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import 'auditor_courses_service.dart';
import 'auditor_notification_service.dart';
import 'auditor_profile_service.dart';
import 'auditor_quiz_service.dart';

class AuditorWorkspaceInitialData {
  const AuditorWorkspaceInitialData({
    required this.profile,
    required this.categories,
    required this.courses,
    required this.quizzes,
    required this.unreadNotifications,
  });

  final Response<Map<String, dynamic>> profile;
  final Response<Map<String, dynamic>> categories;
  final Response<Map<String, dynamic>> courses;
  final Response<Map<String, dynamic>> quizzes;
  final Response<Map<String, dynamic>> unreadNotifications;
}

class AuditorWorkspaceService {
  const AuditorWorkspaceService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<AuditorWorkspaceInitialData> loadInitial({
    String? status = 'review',
    int perPage = 15,
  }) async {
    final profileService = AuditorProfileService(apiClient: _client);
    final coursesService = AuditorCoursesService(apiClient: _client);
    final quizService = AuditorQuizService(apiClient: _client);
    final notificationService = AuditorNotificationService(apiClient: _client);

    final results = await Future.wait<Response<Map<String, dynamic>>>([
      profileService.getProfile(),
      coursesService.getCategories(),
      coursesService.getCourses(status: status, perPage: perPage),
      quizService.getQuizzes(perPage: 8, page: 1),
      notificationService.getNotifications(unreadOnly: true),
    ]);

    return AuditorWorkspaceInitialData(
      profile: results[0],
      categories: results[1],
      courses: results[2],
      quizzes: results[3],
      unreadNotifications: results[4],
    );
  }
}
