import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
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

  bool _loading = true;
  String? _error;
  List<_ForumThreadRow> _threads = const [];
  List<_ForumCourseRow> _courses = const [];

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
        _forumService.getThreads(perPage: 50),
        _coursesService.getMyCourses(),
      ]);
      if (!mounted) return;
      setState(() {
        _threads = unwrapInstructorList(results[0].data)
            .map(_ForumThreadRow.fromMap)
            .toList(growable: false);
        _courses = unwrapInstructorList(results[1].data)
            .map(_ForumCourseRow.fromMap)
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
    if (_courses.isEmpty) return;
    final titleController = TextEditingController();
    final bodyController = TextEditingController();
    int selectedCourseId = _courses.first.id;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Create Thread'),
              content: SizedBox(
                width: 420,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButton<int>(
                      isExpanded: true,
                      value: selectedCourseId,
                      items: _courses
                          .map((course) => DropdownMenuItem<int>(
                                value: course.id,
                                child: Text(course.title),
                              ))
                          .toList(growable: false),
                      onChanged: (value) {
                        if (value == null) return;
                        setDialogState(() => selectedCourseId = value);
                      },
                    ),
                    const SizedBox(height: 12),
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
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(dialogContext).pop(true),
                  child: const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );

    if (confirmed != true) return;

    try {
      await _forumService.createThread(
        title: titleController.text.trim(),
        body: bodyController.text.trim(),
        courseId: selectedCourseId,
      );
      await _load();
      if (!mounted) return;
      AfaqToast.show(context, message: 'Thread created.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return InstructorPageScaffold(
      title: instructorText('forum', lang),
      subtitle: instructorText('forum_subtitle', lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FilledButton.icon(
            onPressed: _courses.isEmpty ? null : _createThread,
            icon: const Icon(Icons.add_comment_outlined),
            label: const Text('Create Thread'),
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            InstructorErrorPanel(message: _error!, onRetry: _load)
          else if (_threads.isEmpty)
            InstructorEmptyPanel(message: instructorText('empty', lang), icon: Icons.forum_outlined)
          else
            ListView.separated(
              itemCount: _threads.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final thread = _threads[index];
                return AfaqPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        thread.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(thread.body, style: const TextStyle(color: AfaqColors.slate500)),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _ForumBadge(label: thread.courseTitle),
                          _ForumBadge(label: '${thread.postsCount} posts'),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _ForumThreadRow {
  const _ForumThreadRow({
    required this.title,
    required this.body,
    required this.courseTitle,
    required this.postsCount,
  });

  final String title;
  final String body;
  final String courseTitle;
  final int postsCount;

  factory _ForumThreadRow.fromMap(Map<String, dynamic> map) {
    final course = instructorMap(map['course']);
    return _ForumThreadRow(
      title: instructorString(map['title'], fallback: 'Untitled Thread'),
      body: instructorString(map['body'], fallback: 'No content'),
      courseTitle: instructorString(course?['title'] ?? map['course_title'], fallback: 'Course'),
      postsCount: instructorInt(map['posts_count']),
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

class _ForumBadge extends StatelessWidget {
  const _ForumBadge({required this.label});

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
