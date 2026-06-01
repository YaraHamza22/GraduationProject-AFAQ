import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/session/session_store.dart';
import '../../../core/theme/afaq_colors.dart';
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
  final Map<int, _ChatContact> _contactById = {};
  final Map<int, List<_ChatParticipant>> _participantsByThreadId = {};
  final Map<int, List<_ChatMessage>> _messagesByThreadId = {};

  _ChatThread? _selectedThread;
  int? _selectedContactId;
  int _threadPage = 1;
  int _threadTotalPages = 1;
  int _messagePage = 1;
  int _messageTotalPages = 1;

  int get _myId => SessionStore.instance.userId ?? 0;
  String get _lang => localeNotifier.value.languageCode;

  bool _isGenericName(String value) {
    final normalized = value.trim().toLowerCase();
    return normalized.isEmpty ||
        normalized == 'user' ||
        normalized == 'instructor' ||
        normalized.startsWith('user #') ||
        normalized.startsWith('instructor #');
  }

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
      final response = await _service.getStudentInstructorContacts();
      final contacts = unwrapDataList(response.data)
          .map(_ChatContact.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);

      if (!mounted) return;

      if (contacts.isEmpty) {
      setState(() {
        _contacts = const [];
        _selectedContactId = null;
        _contactById.clear();
      });
      return;
    }

      final selectedId = _selectedContactId ?? contacts.first.id;
      setState(() {
        _contacts = contacts;
        _selectedContactId = selectedId;
        _contactById
          ..clear()
          ..addEntries(contacts.map((contact) => MapEntry(contact.id, contact)));
      });
      await _loadSelectedInstructorDetails(selectedId);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _contacts = const [];
        _selectedContactId = null;
        _contactById.clear();
      });
    }
  }

  Future<void> _loadSelectedInstructorDetails(int contactId) async {
    if (contactId == 0) return;

    final current = _contacts.where((item) => item.id == contactId).firstOrNull;
    final hasEnoughDetails =
        current != null && (current.email.isNotEmpty || !_isGenericName(current.name));
    if (hasEnoughDetails) return;

    try {
      final response = await _service.getStudentInstructorContact(contactId);
      final details = _ChatContact.fromMap(unwrapDataMap(response.data));
      if (!mounted || details.id == 0) return;

      setState(() {
        _contacts = _contacts
            .map((contact) => contact.id == contactId ? contact.merge(details) : contact)
            .toList(growable: false);
        _contactById[contactId] = (_contactById[contactId] ?? details).merge(details);
      });
    } catch (_) {
      // Keep list response if details endpoint is unavailable.
    }
  }

  Future<void> _loadThreads({int page = 1}) async {
    try {
      final response = await _service.getThreads(page: page, perPage: 15);
      final payload = unwrapDataMap(response.data);
      final threads = unwrapDataList(response.data)
          .map(_ChatThread.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false);
      final pagination = asMap(payload['pagination']);

      if (!mounted) return;
      setState(() {
        _threads = threads;
        _threadPage = readInt(pagination?['current_page'], fallback: 1);
        _threadTotalPages = readInt(pagination?['total_pages'], fallback: 1);
        _selectedThread = threads.isEmpty
            ? null
            : threads.any((thread) => thread.id == _selectedThread?.id)
                ? threads.firstWhere((thread) => thread.id == _selectedThread!.id)
                : threads.first;
        if (_selectedThread != null) {
          _participants = _participantsByThreadId[_selectedThread!.id] ?? const [];
          _messages = _messagesByThreadId[_selectedThread!.id] ?? const [];
        }
      });

      if (_selectedThread != null) {
        await Future.wait([
          _loadParticipants(_selectedThread!.id),
          _loadMessages(_selectedThread!.id),
        ]);
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
      final participants = unwrapDataList(response.data)
          .map(_ChatParticipant.fromMap)
          .where((item) => item.userId != 0)
          .toList(growable: false);
      setState(() {
        _participantsByThreadId[threadId] = participants;
        if (_selectedThread?.id == threadId) {
          _participants = participants;
          final peer = participants.where((item) => item.userId != _myId).firstOrNull;
          if (peer != null) {
            _selectedContactId = peer.userId;
          }
        }
        for (final participant in participants) {
          if (participant.contact != null) {
            _contactById[participant.userId] = participant.contact!;
          }
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        if (_selectedThread?.id == threadId) {
          _participants = const [];
        }
      });
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
      final payload = unwrapDataMap(response.data);
      final pagination = asMap(payload['pagination']);
      final messages = unwrapDataList(response.data)
          .map(_ChatMessage.fromMap)
          .where((item) => item.id != 0)
          .toList(growable: false)
        ..sort((a, b) => a.sortStamp.compareTo(b.sortStamp));

      if (!mounted) return;
      setState(() {
        _messagesByThreadId[threadId] = messages;
        _messages = messages;
        _messagePage = readInt(pagination?['current_page'], fallback: 1);
        _messageTotalPages = readInt(pagination?['total_pages'], fallback: 1);
        _selectedThread = _threads.where((item) => item.id == threadId).firstOrNull ?? _selectedThread;
        for (final message in messages) {
          if (message.contact != null) {
            _contactById[message.authorId] = message.contact!;
          }
        }
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
      final cachedParticipants = _participantsByThreadId[thread.id];
      if (cachedParticipants != null && !cachedParticipants.any((item) => item.userId == userId)) {
        continue;
      }

      try {
        final rows = cachedParticipants ??
            unwrapDataList((await _service.getParticipants(thread.id)).data)
                .map(_ChatParticipant.fromMap)
                .toList(growable: false);
        _participantsByThreadId[thread.id] = rows;
        if (!rows.any((item) => item.userId == userId)) {
          continue;
        }

        final messages = _messagesByThreadId[thread.id] ??
            (unwrapDataList(
              (await _service.getMessages(
                threadId: thread.id,
                page: 1,
                perPage: 1,
              ))
                  .data,
            ).map(_ChatMessage.fromMap).where((item) => item.id != 0).toList(growable: false));
        _messagesByThreadId[thread.id] = messages;

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
      _participants = _participantsByThreadId[thread.id] ?? const [];
      _messages = _messagesByThreadId[thread.id] ?? const [];
    });
    await Future.wait([
      _loadParticipants(thread.id),
      _loadMessages(thread.id),
    ]);
    final peer = _peerParticipant;
    if (peer != null) {
      await _loadSelectedInstructorDetails(peer.userId);
    }
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
            : 'Chat with ${contact?.name ?? 'Instructor #$recipientId'}';

        final response = await _service.createThread(
          title: title,
          participantIds: [recipientId],
        );
        final createdThread = _ChatThread.fromMap(unwrapDataMap(response.data));
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

  _ChatContact? _contactForUserId(int userId) => _contactById[userId];

  Map<int, _ChatParticipant> get _participantByUserId => {
        for (final participant in _participants) participant.userId: participant,
      };

  String _displayNameForUserId(
    int userId, {
    String? fallbackName,
  }) {
    if (userId == _myId) return 'You';

    final contact = _contactForUserId(userId);
    if (contact != null && !_isGenericName(contact.name)) {
      return contact.name;
    }

    final participant = _participantByUserId[userId];
    if (participant?.displayName case final name? when !_isGenericName(name)) {
      return name;
    }

    if (fallbackName != null && !_isGenericName(fallbackName)) {
      return fallbackName.trim();
    }

    return 'User #$userId';
  }

  String _contactLabel(_ChatParticipant participant) {
    return _displayNameForUserId(
      participant.userId,
      fallbackName: participant.displayName,
    );
  }

  _ChatParticipant? get _peerParticipant {
    if (_selectedThread == null) return null;
    for (final participant in _participants) {
      if (participant.userId != _myId) {
        return participant;
      }
    }
    return null;
  }

  int? get _activePeerUserId => _peerParticipant?.userId;

  _ChatContact? get _activePeerContact {
    final userId = _activePeerUserId;
    if (userId == null) return null;
    return _contactForUserId(userId) ?? _peerParticipant?.contact;
  }

  String get _activeChatTitle {
    final contact = _activePeerContact;
    if (contact != null && !_isGenericName(contact.name)) {
      return contact.name;
    }

    final peer = _peerParticipant;
    if (peer?.displayName case final name? when !_isGenericName(name)) {
      return name;
    }

    final userId = _activePeerUserId;
    if (userId != null) {
      return 'User #$userId';
    }

    return 'Messages';
  }

  String get _activeChatSubtitle {
    final contact = _activePeerContact;
    if (contact != null && contact.email.isNotEmpty) {
      return contact.email;
    }

    return _selectedThread == null
        ? 'Choose an instructor to begin.'
        : 'Secure direct chat';
  }

  _ChatContact? get _selectedContact {
    final contactId = _selectedContactId;
    if (contactId == null) return null;
    return _contactById[contactId];
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
    if (parts.isEmpty) return 'IN';
    if (parts.length == 1) return parts.first.substring(0, math.min(2, parts.first.length)).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  String _messageTime(DateTime? value) {
    if (value == null) return '';
    final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
    final minute = value.minute.toString().padLeft(2, '0');
    final suffix = value.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $suffix';
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

    return StudentPageScaffold(
      title: studentText('chat', _lang),
      subtitle: studentText('chat_subtitle', _lang),
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: StudentErrorPanel(message: _error!, onRetry: _load),
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
              _buildMessagesPanel(messageWidth, stacked ? 560 : 760),
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
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFFE8FFF7),
                        Colors.white,
                        const Color(0xFFF4F8FF),
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
                              'Pick an instructor from your directory and open the chat instantly.',
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
                    hintText: 'Search instructors',
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
                                    : 'Instructor contact',
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
                    labelText: 'Optional chat title',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _contacts.isEmpty || _creatingThread
                        ? null
                        : _createOrOpenDirectThread,
                    icon: _creatingThread
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.add_comment_outlined),
                    label: const Text('Open chat'),
                  ),
                ),
                const SizedBox(height: 16),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 340),
                  child: filteredContacts.isEmpty
                      ? Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 22,
                          ),
                          decoration: BoxDecoration(
                            color: AfaqColors.slate100.withValues(alpha: .85),
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: const Text(
                            'No instructors found yet.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AfaqColors.slate500),
                          ),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          itemCount: filteredContacts.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final contact = filteredContacts[index];
                            final active = contact.id == _selectedContactId;
                            return InkWell(
                              onTap: () async {
                                setState(() => _selectedContactId = contact.id);
                                await _loadSelectedInstructorDetails(contact.id);
                              },
                              borderRadius: BorderRadius.circular(22),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: active
                                      ? const Color(0xFFE8FFF7)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(22),
                                  border: Border.all(
                                    color: active
                                        ? const Color(0xFF6EE7B7)
                                        : AfaqColors.slate200,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AfaqColors.slate900.withValues(alpha: .04),
                                      blurRadius: 18,
                                      offset: const Offset(0, 10),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 21,
                                      backgroundColor: active
                                          ? AfaqColors.emerald500
                                          : AfaqColors.primary.withValues(alpha: .14),
                                      child: Text(
                                        _initialsFor(contact.name),
                                        style: TextStyle(
                                          color: active ? Colors.white : AfaqColors.primary,
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
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            contact.email.isNotEmpty
                                                ? contact.email
                                                : 'Tap to chat with this instructor',
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
                                    if (active)
                                      const Icon(
                                        Icons.check_circle_rounded,
                                        color: AfaqColors.emerald600,
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
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
                    Expanded(
                      child: Text(
                        'Threads',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _loadingThreads ? null : _load,
                      icon: const Icon(Icons.refresh_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_loadingThreads)
                  const Center(child: CircularProgressIndicator())
                else if (_threads.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Text('No chat threads yet.'),
                  )
                else
                  ListView.separated(
                    itemCount: _threads.length,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final thread = _threads[index];
                      final active = _selectedThread?.id == thread.id;
                      return InkWell(
                        onTap: () => _openThread(thread),
                        borderRadius: BorderRadius.circular(22),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: active
                                ? const Color(0xFFF0F9FF)
                                : AfaqColors.slate100.withValues(alpha: .55),
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(
                              color: active
                                  ? AfaqColors.sky400.withValues(alpha: .6)
                                  : AfaqColors.slate200,
                            ),
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
                      );
                    },
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
                        _initialsFor(_activeChatTitle),
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
                            _activeChatTitle,
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _activeChatSubtitle,
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
                              'Choose an instructor to open the chat.',
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
                                            _displayNameForUserId(
                                              message.authorId,
                                              fallbackName: message.author,
                                            ),
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
      id: readInt(map['id']),
      title: readString(map['title'], fallback: 'Untitled Thread'),
      preview: readString(
        map['last_message_body'] ?? map['body'],
        fallback: 'No messages yet.',
      ),
      updatedAt: readString(map['updated_at']),
      isArchived: readInt(map['is_archived']) == 1,
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
    final user = asMap(map['user']);
    final student = asMap(map['student']);
    final instructor = asMap(map['instructor']);
    final base = user ?? student ?? instructor ?? map;

    return _ChatContact(
      id: readInt(
        base['id'] ??
            base['user_id'] ??
            base['student_id'] ??
            base['instructor_id'] ??
            map['id'] ??
            map['user_id'] ??
            map['student_id'] ??
            map['instructor_id'],
      ),
      name: readString(
        base['name'] ??
            base['full_name'] ??
            base['username'] ??
            map['name'],
        fallback: 'Instructor',
      ),
      email: readString(base['email'] ?? map['email']),
    );
  }

  _ChatContact merge(_ChatContact other) {
    return _ChatContact(
      id: id,
      name: other.name.isNotEmpty && other.name != 'Instructor' ? other.name : name,
      email: other.email.isNotEmpty ? other.email : email,
    );
  }
}

class _ChatParticipant {
  const _ChatParticipant({
    required this.userId,
    required this.role,
    this.displayName,
    this.contact,
  });

  final int userId;
  final String role;
  final String? displayName;
  final _ChatContact? contact;

  factory _ChatParticipant.fromMap(Map<String, dynamic> map) {
    final user = asMap(map['user']);
    final participantUser = user ?? map;
    final contact = _ChatContact.fromMap(map);
    return _ChatParticipant(
      userId: readInt(map['user_id'] ?? participantUser['id']),
      role: readString(map['role'], fallback: 'member'),
      displayName: readString(
        participantUser['name'] ??
            participantUser['full_name'] ??
            participantUser['username'],
      ),
      contact: contact.id == 0 ? null : contact,
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
    this.contact,
  });

  final int id;
  final String author;
  final int authorId;
  final String body;
  final DateTime? createdAt;
  final _ChatContact? contact;

  int get sortStamp => createdAt?.millisecondsSinceEpoch ?? 0;

  factory _ChatMessage.fromMap(Map<String, dynamic> map) {
    final user = asMap(map['user']);
    final sender = asMap(map['sender']);
    final author = user ?? sender;
    final contact = author == null ? null : _ChatContact.fromMap({'user': author});

    return _ChatMessage(
      id: readInt(map['id']),
      author: readString(
        author?['name'] ?? author?['username'],
        fallback: 'User',
      ),
      authorId: readInt(map['author_id'] ?? map['sender_id'] ?? author?['id']),
      body: readString(map['body'], fallback: ''),
      createdAt: DateTime.tryParse(
        readString(map['updated_at'] ?? map['created_at']),
      ),
      contact: contact != null && contact.id != 0 ? contact : null,
    );
  }
}
