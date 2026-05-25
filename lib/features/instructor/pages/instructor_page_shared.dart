import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';

String instructorText(String key, String lang) {
  const translations = {
    'en': {
      'dashboard': 'Instructor Dashboard',
      'dashboard_subtitle': 'Teaching analytics and course activity from API.',
      'courses': 'My Courses',
      'courses_subtitle': 'Manage course structure, units, and lessons.',
      'quizzes': 'Quizzes',
      'quizzes_subtitle': 'Create quizzes, questions, and review attempts.',
      'forum': 'Instructor Forum',
      'forum_subtitle': 'Discussion threads linked to your courses.',
      'chat': 'Instructor Chat',
      'chat_subtitle': 'Talk with learners from one workspace.',
      'meet': 'Virtual Meet',
      'meet_subtitle': 'Integrations and live session scheduling.',
      'profile': 'Profile',
      'profile_subtitle': 'Instructor details from the profile API.',
      'refresh': 'Refresh',
      'empty': 'No data found.',
      'retry': 'Retry',
      'units': 'Units',
      'lessons': 'Lessons',
      'create': 'Create',
      'save': 'Save',
      'delete': 'Delete',
      'send': 'Send',
    },
    'ar': {
      'dashboard': 'لوحة المدرس',
      'dashboard_subtitle': 'تحليلات التدريس ونشاط المقررات من الواجهة البرمجية.',
      'courses': 'دوراتي',
      'courses_subtitle': 'إدارة بنية الدورة والوحدات والدروس.',
      'quizzes': 'الاختبارات',
      'quizzes_subtitle': 'إنشاء الاختبارات والأسئلة ومراجعة المحاولات.',
      'forum': 'منتدى المدرس',
      'forum_subtitle': 'مواضيع نقاش مرتبطة بدوراتك.',
      'chat': 'محادثات المدرس',
      'chat_subtitle': 'تواصل مع الطلاب من مساحة واحدة.',
      'meet': 'الاجتماعات',
      'meet_subtitle': 'التكاملات وجدولة الجلسات المباشرة.',
      'profile': 'الملف الشخصي',
      'profile_subtitle': 'بيانات المدرس من واجهة الملف الشخصي.',
      'refresh': 'تحديث',
      'empty': 'لا توجد بيانات.',
      'retry': 'إعادة المحاولة',
      'units': 'الوحدات',
      'lessons': 'الدروس',
      'create': 'إنشاء',
      'save': 'حفظ',
      'delete': 'حذف',
      'send': 'إرسال',
    },
  };

  return translations[lang]?[key] ?? translations['en']![key] ?? key;
}

Map<String, dynamic>? instructorMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return null;
}

List<Map<String, dynamic>> instructorList(dynamic value) {
  if (value is! List) return const [];
  return value.map(instructorMap).whereType<Map<String, dynamic>>().toList(growable: false);
}

Map<String, dynamic> unwrapInstructorMap(dynamic payload) {
  var current = payload;
  for (var i = 0; i < 5; i++) {
    final map = instructorMap(current);
    if (map == null) return <String, dynamic>{};
    final data = map['data'];
    if (data == null) return map;
    if (data is Map || data is List) {
      current = data;
      continue;
    }
    return map;
  }
  return instructorMap(current) ?? <String, dynamic>{};
}

List<Map<String, dynamic>> unwrapInstructorList(dynamic payload) {
  var current = payload;
  for (var i = 0; i < 5; i++) {
    if (current is List) return instructorList(current);
    final map = instructorMap(current);
    if (map == null) return const [];
    current = map['data'];
    if (current == null) return const [];
  }
  return current is List ? instructorList(current) : const [];
}

String instructorString(dynamic value, {String fallback = ''}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  if (value is num) return value.toString();
  return fallback;
}

int instructorInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

double instructorDouble(dynamic value, {double fallback = 0}) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

String instructorLocalized(dynamic value, String lang, {String fallback = ''}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  final map = instructorMap(value);
  if (map == null) return fallback;
  final current = instructorString(map[lang]);
  if (current.isNotEmpty) return current;
  final other = instructorString(map[lang == 'ar' ? 'en' : 'ar']);
  if (other.isNotEmpty) return other;
  return fallback;
}

class InstructorPageScaffold extends StatelessWidget {
  const InstructorPageScaffold({
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
            alignment: WrapAlignment.spaceBetween,
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

class InstructorErrorPanel extends StatelessWidget {
  const InstructorErrorPanel({
    super.key,
    required this.message,
    this.onRetry,
  });

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
              fontWeight: FontWeight.w800,
              color: AfaqColors.accent,
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

class InstructorEmptyPanel extends StatelessWidget {
  const InstructorEmptyPanel({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
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
