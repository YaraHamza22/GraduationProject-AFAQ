import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

enum AuditorReviewVerdict {
  approved,
  changesRequested,
  rejected,
}

extension AuditorReviewVerdictApi on AuditorReviewVerdict {
  String get apiValue {
    return switch (this) {
      AuditorReviewVerdict.approved => 'approved',
      AuditorReviewVerdict.changesRequested => 'changes_requested',
      AuditorReviewVerdict.rejected => 'rejected',
    };
  }
}

class AuditorContentReviewService {
  const AuditorContentReviewService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> submitLessonReview({
    required int courseId,
    required int lessonId,
    required AuditorReviewVerdict verdict,
    required String notes,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.auditorContentReview(courseId),
      data: {
        'verdict': verdict.apiValue,
        'notes': notes,
        'lesson_id': lessonId,
      },
    );
  }
}
