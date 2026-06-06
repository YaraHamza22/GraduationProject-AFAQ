import 'package:flutter/material.dart';

import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import '../../virtual_meet/pages/role_virtual_meet_join_page.dart';
import 'auditor_courses_page.dart';
import 'auditor_dashboard_page.dart';
import 'auditor_notifications_page.dart';
import 'auditor_page_shared.dart';
import 'auditor_profile_page.dart';

class AuditorArea extends StatelessWidget {
  const AuditorArea({super.key});

  @override
  Widget build(BuildContext context) {
    final lang = Localizations.localeOf(context).languageCode;

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
        id: 'meet',
        label: lang == 'ar' ? 'Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹Ø§Øª Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©' : 'Live Meet',
        icon: Icons.videocam_outlined,
        route: '/auditor/live-meet',
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
        'meet': const RoleVirtualMeetJoinPage(role: VirtualMeetJoinRole.auditor),
        'notifications': const AuditorNotificationsPage(),
        'profile': const AuditorProfilePage(),
      },
    );
  }
}
