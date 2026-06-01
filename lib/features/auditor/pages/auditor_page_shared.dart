import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';

String auditorText(String key, String lang) {
  const translations = {
    'en': {
      'dashboard': 'Audit Command',
      'dashboard_subtitle': 'Quality review, queue control, and approval intelligence.',
      'review_screen': 'Review',
      'review_screen_subtitle': 'Audit courses, lessons, quizzes, questions, and answer options in one workspace.',
      'courses': 'Content Reviews',
      'courses_subtitle': 'Inspect course structure and submit lesson-specific review decisions.',
      'quizzes': 'Assessment Review',
      'quizzes_subtitle': 'Review quiz quality, question clarity, and answer design.',
      'course_review_section': 'Course Review',
      'quiz_review_section': 'Quiz Review',
      'quiz_review_section_subtitle': 'Inspect quiz questions and answer options from the auditor APIs.',
      'notifications': 'Notification Center',
      'notifications_subtitle': 'Unread platform events and audit updates.',
      'profile': 'Auditor Profile',
      'profile_subtitle': 'Identity, permissions, and reviewer account details.',
      'refresh': 'Refresh',
      'retry': 'Retry',
      'empty': 'No data found.',
      'workspace': 'Audit Workspace',
      'queue': 'Review Queue',
      'history': 'Review History',
      'lessons': 'Lessons',
      'units': 'Units',
      'categories': 'Categories',
      'notifications_count': 'Alerts',
      'quizzes_count': 'Assessments',
      'review_courses': 'Review Courses',
      'priority_review': 'Priority Review',
      'current_focus': 'Current Focus',
      'signed_in_as': 'Signed in as {name}',
      'no_courses': 'No courses found for this view.',
      'no_lessons': 'No lessons returned for this course.',
      'no_reviews': 'No submitted reviews for this course yet.',
      'review_notes': 'Review notes',
      'send_review': 'Send Review',
      'lesson_scope': 'Lesson scope',
      'review_scope': 'Review decision',
      'review_target': 'Review target',
      'specific_lesson_review': 'Specific lesson review',
      'backend_review_scope_note': 'Backend currently supports whole-course reviews or lesson-linked reviews.',
      'whole_unit_review': 'Whole unit review',
      'whole_lesson_review': 'Whole lesson review',
      'whole_quiz_review': 'Whole quiz review',
      'unit_review_not_supported': 'Unit and quiz review targets are visible in the UI, but backend submission is still limited to course or lesson reviews.',
      'follow_up': 'Follow Up',
      'approved': 'Approved',
      'changes_requested': 'Changes Requested',
      'pick_course': 'Select a course to open its review workspace.',
      'select_lesson': 'Select a lesson to attach this review to a specific content item.',
      'all_course_review': 'Whole course review',
      'all': 'All',
      'review': 'Review',
      'published': 'Published',
      'draft': 'Draft',
      'queued': 'Queued',
      'page': 'Page {current} of {total}',
      'next': 'Next',
      'previous': 'Previous',
      'load_error': 'Unable to load data right now.',
      'review_sent': 'Content review submitted.',
      'status': 'Status',
      'question_count': '{count} questions',
      'points': '{count} points',
      'required': 'Required',
      'optional': 'Optional',
      'correct': 'Correct',
      'search_questions': 'Search questions',
      'no_questions': 'No questions found.',
      'select_question': 'Select a question to inspect its details.',
      'notification_inbox': 'Notification Center',
      'mark_all_read': 'Mark All Read',
      'no_unread_notifications': 'No unread notifications.',
      'unread': 'Unread',
      'read': 'Read',
      'auditor_role': 'Auditor',
      'access': 'Content auditor',
      'user_id': 'User ID',
      'phone': 'Phone',
      'gender': 'Gender',
      'address': 'Address',
      'birth_date': 'Birth Date',
      'not_provided': 'Not provided',
      'no_email': 'No email',
      'auditor': 'Auditor',
      'review_recorded': 'Review recorded',
      'lesson_label': 'Lesson #{id}',
      'course_label': 'Course',
      'unit_label': 'Unit',
      'queue_empty_hint': 'Nothing is waiting for review right now.',
      'notifications_marked': 'Notifications marked as read.',
    },
    'ar': {
      'dashboard': 'مركز التدقيق',
      'dashboard_subtitle': 'مراجعة الجودة والتحكم في الطابور ورؤية قرارات الاعتماد.',
      'courses': 'مراجعات المحتوى',
      'courses_subtitle': 'افحص بنية الدورة وأرسل قرارات مراجعة مرتبطة بالدروس.',
      'quizzes': 'مراجعة التقييمات',
      'quizzes_subtitle': 'راجع جودة الاختبارات ووضوح الأسئلة وتصميم الإجابات.',
      'notifications': 'مركز الإشعارات',
      'notifications_subtitle': 'الإشعارات غير المقروءة وتحديثات التدقيق.',
      'profile': 'ملف المدقق',
      'profile_subtitle': 'الهوية والصلاحيات وبيانات حساب المراجع.',
      'refresh': 'تحديث',
      'retry': 'إعادة المحاولة',
      'empty': 'لا توجد بيانات.',
      'workspace': 'مساحة التدقيق',
      'queue': 'طابور المراجعة',
      'history': 'سجل المراجعات',
      'lessons': 'الدروس',
      'units': 'الوحدات',
      'categories': 'التصنيفات',
      'notifications_count': 'التنبيهات',
      'quizzes_count': 'التقييمات',
      'review_courses': 'دورات المراجعة',
      'priority_review': 'أولوية المراجعة',
      'current_focus': 'التركيز الحالي',
      'signed_in_as': 'مسجل الدخول باسم {name}',
      'no_courses': 'لا توجد دورات لهذا العرض.',
      'no_lessons': 'لم يتم إرجاع أي دروس لهذه الدورة.',
      'no_reviews': 'لا توجد مراجعات مرسلة لهذه الدورة بعد.',
      'review_notes': 'ملاحظات المراجعة',
      'send_review': 'إرسال المراجعة',
      'lesson_scope': 'نطاق الدرس',
      'review_scope': 'قرار المراجعة',
      'review_target': 'نطاق المراجعة',
      'specific_lesson_review': 'مراجعة درس محدد',
      'backend_review_scope_note': 'يدعم الخلفية حالياً مراجعة الدورة كاملة أو مراجعة مرتبطة بدرس محدد.',
      'whole_unit_review': 'مراجعة الوحدة كاملة',
      'whole_lesson_review': 'مراجعة الدرس كاملًا',
      'whole_quiz_review': 'مراجعة الاختبار كاملًا',
      'unit_review_not_supported': 'تظهر مراجعة الوحدة والاختبار في الواجهة، لكن الحفظ في الخلفية ما يزال مقتصراً على مراجعة الدورة أو الدرس.',
      'follow_up': 'متابعة',
      'approved': 'مقبول',
      'changes_requested': 'مطلوب تعديل',
      'pick_course': 'اختر دورة لفتح مساحة المراجعة الخاصة بها.',
      'select_lesson': 'اختر درسًا لإرفاق هذه المراجعة بعنصر محتوى محدد.',
      'all_course_review': 'مراجعة على مستوى الدورة',
      'all': 'الكل',
      'review': 'قيد المراجعة',
      'published': 'منشور',
      'draft': 'مسودة',
      'queued': 'في الطابور',
      'page': 'الصفحة {current} من {total}',
      'next': 'التالي',
      'previous': 'السابق',
      'load_error': 'تعذر تحميل البيانات الآن.',
      'review_sent': 'تم إرسال مراجعة المحتوى.',
      'status': 'الحالة',
      'question_count': '{count} أسئلة',
      'points': '{count} نقاط',
      'required': 'إلزامي',
      'optional': 'اختياري',
      'correct': 'صحيح',
      'search_questions': 'ابحث في الأسئلة',
      'no_questions': 'لا توجد أسئلة.',
      'select_question': 'اختر سؤالًا لفحص تفاصيله.',
      'notification_inbox': 'مركز الإشعارات',
      'mark_all_read': 'تعيين الكل كمقروء',
      'no_unread_notifications': 'لا توجد إشعارات غير مقروءة.',
      'unread': 'غير مقروء',
      'read': 'مقروء',
      'auditor_role': 'مدقق',
      'access': 'مدقق محتوى',
      'user_id': 'رقم المستخدم',
      'phone': 'الهاتف',
      'gender': 'الجنس',
      'address': 'العنوان',
      'birth_date': 'تاريخ الميلاد',
      'not_provided': 'غير متوفر',
      'no_email': 'لا يوجد بريد إلكتروني',
      'auditor': 'مدقق',
      'review_recorded': 'تم تسجيل المراجعة',
      'lesson_label': 'الدرس #{id}',
      'course_label': 'الدورة',
      'unit_label': 'الوحدة',
      'queue_empty_hint': 'لا يوجد شيء بانتظار المراجعة الآن.',
      'notifications_marked': 'تم تعليم الإشعارات كمقروءة.',
    },
  };

  return translations[lang]?[key] ?? translations['en']![key] ?? key;
}

String auditorFormatText(
  String key,
  String lang, {
  Map<String, String> values = const {},
}) {
  var text = auditorText(key, lang);
  values.forEach((placeholder, value) {
    text = text.replaceAll('{$placeholder}', value);
  });
  return text;
}

Map<String, dynamic>? auditorMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return null;
}

List<Map<String, dynamic>> auditorList(dynamic value) {
  if (value is! List) return const [];
  return value
      .map(auditorMap)
      .whereType<Map<String, dynamic>>()
      .toList(growable: false);
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

Map<String, dynamic> auditorPaginationOf(dynamic payload) {
  final map = auditorMap(payload);
  final pagination = auditorMap(map?['pagination']);
  return pagination ?? const <String, dynamic>{};
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
  final lang = localeNotifier.value.languageCode;
  final current = auditorString(map[lang]);
  if (current.isNotEmpty) return current;
  final other = auditorString(map[lang == 'ar' ? 'en' : 'ar']);
  if (other.isNotEmpty) return other;
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

String auditorFormatDateTime(dynamic value) {
  final source = auditorString(value);
  if (source.isEmpty) return '';
  final parsed = DateTime.tryParse(source);
  if (parsed == null) return source;
  final local = parsed.toLocal();
  final month = '${local.month}'.padLeft(2, '0');
  final day = '${local.day}'.padLeft(2, '0');
  final hour = local.hour == 0 ? 12 : (local.hour > 12 ? local.hour - 12 : local.hour);
  final minute = '${local.minute}'.padLeft(2, '0');
  final meridiem = local.hour >= 12 ? 'PM' : 'AM';
  return '${local.year}-$month-$day $hour:$minute $meridiem';
}

String auditorFormatDate(dynamic value) {
  final source = auditorString(value);
  if (source.isEmpty) return '';
  final parsed = DateTime.tryParse(source);
  if (parsed == null) return source;
  final local = parsed.toLocal();
  final month = '${local.month}'.padLeft(2, '0');
  final day = '${local.day}'.padLeft(2, '0');
  return '${local.year}-$month-$day';
}

class AuditorPageScaffold extends StatelessWidget {
  const AuditorPageScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.onRefresh,
    this.actions,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Future<void> Function()? onRefresh;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final lang = localeNotifier.value.languageCode;

    return SingleChildScrollView(
      padding: EdgeInsets.symmetric(
        horizontal: width >= 1400 ? 48 : width >= 900 ? 32 : 16,
        vertical: 24,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF0F172A),
                  Color(0xFF172554),
                  Color(0xFF0F766E),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(32),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: .16),
                  blurRadius: 28,
                  offset: const Offset(0, 16),
                ),
              ],
            ),
            child: Wrap(
              spacing: 16,
              runSpacing: 16,
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: width > 900 ? width * .42 : double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.displaySmall?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          color: Color(0xFFD7E4FF),
                          fontWeight: FontWeight.w600,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    if (actions != null) ...actions!,
                    if (onRefresh != null)
                      FilledButton.icon(
                        onPressed: () => onRefresh?.call(),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AfaqColors.slate950,
                        ),
                        icon: const Icon(Icons.refresh_rounded),
                        label: Text(auditorText('refresh', lang)),
                      ),
                  ],
                ),
              ],
            ),
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
    final lang = localeNotifier.value.languageCode;
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
              child: Text(auditorText('retry', lang)),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
      AuditorStatusTone.good => (const Color(0xFFE7F9EF), const Color(0xFF047857)),
      AuditorStatusTone.warn => (const Color(0xFFFFF1D6), const Color(0xFFB45309)),
      AuditorStatusTone.hot => (const Color(0xFFFDE7F3), const Color(0xFFBE185D)),
      AuditorStatusTone.info => (const Color(0xFFE0F2FE), const Color(0xFF0369A1)),
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

class AuditorPaginationBar extends StatelessWidget {
  const AuditorPaginationBar({
    super.key,
    required this.currentPage,
    required this.totalPages,
    required this.onPrevious,
    required this.onNext,
  });

  final int currentPage;
  final int totalPages;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        OutlinedButton.icon(
          onPressed: onPrevious,
          icon: const Icon(Icons.chevron_left_rounded),
          label: Text(auditorText('previous', lang)),
        ),
        AuditorStatusChip(
          label: auditorFormatText(
            'page',
            lang,
            values: {
              'current': '$currentPage',
              'total': '${totalPages < 1 ? 1 : totalPages}',
            },
          ),
          tone: AuditorStatusTone.info,
        ),
        OutlinedButton.icon(
          onPressed: onNext,
          icon: const Icon(Icons.chevron_right_rounded),
          label: Text(auditorText('next', lang)),
        ),
      ],
    );
  }
}

enum AuditorStatusTone { neutral, good, warn, hot, info }
