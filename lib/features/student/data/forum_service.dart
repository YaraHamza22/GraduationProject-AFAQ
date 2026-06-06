import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class ForumService {
  const ForumService({ApiClient? apiClient}) : _apiClient = apiClient;

  final ApiClient? _apiClient;
  static Future<Response<Map<String, dynamic>>>? _inFlightThreads;
  static Response<Map<String, dynamic>>? _cachedThreads;
  static Future<Response<Map<String, dynamic>>>? _inFlightCourseOptions;
  static Response<Map<String, dynamic>>? _cachedCourseOptions;
  static final Map<String, Future<Response<Map<String, dynamic>>>> _inFlightPosts =
      {};
  static final Map<String, Response<Map<String, dynamic>>> _cachedPosts = {};

  ApiClient get _client => _apiClient ?? ApiClient.instance;

  static void _invalidateThreadPostsCache(int threadId) {
    final prefix = '$threadId:';
    _inFlightPosts.removeWhere((key, _) => key.startsWith(prefix));
    _cachedPosts.removeWhere((key, _) => key.startsWith(prefix));
  }

  static Map<String, dynamic>? getCachedPostsPayload({
    required int threadId,
    int page = 1,
    int perPage = 20,
  }) {
    final response = _cachedPosts['$threadId:$page:$perPage'];
    return response?.data;
  }

  static Map<String, dynamic>? getCachedThreadsPayload() {
    return _cachedThreads?.data;
  }

  static Map<String, dynamic>? getCachedCourseOptionsPayload() {
    return _cachedCourseOptions?.data;
  }

  Future<Response<Map<String, dynamic>>> getThreads({
    int page = 1,
    int perPage = 20,
    bool forceRefresh = false,
  }) {
    if (!forceRefresh && page == 1 && _cachedThreads != null) {
      return Future.value(_cachedThreads);
    }

    if (!forceRefresh && page == 1 && _inFlightThreads != null) {
      return _inFlightThreads!;
    }

    final future = _client
        .get<Map<String, dynamic>>(
          ApiEndpoints.forumThreads,
          queryParameters: {'page': page, 'per_page': perPage},
        )
        .then((response) {
          if (page == 1) _cachedThreads = response;
          return response;
        })
        .whenComplete(() {
          if (page == 1) _inFlightThreads = null;
        });

    if (page == 1) _inFlightThreads = future;
    return future;
  }

  Future<Response<Map<String, dynamic>>> createThread({
    required String title,
    required String body,
    required int courseId,
    String category = 'general',
  }) {
    _cachedThreads = null;
    _inFlightThreads = null;
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.forumThreads,
      data: {
        'title': title,
        'body': body,
        'course_id': courseId,
        'category': category,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> updateThread({
    required int threadId,
    required String title,
    required String body,
    required int courseId,
    String category = 'general',
  }) {
    return _client.put<Map<String, dynamic>>(
      ApiEndpoints.forumThread(threadId),
      data: {
        'title': title,
        'body': body,
        'course_id': courseId,
        'category': category,
      },
    );
  }

  Future<Response<Map<String, dynamic>>> getThread(int threadId) {
    return _client.get<Map<String, dynamic>>(ApiEndpoints.forumThread(threadId));
  }

  Future<Response<void>> deleteThread(int threadId) {
    return _client.delete<void>(ApiEndpoints.forumThread(threadId));
  }

  Future<Response<Map<String, dynamic>>> pinThread(int threadId) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.pinForumThread(threadId),
      data: const {},
    );
  }

  Future<Response<Map<String, dynamic>>> lockThread(int threadId) {
    return _client.post<Map<String, dynamic>>(
      ApiEndpoints.lockForumThread(threadId),
      data: const {},
    );
  }

  Future<Response<Map<String, dynamic>>> getPosts({
    required int threadId,
    int page = 1,
    int perPage = 20,
    bool forceRefresh = false,
  }) {
    final requestKey = '$threadId:$page:$perPage';
    if (!forceRefresh) {
      final cached = _cachedPosts[requestKey];
      if (cached != null) return Future.value(cached);
    }

    if (!forceRefresh) {
      final active = _inFlightPosts[requestKey];
      if (active != null) return active;
    }

    final future = _client
        .get<Map<String, dynamic>>(
          ApiEndpoints.forumThreadPosts(threadId),
          queryParameters: {'page': page, 'per_page': perPage},
        )
        .then((response) {
          _cachedPosts[requestKey] = response;
          return response;
        })
        .whenComplete(() => _inFlightPosts.remove(requestKey));

    _inFlightPosts[requestKey] = future;
    return future;
  }

  Future<void> warmPostsCache({
    required int threadId,
    int page = 1,
    int perPage = 20,
  }) async {
    try {
      await getPosts(threadId: threadId, page: page, perPage: perPage);
    } catch (_) {
      // Ignore background warm-up failures.
    }
  }

  Future<Response<Map<String, dynamic>>> createPost({
    required int threadId,
    required String body,
    int? parentId,
  }) {
    _invalidateThreadPostsCache(threadId);
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
    bool forceRefresh = false,
  }) {
    if (!superAdmin && !forceRefresh && _cachedCourseOptions != null) {
      return Future.value(_cachedCourseOptions);
    }

    if (!superAdmin && !forceRefresh && _inFlightCourseOptions != null) {
      return _inFlightCourseOptions!;
    }

    final future = _client
        .get<Map<String, dynamic>>(
          superAdmin ? ApiEndpoints.superAdminCourses : ApiEndpoints.courses,
          queryParameters: {'per_page': perPage},
        )
        .then((response) {
          if (!superAdmin) _cachedCourseOptions = response;
          return response;
        })
        .whenComplete(() {
          if (!superAdmin) _inFlightCourseOptions = null;
        });

    if (!superAdmin) _inFlightCourseOptions = future;
    return future;
  }
}
