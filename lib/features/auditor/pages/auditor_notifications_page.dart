import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/toast/afaq_toast.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/auditor_notification_service.dart';
import 'auditor_page_shared.dart';

class AuditorNotificationsPage extends StatefulWidget {
  const AuditorNotificationsPage({super.key});

  @override
  State<AuditorNotificationsPage> createState() => _AuditorNotificationsPageState();
}

class _AuditorNotificationsPageState extends State<AuditorNotificationsPage> {
  final _service = const AuditorNotificationService();

  bool _loading = true;
  bool _markingAllRead = false;
  String? _error;
  List<_AuditorNotification> _notifications = const [];

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
      final response = await _service.getNotifications(unreadOnly: true);
      if (!mounted) return;
      setState(() {
        _notifications = unwrapAuditorList(response.data)
            .map(_AuditorNotification.fromMap)
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

  Future<void> _markAllRead() async {
    setState(() => _markingAllRead = true);
    try {
      await _service.markAllRead();
      await _load();
      if (!mounted) return;
      AfaqToast.show(context, message: 'Notifications marked as read.', type: AfaqToastType.success);
    } catch (error) {
      if (!mounted) return;
      AfaqToast.show(context, message: error.toString(), type: AfaqToastType.error);
    } finally {
      if (mounted) setState(() => _markingAllRead = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuditorPageScaffold(
      title: 'Notification Inbox',
      subtitle: 'Unread auditor notifications from the same notification API.',
      onRefresh: _load,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FilledButton.icon(
            onPressed: _markingAllRead ? null : _markAllRead,
            icon: _markingAllRead
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.done_all),
            label: const Text('Mark All Read'),
          ),
          const SizedBox(height: 20),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            AuditorErrorPanel(message: _error!, onRetry: _load)
          else if (_notifications.isEmpty)
            const AuditorEmptyPanel(message: 'No unread notifications.', icon: Icons.notifications_none)
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: MediaQuery.sizeOf(context).width >= 1200
                    ? 3
                    : MediaQuery.sizeOf(context).width >= 700
                        ? 2
                        : 1,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 1.45,
              ),
              itemCount: _notifications.length,
              itemBuilder: (context, index) {
                final notification = _notifications[index];
                return AfaqPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.notifications_none, color: AfaqColors.amber500),
                          const Spacer(),
                          AuditorStatusChip(
                            label: notification.readAt.isEmpty ? 'Unread' : 'Read',
                            tone: notification.readAt.isEmpty
                                ? AuditorStatusTone.warn
                                : AuditorStatusTone.neutral,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        notification.title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      Text(notification.body, style: const TextStyle(color: AfaqColors.slate500)),
                      const Spacer(),
                      Text(
                        notification.createdAt,
                        style: const TextStyle(
                          color: AfaqColors.slate400,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
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

class _AuditorNotification {
  const _AuditorNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.readAt,
  });

  final int id;
  final String title;
  final String body;
  final String createdAt;
  final String readAt;

  factory _AuditorNotification.fromMap(Map<String, dynamic> map) {
    final data = auditorMap(map['data']) ?? <String, dynamic>{};
    return _AuditorNotification(
      id: auditorInt(map['id']),
      title: auditorString(data['title'] ?? data['type'], fallback: 'Notification'),
      body: auditorString(data['body'], fallback: 'No body content.'),
      createdAt: auditorString(map['created_at'], fallback: 'Now'),
      readAt: auditorString(map['read_at']),
    );
  }
}
