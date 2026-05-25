import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_virtual_meet_service.dart';
import 'instructor_page_shared.dart';

class InstructorVirtualMeetPage extends StatefulWidget {
  const InstructorVirtualMeetPage({super.key});

  @override
  State<InstructorVirtualMeetPage> createState() => _InstructorVirtualMeetPageState();
}

class _InstructorVirtualMeetPageState extends State<InstructorVirtualMeetPage> {
  final _service = const InstructorVirtualMeetService();

  bool _loading = true;
  String? _error;
  List<_MeetCourse> _courses = const [];
  List<_MeetIntegration> _integrations = const [];
  List<_MeetSession> _sessions = const [];

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
        _service.getCourseChoices(),
        _service.getIntegrations(),
        _service.getSessions(),
      ]);

      if (!mounted) return;
      setState(() {
        _courses = unwrapInstructorList(results[0].data)
            .map(_MeetCourse.fromMap)
            .toList(growable: false);
        _integrations = unwrapInstructorList(results[1].data)
            .map(_MeetIntegration.fromMap)
            .toList(growable: false);
        _sessions = unwrapInstructorList(results[2].data)
            .map(_MeetSession.fromMap)
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

  Future<void> _createSession() async {
    if (_courses.isEmpty) return;
    final titleController = TextEditingController();
    int selectedCourseId = _courses.first.id;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Create Session'),
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
                      decoration: const InputDecoration(labelText: 'Session title'),
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
      await _service.createSession(
        body: {
          'title': titleController.text.trim(),
          'course_id': selectedCourseId,
        },
      );
      await _load();
      if (!mounted) return;
      AfaqToast.show(context, message: 'Session created.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return InstructorPageScaffold(
      title: instructorText('meet', lang),
      subtitle: instructorText('meet_subtitle', lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FilledButton.icon(
            onPressed: _courses.isEmpty ? null : _createSession,
            icon: const Icon(Icons.add),
            label: const Text('Create Session'),
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            InstructorErrorPanel(message: _error!, onRetry: _load)
          else
            LayoutBuilder(
              builder: (context, constraints) {
                final stacked = constraints.maxWidth < 980;
                if (stacked) {
                  return Column(
                    children: [
                      _IntegrationsPanel(integrations: _integrations),
                      const SizedBox(height: 16),
                      _SessionsPanel(sessions: _sessions),
                    ],
                  );
                }

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _IntegrationsPanel(integrations: _integrations)),
                    const SizedBox(width: 16),
                    Expanded(child: _SessionsPanel(sessions: _sessions)),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}

class _MeetCourse {
  const _MeetCourse({required this.id, required this.title});

  final int id;
  final String title;

  factory _MeetCourse.fromMap(Map<String, dynamic> map) {
    return _MeetCourse(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Course'),
      ),
    );
  }
}

class _MeetIntegration {
  const _MeetIntegration({required this.provider, required this.account});

  final String provider;
  final String account;

  factory _MeetIntegration.fromMap(Map<String, dynamic> map) {
    return _MeetIntegration(
      provider: instructorString(map['provider'], fallback: 'provider'),
      account: instructorString(map['external_account_id'], fallback: 'Not linked'),
    );
  }
}

class _MeetSession {
  const _MeetSession({
    required this.title,
    required this.status,
  });

  final String title;
  final String status;

  factory _MeetSession.fromMap(Map<String, dynamic> map) {
    return _MeetSession(
      title: instructorString(map['title'], fallback: 'Session'),
      status: instructorString(map['status'], fallback: 'draft'),
    );
  }
}

class _IntegrationsPanel extends StatelessWidget {
  const _IntegrationsPanel({required this.integrations});

  final List<_MeetIntegration> integrations;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Integrations',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          if (integrations.isEmpty)
            const Text('No integrations found.')
          else
            for (final integration in integrations)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AfaqColors.slate100.withValues(alpha: .55),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(integration.provider, style: const TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text(integration.account, style: const TextStyle(color: AfaqColors.slate500)),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

class _SessionsPanel extends StatelessWidget {
  const _SessionsPanel({required this.sessions});

  final List<_MeetSession> sessions;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sessions',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          if (sessions.isEmpty)
            const Text('No sessions scheduled.')
          else
            for (final session in sessions)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AfaqColors.slate100.withValues(alpha: .55),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.video_camera_front_outlined, color: AfaqColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(session.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                          const SizedBox(height: 4),
                          Text(session.status, style: const TextStyle(color: AfaqColors.slate500)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
