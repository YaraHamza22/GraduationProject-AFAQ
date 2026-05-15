import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../../../core/widgets/afaq_shell.dart';
import '../../../core/widgets/afaq_sidebar.dart';
import '../../../core/widgets/status_pill.dart';

class AuditorArea extends StatelessWidget {
  const AuditorArea({super.key});

  static const _items = [
    AfaqNavItem(id: 'command', label: 'Command', icon: Icons.speed_outlined, route: '/auditor'),
    AfaqNavItem(id: 'courses', label: 'Courses', icon: Icons.fact_check_outlined, route: '/auditor/courses'),
    AfaqNavItem(id: 'quizzes', label: 'Quizzes', icon: Icons.checklist_outlined, route: '/auditor/quizzes'),
    AfaqNavItem(
      id: 'inbox',
      label: 'Inbox',
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
      initialId: 'command',
      pages: {
        for (final item in _items)
          item.id: item.id == 'command'
              ? const AuditorWorkspacePage()
              : _AuditorPlaceholder(title: item.label, subtitle: item.route),
      },
    );
  }
}

class AuditorWorkspacePage extends StatelessWidget {
  const AuditorWorkspacePage({super.key});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final desktop = width >= 1160;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1500),
        child: SingleChildScrollView(
          padding: EdgeInsets.all(width >= 1100 ? 32 : width >= 700 ? 24 : 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const StatusPill(
                label: 'REVIEW CONTROL ROOM',
                backgroundColor: AfaqStatusColors.goodBg,
                borderColor: AfaqStatusColors.goodBorder,
                textColor: AfaqStatusColors.goodText,
              ),
              const SizedBox(height: 18),
              Text(
                'Auditor Workspace',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontSize: width >= 900 ? 48 : 30,
                    ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Review courses, quizzes, notifications, and content quality from one focused workspace.',
                style: TextStyle(color: AfaqColors.slate500, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 26),
              GridView.count(
                crossAxisCount: width >= 1120 ? 4 : width >= 680 ? 2 : 1,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: width >= 1120 ? 1.85 : 2.5,
                children: const [
                  _AuditorMetric('Review courses', '15', Icons.fact_check_outlined, [AfaqColors.primary, AfaqColors.sky400]),
                  _AuditorMetric('Categories', '9', Icons.category_outlined, [AfaqColors.emerald500, AfaqColors.teal400]),
                  _AuditorMetric('Quizzes', '28', Icons.checklist_outlined, [AfaqColors.fuchsia500, Color(0xFFFB7185)]),
                  _AuditorMetric('Unread', '6', Icons.notifications_none, [AfaqColors.amber500, AfaqColors.orange400]),
                ],
              ),
              const SizedBox(height: 24),
              Flex(
                direction: desktop ? Axis.horizontal : Axis.vertical,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(flex: 9, child: _CourseReviewList()),
                  SizedBox(width: desktop ? 24 : 0, height: desktop ? 0 : 24),
                  const Expanded(flex: 13, child: _CourseReviewDetail()),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuditorMetric extends StatelessWidget {
  const _AuditorMetric(this.title, this.value, this.icon, this.colors);

  final String title;
  final String value;
  final IconData icon;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 28,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: colors),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: Colors.white),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(value, style: Theme.of(context).textTheme.titleLarge),
              Text(title, style: const TextStyle(color: AfaqColors.slate500, fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
    );
  }
}

class _CourseReviewList extends StatelessWidget {
  const _CourseReviewList();

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 28,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            decoration: InputDecoration(
              hintText: 'Search courses',
              prefixIcon: const Icon(Icons.search),
              filled: true,
              fillColor: AfaqColors.slate100,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AfaqColors.slate200),
              ),
            ),
          ),
          const SizedBox(height: 18),
          for (final title in const ['Advanced Flutter', 'Learning Analytics', 'Instructor Toolkit'])
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: title == 'Advanced Flutter' ? AfaqColors.slate950 : Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: title == 'Advanced Flutter' ? AfaqColors.slate950 : AfaqColors.slate200),
              ),
              child: Text(
                title,
                style: TextStyle(
                  color: title == 'Advanced Flutter' ? Colors.white : AfaqColors.slate950,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _CourseReviewDetail extends StatelessWidget {
  const _CourseReviewDetail();

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 28,
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Advanced Flutter', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text('12 units • 42 lessons • waiting for final review', style: TextStyle(color: AfaqColors.slate500)),
          const SizedBox(height: 22),
          const Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              StatusPill(
                label: 'CONTENT GOOD',
                backgroundColor: AfaqStatusColors.goodBg,
                borderColor: AfaqStatusColors.goodBorder,
                textColor: AfaqStatusColors.goodText,
              ),
              StatusPill(
                label: '2 CHANGES',
                backgroundColor: AfaqStatusColors.warnBg,
                borderColor: AfaqStatusColors.warnBorder,
                textColor: AfaqStatusColors.warnText,
              ),
            ],
          ),
          const SizedBox(height: 24),
          for (final lesson in const ['State management lesson', 'Animation chapter', 'Final quiz'])
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AfaqColors.primary.withValues(alpha: .06),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AfaqColors.primary.withValues(alpha: .18)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.article_outlined, color: AfaqColors.primary),
                  const SizedBox(width: 12),
                  Expanded(child: Text(lesson, style: const TextStyle(fontWeight: FontWeight.w800))),
                ],
              ),
            ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.check_rounded),
                label: const Text('Approved'),
                style: FilledButton.styleFrom(backgroundColor: AfaqColors.emerald600),
              ),
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.edit_note_rounded),
                label: const Text('Changes'),
                style: FilledButton.styleFrom(backgroundColor: AfaqColors.amber500),
              ),
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.close_rounded),
                label: const Text('Rejected'),
                style: FilledButton.styleFrom(backgroundColor: AfaqColors.rose600),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AuditorPlaceholder extends StatelessWidget {
  const _AuditorPlaceholder({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AfaqPanel(
        radius: 28,
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
