import 'package:flutter/material.dart';

import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import 'auditor_courses_page.dart';
import 'auditor_dashboard_page.dart';
import 'auditor_notifications_page.dart';
import 'auditor_profile_page.dart';
import 'auditor_quizzes_page.dart';

class AuditorArea extends StatelessWidget {
  const AuditorArea({super.key});

  static const _items = [
    AfaqNavItem(
      id: 'dashboard',
      label: 'Auditor Command',
      icon: Icons.speed_outlined,
      route: '/auditor',
    ),
    AfaqNavItem(
      id: 'courses',
      label: 'Content Review',
      icon: Icons.fact_check_outlined,
      route: '/auditor/courses',
    ),
    AfaqNavItem(
      id: 'quizzes',
      label: 'Quizzes',
      icon: Icons.checklist_outlined,
      route: '/auditor/quizzes',
    ),
    AfaqNavItem(
      id: 'notifications',
      label: 'Notifications',
      icon: Icons.notifications_none,
      route: '/auditor/notifications',
    ),
    AfaqNavItem(
      id: 'profile',
      label: 'Profile',
      icon: Icons.account_circle_outlined,
      route: '/auditor/profile',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return AfaqShell(
      role: AfaqRole.auditor,
      items: _items,
      initialId: 'dashboard',
      pages: const {
        'dashboard': AuditorDashboardPage(),
        'courses': AuditorCoursesPage(),
        'quizzes': AuditorQuizzesPage(),
        'notifications': AuditorNotificationsPage(),
        'profile': AuditorProfilePage(),
      },
    );
  }
}
