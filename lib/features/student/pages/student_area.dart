import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';

class StudentArea extends StatelessWidget {
  const StudentArea({super.key});

  static const _items = [
    AfaqNavItem(
      id: 'dashboard',
      label: 'My Dashboard',
      icon: Icons.dashboard_outlined,
      route: '/student',
    ),
    AfaqNavItem(
      id: 'courses',
      label: 'Enrolled Courses',
      icon: Icons.menu_book_outlined,
      route: '/student/courses',
    ),
    AfaqNavItem(
      id: 'quizzes',
      label: 'My Quizzes',
      icon: Icons.description_outlined,
      route: '/student/quizzes',
    ),
    AfaqNavItem(id: 'forum', label: 'Forum', icon: Icons.forum_outlined, route: '/student/forum'),
    AfaqNavItem(
      id: 'chat',
      label: 'Chatting',
      icon: Icons.chat_bubble_outline,
      route: '/student/chat',
    ),
    AfaqNavItem(
      id: 'certificates',
      label: 'My Certificates',
      icon: Icons.workspace_premium_outlined,
      route: '/student/certificates',
    ),
    AfaqNavItem(
      id: 'profile',
      label: 'Profile',
      icon: Icons.account_circle_outlined,
      route: '/student/profile',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return AfaqShell(
      role: AfaqRole.student,
      items: _items,
      initialId: 'dashboard',
      pages: {
        for (final item in _items)
          item.id: item.id == 'dashboard'
              ? const StudentDashboardPage()
              : _PlaceholderPage(title: item.label, subtitle: item.route),
      },
    );
  }
}

class StudentDashboardPage extends StatelessWidget {
  const StudentDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final desktop = width >= 1100;

    return SingleChildScrollView(
      padding: EdgeInsets.all(width >= 1400 ? 48 : width >= 700 ? 32 : 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'My Dashboard',
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  fontSize: width >= 900 ? 56 : 40,
                ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Track your courses, quizzes, progress, and certificates.',
            style: TextStyle(
              color: AfaqColors.slate500,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 28),
          GridView.count(
            crossAxisCount: width >= 1100 ? 4 : width >= 680 ? 2 : 1,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 18,
            mainAxisSpacing: 18,
            childAspectRatio: width >= 1100 ? 1.15 : 1.9,
            children: const [
              _StatCard('Total Courses', '12', Icons.menu_book_outlined, AfaqColors.blue500),
              _StatCard('Average Progress', '76%', Icons.trending_up, AfaqColors.emerald500),
              _StatCard('Active Courses', '8', Icons.play_circle_outline, AfaqColors.purple500),
              _StatCard('Completed Courses', '4', Icons.workspace_premium_outlined, AfaqColors.amber500),
            ],
          ),
          const SizedBox(height: 24),
          Flex(
            direction: desktop ? Axis.horizontal : Axis.vertical,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Expanded(child: _ProgressPanel()),
              SizedBox(width: desktop ? 24 : 0, height: desktop ? 0 : 24),
              const Expanded(child: _LearningTreePanel()),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.title, this.value, this.icon, this.color);

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 34,
      padding: const EdgeInsets.all(26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: color.withOpacity(.10),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, color: color),
          ),
          Text(value, style: Theme.of(context).textTheme.headlineMedium),
          Text(title, style: const TextStyle(color: AfaqColors.slate500, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _ProgressPanel extends StatelessWidget {
  const _ProgressPanel();

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 34,
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Course Progress', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 22),
          for (final course in const [('Flutter Foundations', .82), ('UI Systems', .64), ('Assessment Skills', .48)])
            Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(course.$1, style: const TextStyle(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: course.$2,
                    minHeight: 9,
                    backgroundColor: AfaqColors.slate200,
                    color: const Color(0xFF2563EB),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _LearningTreePanel extends StatelessWidget {
  const _LearningTreePanel();

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 34,
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('My Learning', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 18),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.folder_open, color: AfaqColors.primary),
            title: Text('Mobile App Course'),
            subtitle: Text('Unit 3 • Lesson 7'),
          ),
          const ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.check_circle_outline, color: AfaqColors.emerald500),
            title: Text('Quiz preparation'),
            subtitle: Text('2 quizzes ready'),
          ),
        ],
      ),
    );
  }
}

class _PlaceholderPage extends StatelessWidget {
  const _PlaceholderPage({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AfaqPanel(
        radius: 34,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(subtitle, style: const TextStyle(color: AfaqColors.slate500)),
          ],
        ),
      ),
    );
  }
}
