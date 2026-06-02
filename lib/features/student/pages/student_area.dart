import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import '../../virtual_meet/pages/role_virtual_meet_join_page.dart';
import 'student_certificates_page.dart';
import 'student_chat_page.dart';
import 'student_courses_page.dart';
import 'student_dashboard_page.dart';
import 'student_forum_page.dart';
import 'student_profile_page.dart';
import 'student_quizzes_page.dart';

class StudentArea extends StatelessWidget {
  const StudentArea({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Locale>(
      valueListenable: localeNotifier,
      builder: (context, currentLocale, _) {
        final isArabic = currentLocale.languageCode == 'ar';

        final items = [
          AfaqNavItem(
            id: 'dashboard',
            label: isArabic ? 'Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…' : 'My Dashboard',
            icon: Icons.dashboard_outlined,
            route: '/student',
          ),
          AfaqNavItem(
            id: 'courses',
            label: isArabic ? 'ØªØ¹Ù„ÙŠÙ…ÙŠ' : 'My Learning',
            icon: Icons.menu_book_outlined,
            route: '/student/courses',
          ),
          AfaqNavItem(
            id: 'quizzes',
            label: isArabic ? 'Ø§Ø®ØªØ¨Ø§Ø±Ø§ØªÙŠ' : 'My Quizzes',
            icon: Icons.quiz_outlined,
            route: '/student/quizzes',
          ),
          AfaqNavItem(
            id: 'forum',
            label: isArabic ? 'Ø§Ù„Ù…Ù†ØªØ¯Ù‰' : 'Forum',
            icon: Icons.forum_outlined,
            route: '/student/forum',
          ),
          AfaqNavItem(
            id: 'chat',
            label: isArabic ? 'Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª' : 'Chatting',
            icon: Icons.chat_bubble_outline,
            route: '/student/chat',
          ),
          AfaqNavItem(
            id: 'meet',
            label: isArabic ? 'Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹Ø§Øª Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©' : 'Live Meet',
            icon: Icons.videocam_outlined,
            route: '/student/live-meet',
          ),
          AfaqNavItem(
            id: 'certificates',
            label: isArabic ? 'Ø´Ù‡Ø§Ø¯Ø§ØªÙŠ' : 'My Certificates',
            icon: Icons.workspace_premium_outlined,
            route: '/student/certificates',
          ),
          AfaqNavItem(
            id: 'profile',
            label: isArabic ? 'Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ' : 'Profile',
            icon: Icons.account_circle_outlined,
            route: '/student/profile',
          ),
        ];

        return AfaqShell(
          role: AfaqRole.student,
          items: items,
          initialId: 'dashboard',
          pages: const {
            'dashboard': StudentDashboardPage(),
            'courses': StudentCoursesPage(),
            'quizzes': StudentQuizzesPage(),
            'forum': StudentForumPage(),
            'chat': StudentChatPage(),
            'meet': RoleVirtualMeetJoinPage(role: VirtualMeetJoinRole.student),
            'certificates': StudentCertificatesPage(),
            'profile': StudentProfilePage(),
          },
        );
      },
    );
  }
}
