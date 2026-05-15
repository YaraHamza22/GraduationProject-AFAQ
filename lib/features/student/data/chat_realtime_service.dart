import 'dart:async';

import '../../../core/websocket/realtime_client.dart';
import '../../../core/websocket/realtime_event.dart';

class ChatRealtimeService {
  ChatRealtimeService({RealtimeClient? realtimeClient})
      : _realtimeClient = realtimeClient ?? RealtimeClient.instance;

  final RealtimeClient _realtimeClient;

  Stream<RealtimeConnectionStatus> get statusChanges {
    return _realtimeClient.statusChanges;
  }

  RealtimeConnectionStatus get status => _realtimeClient.status;

  Future<void> connect() => _realtimeClient.connect();

  Future<void> disconnect() => _realtimeClient.disconnect();

  Stream<RealtimeEvent> watchThread(int threadId) {
    final channel = _threadChannel(threadId);
    _realtimeClient.subscribe(channel);

    return _realtimeClient.events.where((event) {
      final eventThreadId = event.payload['thread_id'] ?? event.payload['threadId'];
      return event.channel == channel ||
          eventThreadId?.toString() == threadId.toString();
    });
  }

  void stopWatchingThread(int threadId) {
    _realtimeClient.unsubscribe(_threadChannel(threadId));
  }

  void sendTyping({
    required int threadId,
    required bool isTyping,
  }) {
    _realtimeClient.send(
      type: 'typing',
      channel: _threadChannel(threadId),
      payload: {
        'thread_id': threadId,
        'is_typing': isTyping,
      },
    );
  }

  void sendReadReceipt({
    required int threadId,
    required int messageId,
  }) {
    _realtimeClient.send(
      type: 'message.read',
      channel: _threadChannel(threadId),
      payload: {
        'thread_id': threadId,
        'message_id': messageId,
      },
    );
  }

  String _threadChannel(int threadId) => 'chat.thread.$threadId';
}
