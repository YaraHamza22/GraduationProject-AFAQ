import 'package:flutter/material.dart';

import '../../../app/app.dart';
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
  String? _error;
  List<_ForumThread> _threads = const [];
  List<_ForumCourseOption> _courseOptions = const [];

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

  Future<void> _openThread(_ForumThread thread) async {
    final bodyController = TextEditingController();
    List<_ForumPost> posts = const [];
    bool loadingPosts = true;
    String? postError;

    Future<void> loadPosts(StateSetter setModalState) async {
      setModalState(() {
        loadingPosts = true;
        postError = null;
      });
      try {
        final response = await _service.getPosts(threadId: thread.id, perPage: 100);
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

    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            if (loadingPosts && posts.isEmpty && postError == null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                loadPosts(setModalState);
              });
            }

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
                                            post.author,
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
                            try {
                              await _service.createPost(
                                threadId: thread.id,
                                body: bodyController.text.trim(),
                              );
                              bodyController.clear();
                              await loadPosts(setModalState);
                            } catch (error) {
                              if (!mounted) return;
                              AfaqToast.show(
                                this.context,
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
                              child: Text(
                                thread.title,
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const Icon(Icons.chevron_right_rounded),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          thread.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AfaqColors.slate500),
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
  });

  final int id;
  final String title;
  final String body;
  final String courseTitle;
  final int postsCount;

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
    required this.author,
    required this.body,
  });

  final String author;
  final String body;

  factory _ForumPost.fromMap(Map<String, dynamic> map) {
    final user = asMap(map['user']);
    return _ForumPost(
      author: readString(user?['name'], fallback: 'User'),
      body: readString(map['body'], fallback: ''),
    );
  }
}

class _ForumChip extends StatelessWidget {
  const _ForumChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AfaqColors.slate100.withValues(alpha: .8),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
    );
  }
}
