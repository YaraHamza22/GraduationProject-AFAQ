import 'dart:async';
import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../session/session_store.dart';
import 'realtime_event.dart';

enum RealtimeConnectionStatus {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

class RealtimeClient {
  RealtimeClient({SessionStore? sessionStore})
      : _sessionStore = sessionStore ?? SessionStore.instance;

  static final instance = RealtimeClient();

  final SessionStore _sessionStore;
  final _eventsController = StreamController<RealtimeEvent>.broadcast();
  final _statusController = StreamController<RealtimeConnectionStatus>.broadcast();
  final Set<String> _channels = {};

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  RealtimeConnectionStatus _status = RealtimeConnectionStatus.disconnected;

  Stream<RealtimeEvent> get events => _eventsController.stream;
  Stream<RealtimeConnectionStatus> get statusChanges => _statusController.stream;
  RealtimeConnectionStatus get status => _status;
  bool get isConnected => _status == RealtimeConnectionStatus.connected;

  Future<void> connect() async {
    if (_status == RealtimeConnectionStatus.connected ||
        _status == RealtimeConnectionStatus.connecting) {
      return;
    }

    _setStatus(
      _reconnectAttempts == 0
          ? RealtimeConnectionStatus.connecting
          : RealtimeConnectionStatus.reconnecting,
    );

    final url = _buildSocketUri();
    final headers = <String, dynamic>{
      if (_sessionStore.token != null && _sessionStore.token!.isNotEmpty)
        'Authorization': 'Bearer ${_sessionStore.token}',
      'Accept': 'application/json',
    };

    try {
      _channel = WebSocketChannel.connect(url, protocols: null);
      _subscription = _channel!.stream.listen(
        _handleMessage,
        onError: (_) => _scheduleReconnect(),
        onDone: _scheduleReconnect,
        cancelOnError: true,
      );

      _setStatus(RealtimeConnectionStatus.connected);
      _reconnectAttempts = 0;
      _sendRaw({
        'type': 'auth',
        'headers': headers,
        if (_sessionStore.token != null) 'token': _sessionStore.token,
      });
      for (final channel in _channels) {
        _sendRaw({'type': 'subscribe', 'channel': channel});
      }
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void subscribe(String channel) {
    _channels.add(channel);
    if (isConnected) {
      _sendRaw({'type': 'subscribe', 'channel': channel});
    } else {
      connect();
    }
  }

  void unsubscribe(String channel) {
    _channels.remove(channel);
    if (isConnected) {
      _sendRaw({'type': 'unsubscribe', 'channel': channel});
    }
  }

  void send({
    required String type,
    required Map<String, dynamic> payload,
    String? channel,
  }) {
    _sendRaw({
      'type': type,
      if (channel != null) 'channel': channel,
      'payload': payload,
    });
  }

  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    await _subscription?.cancel();
    await _channel?.sink.close();
    _subscription = null;
    _channel = null;
    _reconnectAttempts = 0;
    _setStatus(RealtimeConnectionStatus.disconnected);
  }

  Uri _buildSocketUri() {
    final rawUrl = dotenv.env['FLUTTER_PUBLIC_WS_URL'] ??
        'ws://127.0.0.1:8000/api/v1/ws';
    final uri = Uri.parse(rawUrl);
    final token = _sessionStore.token;

    if (token == null || token.isEmpty) return uri;

    return uri.replace(
      queryParameters: {
        ...uri.queryParameters,
        'token': token,
        if (_sessionStore.userId != null) 'user_id': _sessionStore.userId.toString(),
      },
    );
  }

  void _handleMessage(dynamic message) {
    try {
      final decoded = jsonDecode(message.toString());
      if (decoded is Map<String, dynamic>) {
        _eventsController.add(RealtimeEvent.fromJson(decoded));
      }
    } catch (_) {
      _eventsController.add(
        RealtimeEvent(
          type: 'raw',
          payload: {'body': message.toString()},
        ),
      );
    }
  }

  void _sendRaw(Map<String, dynamic> data) {
    if (!isConnected) return;
    _channel?.sink.add(jsonEncode(data));
  }

  void _scheduleReconnect() {
    if (_status == RealtimeConnectionStatus.disconnected) return;

    _subscription?.cancel();
    _subscription = null;
    _channel = null;
    _setStatus(RealtimeConnectionStatus.reconnecting);
    _reconnectAttempts++;

    final delaySeconds = _reconnectAttempts.clamp(1, 8);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: delaySeconds), connect);
  }

  void _setStatus(RealtimeConnectionStatus nextStatus) {
    _status = nextStatus;
    _statusController.add(nextStatus);
  }
}
