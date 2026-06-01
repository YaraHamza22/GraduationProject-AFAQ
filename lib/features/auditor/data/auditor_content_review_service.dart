import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import 'auditor_locale_options.dart';

enum AuditorReviewVerdict {
  approved,
  changesRequested,
  followUp,
}

extension AuditorReviewVerdictApi on AuditorReviewVerdict {
  String get apiValue {
    return switch (this) {
      AuditorReviewVerdict.approved => 'approved',
      AuditorReviewVerdict.changesRequested => 'changes_requested',
      AuditorReviewVerdict.followUp => 'follow_up',
    };
  }
}

class AuditorContentReviewService {
  const AuditorContentReviewService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getReviews({
    required int courseId,
    int page = 1,
    int perPage = 10,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.auditorContentReview(courseId),
      queryParameters: {
        'page': page,
        'per_page': perPage,
      },
      options: auditorLocaleOptions(),
    );
  }

  Future<Response<Map<String, dynamic>>> submitLessonReview({
    required int courseId,
    int? lessonId,
    required AuditorReviewVerdict verdict,
    required String notes,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.auditorContentReview(courseId),
      data: {
        'verdict': verdict.apiValue,
        'notes': notes,
        if (lessonId != null && lessonId > 0) 'lesson_id': lessonId,
      },
      options: auditorLocaleOptions(),
    );
  }
}
