import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/chat_service.dart';
import 'student_page_shared.dart';

class StudentChatPage extends StatefulWidget {
  const StudentChatPage({super.key});

  @override
  State<StudentChatPage> createState() => _StudentChatPageState();
}

class _StudentChatPageState extends State<StudentChatPage> {
  final _service = const ChatService();
  final _messageController = TextEditingController();

  bool _loading = true;
  bool _sending = false;
  String? _error;
  List<_ChatThread> _threads = const [];
  List<_ChatContact> _contacts = const [];
  List<_ChatMessage> _messages = const [];
  _ChatThread? _selectedThread;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.getThreads(perPage: 50),
        _service.getInstructorContacts(),
      ]);

      final threads = unwrapDataList(results[0].data)
          .map(_ChatThread.fromMap)
          .toList(growable: false);
      final contacts = unwrapDataList(results[1].data)
          .map(_ChatContact.fromMap)
          .toList(growable: false);

      if (!mounted) return;
      setState(() {
        _threads = threads;
        _contacts = contacts;
        _selectedThread = threads.isNotEmpty ? threads.first : null;
        _loading = false;
      });

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

  Future<void> _loadMessages(_ChatThread thread) async {
    try {
      final response = await _service.getMessages(threadId: thread.id, perPage: 100);
      if (!mounted) return;
      setState(() {
        _selectedThread = thread;
        _messages = unwrapDataList(response.data)
            .map(_ChatMessage.fromMap)
            .toList(growable: false);
      });
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    }
  }

  Future<void> _createThread() async {
    final titleController = TextEditingController();
    int? selectedUserId = _contacts.isNotEmpty ? _contacts.first.id : null;

    final shouldCreate = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('New chat thread'),
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
                    DropdownButtonFormField<int>(
                      initialValue: selectedUserId,
                      items: _contacts
                          .map(
                            (contact) => DropdownMenuItem<int>(
                              value: contact.id,
                              child: Text(contact.name),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) {
                        setDialogState(() => selectedUserId = value);
                      },
                      decoration: const InputDecoration(labelText: 'Instructor'),
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

    if (shouldCreate != true || selectedUserId == null) return;

    try {
      final response = await _service.createThread(
        title: titleController.text.trim(),
      );
      final thread = _ChatThread.fromMap(unwrapDataMap(response.data));
      await _service.addParticipant(
        threadId: thread.id,
        userId: selectedUserId!,
      );
      await _load();
      if (!mounted) return;
      final createdThread = _threads.firstWhere(
        (item) => item.id == thread.id,
        orElse: () => thread,
      );
      await _loadMessages(createdThread);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    }
  }

  Future<void> _sendMessage() async {
    final thread = _selectedThread;
    if (thread == null || _messageController.text.trim().isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      await _service.sendMessage(
        threadId: thread.id,
        body: _messageController.text.trim(),
      );
      _messageController.clear();
      await _loadMessages(thread);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(
        context,
        message: error.toString(),
        type: AfaqToastType.error,
      );
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;

    return StudentPageScaffold(
      title: studentText('chat', lang),
      subtitle: studentText('chat_subtitle', lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FilledButton.icon(
            onPressed: _contacts.isEmpty ? null : _createThread,
            icon: const Icon(Icons.add_comment_outlined),
            label: const Text('New Thread'),
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            StudentErrorPanel(message: _error!, onRetry: _load)
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
                                          Text(
                                            thread.title,
                                            style: const TextStyle(fontWeight: FontWeight.w800),
                                          ),
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
                                                    Text(
                                                      message.author,
                                                      style: const TextStyle(
                                                        fontWeight: FontWeight.w800,
                                                      ),
                                                    ),
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
                                    decoration: const InputDecoration(
                                      hintText: 'Write a message',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                FilledButton(
                                  onPressed: _sending ? null : _sendMessage,
                                  child: _sending
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

class _ChatThread {
  const _ChatThread({
    required this.id,
    required this.title,
    required this.preview,
  });

  final int id;
  final String title;
  final String preview;

  factory _ChatThread.fromMap(Map<String, dynamic> map) {
    return _ChatThread(
      id: readInt(map['id']),
      title: readString(map['title'], fallback: 'Untitled Thread'),
      preview: readString(
        map['last_message_body'] ?? map['body'],
        fallback: 'No messages yet.',
      ),
    );
  }
}

class _ChatContact {
  const _ChatContact({
    required this.id,
    required this.name,
  });

  final int id;
  final String name;

  factory _ChatContact.fromMap(Map<String, dynamic> map) {
    return _ChatContact(
      id: readInt(map['id']),
      name: readString(map['name'], fallback: 'Instructor'),
    );
  }
}

class _ChatMessage {
  const _ChatMessage({
    required this.author,
    required this.body,
    required this.mine,
  });

  final String author;
  final String body;
  final bool mine;

  factory _ChatMessage.fromMap(Map<String, dynamic> map) {
    final user = asMap(map['user']);
    final role = readString(user?['role']).toLowerCase();
    return _ChatMessage(
      author: readString(user?['name'], fallback: 'User'),
      body: readString(map['body'], fallback: ''),
      mine: role == 'student',
    );
  }
}
