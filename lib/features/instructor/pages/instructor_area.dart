import 'package:flutter/material.dart';

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
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';

    final items = [
      AfaqNavItem(
        id: 'dashboard',
        label: isArabic ? 'Ù„ÙˆØ­Ø© Ø§Ù„Ù…Ø¯Ø±Ø³' : 'Dashboard',
        icon: Icons.dashboard_outlined,
        route: '/instructor',
      ),
      AfaqNavItem(
        id: 'courses',
        label: isArabic ? 'Ø¯ÙˆØ±Ø§ØªÙŠ' : 'My Courses',
        icon: Icons.menu_book_outlined,
        route: '/instructor/courses',
      ),
      AfaqNavItem(
        id: 'quizzes',
        label: isArabic ? 'Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª' : 'Quizzes',
        icon: Icons.quiz_outlined,
        route: '/instructor/quizzes',
      ),
      AfaqNavItem(
        id: 'forum',
        label: isArabic ? 'Ø§Ù„Ù…Ù†ØªØ¯Ù‰' : 'Forum',
        icon: Icons.forum_outlined,
        route: '/instructor/forum',
      ),
      AfaqNavItem(
        id: 'chat',
        label: isArabic ? 'Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª' : 'Chat',
        icon: Icons.chat_bubble_outline,
        route: '/instructor/chat',
      ),
      AfaqNavItem(
        id: 'meet',
        label: isArabic ? 'Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹Ø§Øª' : 'Virtual Meet',
        icon: Icons.videocam_outlined,
        route: '/instructor/virtual-meet',
      ),
      AfaqNavItem(
        id: 'profile',
        label: isArabic ? 'Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ' : 'Profile',
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
  }
}
