import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/session/session_store.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../student/data/forum_service.dart';
import '../data/instructor_courses_service.dart';
import 'instructor_page_shared.dart';

class InstructorForumPage extends StatefulWidget {
  const InstructorForumPage({super.key});

  @override
  State<InstructorForumPage> createState() => _InstructorForumPageState();
}

class _InstructorForumPageState extends State<InstructorForumPage> {
  final _forumService = const ForumService();
  final _coursesService = const InstructorCoursesService();
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
      ]);
      if (!mounted) return;

      final threadPayload =
          (results[0] as Response<Map<String, dynamic>>).data;
      final threads = unwrapInstructorList(threadPayload)
          .map(_ForumThreadRow.fromMap)
          .toList(growable: false);
      final root = unwrapInstructorMap(threadPayload);
      final pagination = _ForumPagination.fromMap(
        instructorMap(root['pagination']) ??
            instructorMap(instructorMap(root['data'])?['pagination']),
      );

      setState(() {
        _threads = threads;
        _threadPagination = pagination;
        _loading = false;
      });
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
        final list = unwrapInstructorList(payload)
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
    setState(() {
      if (isOpen) {
        _expandedThreads.remove(thread.id);
      } else {
        _expandedThreads.add(thread.id);
      }
    });

    if (!isOpen && !_postsByThread.containsKey(thread.id)) {
      await _loadPosts(thread.id);
    }
  }

  Future<void> _loadPosts(int threadId, {int page = 1}) async {
    setState(() {
      _loadingPosts[threadId] = true;
      _error = null;
    });

    try {
      final response = await _forumService.getPosts(
        threadId: threadId,
        page: page,
        perPage: 20,
        forceRefresh: true,
      );
      final payload = response.data;
      final root = unwrapInstructorMap(payload);
      final rows = unwrapInstructorList(payload)
          .map(_ForumPostRow.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);
      final pagination = _ForumPagination.fromMap(
        instructorMap(root['pagination']) ??
            instructorMap(instructorMap(root['data'])?['pagination']),
      );
      if (!mounted) return;
      setState(() {
        _postsByThread[threadId] = rows;
        _postPaginationByThread[threadId] = pagination;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _friendlyError(error));
    } finally {
      if (mounted) {
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
      await _loadPosts(threadId, page: _postPaginationByThread[threadId]?.currentPage ?? 1);
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
      await _loadPosts(threadId, page: _postPaginationByThread[threadId]?.currentPage ?? 1);
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
      await _loadPosts(threadId, page: _postPaginationByThread[threadId]?.currentPage ?? 1);
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
      await _loadPosts(threadId, page: _postPaginationByThread[threadId]?.currentPage ?? 1);
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
          gradient: const LinearGradient(
            colors: [
              Color(0xFF0D1324),
              Color(0xFF151B31),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
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
      spacing: 14,
      runSpacing: 14,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 220, maxWidth: 620),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Discussion Control Center',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Moderate threads, publish updates, and manage replies from one polished workspace.',
                style: TextStyle(color: Color(0xFF97A2BE), height: 1.4),
              ),
            ],
          ),
        ),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF232B43),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          onPressed: _loading ? null : _load,
          icon: _loading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.refresh_rounded),
          label: const Text('Refresh'),
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
    return AfaqPanel(
      dark: true,
      radius: 28,
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
          const SizedBox(height: 6),
          const Text(
            'Use the same instructor forum workflow as the frontend: choose a course, set the category, and publish.',
            style: TextStyle(color: Color(0xFF99A2BC), height: 1.4),
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
                ),
                onPressed: _savingThread ? null : _saveThread,
                icon: _savingThread
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Icon(_editingThreadId == null ? Icons.add : Icons.save_outlined),
                label: Text(_editingThreadId == null ? 'Create Thread' : 'Save Changes'),
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
    return AfaqPanel(
      dark: true,
      radius: 28,
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

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF13182D),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
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
                      style: const TextStyle(color: Color(0xFF838CA7), fontSize: 13),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      thread.body,
                      style: const TextStyle(color: Color(0xFFF4F7FF), fontSize: 16, height: 1.5),
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
                backgroundColor: const Color(0xFF252B3E),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
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
                          minimumSize: Size(compactComposer ? constraints.maxWidth : 140, 56),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
                            : const Icon(Icons.add_rounded),
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
                        color: Colors.white.withValues(alpha: .02),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withValues(alpha: .08)),
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

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
        color: const Color(0xFF12182A),
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

  String get updatedAtLabel => updatedAt.isEmpty ? '--' : updatedAt;

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
    required this.body,
    required this.updatedAt,
  });

  final int id;
  final String body;
  final String updatedAt;

  String get updatedAtLabel => updatedAt.isEmpty ? '--' : updatedAt;

  factory _ForumPostRow.fromMap(Map<String, dynamic> map) {
    return _ForumPostRow(
      id: instructorInt(map['id']),
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
