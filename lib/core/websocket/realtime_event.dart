class RealtimeEvent {
  const RealtimeEvent({
    required this.type,
    required this.payload,
    this.channel,
  });

  final String type;
  final String? channel;
  final Map<String, dynamic> payload;

  factory RealtimeEvent.fromJson(Map<String, dynamic> json) {
    return RealtimeEvent(
      type: (json['type'] ?? json['event'] ?? 'message').toString(),
      channel: json['channel']?.toString(),
      payload: json['payload'] is Map<String, dynamic>
          ? json['payload'] as Map<String, dynamic>
          : json,
    );
  }
}
