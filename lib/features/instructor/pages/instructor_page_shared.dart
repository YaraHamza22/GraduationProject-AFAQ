import 'package:flutter/material.dart';

import '../../../app/app.dart';
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
      'workspace': 'Instructor Workspace',
      'workspace_subtitle': 'Manage only the courses assigned to you.',
      'courses_metric': 'Courses',
      'units_metric': 'Units',
      'lessons_metric': 'Lessons',
      'assigned_courses_title': 'My Assigned Courses',
      'assigned_courses_subtitle':
          'Only courses created by you or explicitly assigned to you appear here.',
      'no_instructor_courses': 'No instructor courses found.',
      'selected_for_editing': 'Selected for editing',
      'tap_to_manage': 'Tap to manage structure',
      'builder_subtitle':
          'Build units, expand lessons, and keep your course structure tight and clear.',
      'status': 'Status',
      'new_unit_hint': 'Create a new unit',
      'add_unit': 'Add Unit',
      'no_units': 'No units for this course yet.',
      'new_lesson_hint': 'Create a new lesson in this unit',
      'add_lesson': 'Add Lesson',
      'lessons_in_unit': 'Lessons in {unit}',
      'no_lessons': 'No lessons in this unit yet.',
      'select_course_manage':
          'Select one of your assigned courses to manage units and lessons.',
      'unit_created': 'Unit created successfully.',
      'unit_deleted': 'Unit deleted.',
      'lesson_created': 'Lesson created successfully.',
      'lesson_deleted': 'Lesson deleted.',
      'untitled_course': 'Untitled Course',
      'unit_fallback': 'Unit',
      'lesson_fallback': 'Lesson',
      'hours_short': '{count}h',
      'units_short': '{count} units',
      'draft': 'Draft',
      'published': 'Published',
      'lecture': 'Lecture',
      'course': 'Course',
      'questions_count': '{count} questions',
      'attempts_count': '{count} attempts',
      'create_quiz': 'Create Quiz',
      'create_course_first': 'Create a course first.',
      'create_quiz_title': 'Create Quiz',
      'cancel': 'Cancel',
      'title_label': 'Title',
      'description_label': 'Description',
      'quiz_created': 'Quiz created.',
      'add_question_title': 'Add Question',
      'question_label': 'Question',
      'correct_option': 'Correct option',
      'another_option': 'Another option',
      'question_created': 'Question created.',
      'add_question': 'Add Question',
      'delete_quiz': 'Delete Quiz',
      'no_questions': 'No questions yet.',
      'attempts_title': 'Attempts',
      'no_attempts': 'No attempts yet.',
      'untitled_quiz': 'Untitled Quiz',
      'no_description': 'No description',
      'student': 'Student',
      'score_status': '{status} - score {score}',
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
      'workspace': 'مساحة المدرس',
      'workspace_subtitle': 'اعرض فقط الدورات المنشأة بواسطتك أو المسندة إليك.',
      'courses_metric': 'الدورات',
      'units_metric': 'الوحدات',
      'lessons_metric': 'الدروس',
      'assigned_courses_title': 'الدورات المسندة إلي',
      'assigned_courses_subtitle':
          'تظهر هنا فقط الدورات التي أنشأتها أنت أو أُسنِدت إليك بشكل صريح.',
      'no_instructor_courses': 'لا توجد دورات مسندة لهذا المدرس.',
      'selected_for_editing': 'محددة للتحرير',
      'tap_to_manage': 'اضغط لإدارة البنية',
      'builder_subtitle': 'أنشئ الوحدات ووسع الدروس وحافظ على تنظيم الدورة بوضوح.',
      'status': 'الحالة',
      'new_unit_hint': 'أنشئ وحدة جديدة',
      'add_unit': 'إضافة وحدة',
      'no_units': 'لا توجد وحدات لهذه الدورة بعد.',
      'new_lesson_hint': 'أنشئ درسًا جديدًا داخل هذه الوحدة',
      'add_lesson': 'إضافة درس',
      'lessons_in_unit': 'دروس {unit}',
      'no_lessons': 'لا توجد دروس في هذه الوحدة بعد.',
      'select_course_manage': 'اختر إحدى دوراتك المسندة لإدارة الوحدات والدروس.',
      'unit_created': 'تم إنشاء الوحدة بنجاح.',
      'unit_deleted': 'تم حذف الوحدة.',
      'lesson_created': 'تم إنشاء الدرس بنجاح.',
      'lesson_deleted': 'تم حذف الدرس.',
      'untitled_course': 'دورة بدون عنوان',
      'unit_fallback': 'وحدة',
      'lesson_fallback': 'درس',
      'hours_short': '{count}س',
      'units_short': '{count} وحدات',
      'draft': 'مسودة',
      'published': 'منشور',
      'lecture': 'محاضرة',
      'course': 'الدورة',
      'questions_count': '{count} أسئلة',
      'attempts_count': '{count} محاولات',
      'create_quiz': 'إنشاء اختبار',
      'create_course_first': 'أنشئ دورة أولاً.',
      'create_quiz_title': 'إنشاء اختبار',
      'cancel': 'إلغاء',
      'title_label': 'العنوان',
      'description_label': 'الوصف',
      'quiz_created': 'تم إنشاء الاختبار.',
      'add_question_title': 'إضافة سؤال',
      'question_label': 'السؤال',
      'correct_option': 'الخيار الصحيح',
      'another_option': 'خيار آخر',
      'question_created': 'تم إنشاء السؤال.',
      'add_question': 'إضافة سؤال',
      'delete_quiz': 'حذف الاختبار',
      'no_questions': 'لا توجد أسئلة بعد.',
      'attempts_title': 'المحاولات',
      'no_attempts': 'لا توجد محاولات بعد.',
      'untitled_quiz': 'اختبار بدون عنوان',
      'no_description': 'لا يوجد وصف',
      'student': 'طالب',
      'score_status': '{status} - الدرجة {score}',
    },
  };

  return translations[lang]?[key] ?? translations['en']![key] ?? key;
}

String instructorFormatText(
  String key,
  String lang, {
  Map<String, String> values = const {},
}) {
  var text = instructorText(key, lang);
  values.forEach((placeholder, value) {
    text = text.replaceAll('{$placeholder}', value);
  });
  return text;
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
  return value
      .map(instructorMap)
      .whereType<Map<String, dynamic>>()
      .toList(growable: false);
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

String instructorStatusText(String status, String lang) {
  final normalized = instructorString(status, fallback: 'draft').toLowerCase();
  return instructorText(normalized, lang);
}

String instructorLessonTypeText(String type, String lang) {
  final normalized = instructorString(type, fallback: 'lecture').toLowerCase();
  return instructorText(normalized, lang);
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor =
        isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final subtitleColor = isDark ? AfaqColors.slate300 : AfaqColors.slate500;
    final lang = localeNotifier.value.languageCode;

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
                  label: Text(instructorText('refresh', lang)),
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
    final lang = localeNotifier.value.languageCode;
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
              child: Text(instructorText('retry', lang)),
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
