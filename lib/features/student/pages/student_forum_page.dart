import 'dart:async';

import 'package:flutter/material.dart';

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
  static const int _postsPerPage = 100;
  static const Duration _postsCacheTtl = Duration(minutes: 3);

  final _service = const ForumService();

  bool _loading = true;
  String? _error;
  int? _openingThreadId;

  List<_ForumThread> _threads = const [];
  List<_ForumCourseOption> _courseOptions = const [];

  /// O(1) thread-post cache.
  ///
  /// The key is `threadId`, so opening a thread checks memory instantly instead
  /// of waiting for a network request every time.
  final Map<int, List<_ForumPost>> _postsByThreadId = {};
  final Map<int, String> _postsErrorByThreadId = {};
  final Map<int, Future<List<_ForumPost>>> _postsInFlightByThreadId = {};
  final Map<int, DateTime> _postsLoadedAtByThreadId = {};

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
    _hydrateCachedLists();
    unawaited(_load(showLoader: _threads.isEmpty));
  }

  void _hydrateCachedLists() {
    final cachedThreadsPayload = ForumService.getCachedThreadsPayload();
    final cachedCourseOptionsPayload = ForumService.getCachedCourseOptionsPayload();

    if (cachedThreadsPayload == null && cachedCourseOptionsPayload == null) {
      return;
    }

    final cachedThreads = cachedThreadsPayload == null
        ? _threads
        : unwrapDataList(cachedThreadsPayload)
            .map(_ForumThread.fromMap)
            .toList(growable: false);

    final cachedCourseOptions = cachedCourseOptionsPayload == null
        ? _courseOptions
        : unwrapDataList(cachedCourseOptionsPayload)
            .map(_ForumCourseOption.fromMap)
            .toList(growable: false);

    setState(() {
      _threads = cachedThreads;
      _courseOptions = cachedCourseOptions;
      _loading = false;
      _error = null;
    });

    for (final thread in cachedThreads.take(12)) {
      unawaited(_warmThreadPosts(thread));
    }
  }

  bool _hasFreshPostsCache(int threadId) {
    final loadedAt = _postsLoadedAtByThreadId[threadId];
    return loadedAt != null &&
        _postsByThreadId.containsKey(threadId) &&
        DateTime.now().difference(loadedAt) < _postsCacheTtl;
  }

  List<_ForumPost> _readCachedPosts(int threadId) {
    final local = _postsByThreadId[threadId];
    if (local != null) return local;

    final cachedPayload = ForumService.getCachedPostsPayload(
      threadId: threadId,
      perPage: _postsPerPage,
    );

    if (cachedPayload == null) return const [];

    final posts = unwrapDataList(cachedPayload)
        .map(_ForumPost.fromMap)
        .toList(growable: false);

    _postsByThreadId[threadId] = posts;
    _postsLoadedAtByThreadId[threadId] = DateTime.now();

    return posts;
  }

  Future<List<_ForumPost>> _getPostsByThreadId({
    required int threadId,
    bool forceRefresh = false,
  }) {
    if (!forceRefresh && _hasFreshPostsCache(threadId)) {
      return Future.value(_postsByThreadId[threadId] ?? const []);
    }

    final existing = _postsInFlightByThreadId[threadId];
    if (existing != null) return existing;

    final future = () async {
      try {
        final response = await _service.getPosts(
          threadId: threadId,
          perPage: _postsPerPage,
          forceRefresh: forceRefresh,
        );

        final posts = unwrapDataList(response.data)
            .map(_ForumPost.fromMap)
            .toList(growable: false);

        _postsByThreadId[threadId] = posts;
        _postsLoadedAtByThreadId[threadId] = DateTime.now();
        _postsErrorByThreadId.remove(threadId);

        return posts;
      } catch (error) {
        _postsErrorByThreadId[threadId] = error.toString();
        rethrow;
      } finally {
        _postsInFlightByThreadId.remove(threadId);
      }
    }();

    _postsInFlightByThreadId[threadId] = future;
    return future;
  }

  Future<void> _warmThreadPosts(_ForumThread thread) async {
    if (_hasFreshPostsCache(thread.id)) return;

    try {
      final posts = await _getPostsByThreadId(threadId: thread.id);
      if (posts.isEmpty) return;
    } catch (_) {
      // Warming is best-effort only. The user-facing modal will show errors
      // when the thread is opened.
    }
  }

  Future<void> _load({bool showLoader = true}) async {
    if (showLoader) {
      setState(() {
        _loading = true;
        _error = null;
      });
    } else {
      setState(() => _error = null);
    }

    try {
      final results = await Future.wait([
        _service.getThreads(perPage: 50, forceRefresh: true),
        _service.getCourseOptions(forceRefresh: true),
      ]);

      final threads = unwrapDataList(results[0].data)
          .map(_ForumThread.fromMap)
          .toList(growable: false);

      final courseOptions = unwrapDataList(results[1].data)
          .map(_ForumCourseOption.fromMap)
          .toList(growable: false);

      if (!mounted) return;

      setState(() {
        _threads = threads;
        _courseOptions = courseOptions;
        _loading = false;
      });

      // Warm visible threads in the background. Opening one of these threads is
      // then an O(1) map lookup instead of waiting on the network.
      for (final thread in threads.take(12)) {
        unawaited(_warmThreadPosts(thread));
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
    var titleValue = '';
    var bodyValue = '';
    int? selectedCourseId =
        _courseOptions.isNotEmpty ? _courseOptions.first.id : null;

    try {
      final created = await showDialog<bool>(
        context: context,
        builder: (context) {
          return StatefulBuilder(
            builder: (context, setDialogState) {
              return AlertDialog(
                title: const Text('Create Thread'),
                content: SizedBox(
                  width: 460,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextFormField(
                          initialValue: titleValue,
                          textInputAction: TextInputAction.next,
                          onChanged: (value) {
                            setDialogState(() => titleValue = value);
                          },
                          decoration: const InputDecoration(labelText: 'Title'),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          initialValue: bodyValue,
                          maxLines: 4,
                          onChanged: (value) {
                            setDialogState(() => bodyValue = value);
                          },
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
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Cancel'),
                  ),
                  FilledButton(
                    onPressed: () {
                      if (titleValue.trim().isEmpty ||
                          bodyValue.trim().isEmpty ||
                          selectedCourseId == null) {
                        return;
                      }
                      Navigator.of(context).pop(true);
                    },
                    child: const Text('Create'),
                  ),
                ],
              );
            },
          );
        },
      );

      if (created != true || selectedCourseId == null) return;

      await _service.createThread(
        title: titleValue.trim(),
        body: bodyValue.trim(),
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
        message:
            'Thread ${thread.isPinned ? 'unpinned' : 'pinned'} successfully.',
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
        message:
            'Thread ${thread.isLocked ? 'unlocked' : 'locked'} successfully.',
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

  void _updateThreadPostCount(int threadId) {
    setState(() {
      _threads = _threads
          .map(
            (thread) => thread.id == threadId
                ? thread.copyWith(postsCount: thread.postsCount + 1)
                : thread,
          )
          .toList(growable: false);
    });
  }

  Future<void> _openThread(_ForumThread thread) async {
    if (_openingThreadId != null) return;
    _openingThreadId = thread.id;

    var replyDraft = '';
    var composerRevision = 0;
    final cachedPosts = _readCachedPosts(thread.id);

    List<_ForumPost> posts = cachedPosts;
    bool loadingPosts = posts.isEmpty;
    bool refreshingPosts = posts.isNotEmpty;
    bool sendingReply = false;
    String? postError = _postsErrorByThreadId[thread.id];

    StateSetter? modalSetState;
    bool initialRequestStarted = false;

    Future<void> refreshPosts({
      required StateSetter setModalState,
      bool forceRefresh = false,
      bool showFullLoader = false,
    }) async {
      setModalState(() {
        if (showFullLoader && posts.isEmpty) loadingPosts = true;
        if (!showFullLoader && posts.isNotEmpty) refreshingPosts = true;
        postError = null;
      });

      try {
        final nextPosts = await _getPostsByThreadId(
          threadId: thread.id,
          forceRefresh: forceRefresh,
        );

        if (modalSetState == null) return;

        setModalState(() {
          posts = nextPosts;
          loadingPosts = false;
          refreshingPosts = false;
          postError = null;
        });
      } catch (error) {
        if (modalSetState == null) return;

        setModalState(() {
          postError = error.toString();
          loadingPosts = false;
          refreshingPosts = false;
        });
      }
    }

    Future<void> sendReply(StateSetter setModalState) async {
      final text = replyDraft.trim();
      if (text.isEmpty || sendingReply) return;

      final previousPosts = posts;
      final optimisticPost = _ForumPost(
        authorId: SessionStore.instance.userId ?? 0,
        author: 'You',
        body: text,
      );

      setModalState(() {
        sendingReply = true;
        postError = null;
        posts = [...posts, optimisticPost];
        _postsByThreadId[thread.id] = posts;
        replyDraft = '';
        composerRevision++;
        sendingReply = false;
      });

      _updateThreadPostCount(thread.id);

      unawaited(() async {
        try {
          await _service.createPost(threadId: thread.id, body: text);

          if (!mounted || modalSetState == null) return;

          await refreshPosts(
            setModalState: setModalState,
            forceRefresh: true,
            showFullLoader: false,
          );
        } catch (error) {
          if (!mounted || modalSetState == null) return;

          setModalState(() {
            posts = previousPosts;
            _postsByThreadId[thread.id] = previousPosts;
            postError = error.toString();
          });

          setState(() {
            _threads = _threads
                .map(
                  (item) => item.id == thread.id
                      ? item.copyWith(
                          postsCount: item.postsCount > 0
                              ? item.postsCount - 1
                              : 0,
                        )
                      : item,
                )
                .toList(growable: false);
          });

          AfaqToast.show(
            context,
            message: error.toString(),
            type: AfaqToastType.error,
          );
        }
      }());
    }

    if (!mounted) return;

    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (sheetContext) {
          return StatefulBuilder(
            builder: (modalContext, setModalState) {
              modalSetState = setModalState;

              if (!initialRequestStarted) {
                initialRequestStarted = true;

                // Open immediately. If cached data exists, show it instantly and
                // refresh in the background. If not, only then show the loader.
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (posts.isEmpty) {
                    unawaited(
                      refreshPosts(
                        setModalState: setModalState,
                        showFullLoader: true,
                      ),
                    );
                  } else {
                    unawaited(
                      refreshPosts(
                        setModalState: setModalState,
                        forceRefresh: true,
                        showFullLoader: false,
                      ),
                    );
                  }
                });
              }

              final height = MediaQuery.sizeOf(modalContext).height;
              final width = MediaQuery.sizeOf(modalContext).width;
              final keyboardInset = MediaQuery.of(modalContext).viewInsets.bottom;
              final sheetHeight = height * (width >= 900 ? .78 : .86);
              final isDark = Theme.of(modalContext).brightness == Brightness.dark;
              final surface = Theme.of(modalContext).colorScheme.surface;

              return Padding(
                padding: EdgeInsets.only(
                  left: width >= 900 ? 24 : 0,
                  right: width >= 900 ? 24 : 0,
                  bottom: keyboardInset,
                ),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 820),
                    child: Container(
                      height: sheetHeight,
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
                      decoration: BoxDecoration(
                        color: surface,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(32),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: .14),
                            blurRadius: 30,
                            offset: const Offset(0, -10),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(
                            child: Container(
                              width: 42,
                              height: 5,
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.white.withValues(alpha: .24)
                                    : AfaqColors.slate300,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          _ThreadSheetHeader(
                            thread: thread,
                            refreshing: refreshingPosts,
                            onRefresh: () => refreshPosts(
                              setModalState: setModalState,
                              forceRefresh: true,
                              showFullLoader: posts.isEmpty,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Expanded(
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 180),
                              child: loadingPosts
                                  ? const _ForumLoadingPosts(key: ValueKey('loading-posts'))
                                  : postError != null && posts.isEmpty
                                      ? _ForumPostsError(
                                          key: const ValueKey('posts-error'),
                                          message: postError!,
                                          onRetry: () => refreshPosts(
                                            setModalState: setModalState,
                                            forceRefresh: true,
                                            showFullLoader: true,
                                          ),
                                        )
                                      : posts.isEmpty
                                          ? const _ForumEmptyPosts(
                                              key: ValueKey('empty-posts'),
                                            )
                                          : ListView.separated(
                                              key: const PageStorageKey<String>(
                                                'forum-posts-list',
                                              ),
                                              itemCount: posts.length,
                                              padding: const EdgeInsets.only(
                                                top: 4,
                                                bottom: 12,
                                              ),
                                              separatorBuilder: (_, __) =>
                                                  const SizedBox(height: 12),
                                              itemBuilder: (itemContext, index) {
                                                final post = posts[index];
                                                final mine =
                                                    _displayAuthor(post) == 'You';
                                                return _ForumPostBubble(
                                                  author: _displayAuthor(post),
                                                  body: post.body,
                                                  mine: mine,
                                                );
                                              },
                                            ),
                            ),
                          ),
                          if (postError != null && posts.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            _InlinePostWarning(
                              message: postError!,
                              onRetry: () => refreshPosts(
                                setModalState: setModalState,
                                forceRefresh: true,
                                showFullLoader: false,
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          _ReplyComposer(
                            key: ValueKey('reply-composer-$composerRevision'),
                            initialValue: replyDraft,
                            sending: sendingReply,
                            locked: thread.isLocked,
                            onChanged: (value) => replyDraft = value,
                            onSend: () => sendReply(setModalState),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          );
        },
      );
    } finally {
      modalSetState = null;
      _openingThreadId = null;
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

                return _ThreadCard(
                  thread: thread,
                  opening: _openingThreadId == thread.id,
                  onOpen: () => _openThread(thread),
                  onPin: () => _toggleThreadPin(thread),
                  onLock: () => _toggleThreadLock(thread),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _ThreadCard extends StatelessWidget {
  const _ThreadCard({
    required this.thread,
    required this.opening,
    required this.onOpen,
    required this.onPin,
    required this.onLock,
  });

  final _ForumThread thread;
  final bool opening;
  final VoidCallback onOpen;
  final VoidCallback onPin;
  final VoidCallback onLock;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor =
        isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return AfaqPanel(
      child: InkWell(
        onTap: opening ? null : onOpen,
        borderRadius: BorderRadius.circular(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AfaqColors.primary.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: opening
                      ? const Padding(
                          padding: EdgeInsets.all(13),
                          child: CircularProgressIndicator(strokeWidth: 2.2),
                        )
                      : const Icon(
                          Icons.forum_rounded,
                          color: AfaqColors.primary,
                        ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    thread.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: titleColor,
                        ),
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'pin') {
                      onPin();
                    } else if (value == 'lock') {
                      onLock();
                    } else if (value == 'open') {
                      onOpen();
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
                      color: isDark ? AfaqColors.slate300 : AfaqColors.slate700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              thread.body,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: secondary, height: 1.35),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ForumChip(label: thread.courseTitle),
                _ForumChip(label: '${thread.postsCount} posts'),
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
          ],
        ),
      ),
    );
  }
}

class _ThreadSheetHeader extends StatelessWidget {
  const _ThreadSheetHeader({
    required this.thread,
    required this.refreshing,
    required this.onRefresh,
  });

  final _ForumThread thread;
  final bool refreshing;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor =
        isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                thread.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: titleColor,
                    ),
              ),
            ),
            IconButton.filledTonal(
              onPressed: refreshing ? null : onRefresh,
              icon: refreshing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh_rounded),
              tooltip: 'Refresh replies',
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          thread.body,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: secondary, height: 1.35),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _ForumChip(label: thread.courseTitle),
            _ForumChip(label: '${thread.postsCount} posts'),
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
      ],
    );
  }
}

class _ForumPostBubble extends StatelessWidget {
  const _ForumPostBubble({
    required this.author,
    required this.body,
    required this.mine,
  });

  final String author;
  final String body;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 620),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: mine
                ? AfaqColors.primary.withValues(alpha: .13)
                : isDark
                    ? Colors.white.withValues(alpha: .07)
                    : AfaqColors.slate100.withValues(alpha: .75),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(mine ? 18 : 6),
              bottomRight: Radius.circular(mine ? 6 : 18),
            ),
            border: Border.all(
              color: mine
                  ? AfaqColors.primary.withValues(alpha: .20)
                  : Colors.transparent,
            ),
          ),
          child: Column(
            crossAxisAlignment:
                mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              Text(
                author,
                style: TextStyle(
                  color: mine ? AfaqColors.primary : null,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                body,
                textAlign: mine ? TextAlign.right : TextAlign.left,
                style: const TextStyle(height: 1.35),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReplyComposer extends StatelessWidget {
  const _ReplyComposer({
    super.key,
    required this.initialValue,
    required this.sending,
    required this.locked,
    required this.onChanged,
    required this.onSend,
  });

  final String initialValue;
  final bool sending;
  final bool locked;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    if (locked) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AfaqColors.amber500.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Text(
          'This thread is locked. Replies are disabled.',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      );
    }

    return Row(
      children: [
        Expanded(
          child: TextFormField(
            initialValue: initialValue,
            minLines: 1,
            maxLines: 4,
            textInputAction: TextInputAction.send,
            onChanged: onChanged,
            onFieldSubmitted: (_) => sending ? null : onSend(),
            decoration: InputDecoration(
              hintText: 'Write a reply',
              filled: true,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(18),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        FilledButton(
          onPressed: sending ? null : onSend,
          style: FilledButton.styleFrom(
            minimumSize: const Size(86, 54),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          child: sending
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Send'),
        ),
      ],
    );
  }
}

class _ForumLoadingPosts extends StatelessWidget {
  const _ForumLoadingPosts({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 34,
        height: 34,
        child: CircularProgressIndicator(strokeWidth: 3),
      ),
    );
  }
}

class _ForumEmptyPosts extends StatelessWidget {
  const _ForumEmptyPosts({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: AfaqColors.slate100.withValues(alpha: .55),
          borderRadius: BorderRadius.circular(24),
        ),
        child: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline_rounded, size: 34),
            SizedBox(height: 10),
            Text(
              'No replies yet.',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 4),
            Text('Be the first to reply.'),
          ],
        ),
      ),
    );
  }
}

class _ForumPostsError extends StatelessWidget {
  const _ForumPostsError({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.red.withValues(alpha: .08),
          borderRadius: BorderRadius.circular(22),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.red),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InlinePostWarning extends StatelessWidget {
  const _InlinePostWarning({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
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

  _ForumThread copyWith({
    int? postsCount,
  }) {
    return _ForumThread(
      id: id,
      title: title,
      body: body,
      courseTitle: courseTitle,
      postsCount: postsCount ?? this.postsCount,
      isPinned: isPinned,
      isLocked: isLocked,
    );
  }

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
      postsCount: readInt(
        map['posts_count'] ??
            map['replies_count'] ??
            map['comments_count'] ??
            map['forum_posts_count'],
      ),
      isPinned: map['is_pinned'] == true || readInt(map['is_pinned']) == 1,
      isLocked: map['is_locked'] == true || readInt(map['is_locked']) == 1,
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

    final authorId = readInt(
      map['author_id'] ??
          map['user_id'] ??
          user?['id'] ??
          authorUser?['id'] ??
          student?['id'] ??
          profile?['id'],
    );

    return _ForumPost(
      authorId: authorId,
      author: author.isNotEmpty
          ? author
          : 'User${authorId != 0 ? ' #$authorId' : ''}',
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background ??
            (isDark
                ? Colors.white.withValues(alpha: .10)
                : AfaqColors.slate100.withValues(alpha: .85)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: foreground,
        ),
      ),
    );
  }
}
