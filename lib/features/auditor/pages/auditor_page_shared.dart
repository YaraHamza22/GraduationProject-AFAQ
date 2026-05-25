import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';

Map<String, dynamic>? auditorMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return null;
}

List<Map<String, dynamic>> auditorList(dynamic value) {
  if (value is! List) return const [];
  return value.map(auditorMap).whereType<Map<String, dynamic>>().toList(growable: false);
}

Map<String, dynamic> unwrapAuditorMap(dynamic payload) {
  var current = payload;
  for (var i = 0; i < 5; i++) {
    final map = auditorMap(current);
    if (map == null) return <String, dynamic>{};
    final data = map['data'];
    if (data == null) return map;
    if (data is Map || data is List) {
      current = data;
      continue;
    }
    return map;
  }
  return auditorMap(current) ?? <String, dynamic>{};
}

List<Map<String, dynamic>> unwrapAuditorList(dynamic payload) {
  var current = payload;
  for (var i = 0; i < 5; i++) {
    if (current is List) return auditorList(current);
    final map = auditorMap(current);
    if (map == null) return const [];
    current = map['data'];
    if (current == null) return const [];
  }
  return current is List ? auditorList(current) : const [];
}

String auditorString(dynamic value, {String fallback = ''}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  if (value is num) return value.toString();
  return fallback;
}

int auditorInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

bool auditorBool(dynamic value, {bool fallback = false}) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final normalized = value.trim().toLowerCase();
    if (normalized == 'true' || normalized == '1') return true;
    if (normalized == 'false' || normalized == '0') return false;
  }
  return fallback;
}

String auditorTextOf(dynamic value, {String fallback = ''}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  final map = auditorMap(value);
  if (map == null) return fallback;
  for (final key in const ['en', 'ar']) {
    final text = auditorString(map[key]);
    if (text.isNotEmpty) return text;
  }
  return fallback;
}

String auditorStatus(dynamic value) {
  final raw = auditorString(value, fallback: 'unknown');
  if (raw.isEmpty) return 'Unknown';
  return raw
      .split('_')
      .map((part) => part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

class AuditorPageScaffold extends StatelessWidget {
  const AuditorPageScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.onRefresh,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(
        horizontal: width >= 1400 ? 48 : width >= 900 ? 32 : 16,
        vertical: 24,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 16,
            runSpacing: 16,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AfaqColors.slate500,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              if (onRefresh != null)
                FilledButton.icon(
                  onPressed: () => onRefresh?.call(),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Refresh'),
                ),
            ],
          ),
          const SizedBox(height: 24),
          child,
        ],
      ),
    );
  }
}

class AuditorErrorPanel extends StatelessWidget {
  const AuditorErrorPanel({super.key, required this.message, this.onRetry});

  final String message;
  final Future<void> Function()? onRetry;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AfaqColors.accent,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => onRetry?.call(),
              child: const Text('Retry'),
            ),
          ],
        ],
      ),
    );
  }
}

class AuditorEmptyPanel extends StatelessWidget {
  const AuditorEmptyPanel({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 36, color: AfaqColors.slate400),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AfaqColors.slate500,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AuditorStatusChip extends StatelessWidget {
  const AuditorStatusChip({
    super.key,
    required this.label,
    this.tone = AuditorStatusTone.neutral,
  });

  final String label;
  final AuditorStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (tone) {
      AuditorStatusTone.good => (const Color(0xFFE9FBF1), const Color(0xFF047857)),
      AuditorStatusTone.warn => (const Color(0xFFFFF4DB), const Color(0xFFB45309)),
      AuditorStatusTone.hot => (const Color(0xFFFBE8FF), const Color(0xFFA21CAF)),
      AuditorStatusTone.neutral => (AfaqColors.slate100, AfaqColors.slate600),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

enum AuditorStatusTone { neutral, good, warn, hot }
