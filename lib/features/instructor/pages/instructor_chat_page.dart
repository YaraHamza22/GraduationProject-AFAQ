import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'dart:async';

import '../../../app/app.dart';
import '../../../core/websocket/realtime_client.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_chat_service.dart';
import 'instructor_page_shared.dart';

class InstructorChatPage extends StatefulWidget {
  const InstructorChatPage({super.key});

  @override
  State<InstructorChatPage> createState() => _InstructorChatPageState();
}

class _InstructorChatPageState extends State<InstructorChatPage> {
  final _service = const InstructorChatService();
  final _realtime = InstructorChatRealtimeService();
  final _messageController = TextEditingController();

  bool _loading = true;
  bool _sending = false;
  String? _error;
  RealtimeConnectionStatus _realtimeStatus = RealtimeConnectionStatus.disconnected;
  List<_InstructorChatThread> _threads = const [];
  List<_InstructorStudentContact> _students = const [];
  List<_InstructorChatMessage> _messages = const [];
  _InstructorChatThread? _selectedThread;
  StreamSubscription<RealtimeConnectionStatus>? _statusSubscription;
  final Map<int, StreamSubscription<dynamic>> _threadSubscriptions = {};

  @override
  void initState() {
    super.initState();
    _statusSubscription = _realtime.statusChanges.listen((status) {
      if (!mounted) return;
      setState(() => _realtimeStatus = status);
    });
    unawaited(_realtime.connect());
    _load();
  }

  @override
  void dispose() {
    _statusSubscription?.cancel();
    for (final subscription in _threadSubscriptions.values) {
      subscription.cancel();
    }
    _threadSubscriptions.clear();
    unawaited(_realtime.disconnect());
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final threadsResponse = await _service.getThreads(perPage: 50);
      final studentsResponse = await _loadStudentContacts();

      final threads = unwrapInstructorList(threadsResponse.data)
          .map(_InstructorChatThread.fromMap)
          .toList(growable: false);
      final students = unwrapInstructorList(studentsResponse.data)
          .map(_InstructorStudentContact.fromMap)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _threads = threads;
        _students = students;
        _selectedThread = threads.isNotEmpty ? threads.first : null;
        _loading = false;
      });
      _bindRealtimeThreads(threads);

      if (_selectedThread != null) {
        await _loadMessages(_selectedThread!);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<Response<Map<String, dynamic>>> _loadStudentContacts() async {
    try {
      return await _service.getInstructorStudentContacts();
    } catch (_) {
      try {
        return await _service.getStudentContacts(useUsersEndpoint: true);
      } catch (_) {
        return _service.getStudentContacts();
      }
    }
  }

  void _bindRealtimeThreads(List<_InstructorChatThread> threads) {
    final nextIds = threads.map((thread) => thread.id).toSet();

    final staleIds = _threadSubscriptions.keys
        .where((threadId) => !nextIds.contains(threadId))
        .toList(growable: false);
    for (final threadId in staleIds) {
      _threadSubscriptions.remove(threadId)?.cancel();
      _realtime.stopWatchingThread(threadId);
    }

    for (final thread in threads) {
      if (_threadSubscriptions.containsKey(thread.id)) continue;
      _threadSubscriptions[thread.id] = _realtime.watchThread(thread.id).listen((_) {
        if (!mounted) return;
        unawaited(_refreshFromRealtime(thread.id));
      });
    }
  }

  Future<void> _refreshFromRealtime(int threadId) async {
    try {
      final response = await _service.getThreads(perPage: 50);
      final threads = unwrapInstructorList(response.data)
          .map(_InstructorChatThread.fromMap)
          .toList(growable: false);
      if (!mounted) return;

      final selectedId = _selectedThread?.id;
      _bindRealtimeThreads(threads);
      setState(() {
        _threads = threads;
        if (selectedId != null) {
          _selectedThread = _findThreadById(threads, selectedId) ?? _selectedThread;
        }
      });

      if (_selectedThread?.id == threadId) {
        await _loadMessages(_selectedThread!);
      }
    } catch (_) {
      // Keep the current UI if realtime refresh fails.
    }
  }

  _InstructorChatThread? _findThreadById(List<_InstructorChatThread> threads, int id) {
    for (final thread in threads) {
      if (thread.id == id) return thread;
    }
    return null;
  }

  Future<void> _loadMessages(_InstructorChatThread thread) async {
    try {
      final response = await _service.getMessages(threadId: thread.id, perPage: 100);
      if (!mounted) return;
      setState(() {
        _selectedThread = thread;
        _messages = unwrapInstructorList(response.data)
            .map(_InstructorChatMessage.fromMap)
            .toList(growable: false);
      });
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    }
  }

  Future<void> _createThread() async {
    if (_students.isEmpty) return;
    final titleController = TextEditingController();
    int selectedUserId = _students.first.id;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('New Thread'),
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
                    DropdownButton<int>(
                      isExpanded: true,
                      value: selectedUserId,
                      items: _students
                          .map((student) => DropdownMenuItem<int>(
                                value: student.id,
                                child: Text(student.name),
                              ))
                          .toList(growable: false),
                      onChanged: (value) {
                        if (value == null) return;
                        setDialogState(() => selectedUserId = value);
                      },
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
      final response = await _service.createThread(title: titleController.text.trim());
      final thread = _InstructorChatThread.fromMap(unwrapInstructorMap(response.data));
      await _service.addParticipant(threadId: thread.id, userId: selectedUserId);
      await _load();
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    }
  }

  Future<void> _sendMessage() async {
    final thread = _selectedThread;
    if (thread == null || _messageController.text.trim().isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      await _service.sendMessage(threadId: thread.id, body: _messageController.text.trim());
      _messageController.clear();
      await _loadMessages(thread);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return InstructorPageScaffold(
      title: instructorText('chat', lang),
      subtitle: instructorText('chat_subtitle', lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _RealtimeStatusChip(status: _realtimeStatus),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _students.isEmpty ? null : _createThread,
            icon: const Icon(Icons.add_comment_outlined),
            label: const Text('New Thread'),
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
                return Flex(
                  direction: stacked ? Axis.vertical : Axis.horizontal,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: stacked ? double.infinity : 320,
                      child: AfaqPanel(
                        child: _threads.isEmpty
                            ? const Text('No threads yet.')
                            : ListView.separated(
                                itemCount: _threads.length,
                                shrinkWrap: true,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final thread = _threads[index];
                                  final active = _selectedThread?.id == thread.id;
                                  return InkWell(
                                    onTap: () => _loadMessages(thread),
                                    borderRadius: BorderRadius.circular(18),
                                    child: Container(
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: active
                                            ? AfaqColors.primary.withValues(alpha: .12)
                                            : AfaqColors.slate100.withValues(alpha: .45),
                                        borderRadius: BorderRadius.circular(18),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(thread.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                                          const SizedBox(height: 6),
                                          Text(
                                            thread.preview,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(color: AfaqColors.slate500),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ),
                    SizedBox(width: stacked ? 0 : 16, height: stacked ? 16 : 0),
                    Expanded(
                      child: AfaqPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedThread?.title ?? 'Messages',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Expanded(
                              child: _selectedThread == null
                                  ? const Center(child: Text('Select a thread.'))
                                  : _messages.isEmpty
                                      ? const Center(child: Text('No messages yet.'))
                                      : ListView.separated(
                                          itemCount: _messages.length,
                                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                                          itemBuilder: (context, index) {
                                            final message = _messages[index];
                                            return Align(
                                              alignment: message.mine
                                                  ? Alignment.centerRight
                                                  : Alignment.centerLeft,
                                              child: Container(
                                                constraints: const BoxConstraints(maxWidth: 420),
                                                padding: const EdgeInsets.all(14),
                                                decoration: BoxDecoration(
                                                  color: message.mine
                                                      ? AfaqColors.primary.withValues(alpha: .14)
                                                      : AfaqColors.slate100.withValues(alpha: .55),
                                                  borderRadius: BorderRadius.circular(18),
                                                ),
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(message.author, style: const TextStyle(fontWeight: FontWeight.w800)),
                                                    const SizedBox(height: 6),
                                                    Text(message.body),
                                                  ],
                                                ),
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
                                    controller: _messageController,
                                    decoration: const InputDecoration(hintText: 'Write a message'),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                FilledButton(
                                  onPressed: _sending ? null : _sendMessage,
                                  child: _sending
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                        )
                                      : const Text('Send'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}

class _RealtimeStatusChip extends StatelessWidget {
  const _RealtimeStatusChip({required this.status});

  final RealtimeConnectionStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      RealtimeConnectionStatus.connected => ('Live', AfaqColors.emerald500),
      RealtimeConnectionStatus.connecting => ('Connecting', AfaqColors.amber500),
      RealtimeConnectionStatus.reconnecting => ('Reconnecting', AfaqColors.amber500),
      RealtimeConnectionStatus.disconnected => ('Offline', AfaqColors.accent),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 10, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _InstructorChatThread {
  const _InstructorChatThread({
    required this.id,
    required this.title,
    required this.preview,
  });

  final int id;
  final String title;
  final String preview;

  factory _InstructorChatThread.fromMap(Map<String, dynamic> map) {
    return _InstructorChatThread(
      id: instructorInt(map['id']),
      title: instructorString(map['title'], fallback: 'Thread'),
      preview: instructorString(
        map['last_message_body'] ?? map['body'],
        fallback: 'No messages yet.',
      ),
    );
  }
}

class _InstructorStudentContact {
  const _InstructorStudentContact({required this.id, required this.name});

  final int id;
  final String name;

  factory _InstructorStudentContact.fromMap(Map<String, dynamic> map) {
    return _InstructorStudentContact(
      id: instructorInt(map['id']),
      name: instructorString(map['name'], fallback: 'Student'),
    );
  }
}

class _InstructorChatMessage {
  const _InstructorChatMessage({
    required this.author,
    required this.body,
    required this.mine,
  });

  final String author;
  final String body;
  final bool mine;

  factory _InstructorChatMessage.fromMap(Map<String, dynamic> map) {
    final user = instructorMap(map['user']);
    final role = instructorString(user?['role']).toLowerCase();
    return _InstructorChatMessage(
      author: instructorString(user?['name'], fallback: 'User'),
      body: instructorString(map['body'], fallback: ''),
      mine: role == 'instructor',
    );
  }
}
