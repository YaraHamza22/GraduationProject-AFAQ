import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import 'instructor_chat_page.dart';
import 'instructor_courses_page.dart';
import 'instructor_dashboard_page.dart';
import 'instructor_forum_page.dart';
import 'instructor_profile_page.dart';
import 'instructor_quizzes_page.dart';
import 'instructor_virtual_meet_page.dart';

class InstructorArea extends StatelessWidget {
  const InstructorArea({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Locale>(
      valueListenable: localeNotifier,
      builder: (context, locale, _) {
        final isArabic = locale.languageCode == 'ar';
        final items = [
          AfaqNavItem(
            id: 'dashboard',
            label: isArabic ? 'لوحة المدرس' : 'Dashboard',
            icon: Icons.dashboard_outlined,
            route: '/instructor',
          ),
          AfaqNavItem(
            id: 'courses',
            label: isArabic ? 'دوراتي' : 'My Courses',
            icon: Icons.menu_book_outlined,
            route: '/instructor/courses',
          ),
          AfaqNavItem(
            id: 'quizzes',
            label: isArabic ? 'الاختبارات' : 'Quizzes',
            icon: Icons.quiz_outlined,
            route: '/instructor/quizzes',
          ),
          AfaqNavItem(
            id: 'forum',
            label: isArabic ? 'المنتدى' : 'Forum',
            icon: Icons.forum_outlined,
            route: '/instructor/forum',
          ),
          AfaqNavItem(
            id: 'chat',
            label: isArabic ? 'المحادثات' : 'Chat',
            icon: Icons.chat_bubble_outline,
            route: '/instructor/chat',
          ),
          AfaqNavItem(
            id: 'meet',
            label: isArabic ? 'الاجتماعات' : 'Virtual Meet',
            icon: Icons.videocam_outlined,
            route: '/instructor/virtual-meet',
          ),
          AfaqNavItem(
            id: 'profile',
            label: isArabic ? 'الملف الشخصي' : 'Profile',
            icon: Icons.account_circle_outlined,
            route: '/instructor/profile',
          ),
        ];

        return AfaqShell(
          role: AfaqRole.instructor,
          items: items,
          initialId: 'dashboard',
          pages: const {
            'dashboard': InstructorDashboardPage(),
            'courses': InstructorCoursesPage(),
            'quizzes': InstructorQuizzesPage(),
            'forum': InstructorForumPage(),
            'chat': InstructorChatPage(),
            'meet': InstructorVirtualMeetPage(),
            'profile': InstructorProfilePage(),
          },
        );
      },
    );
  }
}
