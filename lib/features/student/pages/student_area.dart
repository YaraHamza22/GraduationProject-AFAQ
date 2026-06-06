import 'package:flutter/material.dart';

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
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';

    final items = [
      AfaqNavItem(
        id: 'dashboard',
        label: isArabic ? 'Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™Æ’Ã™â€¦' : 'My Dashboard',
        icon: Icons.dashboard_outlined,
        route: '/student',
      ),
      AfaqNavItem(
        id: 'courses',
        label: isArabic ? 'Ã˜ÂªÃ˜Â¹Ã™â€žÃ™Å Ã™â€¦Ã™Å ' : 'My Learning',
        icon: Icons.menu_book_outlined,
        route: '/student/courses',
      ),
      AfaqNavItem(
        id: 'quizzes',
        label: isArabic ? 'Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â¨Ã˜Â§Ã˜Â±Ã˜Â§Ã˜ÂªÃ™Å ' : 'My Quizzes',
        icon: Icons.quiz_outlined,
        route: '/student/quizzes',
      ),
      AfaqNavItem(
        id: 'forum',
        label: isArabic ? 'Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜ÂªÃ˜Â¯Ã™â€°' : 'Forum',
        icon: Icons.forum_outlined,
        route: '/student/forum',
      ),
      AfaqNavItem(
        id: 'chat',
        label: isArabic ? 'Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â§Ã˜Â¯Ã˜Â«Ã˜Â§Ã˜Âª' : 'Chatting',
        icon: Icons.chat_bubble_outline,
        route: '/student/chat',
      ),
      AfaqNavItem(
        id: 'meet',
        label: isArabic ? 'Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¬Ã˜ÂªÃ™â€¦Ã˜Â§Ã˜Â¹Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±Ã˜Â©' : 'Live Meet',
        icon: Icons.videocam_outlined,
        route: '/student/live-meet',
      ),
      AfaqNavItem(
        id: 'certificates',
        label: isArabic ? 'Ã˜Â´Ã™â€¡Ã˜Â§Ã˜Â¯Ã˜Â§Ã˜ÂªÃ™Å ' : 'My Certificates',
        icon: Icons.workspace_premium_outlined,
        route: '/student/certificates',
      ),
      AfaqNavItem(
        id: 'profile',
        label: isArabic ? 'Ã˜Â§Ã™â€žÃ™â€¦Ã™â€žÃ™Â Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â®Ã˜ÂµÃ™Å ' : 'Profile',
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
  }
}
