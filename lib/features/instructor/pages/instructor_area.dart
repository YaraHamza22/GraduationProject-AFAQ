import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';

class InstructorArea extends StatelessWidget {
  const InstructorArea({super.key});

  static const _items = [
    AfaqNavItem(id: 'home', label: 'Homescreen', icon: Icons.dashboard_outlined, route: '/instructor'),
    AfaqNavItem(
      id: 'courses',
      label: 'View My Courses',
      icon: Icons.menu_book_outlined,
      route: '/instructor/courses',
    ),
    AfaqNavItem(id: 'quizzes', label: 'My Quizes', icon: Icons.help_outline, route: '/instructor/quizzes'),
    AfaqNavItem(
      id: 'meet',
      label: 'Virtual Meet',
      icon: Icons.videocam_outlined,
      route: '/instructor/virtual-meet',
    ),
    AfaqNavItem(
      id: 'chat',
      label: 'Chatting',
      icon: Icons.chat_bubble_outline,
      route: '/instructor/chat',
    ),
    AfaqNavItem(
      id: 'profile',
      label: 'Profile',
      icon: Icons.account_circle_outlined,
      route: '/instructor/profile',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return AfaqShell(
      role: AfaqRole.instructor,
      items: _items,
      initialId: 'home',
      pages: {
        for (final item in _items)
          item.id: item.id == 'home'
              ? const InstructorDashboardPage()
              : _InstructorPlaceholder(title: item.label, subtitle: item.route),
      },
    );
  }
}

class InstructorDashboardPage extends StatelessWidget {
  const InstructorDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final desktop = width >= 1120;

    return SingleChildScrollView(
      padding: EdgeInsets.all(width >= 1400 ? 48 : width >= 720 ? 32 : 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 18,
            runSpacing: 18,
            children: [
              Text.rich(
                TextSpan(
                  text: 'Welcome back, ',
                  children: [
                    TextSpan(
                      text: 'Dr. Sarah',
                      style: TextStyle(color: AfaqColors.primaryButton),
                    ),
                  ],
                ),
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontSize: width >= 900 ? 48 : 40,
                    ),
              ),
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add_rounded),
                label: const Text('Create Course'),
              ),
            ],
          ),
          const SizedBox(height: 28),
          GridView.count(
            crossAxisCount: width >= 1120 ? 4 : width >= 700 ? 2 : 1,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 18,
            mainAxisSpacing: 18,
            childAspectRatio: width >= 1120 ? 1.4 : 2.3,
            children: const [
              _InstructorStat('Students', '1,284', Icons.groups_outlined, AfaqColors.blue500),
              _InstructorStat('Courses', '18', Icons.menu_book_outlined, AfaqColors.purple500),
              _InstructorStat('Pending Assignments', '42', Icons.assignment_late_outlined, AfaqColors.emerald500),
              _InstructorStat('Top Courses', '6', Icons.star_outline, AfaqColors.amber500),
            ],
          ),
          const SizedBox(height: 24),
          Flex(
            direction: desktop ? Axis.horizontal : Axis.vertical,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Expanded(flex: 3, child: _ActiveCoursesPanel()),
              SizedBox(width: desktop ? 24 : 0, height: desktop ? 0 : 24),
              const Expanded(flex: 2, child: _InstructorTipPanel()),
            ],
          ),
        ],
      ),
    );
  }
}

class _InstructorStat extends StatelessWidget {
  const _InstructorStat(this.title, this.value, this.icon, this.color);

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 32,
      padding: const EdgeInsets.all(24),
      child: Stack(
        children: [
          Positioned(
            right: -8,
            top: -8,
            child: Icon(icon, size: 78, color: color.withOpacity(.10)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color),
              Text(value, style: Theme.of(context).textTheme.headlineMedium),
              Text(title, style: const TextStyle(color: AfaqColors.slate500, fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActiveCoursesPanel extends StatelessWidget {
  const _ActiveCoursesPanel();

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 32,
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Active Courses', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 18),
          for (final course in const ['Flutter Foundations', 'Design Systems', 'Quiz Architecture'])
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AfaqColors.slate200),
              ),
              child: Row(
                children: [
                  Container(
                    width: 96,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [AfaqColors.primaryButton, AfaqColors.secondary]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.play_lesson_outlined, color: Colors.white),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(course, style: const TextStyle(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 8),
                        const Text('Updated today • 24 enrolled', style: TextStyle(color: AfaqColors.slate500)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _InstructorTipPanel extends StatelessWidget {
  const _InstructorTipPanel();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AfaqColors.primaryButton, Color(0xFF7E22CE)]),
            borderRadius: BorderRadius.circular(40),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lightbulb_outline, color: Colors.white),
              SizedBox(height: 18),
              Text(
                'Tip of the day',
                style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 8),
              Text(
                'Review lessons with low completion before publishing the next unit.',
                style: TextStyle(color: Colors.white70, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        AfaqPanel(
          radius: 32,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Performance', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 18),
              for (final item in const [('Completion', .78), ('Engagement', .64), ('Quiz Score', .86)])
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: LinearProgressIndicator(
                    value: item.$2,
                    minHeight: 9,
                    borderRadius: BorderRadius.circular(999),
                    backgroundColor: AfaqColors.slate100,
                    color: AfaqColors.emerald500,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _InstructorPlaceholder extends StatelessWidget {
  const _InstructorPlaceholder({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AfaqPanel(
        radius: 32,
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
