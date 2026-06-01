import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import 'auditor_courses_page.dart';
import 'auditor_dashboard_page.dart';
import 'auditor_notifications_page.dart';
import 'auditor_page_shared.dart';
import 'auditor_profile_page.dart';

class AuditorArea extends StatelessWidget {
  const AuditorArea({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Locale>(
      valueListenable: localeNotifier,
      builder: (context, locale, _) {
        final lang = locale.languageCode;
        final items = [
          AfaqNavItem(
            id: 'dashboard',
            label: auditorText('dashboard', lang),
            icon: Icons.space_dashboard_outlined,
            route: '/auditor',
          ),
          AfaqNavItem(
            id: 'review',
            label: auditorText('review_screen', lang),
            icon: Icons.fact_check_outlined,
            route: '/auditor/review',
          ),
          AfaqNavItem(
            id: 'notifications',
            label: auditorText('notifications', lang),
            icon: Icons.notifications_active_outlined,
            route: '/auditor/notifications',
          ),
          AfaqNavItem(
            id: 'profile',
            label: auditorText('profile', lang),
            icon: Icons.verified_user_outlined,
            route: '/auditor/profile',
          ),
        ];

        return AfaqShell(
          role: AfaqRole.auditor,
          items: items,
          initialId: 'dashboard',
          pages: {
            'dashboard': const AuditorDashboardPage(),
            'review': const AuditorCoursesPage(),
            'notifications': const AuditorNotificationsPage(),
            'profile': const AuditorProfilePage(),
          },
        );
      },
    );
  }
}
