import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/session/session_store.dart';
import '../../../core/theme/afaq_colors.dart';
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
  final _messageController = TextEditingController();
  final _titleController = TextEditingController();
  final _contactSearchController = TextEditingController();

  bool _loadingThreads = true;
  bool _loadingMessages = false;
  bool _creatingThread = false;
  bool _sending = false;
  String? _error;
  String? _ok;

  List<_ChatThread> _threads = const [];
  List<_ChatContact> _contacts = const [];
  List<_ChatParticipant> _participants = const [];
  List<_ChatMessage> _messages = const [];

  _ChatThread? _selectedThread;
  int? _selectedContactId;
  int _threadPage = 1;
  int _threadTotalPages = 1;
  int _messagePage = 1;
  int _messageTotalPages = 1;

  int get _myId => SessionStore.instance.userId ?? 0;
  String get _lang => localeNotifier.value.languageCode;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _titleController.dispose();
    _contactSearchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loadingThreads = true;
      _error = null;
      _ok = null;
    });

    await Future.wait([
      _loadContacts(),
      _loadThreads(),
    ]);

    if (!mounted) return;
    setState(() => _loadingThreads = false);
  }

  Future<void> _loadContacts() async {
    try {
      final response = await _loadStudentContacts();
      final contacts = unwrapInstructorList(response.data)
          .map(_ChatContact.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);

      if (!mounted) return;

      if (contacts.isEmpty) {
        setState(() {
          _contacts = const [];
          _selectedContactId = null;
        });
        return;
      }

      final selectedId = _selectedContactId ?? contacts.first.id;
      setState(() {
        _contacts = contacts;
        _selectedContactId = selectedId;
      });
      await _loadSelectedStudentDetails(selectedId);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _contacts = const [];
        _selectedContactId = null;
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

  Future<void> _loadSelectedStudentDetails(int contactId) async {
    if (contactId == 0) return;

    final current = _contacts.where((item) => item.id == contactId).firstOrNull;
    final hasEnoughDetails = current != null &&
        (current.email.isNotEmpty ||
            current.name.trim().isNotEmpty &&
                current.name != 'Student' &&
                current.name != 'User #$contactId');
    if (hasEnoughDetails) return;

    try {
      final response = await _service.getStudentContacts(
        perPage: 200,
        useUsersEndpoint: true,
      );
      final details = unwrapInstructorList(response.data)
          .map(_ChatContact.fromMap)
          .where((item) => item.id == contactId)
          .firstOrNull;
      if (!mounted || details == null || details.id == 0) return;

      setState(() {
        _contacts = _contacts
            .map((contact) => contact.id == contactId ? contact.merge(details) : contact)
            .toList(growable: false);
      });
    } catch (_) {
      // Keep list response if details endpoint is unavailable.
    }
  }

  Future<void> _loadThreads({int page = 1}) async {
    try {
      final response = await _service.getThreads(page: page, perPage: 15);
      final payload = unwrapInstructorMap(response.data);
      final threads = unwrapInstructorList(response.data)
          .map(_ChatThread.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);
      final pagination = instructorMap(payload['pagination']);

      if (!mounted) return;
      setState(() {
        _threads = threads;
        _threadPage = instructorInt(pagination?['current_page'], fallback: 1);
        _threadTotalPages = instructorInt(pagination?['total_pages'], fallback: 1);
        _selectedThread = threads.isEmpty
            ? null
            : threads.any((thread) => thread.id == _selectedThread?.id)
                ? threads.firstWhere((thread) => thread.id == _selectedThread!.id)
                : threads.first;
      });

      if (_selectedThread != null) {
        await _loadParticipants(_selectedThread!.id);
        await _loadMessages(_selectedThread!.id);
      } else if (mounted) {
        setState(() {
          _participants = const [];
          _messages = const [];
        });
      }
    } catch (error) {
      if (!mounted) return;
      final message = error.toString();
      if (message.contains('403') || message.contains('Forbidden')) {
        setState(() {
          _threads = const [];
          _selectedThread = null;
          _participants = const [];
          _messages = const [];
          _threadPage = 1;
          _threadTotalPages = 1;
        });
        return;
      }
      setState(() => _error = 'Failed to load chat threads.');
    }
  }

  Future<void> _loadParticipants(int threadId) async {
    try {
      final response = await _service.getParticipants(threadId);
      if (!mounted) return;
      setState(() {
        _participants = unwrapInstructorList(response.data)
            .map(_ChatParticipant.fromMap)
            .where((item) => item.userId != 0)
            .toList(growable: false);
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _participants = const []);
    }
  }

  Future<void> _loadMessages(int threadId, {int page = 1}) async {
    setState(() {
      _loadingMessages = true;
      _error = null;
    });

    try {
      final response = await _service.getMessages(
        threadId: threadId,
        page: page,
        perPage: 30,
      );
      final payload = unwrapInstructorMap(response.data);
      final pagination = instructorMap(payload['pagination']);
      final messages = unwrapInstructorList(response.data)
          .map(_ChatMessage.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false)
        ..sort((a, b) => a.sortStamp.compareTo(b.sortStamp));

      if (!mounted) return;
      setState(() {
        _messages = messages;
        _messagePage = instructorInt(pagination?['current_page'], fallback: 1);
        _messageTotalPages = instructorInt(pagination?['total_pages'], fallback: 1);
        _selectedThread =
            _threads.where((item) => item.id == threadId).firstOrNull ?? _selectedThread;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load messages.');
    } finally {
      if (mounted) {
        setState(() => _loadingMessages = false);
      }
    }
  }

  Future<int?> _findThreadByParticipantWithMessages(int userId) async {
    for (final thread in _threads) {
      try {
        final participantsResponse = await _service.getParticipants(thread.id);
        final rows = unwrapInstructorList(participantsResponse.data)
            .map(_ChatParticipant.fromMap)
            .toList(growable: false);
        if (!rows.any((item) => item.userId == userId)) {
          continue;
        }

        final messagesResponse = await _service.getMessages(
          threadId: thread.id,
          page: 1,
          perPage: 1,
        );
        final messages = unwrapInstructorList(messagesResponse.data)
            .map(_ChatMessage.fromMap)
            .where((item) => item.id != 0)
            .toList(growable: false);

        if (messages.isNotEmpty) {
          return thread.id;
        }
      } catch (_) {
        // Keep scanning.
      }
    }
    return null;
  }

  Future<void> _openThread(_ChatThread thread) async {
    setState(() {
      _selectedThread = thread;
      _ok = null;
    });
    await _loadParticipants(thread.id);
    await _loadMessages(thread.id);
  }

  Future<void> _createOrOpenDirectThread() async {
    final recipientId = _selectedContactId;
    if (recipientId == null || _creatingThread) return;

    setState(() {
      _creatingThread = true;
      _error = null;
      _ok = null;
    });

    try {
      final existingThreadId = await _findThreadByParticipantWithMessages(recipientId);
      int threadId = existingThreadId ?? 0;

      if (threadId == 0) {
        final contact = _contacts.where((item) => item.id == recipientId).firstOrNull;
        final title = _titleController.text.trim().isNotEmpty
            ? _titleController.text.trim()
            : 'Chat with ${contact?.name ?? 'Student #$recipientId'}';

        final response = await _service.createThread(
          title: title,
          participantIds: [recipientId],
        );
        final createdThread = _ChatThread.fromMap(unwrapInstructorMap(response.data));
        threadId = createdThread.id;
        if (threadId == 0) {
          throw StateError('Failed to create chat thread.');
        }
      }

      await _loadThreads(page: _threadPage);
      final target = _threads.where((item) => item.id == threadId).firstOrNull;
      if (target != null) {
        await _openThread(target);
      }

      if (!mounted) return;
      setState(() {
        _titleController.clear();
        _ok = 'Chat is ready.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) {
        setState(() => _creatingThread = false);
      }
    }
  }

  Future<void> _sendMessage() async {
    final thread = _selectedThread;
    final body = _messageController.text.trim();
    if (thread == null || body.isEmpty || _sending) return;

    setState(() {
      _sending = true;
      _error = null;
      _ok = null;
    });

    try {
      await _service.sendMessage(threadId: thread.id, body: body);
      if (!mounted) return;

      setState(() {
        _messageController.clear();
        _messages = [
          ..._messages,
          _ChatMessage(
            id: DateTime.now().microsecondsSinceEpoch,
            author: 'You',
            authorId: _myId,
            body: body,
            createdAt: DateTime.now(),
          ),
        ];
      });

      await _loadMessages(thread.id, page: _messagePage);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  String _contactLabel(_ChatParticipant participant) {
    final contact = _contacts.where((item) => item.id == participant.userId).firstOrNull;
    if (contact != null) return contact.name;
    if (participant.userId == _myId) return 'You';
    return 'User #${participant.userId}';
  }

  String _messageAuthorLabel(_ChatMessage message) {
    if (message.authorId == _myId) return 'You';

    final contact = _contacts.where((item) => item.id == message.authorId).firstOrNull;
    if (contact != null && contact.name.trim().isNotEmpty) {
      return contact.name;
    }

    final participant = _participants.where((item) => item.userId == message.authorId).firstOrNull;
    if (participant != null) {
      return _contactLabel(participant);
    }

    final author = message.author.trim();
    if (author.isNotEmpty && author.toLowerCase() != 'user') {
      return author;
    }

    return message.authorId != 0 ? 'User #${message.authorId}' : 'User';
  }

  _ChatContact? get _selectedContact {
    final contactId = _selectedContactId;
    if (contactId == null) return null;
    return _contacts.where((item) => item.id == contactId).firstOrNull;
  }

  List<_ChatContact> get _filteredContacts {
    final query = _contactSearchController.text.trim().toLowerCase();
    if (query.isEmpty) return _contacts;
    return _contacts
        .where(
          (contact) =>
              contact.name.toLowerCase().contains(query) ||
              contact.email.toLowerCase().contains(query),
        )
        .toList(growable: false);
  }

  String _initialsFor(String value) {
    final parts = value
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList(growable: false);
    if (parts.isEmpty) return 'ST';
    if (parts.length == 1) {
      return parts.first.substring(0, math.min(2, parts.first.length)).toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  String _messageTime(DateTime? value) {
    if (value == null) return '';
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
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final suffix = local.hour >= 12 ? 'PM' : 'AM';
    final month = months[local.month - 1];
    final day = local.day.toString().padLeft(2, '0');
    return '$month $day, ${local.year} $hour:$minute $suffix';
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final horizontalPadding = screenWidth >= 1400
        ? 48.0
        : screenWidth >= 900
            ? 32.0
            : 16.0;
    final contentWidth = math.max(280.0, screenWidth - (horizontalPadding * 2));
    final stacked = screenWidth < 980;
    final sidebarWidth = stacked ? contentWidth : 340.0;
    final messageWidth = stacked
        ? contentWidth
        : (contentWidth - sidebarWidth - 16).clamp(320.0, 1200.0);

    return InstructorPageScaffold(
      title: instructorText('chat', _lang),
      subtitle: instructorText('chat_subtitle', _lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: InstructorErrorPanel(message: _error!, onRetry: _load),
            ),
          if (_ok != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: AfaqPanel(
                child: Text(
                  _ok!,
                  style: const TextStyle(
                    color: AfaqColors.emerald600,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            crossAxisAlignment: WrapCrossAlignment.start,
            children: [
              _buildSidebar(sidebarWidth),
              _buildMessagesPanel(messageWidth.toDouble(), stacked ? 560 : 760),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar(double width) {
    final selectedContact = _selectedContact;
    final filteredContacts = _filteredContacts;

    return SizedBox(
      width: width,
      child: Column(
        children: [
          AfaqPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFFE8FFF7),
                        Colors.white,
                        Color(0xFFF4F8FF),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(color: AfaqColors.slate200),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AfaqColors.emerald500.withValues(alpha: .12),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: const Icon(
                          Icons.chat_bubble_rounded,
                          color: AfaqColors.emerald600,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Start a conversation',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Pick a learner from your directory and open the chat instantly.',
                              style: TextStyle(
                                color: AfaqColors.slate500,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: _contactSearchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search students',
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: AfaqColors.slate100.withValues(alpha: .75),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(22),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                if (selectedContact != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: AfaqColors.emerald500,
                          child: Text(
                            _initialsFor(selectedContact.name),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                selectedContact.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                selectedContact.email.isNotEmpty
                                    ? selectedContact.email
                                    : 'Student contact',
                                style: const TextStyle(
                                  color: AfaqColors.slate500,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12),
                TextField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    hintText: 'Optional thread title',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide(color: AfaqColors.slate200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide(color: AfaqColors.slate200),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _selectedContactId == null || _creatingThread
                        ? null
                        : _createOrOpenDirectThread,
                    icon: _creatingThread
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.add_comment_rounded),
                    label: Text(
                      _creatingThread ? 'Opening...' : 'Open Chat',
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AfaqColors.emerald600,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AfaqPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Contacts',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const Spacer(),
                    if (_loadingThreads)
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (filteredContacts.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AfaqColors.slate100.withValues(alpha: .75),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Text(
                      'No students found.',
                      style: TextStyle(color: AfaqColors.slate500),
                    ),
                  )
                else
                  Column(
                    children: filteredContacts
                        .map(
                          (contact) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: InkWell(
                              onTap: () async {
                                setState(() => _selectedContactId = contact.id);
                                await _loadSelectedStudentDetails(contact.id);
                              },
                              borderRadius: BorderRadius.circular(20),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                width: double.infinity,
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: _selectedContactId == contact.id
                                      ? const Color(0xFFE8FFF7)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _selectedContactId == contact.id
                                        ? const Color(0xFFA7F3D0)
                                        : AfaqColors.slate200,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 20,
                                      backgroundColor: _selectedContactId == contact.id
                                          ? AfaqColors.emerald500
                                          : const Color(0xFFDCEAF8),
                                      child: Text(
                                        _initialsFor(contact.name),
                                        style: TextStyle(
                                          color: _selectedContactId == contact.id
                                              ? Colors.white
                                              : AfaqColors.slate700,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            contact.name,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 3),
                                          Text(
                                            contact.email.isNotEmpty
                                                ? contact.email
                                                : 'Student contact',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: AfaqColors.slate500,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AfaqPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Threads',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 12),
                if (_threads.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AfaqColors.slate100.withValues(alpha: .75),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Text(
                      'No threads yet.',
                      style: TextStyle(color: AfaqColors.slate500),
                    ),
                  )
                else
                  Column(
                    children: _threads
                        .map(
                          (thread) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: InkWell(
                              onTap: () => _openThread(thread),
                              borderRadius: BorderRadius.circular(20),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                width: double.infinity,
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: _selectedThread?.id == thread.id
                                      ? const Color(0xFFF0F9FF)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _selectedThread?.id == thread.id
                                        ? const Color(0xFF7DD3FC)
                                        : AfaqColors.slate200,
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFDCEAF8),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: const Icon(
                                        Icons.forum_rounded,
                                        color: AfaqColors.slate700,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            thread.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 15,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            'Thread #${thread.id}',
                                            style: const TextStyle(
                                              color: AfaqColors.slate500,
                                              fontSize: 12,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            thread.preview,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: AfaqColors.slate500,
                                              height: 1.35,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
                if (_threadTotalPages > 1) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      OutlinedButton(
                        onPressed: _threadPage > 1
                            ? () => _loadThreads(page: _threadPage - 1)
                            : null,
                        child: const Text('Prev'),
                      ),
                      Text('Page $_threadPage/$_threadTotalPages'),
                      OutlinedButton(
                        onPressed: _threadPage < _threadTotalPages
                            ? () => _loadThreads(page: _threadPage + 1)
                            : null,
                        child: const Text('Next'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessagesPanel(double width, double height) {
    final selectedContact = _selectedContact;

    return SizedBox(
      width: width,
      child: AfaqPanel(
        child: SizedBox(
          height: height,
          width: double.infinity,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: AfaqColors.slate200),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: AfaqColors.emerald500.withValues(alpha: .14),
                      child: Text(
                        _initialsFor(selectedContact?.name ?? (_selectedThread?.title ?? 'Chat')),
                        style: const TextStyle(
                          color: AfaqColors.emerald600,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            selectedContact?.name ?? _selectedThread?.title ?? 'Messages',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            selectedContact?.email.isNotEmpty == true
                                ? selectedContact!.email
                                : _selectedThread == null
                                    ? 'Choose a student to begin.'
                                    : 'Secure direct chat',
                            style: const TextStyle(
                              color: AfaqColors.slate500,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_participants.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: AfaqColors.slate200),
                        ),
                        child: Text(
                          '${_participants.length} members',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AfaqColors.slate600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (_participants.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _participants
                      .map(
                        (participant) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: AfaqColors.slate200),
                          ),
                          child: Text(
                            '${_contactLabel(participant)} - ${participant.role}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      )
                      .toList(growable: false),
                ),
              ],
              const SizedBox(height: 16),
              Expanded(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFFF7FBF9),
                        Color(0xFFFDFEFE),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: AfaqColors.slate200),
                  ),
                  child: _selectedThread == null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: AfaqColors.emerald500.withValues(alpha: .1),
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                child: const Icon(
                                  Icons.forum_rounded,
                                  size: 34,
                                  color: AfaqColors.emerald600,
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Choose a student to open the chat.',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'The contact list on the left works like a messaging app directory.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: AfaqColors.slate500,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        )
                      : _loadingMessages
                          ? const Center(child: CircularProgressIndicator())
                          : _messages.isEmpty
                              ? const Center(child: Text('No messages in this chat yet.'))
                              : ListView.separated(
                                  itemCount: _messages.length,
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                                  itemBuilder: (context, index) {
                                    final message = _messages[index];
                                    final mine = message.authorId == _myId;
                                    return Align(
                                      alignment: mine
                                          ? Alignment.centerRight
                                          : Alignment.centerLeft,
                                      child: Container(
                                        constraints: const BoxConstraints(maxWidth: 420),
                                        padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
                                        decoration: BoxDecoration(
                                          color: mine
                                              ? const Color(0xFFDCF8E8)
                                              : Colors.white,
                                          borderRadius: BorderRadius.only(
                                            topLeft: const Radius.circular(20),
                                            topRight: const Radius.circular(20),
                                            bottomLeft: Radius.circular(mine ? 20 : 6),
                                            bottomRight: Radius.circular(mine ? 6 : 20),
                                          ),
                                          border: Border.all(
                                            color: mine
                                                ? const Color(0xFFA7F3D0)
                                                : AfaqColors.slate200,
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: AfaqColors.slate900.withValues(alpha: .04),
                                              blurRadius: 14,
                                              offset: const Offset(0, 8),
                                            ),
                                          ],
                                        ),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              _messageAuthorLabel(message),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(message.body),
                                            const SizedBox(height: 6),
                                            Align(
                                              alignment: Alignment.centerRight,
                                              child: Text(
                                                _messageTime(message.createdAt),
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: AfaqColors.slate500,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                ),
              ),
              if (_selectedThread != null && _messageTotalPages > 1) ...[
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    OutlinedButton(
                      onPressed: _messagePage > 1
                          ? () => _loadMessages(
                                _selectedThread!.id,
                                page: _messagePage - 1,
                              )
                          : null,
                      child: const Text('Prev'),
                    ),
                    Text('Page $_messagePage/$_messageTotalPages'),
                    OutlinedButton(
                      onPressed: _messagePage < _messageTotalPages
                          ? () => _loadMessages(
                                _selectedThread!.id,
                                page: _messagePage + 1,
                              )
                          : null,
                      child: const Text('Next'),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(26),
                  border: Border.all(color: AfaqColors.slate200),
                  boxShadow: [
                    BoxShadow(
                      color: AfaqColors.slate900.withValues(alpha: .04),
                      blurRadius: 14,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        enabled: _selectedThread != null,
                        minLines: 1,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText: 'Type a message',
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: AfaqColors.emerald600,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                      onPressed: _selectedThread == null || _sending
                          ? null
                          : _sendMessage,
                      child: _sending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChatThread {
  const _ChatThread({
    required this.id,
    required this.title,
    required this.preview,
    required this.updatedAt,
    required this.isArchived,
  });

  final int id;
  final String title;
  final String preview;
  final String updatedAt;
  final bool isArchived;

  factory _ChatThread.fromMap(Map<String, dynamic> map) {
    return _ChatThread(
      id: instructorInt(map['id']),
      title: instructorString(map['title'], fallback: 'Untitled Thread'),
      preview: instructorString(
        map['last_message_body'] ?? map['body'],
        fallback: 'No messages yet.',
      ),
      updatedAt: instructorString(map['updated_at']),
      isArchived: instructorInt(map['is_archived']) == 1,
    );
  }
}

class _ChatContact {
  const _ChatContact({
    required this.id,
    required this.name,
    required this.email,
  });

  final int id;
  final String name;
  final String email;

  factory _ChatContact.fromMap(Map<String, dynamic> map) {
    final user = instructorMap(map['user']);
    final student = instructorMap(map['student']);
    final instructor = instructorMap(map['instructor']);
    final base = user ?? student ?? instructor ?? map;

    return _ChatContact(
      id: instructorInt(
        base['id'] ??
            base['user_id'] ??
            base['student_id'] ??
            base['instructor_id'] ??
            map['id'] ??
            map['user_id'] ??
            map['student_id'] ??
            map['instructor_id'],
      ),
      name: instructorString(
        base['name'] ??
            base['full_name'] ??
            base['username'] ??
            map['name'],
        fallback: 'Student',
      ),
      email: instructorString(base['email'] ?? map['email']),
    );
  }

  _ChatContact merge(_ChatContact other) {
    return _ChatContact(
      id: id,
      name: other.name.isNotEmpty && other.name != 'Student' ? other.name : name,
      email: other.email.isNotEmpty ? other.email : email,
    );
  }
}

class _ChatParticipant {
  const _ChatParticipant({
    required this.userId,
    required this.role,
  });

  final int userId;
  final String role;

  factory _ChatParticipant.fromMap(Map<String, dynamic> map) {
    return _ChatParticipant(
      userId: instructorInt(map['user_id']),
      role: instructorString(map['role'], fallback: 'member'),
    );
  }
}

class _ChatMessage {
  const _ChatMessage({
    required this.id,
    required this.author,
    required this.authorId,
    required this.body,
    required this.createdAt,
  });

  final int id;
  final String author;
  final int authorId;
  final String body;
  final DateTime? createdAt;

  int get sortStamp => createdAt?.millisecondsSinceEpoch ?? 0;

  factory _ChatMessage.fromMap(Map<String, dynamic> map) {
    final user = instructorMap(map['user']);
    final sender = instructorMap(map['sender']);
    final author = user ?? sender;

    return _ChatMessage(
      id: instructorInt(map['id']),
      author: instructorString(
        author?['name'] ?? author?['username'],
        fallback: 'User',
      ),
      authorId: instructorInt(map['author_id'] ?? map['sender_id'] ?? author?['id']),
      body: instructorString(map['body'], fallback: ''),
      createdAt: DateTime.tryParse(
        instructorString(map['updated_at'] ?? map['created_at']),
      ),
    );
  }
}
