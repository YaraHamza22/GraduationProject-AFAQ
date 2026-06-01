import 'package:flutter/material.dart';
import 'dart:async';

import '../../../app/app.dart';
import '../../../core/session/session_store.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/forum_service.dart';
import 'student_page_shared.dart';

class StudentForumPage extends StatefulWidget {
  const StudentForumPage({super.key});

  @override
  State<StudentForumPage> createState() => _StudentForumPageState();
}

class _StudentForumPageState extends State<StudentForumPage> {
  final _service = const ForumService();

  bool _loading = true;
  bool _openingThread = false;
  String? _error;
  List<_ForumThread> _threads = const [];
  List<_ForumCourseOption> _courseOptions = const [];

  String _displayAuthor(_ForumPost post) {
    final currentUserId = SessionStore.instance.userId;
    if (currentUserId != null && post.authorId == currentUserId) {
      final normalized = post.author.trim().toLowerCase();
      if (normalized.isEmpty ||
          normalized == 'user' ||
          normalized.startsWith('user #')) {
        return 'You';
      }
    }
    return post.author.trim().isEmpty ? 'You' : post.author;
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.getThreads(perPage: 50),
        _service.getCourseOptions(),
      ]);

      if (!mounted) return;
      setState(() {
        _threads = unwrapDataList(results[0].data)
            .map(_ForumThread.fromMap)
            .toList(growable: false);
        _courseOptions = unwrapDataList(results[1].data)
            .map(_ForumCourseOption.fromMap)
            .toList(growable: false);
        _loading = false;
      });

      for (final thread in _threads.take(6)) {
        unawaited(_service.warmPostsCache(threadId: thread.id, perPage: 100));
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _createThread() async {
    final titleController = TextEditingController();
    final bodyController = TextEditingController();
    int? selectedCourseId = _courseOptions.isNotEmpty ? _courseOptions.first.id : null;

    final created = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Create Thread'),
              content: SizedBox(
                width: 420,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Title'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: bodyController,
                      maxLines: 4,
                      decoration: const InputDecoration(labelText: 'Body'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int>(
                      initialValue: selectedCourseId,
                      items: _courseOptions
                          .map(
                            (item) => DropdownMenuItem<int>(
                              value: item.id,
                              child: Text(item.title),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) {
                        setDialogState(() => selectedCourseId = value);
                      },
                      decoration: const InputDecoration(labelText: 'Course'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );

    if (created != true || selectedCourseId == null) return;

    try {
      await _service.createThread(
        title: titleController.text.trim(),
        body: bodyController.text.trim(),
        courseId: selectedCourseId!,
      );
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Thread created successfully.',
        type: AfaqToastType.success,
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    }
  }

  Future<void> _toggleThreadPin(_ForumThread thread) async {
    try {
      await _service.pinThread(thread.id);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Thread ${thread.isPinned ? 'unpinned' : 'pinned'} successfully.',
        type: AfaqToastType.success,
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    }
  }

  Future<void> _toggleThreadLock(_ForumThread thread) async {
    try {
      await _service.lockThread(thread.id);
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: 'Thread ${thread.isLocked ? 'unlocked' : 'locked'} successfully.',
        type: AfaqToastType.success,
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    }
  }

  Future<void> _openThread(_ForumThread thread) async {
    if (_openingThread) return;
    _openingThread = true;
    final bodyController = TextEditingController();
    List<_ForumPost> posts = const [];
    bool loadingPosts = true;
    String? postError;
    StateSetter? modalSetState;

    final cachedPayload = ForumService.getCachedPostsPayload(
      threadId: thread.id,
      perPage: 100,
    );
    if (cachedPayload != null) {
      posts = unwrapDataList(cachedPayload)
          .map(_ForumPost.fromMap)
          .toList(growable: false);
      loadingPosts = false;
    }

    Future<void> loadPosts(StateSetter setModalState) async {
      setModalState(() {
        loadingPosts = true;
        postError = null;
      });
      try {
        final response = await _service.getPosts(
          threadId: thread.id,
          perPage: 100,
          forceRefresh: true,
        );
        posts = unwrapDataList(response.data)
            .map(_ForumPost.fromMap)
            .toList(growable: false);
        setModalState(() => loadingPosts = false);
      } catch (error) {
        setModalState(() {
          postError = error.toString();
          loadingPosts = false;
        });
      }
    }

    Future<void> startInitialLoad() async {
      if (posts.isNotEmpty) {
        if (modalSetState != null) {
          modalSetState!(() {});
        }
        return;
      }
      try {
        final response = await _service.getPosts(
          threadId: thread.id,
          perPage: 100,
        );
        posts = unwrapDataList(response.data)
            .map(_ForumPost.fromMap)
            .toList(growable: false);
        loadingPosts = false;
        postError = null;
      } catch (error) {
        loadingPosts = false;
        postError = error.toString();
      }

      if (modalSetState != null) {
        modalSetState!(() {});
      }
    }

    final initialLoadFuture = startInitialLoad();

    if (!mounted) return;
    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (sheetContext) {
          return StatefulBuilder(
            builder: (modalContext, setModalState) {
              modalSetState = setModalState;

              return Padding(
                padding: EdgeInsets.only(
                  left: 20,
                  right: 20,
                  top: 20,
                  bottom: MediaQuery.of(modalContext).viewInsets.bottom + 20,
                ),
                child: SizedBox(
                  height: MediaQuery.sizeOf(modalContext).height * .78,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        thread.title,
                        style: Theme.of(modalContext).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        thread.body,
                        style: const TextStyle(color: AfaqColors.slate500),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: loadingPosts
                            ? const Center(child: CircularProgressIndicator())
                            : postError != null
                                ? Center(child: Text(postError!))
                                : ListView.separated(
                                    itemCount: posts.length,
                                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                                    itemBuilder: (itemContext, index) {
                                      final post = posts[index];
                                      return Container(
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          color: AfaqColors.slate100.withValues(alpha: .55),
                                          borderRadius: BorderRadius.circular(18),
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              _displayAuthor(post),
                                              style: const TextStyle(fontWeight: FontWeight.w800),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(post.body),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: bodyController,
                              decoration: const InputDecoration(
                                hintText: 'Write a reply',
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                        FilledButton(
                          onPressed: () async {
                            final text = bodyController.text.trim();
                            if (text.isEmpty) return;

                            try {
                              await _service.createPost(
                                threadId: thread.id,
                                body: text,
                              );
                              if (!mounted) return;

                              final optimisticAuthor = 'You';
                              bodyController.clear();
                              setModalState(() {
                                posts = [
                                  ...posts,
                                  _ForumPost(
                                    authorId: SessionStore.instance.userId ?? 0,
                                    author: optimisticAuthor,
                                    body: text,
                                  ),
                                ];
                                loadingPosts = false;
                                postError = null;
                              });

                              await loadPosts(setModalState);
                            } catch (error) {
                              if (!mounted) return;
                              AfaqToast.show(
                                  context,
                                  message: error.toString(),
                                  type: AfaqToastType.error,
                                );
                              }
                            },
                            child: const Text('Send'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      );
      await initialLoadFuture;
    } finally {
      modalSetState = null;
      _openingThread = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return StudentPageScaffold(
      title: studentText('forum', lang),
      subtitle: studentText('forum_subtitle', lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FilledButton.icon(
            onPressed: _courseOptions.isEmpty ? null : _createThread,
            icon: const Icon(Icons.add_comment_outlined),
            label: Text(studentText('create_thread', lang)),
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            StudentErrorPanel(message: _error!, onRetry: _load)
          else if (_threads.isEmpty)
            StudentEmptyPanel(
              message: studentText('empty', lang),
              icon: Icons.forum_outlined,
            )
          else
            ListView.separated(
              itemCount: _threads.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final thread = _threads[index];
                final isDark = Theme.of(context).brightness == Brightness.dark;
                return AfaqPanel(
                  child: InkWell(
                    onTap: () => _openThread(thread),
                    borderRadius: BorderRadius.circular(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      if (thread.isPinned)
                                        _ForumChip(
                                          label: 'Pinned',
                                          background: AfaqColors.sky400.withValues(alpha: .16),
                                          foreground: AfaqColors.sky400,
                                        ),
                                      if (thread.isLocked)
                                        _ForumChip(
                                          label: 'Locked',
                                          background: AfaqColors.amber500.withValues(alpha: .14),
                                          foreground: AfaqColors.amber500,
                                        ),
                                    ],
                                  ),
                                  if (thread.isPinned || thread.isLocked)
                                    const SizedBox(height: 8),
                                  Text(
                                    thread.title,
                                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                      fontWeight: FontWeight.w900,
                                      color: isDark
                                          ? AfaqColors.foregroundDark
                                          : AfaqColors.foregroundLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            PopupMenuButton<String>(
                              onSelected: (value) async {
                                if (value == 'pin') {
                                  await _toggleThreadPin(thread);
                                } else if (value == 'lock') {
                                  await _toggleThreadLock(thread);
                                } else if (value == 'open') {
                                  await _openThread(thread);
                                }
                              },
                              itemBuilder: (context) => [
                                PopupMenuItem<String>(
                                  value: 'pin',
                                  child: Text(thread.isPinned ? 'Unpin' : 'Pin'),
                                ),
                                PopupMenuItem<String>(
                                  value: 'lock',
                                  child: Text(thread.isLocked ? 'Unlock' : 'Lock'),
                                ),
                                const PopupMenuItem<String>(
                                  value: 'open',
                                  child: Text('Open'),
                                ),
                              ],
                              child: Padding(
                                padding: const EdgeInsets.all(4),
                                child: Icon(
                                  Icons.more_vert_rounded,
                                  color: isDark
                                      ? AfaqColors.slate300
                                      : AfaqColors.slate700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          thread.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isDark
                                ? AfaqColors.slate300
                                : AfaqColors.slate500,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _ForumChip(label: thread.courseTitle),
                            _ForumChip(label: '${thread.postsCount} posts'),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _ForumThread {
  const _ForumThread({
    required this.id,
    required this.title,
    required this.body,
    required this.courseTitle,
    required this.postsCount,
    required this.isPinned,
    required this.isLocked,
  });

  final int id;
  final String title;
  final String body;
  final String courseTitle;
  final int postsCount;
  final bool isPinned;
  final bool isLocked;

  factory _ForumThread.fromMap(Map<String, dynamic> map) {
    final course = asMap(map['course']);
    return _ForumThread(
      id: readInt(map['id']),
      title: readString(map['title'], fallback: 'Untitled Thread'),
      body: readString(map['body'], fallback: 'No content.'),
      courseTitle: readString(
        course?['title'] ?? map['course_title'],
        fallback: 'Course',
      ),
      postsCount: readInt(map['posts_count']),
      isPinned: readInt(map['is_pinned']) == 1,
      isLocked: readInt(map['is_locked']) == 1,
    );
  }
}

class _ForumCourseOption {
  const _ForumCourseOption({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;

  factory _ForumCourseOption.fromMap(Map<String, dynamic> map) {
    return _ForumCourseOption(
      id: readInt(map['id']),
      title: readString(map['title'], fallback: 'Course'),
    );
  }
}

class _ForumPost {
  const _ForumPost({
    required this.authorId,
    required this.author,
    required this.body,
  });

  final int authorId;
  final String author;
  final String body;

  factory _ForumPost.fromMap(Map<String, dynamic> map) {
    final user = asMap(map['user']);
    final authorUser = asMap(map['author']);
    final student = asMap(map['student']);
    final profile = asMap(map['profile']);
    final author = readString(
      user?['name'] ??
          user?['username'] ??
          authorUser?['name'] ??
          authorUser?['username'] ??
          student?['name'] ??
          student?['username'] ??
          profile?['name'] ??
          profile?['username'] ??
          map['author_name'] ??
          map['author_username'] ??
          map['user_name'] ??
          map['username'],
      fallback: '',
    );

    return _ForumPost(
      authorId: readInt(
        map['author_id'] ??
            map['user_id'] ??
            user?['id'] ??
            authorUser?['id'] ??
            student?['id'] ??
            profile?['id'],
      ),
      author: author.isNotEmpty
          ? author
          : 'User${readInt(map['user_id']) != 0 ? ' #${readInt(map['user_id'])}' : ''}',
      body: readString(map['body'], fallback: ''),
    );
  }
}

class _ForumChip extends StatelessWidget {
  const _ForumChip({
    required this.label,
    this.background,
    this.foreground,
  });

  final String label;
  final Color? background;
  final Color? foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background ?? AfaqColors.slate100.withValues(alpha: .8),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: foreground,
        ),
      ),
    );
  }
}
