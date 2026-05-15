import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class ForumService {
  const ForumService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  Future<Response<Map<String, dynamic>>> getThreads({
    int page = 1,
    int perPage = 20,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.forumThreads,
      queryParameters: {'page': page, 'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> createThread({
    required String title,
    required String body,
    required int courseId,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.forumThreads,
      data: {'title': title, 'body': body, 'course_id': courseId},
    );
  }

  Future<Response<Map<String, dynamic>>> updateThread({
    required int threadId,
    required String title,
    required String body,
    required int courseId,
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.forumThread(threadId),
      data: {'title': title, 'body': body, 'course_id': courseId},
    );
  }

  Future<Response<void>> deleteThread(int threadId) {
    return _client.delete<void>(ApiEndpoints.forumThread(threadId));
  }

  Future<Response<Map<String, dynamic>>> getPosts({
    required int threadId,
    int page = 1,
    int perPage = 20,
  }) {
    return _client.get<Map<String, dynamic>>(
      ApiEndpoints.forumThreadPosts(threadId),
      queryParameters: {'page': page, 'per_page': perPage},
    );
  }

  Future<Response<Map<String, dynamic>>> createPost({
    required int threadId,
    required String body,
    int? parentId,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.forumThreadPosts(threadId),
      data: {'body': body, 'parent_id': parentId},
    );
  }

  Future<Response<Map<String, dynamic>>> updatePost({
    required int postId,
    required String body,
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.forumPost(postId),
      data: {'body': body},
    );
  }

  Future<Response<void>> deletePost(int postId) {
    return _client.delete<void>(ApiEndpoints.forumPost(postId));
  }

  Future<Response<Map<String, dynamic>>> reactToPost({
    required int postId,
    String reaction = 'like',
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.reactToForumPost(postId),
      data: {'reaction': reaction},
    );
  }

  Future<Response<Map<String, dynamic>>> reportPost({
    required int postId,
    required String reason,
    required String description,
  }) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.reportForumPost(postId),
      data: {'reason': reason, 'description': description},
    );
  }

  Future<Response<Map<String, dynamic>>> getCourseOptions({
    bool superAdmin = false,
    int perPage = 100,
  }) {
    return _client.get<Map<String, dynamic>>(
      superAdmin ? ApiEndpoints.superAdminCourses : ApiEndpoints.courses,
      queryParameters: {'per_page': perPage},
    );
  }
}
