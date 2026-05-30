import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/session/session_store.dart';
import '../../student/data/forum_service.dart';
import '../data/instructor_chat_service.dart';
import '../data/instructor_courses_service.dart';
import '../data/instructor_profile_service.dart';
import 'instructor_page_shared.dart';

class InstructorForumPage extends StatefulWidget {
  const InstructorForumPage({super.key});

  @override
  State<InstructorForumPage> createState() => _InstructorForumPageState();
}

class _InstructorForumPageState extends State<InstructorForumPage> {
  final _forumService = const ForumService();
  final _coursesService = const InstructorCoursesService();
  final _chatService = const InstructorChatService();
  final _profileService = const InstructorProfileService();
  final _searchController = TextEditingController();
  final _titleController = TextEditingController();
  final _bodyController = TextEditingController();

  bool _loading = true;
  bool _savingThread = false;
  String? _error;
  String? _ok;
  List<_ForumThreadRow> _threads = const [];
  List<_ForumCourseRow> _courses = const [];
  _ForumPagination _threadPagination = const _ForumPagination();
  String _categoryFilter = 'all';
  String _formCategory = 'general';
  int? _selectedCourseId;
  int? _editingThreadId;
  int? _busyThreadId;
  int? _busyPostId;
  String _reportReason = 'spam';
  String _reportDetails = '';

  final Set<int> _expandedThreads = <int>{};
  final Map<int, List<_ForumPostRow>> _postsByThread = <int, List<_ForumPostRow>>{};
  final Map<int, _ForumPagination> _postPaginationByThread = <int, _ForumPagination>{};
  final Map<int, bool> _loadingPosts = <int, bool>{};
  final Map<int, String> _draftByThread = <int, String>{};
  final Set<int> _likedPosts = <int>{};
  final Map<int, String> _authorNames = <int, String>{};

  int? _editingPostId;
  int? _reportingPostId;
  String _editingPostBody = '';

  static const _categories = <String>[
    'general',
    'question',
    'announcement',
    'resource',
  ];

  static const _reportReasons = <String>[
    'spam',
    'abuse',
    'harassment',
    'misinformation',
    'other',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _titleController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _forumService.getThreads(perPage: _threadPagination.perPage),
        _loadCoursesFromFrontendSources(),
        _loadAuthorDirectory(),
      ]);
      if (!mounted) return;

      final threadPayload =
          (results[0] as Response<Map<String, dynamic>>).data;
      final parsedThreads = _parseThreadCollection(threadPayload);
      final threads = parsedThreads.rows
          .map(_ForumThreadRow.fromMap)
          .toList(growable: false);

      setState(() {
        _threads = threads;
        _threadPagination = parsedThreads.pagination;
        _loading = false;
      });
      for (final thread in threads) {
        _primeThreadPosts(thread.id);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<Map<String, dynamic>> _loadCoursesFromFrontendSources() async {
    final loaders = <Future<Map<String, dynamic>> Function()>[
      () async => (await _coursesService.getMyCourses()).data ?? <String, dynamic>{},
      () async => (await _forumService.getCourseOptions(perPage: 100)).data ?? <String, dynamic>{},
      () async => (await _forumService.getCourseOptions(superAdmin: true, perPage: 100)).data ?? <String, dynamic>{},
    ];

    for (final load in loaders) {
      try {
        final payload = await load();
        final list = _parseCourseRows(payload)
            .map(_ForumCourseRow.fromMap)
            .where((item) => item.id != 0)
            .toList(growable: false);
        if (list.isNotEmpty) {
          _courses = list;
          _selectedCourseId ??= list.first.id;
          return payload;
        }
      } catch (_) {
        // Try next source.
      }
    }

    _courses = const [];
    _selectedCourseId = null;
    return <String, dynamic>{};
  }

  Future<Map<int, String>> _loadAuthorDirectory() async {
    final names = <int, String>{};

    try {
      final profileResponse = await _profileService.getProfile();
      final root = instructorMap(profileResponse.data) ?? <String, dynamic>{};
      final profile = instructorMap(root['profile']) ?? root;
      final user = instructorMap(profile['user']) ?? profile;
      final id = instructorInt(user['id'] ?? profile['id']);
      final name = instructorString(
        user['name'] ?? user['username'] ?? profile['name'] ?? profile['username'],
      ).trim();
      if (id != 0 && name.isNotEmpty) {
        names[id] = name;
      }
    } catch (_) {
      // Keep going if profile lookup is unavailable.
    }

    final loaders = <Future<Response<Map<String, dynamic>>> Function()>[
      () => _chatService.getInstructorStudentContacts(perPage: 200),
      () => ApiClient.instance.get<Map<String, dynamic>>(
            ApiEndpoints.users,
            queryParameters: {'per_page': 200},
          ),
      () => _chatService.getStudentContacts(perPage: 200, useUsersEndpoint: true),
      () => _chatService.getStudentContacts(perPage: 200),
    ];

    for (final load in loaders) {
      try {
        final response = await load();
        final rows = unwrapInstructorList(response.data);
        for (final row in rows) {
          final user = instructorMap(row['user']);
          final student = instructorMap(row['student']);
          final instructor = instructorMap(row['instructor']);
          final base = user ?? student ?? instructor ?? row;
          final id = instructorInt(
            base['id'] ??
                base['user_id'] ??
                base['student_id'] ??
                base['instructor_id'] ??
                row['id'] ??
                row['user_id'],
          );
          final name = instructorString(
            base['name'] ?? base['full_name'] ?? base['username'] ?? row['name'],
          ).trim();
          if (id != 0 && name.isNotEmpty && name.toLowerCase() != 'user') {
            names[id] = name;
          }
        }
        if (names.isNotEmpty) {
          break;
        }
      } catch (_) {
        // Try the next source.
      }
    }

    if (mounted) {
      setState(() {
        _authorNames
          ..clear()
          ..addAll(names);
      });
    } else {
      _authorNames
        ..clear()
        ..addAll(names);
    }

    return names;
  }

  List<_ForumThreadRow> get _filteredThreads {
    final query = _searchController.text.trim().toLowerCase();
    return _threads.where((thread) {
      final matchesCategory =
          _categoryFilter == 'all' || thread.category.toLowerCase() == _categoryFilter;
      final matchesQuery = query.isEmpty ||
          thread.title.toLowerCase().contains(query) ||
          thread.body.toLowerCase().contains(query) ||
          thread.category.toLowerCase().contains(query) ||
          thread.courseTitle.toLowerCase().contains(query);
      return matchesCategory && matchesQuery;
    }).toList(growable: false);
  }

  String _friendlyError(
    Object error, {
    String? forbiddenMessage,
    String? unauthorizedMessage,
    String fallback = 'Something went wrong. Please try again.',
  }) {
    if (error is AppException) {
      if (error.statusCode == 403 && forbiddenMessage != null) {
        return forbiddenMessage;
      }
      if (error.statusCode == 401 && unauthorizedMessage != null) {
        return unauthorizedMessage;
      }
      return error.message;
    }
    return error.toString().trim().isEmpty ? fallback : error.toString();
  }

  Future<void> _saveThread() async {
    final courseId = _selectedCourseId;
    if (courseId == null ||
        _titleController.text.trim().isEmpty ||
        _bodyController.text.trim().isEmpty) {
      setState(() => _error = 'Course, title, body, and category are required.');
      return;
    }

    setState(() {
      _savingThread = true;
      _error = null;
      _ok = null;
    });

    try {
      final savedMessage = _editingThreadId == null
          ? 'Forum thread created successfully.'
          : 'Forum thread updated successfully.';
      if (_editingThreadId != null) {
        await _forumService.updateThread(
          threadId: _editingThreadId!,
          title: _titleController.text.trim(),
          body: _bodyController.text.trim(),
          courseId: courseId,
          category: _formCategory,
        );
      } else {
        await _forumService.createThread(
          title: _titleController.text.trim(),
          body: _bodyController.text.trim(),
          courseId: courseId,
          category: _formCategory,
        );
      }

      _resetThreadComposer(keepCourse: true);
      await _load();
      if (!mounted) return;
      setState(() => _ok = savedMessage);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) {
        setState(() => _savingThread = false);
      }
    }
  }

  void _startEditingThread(_ForumThreadRow thread) {
    setState(() {
      _editingThreadId = thread.id;
      _selectedCourseId = thread.courseId;
      _formCategory = thread.category;
      _titleController.text = thread.title;
      _bodyController.text = thread.body;
      _ok = null;
    });
  }

  void _resetThreadComposer({bool keepCourse = false}) {
    final previousCourseId = _selectedCourseId;
    setState(() {
      _editingThreadId = null;
      _formCategory = 'general';
      _titleController.clear();
      _bodyController.clear();
      if (!keepCourse) {
        _selectedCourseId = _courses.isEmpty ? null : _courses.first.id;
      } else {
        _selectedCourseId = previousCourseId ?? (_courses.isEmpty ? null : _courses.first.id);
      }
    });
  }

  Future<void> _deleteThread(_ForumThreadRow thread) async {
    setState(() {
      _busyThreadId = thread.id;
      _error = null;
      _ok = null;
    });

    try {
      await _forumService.deleteThread(thread.id);
      await _load();
      if (!mounted) return;
      setState(() => _ok = 'Forum thread deleted successfully.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) {
        setState(() => _busyThreadId = null);
      }
    }
  }

  Future<void> _toggleThreadPosts(_ForumThreadRow thread) async {
    final isOpen = _expandedThreads.contains(thread.id);
    debugPrint(
      '[InstructorForum] toggleThreadPosts threadId=${thread.id} '
      'title="${thread.title}" isOpen=$isOpen cached=${_postsByThread.containsKey(thread.id)}',
    );
    setState(() {
      if (isOpen) {
        _expandedThreads.remove(thread.id);
      } else {
        _expandedThreads.add(thread.id);
      }
    });

    if (!isOpen && !_postsByThread.containsKey(thread.id)) {
      final hydratedFromCache = _hydrateThreadPostsFromCache(thread.id);
      if (hydratedFromCache) {
        return;
      }
      await _loadPosts(thread.id);
    }
  }

  bool _hydrateThreadPostsFromCache(int threadId, {int page = 1}) {
    final cachedPayload = ForumService.getCachedPostsPayload(
      threadId: threadId,
      page: page,
      perPage: 20,
    );
    if (cachedPayload == null) {
      return false;
    }

    final parsed = _parsePostCollection(cachedPayload);
    final rows = parsed.rows
        .map(_ForumPostRow.fromMap)
        .where((item) => item.id != 0)
        .toList(growable: false);
    if (rows.isEmpty) {
      return false;
    }

    debugPrint(
      '[InstructorForum] hydrateThreadPostsFromCache '
      'threadId=$threadId rows=${rows.length} '
      'page=${parsed.pagination.currentPage}/${parsed.pagination.totalPages}',
    );

    if (mounted) {
      setState(() {
        _postsByThread[threadId] = rows;
        _postPaginationByThread[threadId] = parsed.pagination;
        _loadingPosts[threadId] = false;
      });
    } else {
      _postsByThread[threadId] = rows;
      _postPaginationByThread[threadId] = parsed.pagination;
      _loadingPosts[threadId] = false;
    }
    return true;
  }

  Future<void> _primeThreadPosts(int threadId, {int page = 1}) async {
    if (_postsByThread.containsKey(threadId) || _loadingPosts[threadId] == true) {
      return;
    }
    try {
      final response = await _forumService.getPosts(
        threadId: threadId,
        page: page,
        perPage: 20,
      );
      final parsed = _parsePostCollection(response.data);
      final rows = parsed.rows
          .map(_ForumPostRow.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);
      if (!mounted || rows.isEmpty) return;
      setState(() {
        _postsByThread[threadId] = rows;
        _postPaginationByThread[threadId] = parsed.pagination;
      });
      debugPrint(
        '[InstructorForum] primeThreadPosts threadId=$threadId rows=${rows.length}',
      );
    } catch (error) {
      debugPrint('[InstructorForum] primeThreadPosts:error threadId=$threadId error=$error');
    }
  }

  Future<void> _loadPosts(int threadId, {int page = 1, bool forceRefresh = false}) async {
    debugPrint('[InstructorForum] loadPosts:start threadId=$threadId page=$page');
    setState(() {
      _loadingPosts[threadId] = true;
      _error = null;
    });

    try {
      final response = await _forumService.getPosts(
        threadId: threadId,
        page: page,
        perPage: 20,
        forceRefresh: forceRefresh,
      );
      final payload = response.data;
      debugPrint(
        '[InstructorForum] loadPosts:response '
        'threadId=$threadId '
        'postKeys=${instructorMap(payload)?.keys.toList()}',
      );
      var parsed = _parsePostCollection(payload);
      if (parsed.rows.isEmpty) {
        debugPrint(
          '[InstructorForum] loadPosts:posts-empty threadId=$threadId '
          'checking thread detail payload fallback',
        );
        final threadResponse = await _forumService.getThread(threadId);
        final threadPayload = threadResponse.data;
        final threadMap = _parseThreadDetail(threadPayload);
        parsed = _parsePostCollection(
          _threadEmbeddedPostsPayload(
            postsPayload: payload,
            threadPayload: threadPayload,
          ),
        );
        if (!mounted) return;
        if (threadMap != null) {
          _threads = _threads
              .map((thread) => thread.id == threadId ? _ForumThreadRow.fromMap(threadMap) : thread)
              .toList(growable: false);
        }
      }
      debugPrint(
        '[InstructorForum] loadPosts:parsed '
        'threadId=$threadId rows=${parsed.rows.length} '
        'page=${parsed.pagination.currentPage}/${parsed.pagination.totalPages} '
        'total=${parsed.pagination.total}',
      );
      final rows = parsed.rows
          .map(_ForumPostRow.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);
      if (!mounted) return;
      setState(() {
        _postsByThread[threadId] = rows;
        _postPaginationByThread[threadId] = parsed.pagination;
        _loadingPosts[threadId] = false;
      });
    } catch (error) {
      debugPrint('[InstructorForum] loadPosts:error threadId=$threadId error=$error');
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) {
        debugPrint('[InstructorForum] loadPosts:done threadId=$threadId');
        setState(() => _loadingPosts[threadId] = false);
      }
    }
  }

  Future<void> _createPost(_ForumThreadRow thread) async {
    final body = (_draftByThread[thread.id] ?? '').trim();
    if (body.isEmpty) return;

    setState(() {
      _busyThreadId = thread.id;
      _error = null;
      _ok = null;
    });

    try {
      await _forumService.createPost(threadId: thread.id, body: body);
      if (!mounted) return;
      setState(() => _draftByThread[thread.id] = '');
      await _loadPosts(
        thread.id,
        page: _postPaginationByThread[thread.id]?.currentPage ?? 1,
        forceRefresh: true,
      );
      if (!mounted) return;
      setState(() => _ok = 'Forum post created successfully.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _busyThreadId = null);
    }
  }

  Future<void> _updatePost(int threadId, int postId) async {
    final body = _editingPostBody.trim();
    if (body.isEmpty) return;

    setState(() {
      _busyPostId = postId;
      _error = null;
      _ok = null;
    });

    try {
      await _forumService.updatePost(postId: postId, body: body);
      await _loadPosts(
        threadId,
        page: _postPaginationByThread[threadId]?.currentPage ?? 1,
        forceRefresh: true,
      );
      if (!mounted) return;
      setState(() {
        _editingPostId = null;
        _editingPostBody = '';
        _ok = 'Forum post updated successfully.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _busyPostId = null);
    }
  }

  Future<void> _deletePost(int threadId, int postId) async {
    setState(() {
      _busyPostId = postId;
      _error = null;
      _ok = null;
    });

    try {
      await _forumService.deletePost(postId);
      await _loadPosts(
        threadId,
        page: _postPaginationByThread[threadId]?.currentPage ?? 1,
        forceRefresh: true,
      );
      if (!mounted) return;
      setState(() => _ok = 'Forum post deleted successfully.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _busyPostId = null);
    }
  }

  Future<void> _reactToPost(int threadId, int postId) async {
    setState(() {
      _busyPostId = postId;
      _error = null;
      _ok = null;
    });

    try {
      await _forumService.reactToPost(postId: postId, reaction: 'like');
      await _loadPosts(
        threadId,
        page: _postPaginationByThread[threadId]?.currentPage ?? 1,
        forceRefresh: true,
      );
      if (!mounted) return;
      setState(() {
        _likedPosts.add(postId);
        _ok = 'Forum reaction added successfully.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _busyPostId = null);
    }
  }

  Future<void> _reportPost(int threadId, int postId) async {
    setState(() {
      _busyPostId = postId;
      _error = null;
      _ok = null;
    });

    try {
      await _forumService.reportPost(
        postId: postId,
        reason: _reportReason,
        description: _reportDetails.trim(),
      );
      await _loadPosts(
        threadId,
        page: _postPaginationByThread[threadId]?.currentPage ?? 1,
        forceRefresh: true,
      );
      if (!mounted) return;
      setState(() {
        _reportingPostId = null;
        _reportReason = 'spam';
        _reportDetails = '';
        _ok = 'Forum post reported successfully.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) setState(() => _busyPostId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final threads = _filteredThreads;

    return InstructorPageScaffold(
      title: instructorText('forum', lang),
      subtitle: instructorText('forum_subtitle', lang),
      onRefresh: _load,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFF050816),
          borderRadius: BorderRadius.circular(32),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: .22),
              blurRadius: 28,
              offset: const Offset(0, 18),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 1180;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeaderBar(),
                const SizedBox(height: 16),
                if (_error != null || _ok != null) _buildNoticeBanner(),
                if (_error != null || _ok != null) const SizedBox(height: 16),
                if (stacked)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildComposerPanel(),
                      const SizedBox(height: 16),
                      _buildThreadsPanel(threads),
                    ],
                  )
                else
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 360,
                        child: _buildComposerPanel(),
                      ),
                      const SizedBox(width: 16),
                      Expanded(child: _buildThreadsPanel(threads)),
                    ],
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeaderBar() {
    return Wrap(
      spacing: 16,
      runSpacing: 16,
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          'Instructor Forum',
          style: Theme.of(context).textTheme.displaySmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w900,
              ),
        ),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: const Color(0xFF0A1020),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            textStyle: const TextStyle(fontWeight: FontWeight.w900),
          ),
          onPressed: _loading ? null : _load,
          icon: _loading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0A1020)),
                )
              : const Icon(Icons.refresh_rounded),
          label: const Text('REFRESH'),
        ),
      ],
    );
  }

  Widget _buildNoticeBanner() {
    final error = _error;
    final success = _ok;
    final isError = error != null;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isError ? const Color(0xFF3A1721) : const Color(0xFF12392F),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isError ? const Color(0xFF7F2940) : const Color(0xFF1F7A61),
        ),
      ),
      child: Text(
        error ?? success ?? '',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _buildComposerPanel() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF12162A),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _editingThreadId == null ? 'Create Thread' : 'Edit Thread',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 16),
          _buildDarkDropdown<int>(
            value: _selectedCourseId,
            hint: 'Choose course',
            items: _courses
                .map(
                  (course) => DropdownMenuItem<int>(
                    value: course.id,
                    child: Text(course.title, overflow: TextOverflow.ellipsis),
                  ),
                )
                .toList(growable: false),
            onChanged: (value) => setState(() => _selectedCourseId = value),
          ),
          const SizedBox(height: 12),
          _buildDarkDropdown<String>(
            value: _formCategory,
            hint: 'Category',
            items: _categories
                .map(
                  (category) => DropdownMenuItem<String>(
                    value: category,
                    child: Text(_cap(category)),
                  ),
                )
                .toList(growable: false),
            onChanged: (value) {
              if (value != null) {
                setState(() => _formCategory = value);
              }
            },
          ),
          const SizedBox(height: 12),
          _buildDarkInput(
            controller: _titleController,
            hint: 'Thread title',
          ),
          const SizedBox(height: 12),
          _buildDarkInput(
            controller: _bodyController,
            hint: 'Write the thread body...',
            maxLines: 5,
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF0991B2),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _savingThread ? null : _saveThread,
                icon: _savingThread
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Icon(_editingThreadId == null ? Icons.add : Icons.save_outlined),
                label: Text(_editingThreadId == null ? 'Save' : 'Save'),
              ),
              if (_editingThreadId != null)
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF39405B)),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  ),
                  onPressed: _savingThread ? null : _resetThreadComposer,
                  child: const Text('Cancel'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThreadsPanel(List<_ForumThreadRow> threads) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF12162A),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      padding: const EdgeInsets.all(18),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 720;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (compact)
                Column(
                  children: [
                    _buildDarkInput(
                      controller: _searchController,
                      hint: 'Search threads',
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF8E97B4)),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 12),
                    _buildDarkDropdown<String>(
                      value: _categoryFilter,
                      hint: 'Filter',
                      items: [
                        const DropdownMenuItem<String>(value: 'all', child: Text('All')),
                        ..._categories.map(
                          (category) => DropdownMenuItem<String>(
                            value: category,
                            child: Text(_cap(category)),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _categoryFilter = value);
                        }
                      },
                    ),
                  ],
                )
              else
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    SizedBox(
                      width: 280,
                      child: _buildDarkInput(
                        controller: _searchController,
                        hint: 'Search threads',
                        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF8E97B4)),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                    SizedBox(
                      width: 190,
                      child: _buildDarkDropdown<String>(
                        value: _categoryFilter,
                        hint: 'Filter',
                        items: [
                          const DropdownMenuItem<String>(value: 'all', child: Text('All')),
                          ..._categories.map(
                            (category) => DropdownMenuItem<String>(
                              value: category,
                              child: Text(_cap(category)),
                            ),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _categoryFilter = value);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 18),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (threads.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withValues(alpha: .10)),
                    color: Colors.white.withValues(alpha: .03),
                  ),
                  child: const Text(
                    'No threads found.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF9CA6C3), fontWeight: FontWeight.w700),
                  ),
                )
              else
                Column(
                  children: threads
                      .map((thread) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: _buildThreadCard(thread),
                          ))
                      .toList(growable: false),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildThreadCard(_ForumThreadRow thread) {
    final expanded = _expandedThreads.contains(thread.id);
    final isMine =
        thread.authorId != 0 && thread.authorId == (SessionStore.instance.userId ?? -1);
    final posts = _postsByThread[thread.id] ?? const <_ForumPostRow>[];
    final postPagination =
        _postPaginationByThread[thread.id] ?? const _ForumPagination();
    debugPrint(
      '[InstructorForum] buildThreadCard threadId=${thread.id} '
      'expanded=$expanded loading=${_loadingPosts[thread.id] == true} posts=${posts.length}',
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF13182A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: .07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.start,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 220, maxWidth: 760),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _threadTag(thread.category),
                        if (thread.isPinned) _stateTag('Pinned', const Color(0xFF1C92B6)),
                        if (thread.isLocked) _stateTag('Locked', const Color(0xFFB7791F)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      thread.title,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${thread.courseTitle} | Updated ${thread.updatedAtLabel}',
                      style: const TextStyle(color: Color(0xFF8D93A8), fontSize: 13),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      thread.body,
                      style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.5),
                    ),
                  ],
                ),
              ),
              if (isMine)
                Theme(
                  data: Theme.of(context).copyWith(
                    popupMenuTheme: PopupMenuThemeData(
                      color: const Color(0xFF20263A),
                      textStyle: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.white.withValues(alpha: .08)),
                      ),
                    ),
                  ),
                  child: PopupMenuButton<String>(
                    tooltip: 'Thread actions',
                    icon: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: .06),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withValues(alpha: .06)),
                      ),
                      child: const Icon(Icons.more_vert_rounded, color: Colors.white),
                    ),
                    iconSize: 18,
                    surfaceTintColor: Colors.transparent,
                    onSelected: (value) async {
                      if (value == 'edit') {
                        _startEditingThread(thread);
                      } else if (value == 'delete') {
                        await _deleteThread(thread);
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem<String>(
                        value: 'edit',
                        child: Text('Update', style: TextStyle(color: Colors.white)),
                      ),
                      const PopupMenuItem<String>(
                        value: 'delete',
                        child: Text('Delete', style: TextStyle(color: Color(0xFFFF8AA5))),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: .10),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
              ),
              onPressed: () => _toggleThreadPosts(thread),
              icon: const Icon(Icons.chat_bubble_outline_rounded),
              label: Text(expanded ? 'Hide Posts' : 'View Posts'),
            ),
          ),
          if (expanded) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: .08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final compactComposer = constraints.maxWidth < 700;
                      final input = _buildDarkInput(
                        initialValue: _draftByThread[thread.id] ?? '',
                        hint: 'Write post...',
                        maxLines: 3,
                        onChanged: (value) => _draftByThread[thread.id] = value,
                      );
                      final button = FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF0991B2),
                          minimumSize: Size(compactComposer ? constraints.maxWidth : 120, 48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          textStyle: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        onPressed: thread.isLocked || _busyThreadId == thread.id
                            ? null
                            : () => _createPost(thread),
                        icon: _busyThreadId == thread.id
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.add_rounded, size: 18),
                        label: const Text('Add Post'),
                      );

                      if (compactComposer) {
                        return Column(
                          children: [
                            input,
                            const SizedBox(height: 12),
                            button,
                          ],
                        );
                      }

                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(child: input),
                          const SizedBox(width: 12),
                          button,
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 14),
                  if (_loadingPosts[thread.id] == true)
                    const Center(child: CircularProgressIndicator())
                  else if (posts.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withValues(alpha: .14), style: BorderStyle.solid),
                      ),
                      child: const Text(
                        'No posts.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Color(0xFF8B95B3)),
                      ),
                    )
                  else
                    Column(
                      children: posts
                          .map((post) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _buildPostCard(thread, post),
                              ))
                          .toList(growable: false),
                    ),
                  const SizedBox(height: 8),
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      Text(
                        'Total posts: ${postPagination.total == 0 ? posts.length : postPagination.total} | '
                        'Page ${postPagination.currentPage}/${postPagination.totalPages}',
                        style: const TextStyle(color: Color(0xFF8A93AF), fontSize: 12),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Color(0xFF38405A)),
                            ),
                            onPressed: postPagination.currentPage > 1 && _loadingPosts[thread.id] != true
                                ? () => _loadPosts(thread.id, page: postPagination.currentPage - 1)
                                : null,
                            child: const Text('Prev'),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Color(0xFF38405A)),
                            ),
                            onPressed: postPagination.currentPage < postPagination.totalPages &&
                                    _loadingPosts[thread.id] != true
                                ? () => _loadPosts(thread.id, page: postPagination.currentPage + 1)
                                : null,
                            child: const Text('Next'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPostCard(_ForumThreadRow thread, _ForumPostRow post) {
    final editing = _editingPostId == post.id;
    final reporting = _reportingPostId == post.id;
    final isMine = post.authorId != 0 && post.authorId == (SessionStore.instance.userId ?? -1);

    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(left: post.isReply ? 18 : 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: .07)),
        color: Colors.transparent,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (editing) ...[
            _buildDarkInput(
              initialValue: _editingPostBody,
              hint: 'Edit post...',
              maxLines: 4,
              onChanged: (value) => _editingPostBody = value,
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0991B2)),
                  onPressed: _busyPostId == post.id ? null : () => _updatePost(thread.id, post.id),
                  child: const Text('Save'),
                ),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF38405A)),
                  ),
                  onPressed: () {
                    setState(() {
                      _editingPostId = null;
                      _editingPostBody = '';
                    });
                  },
                  child: const Text('Cancel'),
                ),
              ],
            ),
          ] else ...[
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  _forumAuthorLabel(post, isMine: isMine),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (post.isReply)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF24314E),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'Reply',
                      style: TextStyle(
                        color: Color(0xFFAFC7FF),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              post.body,
              style: const TextStyle(color: Colors.white, fontSize: 15, height: 1.45),
            ),
            const SizedBox(height: 10),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              spacing: 10,
              runSpacing: 10,
              children: [
                Text(
                  'Post #${post.id} | ${post.updatedAtLabel}',
                  style: const TextStyle(color: Color(0xFF8B95B3), fontSize: 12),
                ),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _postAction(
                      label: 'Like',
                      icon: Icons.favorite_border_rounded,
                      color: _likedPosts.contains(post.id)
                          ? const Color(0xFF5A1D38)
                          : const Color(0xFF252B3E),
                      onTap: () => _reactToPost(thread.id, post.id),
                    ),
                    _postAction(
                      label: 'Edit',
                      icon: Icons.edit_outlined,
                      color: const Color(0xFF252B3E),
                      onTap: () {
                        setState(() {
                          _editingPostId = post.id;
                          _editingPostBody = post.body;
                        });
                      },
                    ),
                    _postAction(
                      label: 'Report',
                      icon: Icons.flag_outlined,
                      color: const Color(0xFF4B3419),
                      onTap: () {
                        setState(() {
                          _reportingPostId = reporting ? null : post.id;
                        });
                      },
                    ),
                    _postAction(
                      label: 'Delete',
                      icon: Icons.delete_outline_rounded,
                      color: const Color(0xFF53182C),
                      onTap: () => _deletePost(thread.id, post.id),
                    ),
                  ],
                ),
              ],
            ),
          ],
          if (reporting) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: const Color(0xFF2E2411),
                border: Border.all(color: const Color(0xFF7A5C20)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDarkDropdown<String>(
                    value: _reportReason,
                    hint: 'Reason',
                    items: _reportReasons
                        .map(
                          (reason) => DropdownMenuItem<String>(
                            value: reason,
                            child: Text(_cap(reason)),
                          ),
                        )
                        .toList(growable: false),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _reportReason = value);
                      }
                    },
                  ),
                  const SizedBox(height: 10),
                  _buildDarkInput(
                    initialValue: _reportDetails,
                    hint: 'Details (optional)',
                    maxLines: 2,
                    onChanged: (value) => _reportDetails = value,
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFFB16A08)),
                        onPressed: _busyPostId == post.id ? null : () => _reportPost(thread.id, post.id),
                        child: const Text('Submit'),
                      ),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFF85651B)),
                        ),
                        onPressed: () {
                          setState(() {
                            _reportingPostId = null;
                            _reportReason = 'spam';
                            _reportDetails = '';
                          });
                        },
                        child: const Text('Cancel'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _forumAuthorLabel(_ForumPostRow post, {required bool isMine}) {
    final mapped = _authorNames[post.authorId]?.trim() ?? '';
    final raw = post.author.trim();
    if (mapped.isNotEmpty && mapped.toLowerCase() != 'user') {
      return mapped;
    }
    if (raw.isNotEmpty && raw.toLowerCase() != 'user') {
      return raw;
    }
    if (isMine) {
      return _authorNames[SessionStore.instance.userId ?? 0] ?? 'You';
    }
    return post.authorId != 0 ? 'User #${post.authorId}' : 'User';
  }

  Widget _postAction({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }

  Widget _threadTag(String category) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF373641),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        _cap(category),
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
      ),
    );
  }

  Widget _stateTag(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w800),
      ),
    );
  }

  Widget _buildDarkInput({
    TextEditingController? controller,
    String? initialValue,
    required String hint,
    int maxLines = 1,
    Widget? prefixIcon,
    ValueChanged<String>? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      initialValue: controller == null ? initialValue : null,
      maxLines: maxLines,
      onChanged: onChanged,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF8D96B2)),
        prefixIcon: prefixIcon,
        filled: true,
        fillColor: const Color(0xFF2B3042),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF41475B)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF1197B9)),
        ),
      ),
    );
  }

  Widget _buildDarkDropdown<T>({
    required T? value,
    required String hint,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      dropdownColor: const Color(0xFF242A3D),
      items: items,
      onChanged: onChanged,
      style: const TextStyle(color: Colors.white),
      iconEnabledColor: Colors.white,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF8D96B2)),
        filled: true,
        fillColor: const Color(0xFF2B3042),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF41475B)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF1197B9)),
        ),
      ),
    );
  }

  String _cap(String value) {
    if (value.isEmpty) return '';
    return '${value[0].toUpperCase()}${value.substring(1)}';
  }

  _ParsedForumCollection _parseThreadCollection(dynamic payload) {
    final root = instructorMap(payload) ?? <String, dynamic>{};
    final directData = root['data'];
    final directMap = instructorMap(directData);

    final rows = directData is List
        ? instructorList(directData)
        : directMap?['data'] is List
            ? instructorList(directMap?['data'])
            : const <Map<String, dynamic>>[];

    final normalizedRows = rows
        .map((row) => <String, dynamic>{
              'id': instructorInt(row['id']),
              'course_id': instructorInt(row['course_id']),
              'author_id': instructorInt(row['author_id']),
              'title': instructorString(
                row['title'],
                fallback: 'Thread #${instructorInt(row['id'])}',
              ),
              'body': instructorString(row['body']),
              'category': instructorString(row['category'], fallback: 'general'),
              'is_pinned': instructorInt(row['is_pinned']),
              'is_locked': instructorInt(row['is_locked']),
              'updated_at': instructorString(row['updated_at']),
              'posts_count': instructorInt(row['posts_count']),
              'course': instructorMap(row['course']),
              'course_title': instructorString(row['course_title']),
            })
        .where((row) => instructorInt(row['id']) != 0)
        .toList(growable: false);

    final pagination = _ForumPagination.fromMap(
      instructorMap(root['pagination']) ??
          instructorMap(directMap?['pagination']),
    );

    return _ParsedForumCollection(rows: normalizedRows, pagination: pagination);
  }

  Map<String, dynamic>? _parseThreadDetail(dynamic payload) {
    final root = instructorMap(payload) ?? <String, dynamic>{};
    final map = instructorMap(root['data']) ?? root;
    final id = instructorInt(map['id']);
    if (id == 0) return null;

    return <String, dynamic>{
      'id': id,
      'course_id': instructorInt(map['course_id']),
      'author_id': instructorInt(
        map['author_id'] ??
            map['user_id'] ??
            instructorMap(map['author'])?['id'] ??
            instructorMap(map['user'])?['id'],
      ),
      'title': instructorString(
        map['title'],
        fallback: 'Thread #$id',
      ),
      'body': instructorString(map['body']),
      'category': instructorString(map['category'], fallback: 'general'),
      'is_pinned': instructorInt(map['is_pinned']),
      'is_locked': instructorInt(map['is_locked']),
      'updated_at': instructorString(map['updated_at']),
      'posts_count': instructorInt(map['posts_count']),
      'course': instructorMap(map['course']),
      'course_title': instructorString(map['course_title']),
    };
  }

  dynamic _threadEmbeddedPostsPayload({
    required dynamic postsPayload,
    required dynamic threadPayload,
  }) {
    final threadRoot = instructorMap(threadPayload) ?? <String, dynamic>{};
    final threadData = instructorMap(threadRoot['data']) ?? threadRoot;

    final embeddedPosts = threadData['posts'] ??
        threadData['forum_posts'] ??
        threadData['children'] ??
        threadData['replies'];

    debugPrint(
      '[InstructorForum] embeddedPayload '
      'threadKeys=${threadData.keys.toList()} '
      'embeddedType=${embeddedPosts.runtimeType}',
    );

    if (embeddedPosts == null) {
      return postsPayload;
    }

    final postsRoot = instructorMap(postsPayload) ?? <String, dynamic>{};
    final pagination = instructorMap(postsRoot['pagination']) ??
        instructorMap(instructorMap(postsRoot['data'])?['pagination']);

    return <String, dynamic>{
      'data': embeddedPosts,
      if (pagination != null) 'pagination': pagination,
    };
  }

  _ParsedForumCollection _parsePostCollection(dynamic payload) {
    final root = instructorMap(payload) ?? <String, dynamic>{};
    final directData = root['data'];
    final directMap = instructorMap(directData);
    final directRows = directData is List
        ? instructorList(directData)
        : directMap?['data'] is List
            ? instructorList(directMap?['data'])
            : const <Map<String, dynamic>>[];
    final rows = directRows.isNotEmpty ? directRows : _extractPostRows(root);
    debugPrint(
      '[InstructorForum] parsePostCollection '
      'rootKeys=${root.keys.toList()} directRows=${directRows.length} extractedRows=${rows.length}',
    );

    final normalizedRows = rows
        .map((row) => <String, dynamic>{
              'id': instructorInt(row['id']),
              'forum_thread_id': instructorInt(row['forum_thread_id']),
              'parent_id': instructorInt(row['parent_id']),
              'body': instructorString(row['body']),
              'created_at': instructorString(row['created_at']),
              'updated_at': instructorString(row['updated_at']),
              'user': instructorMap(row['user']),
              'author': instructorMap(row['author']),
              'student': instructorMap(row['student']),
              'profile': instructorMap(row['profile']),
              'author_id': instructorInt(
                row['author_id'] ??
                    row['user_id'] ??
                    instructorMap(row['user'])?['id'] ??
                    instructorMap(row['author'])?['id'] ??
                    instructorMap(row['student'])?['id'] ??
                    instructorMap(row['profile'])?['id'],
              ),
              'author_name': instructorString(
                row['author_name'] ??
                    row['user_name'] ??
                    instructorMap(row['user'])?['name'] ??
                    instructorMap(row['author'])?['name'] ??
                    instructorMap(row['student'])?['name'] ??
                    instructorMap(row['profile'])?['name'],
              ),
            })
        .where((row) => instructorInt(row['id']) != 0)
        .toList(growable: false);

    final pagination = _ForumPagination.fromMap(
      instructorMap(root['pagination']) ??
          instructorMap(directMap?['pagination']) ??
          instructorMap(instructorMap(root['data'])?['pagination']) ??
          instructorMap(instructorMap(root['posts'])?['pagination']),
    );

    return _ParsedForumCollection(rows: normalizedRows, pagination: pagination);
  }

  List<Map<String, dynamic>> _extractPostRows(dynamic payload) {
    final queue = <dynamic>[payload];
    final rows = <Map<String, dynamic>>[];
    final seenIds = <int>{};

    while (queue.isNotEmpty) {
      final current = queue.removeAt(0);

      if (current is List) {
        queue.addAll(current);
        continue;
      }

      final map = instructorMap(current);
      if (map == null) {
        continue;
      }

      final id = instructorInt(map['id']);
      final looksLikePost = id != 0 &&
          (map.containsKey('body') ||
              map.containsKey('forum_thread_id') ||
              map.containsKey('parent_id'));
      if (looksLikePost && seenIds.add(id)) {
        rows.add(map);
      }

      for (final key in const [
        'data',
        'posts',
        'children',
        'replies',
        'reply_posts',
        'sub_threads',
        'sub_posts',
      ]) {
        final value = map[key];
        if (value is List || value is Map) {
          queue.add(value);
        }
      }
    }

    return rows;
  }

  List<Map<String, dynamic>> _parseCourseRows(dynamic payload) {
    final root = instructorMap(payload) ?? <String, dynamic>{};
    final directData = root['data'];
    final directMap = instructorMap(directData);
    final rows = directData is List
        ? instructorList(directData)
        : directMap?['data'] is List
            ? instructorList(directMap?['data'])
            : const <Map<String, dynamic>>[];

    return rows
        .map((row) => <String, dynamic>{
              'id': instructorInt(row['id']),
              'title': instructorString(row['title'], fallback: 'Course'),
              'title_translations': instructorMap(row['title_translations']),
            })
        .where((row) => instructorInt(row['id']) != 0)
        .toList(growable: false);
  }
}

class _ForumThreadRow {
  const _ForumThreadRow({
    required this.id,
    required this.authorId,
    required this.courseId,
    required this.title,
    required this.body,
    required this.category,
    required this.courseTitle,
    required this.postsCount,
    required this.isPinned,
    required this.isLocked,
    required this.updatedAt,
  });

  final int id;
  final int authorId;
  final int courseId;
  final String title;
  final String body;
  final String category;
  final String courseTitle;
  final int postsCount;
  final bool isPinned;
  final bool isLocked;
  final String updatedAt;

  String get updatedAtLabel => _friendlyDateTimeLabel(updatedAt);

  factory _ForumThreadRow.fromMap(Map<String, dynamic> map) {
    final course = instructorMap(map['course']);
    return _ForumThreadRow(
      id: instructorInt(map['id']),
      authorId: instructorInt(
        map['author_id'] ??
            map['user_id'] ??
            instructorMap(map['author'])?['id'] ??
            instructorMap(map['user'])?['id'],
      ),
      courseId: instructorInt(map['course_id']),
      title: instructorString(map['title'], fallback: 'Untitled Thread'),
      body: instructorString(map['body'], fallback: 'No content'),
      category: instructorString(map['category'], fallback: 'general'),
      courseTitle: instructorLocalized(
        course?['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(course?['title'] ?? map['course_title'], fallback: 'Course'),
      ),
      postsCount: instructorInt(map['posts_count']),
      isPinned: instructorInt(map['is_pinned']) == 1,
      isLocked: instructorInt(map['is_locked']) == 1,
      updatedAt: instructorString(map['updated_at']),
    );
  }
}

class _ForumPostRow {
  const _ForumPostRow({
    required this.id,
    required this.authorId,
    required this.author,
    required this.parentId,
    required this.body,
    required this.updatedAt,
  });

  final int id;
  final int authorId;
  final String author;
  final int parentId;
  final String body;
  final String updatedAt;

  String get updatedAtLabel => _friendlyDateTimeLabel(updatedAt);
  bool get isReply => parentId != 0;

  factory _ForumPostRow.fromMap(Map<String, dynamic> map) {
    final user = instructorMap(map['user']);
    final author = instructorMap(map['author']);
    final student = instructorMap(map['student']);
    final profile = instructorMap(map['profile']);

    return _ForumPostRow(
      id: instructorInt(map['id']),
      authorId: instructorInt(
        map['author_id'] ??
            map['user_id'] ??
            user?['id'] ??
            author?['id'] ??
            student?['id'] ??
            profile?['id'],
      ),
      author: instructorString(
        map['author_name'] ??
            map['user_name'] ??
            user?['name'] ??
            user?['username'] ??
            author?['name'] ??
            author?['username'] ??
            student?['name'] ??
            student?['username'] ??
            profile?['name'] ??
            profile?['username'],
        fallback: 'User',
      ),
      parentId: instructorInt(map['parent_id']),
      body: instructorString(map['body']),
      updatedAt: instructorString(map['updated_at'] ?? map['created_at']),
    );
  }
}

class _ForumCourseRow {
  const _ForumCourseRow({required this.id, required this.title});

  final int id;
  final String title;

  factory _ForumCourseRow.fromMap(Map<String, dynamic> map) {
    return _ForumCourseRow(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Course'),
      ),
    );
  }
}

String _friendlyDateTimeLabel(String raw) {
  if (raw.trim().isEmpty) return '--';
  final value = DateTime.tryParse(raw.trim());
  if (value == null) return raw;

  const months = <String>[
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  final local = value.toLocal();
  final month = months[local.month - 1];
  final day = local.day.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final suffix = local.hour >= 12 ? 'PM' : 'AM';
  return '$month $day, ${local.year} $hour12:$minute $suffix';
}

class _ForumPagination {
  const _ForumPagination({
    this.total = 0,
    this.count = 0,
    this.perPage = 15,
    this.currentPage = 1,
    this.totalPages = 1,
  });

  final int total;
  final int count;
  final int perPage;
  final int currentPage;
  final int totalPages;

  factory _ForumPagination.fromMap(Map<String, dynamic>? map) {
    return _ForumPagination(
      total: instructorInt(map?['total']),
      count: instructorInt(map?['count']),
      perPage: instructorInt(map?['per_page'], fallback: 15),
      currentPage: instructorInt(map?['current_page'], fallback: 1),
      totalPages: instructorInt(map?['total_pages'], fallback: 1),
    );
  }
}

class _ParsedForumCollection {
  const _ParsedForumCollection({
    required this.rows,
    required this.pagination,
  });

  final List<Map<String, dynamic>> rows;
  final _ForumPagination pagination;
}
