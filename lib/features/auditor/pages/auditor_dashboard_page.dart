import 'package:flutter/material.dart';

import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/auditor_workspace_service.dart';
import 'auditor_page_shared.dart';

class AuditorDashboardPage extends StatefulWidget {
  const AuditorDashboardPage({super.key});

  @override
  State<AuditorDashboardPage> createState() => _AuditorDashboardPageState();
}

class _AuditorDashboardPageState extends State<AuditorDashboardPage> {
  final _service = const AuditorWorkspaceService();

  bool _loading = true;
  String? _error;
  _AuditorDashboardData? _data;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await _service.loadInitial();
      if (!mounted) return;
      setState(() {
        _data = _AuditorDashboardData.fromResponses(results);
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return AuditorPageScaffold(
      title: 'Auditor Command',
      subtitle: 'Review courses, quizzes, notifications, and profile data from API.',
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : Column(
                  children: [
                    GridView.count(
                      crossAxisCount: MediaQuery.sizeOf(context).width >= 1100
                          ? 4
                          : MediaQuery.sizeOf(context).width >= 700
                              ? 2
                              : 1,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: MediaQuery.sizeOf(context).width >= 1100 ? 1.3 : 2.1,
                      children: [
                        _MetricCard(
                          label: 'Review Courses',
                          value: '${data?.courses.length ?? 0}',
                          icon: Icons.book_outlined,
                          color: AfaqColors.primary,
                        ),
                        _MetricCard(
                          label: 'Categories',
                          value: '${data?.categoriesCount ?? 0}',
                          icon: Icons.layers_outlined,
                          color: AfaqColors.emerald500,
                        ),
                        _MetricCard(
                          label: 'Quizzes',
                          value: '${data?.quizzesCount ?? 0}',
                          icon: Icons.quiz_outlined,
                          color: AfaqColors.fuchsia500,
                        ),
                        _MetricCard(
                          label: 'Unread',
                          value: '${data?.notificationsCount ?? 0}',
                          icon: Icons.notifications_none,
                          color: AfaqColors.amber500,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final stacked = constraints.maxWidth < 980;
                        if (stacked) {
                          return Column(
                            children: [
                              _SelectedCoursePanel(data: data),
                              const SizedBox(height: 16),
                              _QuickPanels(data: data),
                            ],
                          );
                        }
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(flex: 3, child: _SelectedCoursePanel(data: data)),
                            const SizedBox(width: 16),
                            Expanded(flex: 2, child: _QuickPanels(data: data)),
                          ],
                        );
                      },
                    ),
                  ],
                ),
    );
  }
}

class _AuditorDashboardData {
  const _AuditorDashboardData({
    required this.auditorName,
    required this.courses,
    required this.categoriesCount,
    required this.quizzesCount,
    required this.notificationsCount,
  });

  final String auditorName;
  final List<_DashboardCourse> courses;
  final int categoriesCount;
  final int quizzesCount;
  final int notificationsCount;

  factory _AuditorDashboardData.fromResponses(AuditorWorkspaceInitialData data) {
    final profile = unwrapAuditorMap(data.profile.data);
    final user = auditorMap(profile['user']) ?? profile;
    return _AuditorDashboardData(
      auditorName: auditorString(user['name'], fallback: 'Auditor'),
      courses: unwrapAuditorList(data.courses.data)
          .map(_DashboardCourse.fromMap)
          .toList(growable: false),
      categoriesCount: unwrapAuditorList(data.categories.data).length,
      quizzesCount: unwrapAuditorList(data.quizzes.data).length,
      notificationsCount: unwrapAuditorList(data.unreadNotifications.data).length,
    );
  }
}

class _DashboardCourse {
  const _DashboardCourse({
    required this.id,
    required this.title,
    required this.status,
    required this.description,
  });

  final int id;
  final String title;
  final String status;
  final String description;

  factory _DashboardCourse.fromMap(Map<String, dynamic> map) {
    return _DashboardCourse(
      id: auditorInt(map['id']),
      title: auditorTextOf(map['title'], fallback: 'Course'),
      status: auditorStatus(map['status']),
      description: auditorString(map['description'], fallback: 'No description available.'),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color),
          ),
          const Spacer(),
          Text(label, style: const TextStyle(color: AfaqColors.slate500, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _SelectedCoursePanel extends StatelessWidget {
  const _SelectedCoursePanel({required this.data});

  final _AuditorDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final course = data?.courses.isNotEmpty == true ? data!.courses.first : null;
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Priority Review',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 16),
          if (course == null)
            const Text('No courses currently waiting for review.')
          else ...[
            Text(
              course.title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(course.description, style: const TextStyle(color: AfaqColors.slate500)),
            const SizedBox(height: 16),
            AuditorStatusChip(
              label: course.status,
              tone: course.status.toLowerCase().contains('review')
                  ? AuditorStatusTone.warn
                  : AuditorStatusTone.neutral,
            ),
          ],
        ],
      ),
    );
  }
}

class _QuickPanels extends StatelessWidget {
  const _QuickPanels({required this.data});

  final _AuditorDashboardData? data;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AfaqPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Workspace',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              Text('Signed in as ${data?.auditorName ?? 'Auditor'}'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AfaqPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Recent Queue',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 12),
              if (data?.courses.isEmpty ?? true)
                const Text('No queued courses.')
              else
                for (final course in data!.courses.take(4))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        const Icon(Icons.article_outlined, color: AfaqColors.primary),
                        const SizedBox(width: 10),
                        Expanded(child: Text(course.title)),
                      ],
                    ),
                  ),
            ],
          ),
        ),
      ],
    );
  }
}
