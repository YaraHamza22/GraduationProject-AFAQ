import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';

String studentText(String key, String lang) {
  const values = {
    'en': {
      'dashboard': 'My Dashboard',
      'dashboard_subtitle': 'Your learning dashboard, live from API.',
      'refresh': 'Refresh',
      'retry': 'Retry',
      'loading': 'Loading...',
      'error': 'Something went wrong.',
      'courses': 'My Learning',
      'courses_subtitle': 'Track enrolled courses and discover new ones.',
      'discover': 'Discover',
      'my_learning': 'My Learning',
      'join_course': 'Join Course',
      'joined': 'Joined',
      'progress': 'Progress',
      'progress_details': 'Progress Details',
      'quizzes': 'My Quizzes',
      'quizzes_subtitle': 'Available quizzes from your courses.',
      'start_quiz': 'Start Quiz',
      'view_grade': 'View Grade',
      'forum': 'Student Forum',
      'forum_subtitle': 'Open discussions with course context.',
      'chat': 'Chatting',
      'chat_subtitle': 'Threads and live messages with instructors.',
      'certificates': 'My Certificates',
      'certificates_subtitle': 'Check course certificate eligibility.',
      'profile': 'Profile',
      'profile_subtitle': 'Your student details from the profile API.',
      'empty': 'No data found.',
      'create_thread': 'Create Thread',
      'send': 'Send',
      'check': 'Check',
      'available': 'Available',
      'unavailable': 'Unavailable',
      'recent_courses': 'Recent Courses',
      'progress_by_course': 'Progress By Course',
      'total_courses': 'Total Courses',
      'average_progress': 'Average Progress',
      'active_courses': 'Active Courses',
      'completed_courses': 'Completed Courses',
    },
    'ar': {
      'dashboard': 'لوحة التحكم',
      'dashboard_subtitle': 'لوحة تعلمك مرتبطة مباشرة بالواجهة البرمجية.',
      'refresh': 'تحديث',
      'retry': 'إعادة المحاولة',
      'loading': 'جار التحميل...',
      'error': 'حدث خطأ ما.',
      'courses': 'تعليمي',
      'courses_subtitle': 'تابع الدورات المسجلة واكتشف دورات جديدة.',
      'discover': 'اكتشف',
      'my_learning': 'تعليمي',
      'join_course': 'انضم للدورة',
      'joined': 'تم الانضمام',
      'progress': 'التقدم',
      'progress_details': 'تفاصيل التقدم',
      'quizzes': 'اختباراتي',
      'quizzes_subtitle': 'الاختبارات المتاحة من دوراتك.',
      'start_quiz': 'ابدأ الاختبار',
      'view_grade': 'عرض النتيجة',
      'forum': 'المنتدى',
      'forum_subtitle': 'نقاشات الطلاب مرتبطة بالمقررات.',
      'chat': 'المحادثات',
      'chat_subtitle': 'المحادثات والرسائل مع المدرسين.',
      'certificates': 'شهاداتي',
      'certificates_subtitle': 'تحقق من أهلية شهادة كل دورة.',
      'profile': 'الملف الشخصي',
      'profile_subtitle': 'بيانات الطالب من واجهة الملف الشخصي.',
      'empty': 'لا توجد بيانات.',
      'create_thread': 'إنشاء موضوع',
      'send': 'إرسال',
      'check': 'تحقق',
      'available': 'متاح',
      'unavailable': 'غير متاح',
      'recent_courses': 'الدورات الأخيرة',
      'progress_by_course': 'التقدم حسب الدورة',
      'total_courses': 'إجمالي الدورات',
      'average_progress': 'متوسط التقدم',
      'active_courses': 'الدورات النشطة',
      'completed_courses': 'الدورات المكتملة',
    },
  };

  return values[lang]?[key] ?? values['en']![key] ?? key;
}

Map<String, dynamic>? asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map(
      (key, item) => MapEntry(key.toString(), item),
    );
  }
  return null;
}

List<Map<String, dynamic>> asListOfMaps(dynamic value) {
  if (value is! List) return const [];
  return value
      .map(asMap)
      .whereType<Map<String, dynamic>>()
      .toList(growable: false);
}

Map<String, dynamic> unwrapDataMap(dynamic payload) {
  var current = payload;
  for (var i = 0; i < 5; i++) {
    final map = asMap(current);
    if (map == null) return <String, dynamic>{};
    final next = map['data'];
    if (next == null) return map;
    if (next is Map || next is List) {
      current = next;
      continue;
    }
    return map;
  }
  return asMap(current) ?? <String, dynamic>{};
}

List<Map<String, dynamic>> unwrapDataList(dynamic payload) {
  var current = payload;
  for (var i = 0; i < 5; i++) {
    if (current is List) return asListOfMaps(current);
    final map = asMap(current);
    if (map == null) return const [];
    final next = map['data'];
    if (next == null) return const [];
    current = next;
  }
  return current is List ? asListOfMaps(current) : const [];
}

String readString(dynamic value, {String fallback = ''}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  if (value is num) return value.toString();
  return fallback;
}

int readInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? fallback;
  return fallback;
}

double readDouble(dynamic value, {double fallback = 0}) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? fallback;
  return fallback;
}

String localizedValue(
  dynamic value,
  String lang, {
  String fallback = '',
}) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  final map = asMap(value);
  if (map == null) return fallback;
  final primary = readString(map[lang]);
  if (primary.isNotEmpty) return primary;
  final secondary = readString(map[lang == 'ar' ? 'en' : 'ar']);
  if (secondary.isNotEmpty) return secondary;
  return fallback;
}

Color badgeColor(String status) {
  switch (status.toLowerCase()) {
    case 'available':
    case 'published':
    case 'active':
      return AfaqColors.emerald500;
    case 'draft':
    case 'pending':
      return AfaqColors.amber500;
    default:
      return AfaqColors.slate500;
  }
}

class StudentPageScaffold extends StatelessWidget {
  const StudentPageScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    this.onRefresh,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Future<void> Function()? onRefresh;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final subtitleColor = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

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
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: subtitleColor,
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

class StudentErrorPanel extends StatelessWidget {
  const StudentErrorPanel({
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

class StudentEmptyPanel extends StatelessWidget {
  const StudentEmptyPanel({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
                style: TextStyle(
                  color: isDark ? AfaqColors.slate300 : AfaqColors.slate500,
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
