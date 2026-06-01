import 'package:flutter/material.dart';

import '../../../app/app.dart';
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
    final lang = localeNotifier.value.languageCode;
    final data = _data;

    return AuditorPageScaffold(
      title: auditorText('dashboard', lang),
      subtitle: auditorText('dashboard_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? AuditorErrorPanel(message: _error!, onRetry: _load)
              : Column(
                  children: [
                    _AuditHero(data: data),
                    const SizedBox(height: 18),
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
                      childAspectRatio: MediaQuery.sizeOf(context).width >= 1100
                          ? 1.28
                          : 2.0,
                      children: [
                        _MetricCard(
                          label: auditorText('review_courses', lang),
                          value: '${data?.courses.length ?? 0}',
                          icon: Icons.fact_check_outlined,
                          color: const Color(0xFF2563EB),
                        ),
                        _MetricCard(
                          label: auditorText('categories', lang),
                          value: '${data?.categoriesCount ?? 0}',
                          icon: Icons.layers_outlined,
                          color: const Color(0xFF059669),
                        ),
                        _MetricCard(
                          label: auditorText('quizzes_count', lang),
                          value: '${data?.quizzesCount ?? 0}',
                          icon: Icons.rule_folder_outlined,
                          color: const Color(0xFFD946EF),
                        ),
                        _MetricCard(
                          label: auditorText('notifications_count', lang),
                          value: '${data?.notificationsCount ?? 0}',
                          icon: Icons.notifications_active_outlined,
                          color: const Color(0xFFF59E0B),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final stacked = constraints.maxWidth < 980;
                        if (stacked) {
                          return Column(
                            children: [
                              _PriorityPanel(data: data),
                              const SizedBox(height: 16),
                              _QuickQueuePanel(data: data),
                            ],
                          );
                        }
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(flex: 3, child: _PriorityPanel(data: data)),
                            const SizedBox(width: 16),
                            Expanded(flex: 2, child: _QuickQueuePanel(data: data)),
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
      auditorName: auditorString(
        user['name'],
        fallback: auditorText('auditor', localeNotifier.value.languageCode),
      ),
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
    final lang = localeNotifier.value.languageCode;
    return _DashboardCourse(
      id: auditorInt(map['id']),
      title: auditorTextOf(
        map['title_translations'] ?? map['title'],
        fallback: auditorText('course_label', lang),
      ),
      status: auditorStatus(map['status']),
      description: auditorTextOf(
        map['description_translations'] ?? map['description'],
        fallback: auditorText('queue_empty_hint', lang),
      ),
    );
  }
}

class _AuditHero extends StatelessWidget {
  const _AuditHero({required this.data});

  final _AuditorDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    return AfaqPanel(
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0xFFDBEAFE),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(
              Icons.shield_outlined,
              color: Color(0xFF1D4ED8),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  auditorText('workspace', lang),
                  style: const TextStyle(
                    color: AfaqColors.slate500,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  auditorFormatText(
                    'signed_in_as',
                    lang,
                    values: {'name': data?.auditorName ?? auditorText('auditor', lang)},
                  ),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final labelColor = isDark ? AfaqColors.slate300 : AfaqColors.slate500;
    final valueColor =
        isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: color.withValues(alpha: .14),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color),
          ),
          const Spacer(),
          Text(
            label,
            style: TextStyle(
              color: labelColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: valueColor,
                ),
          ),
        ],
      ),
    );
  }
}

class _PriorityPanel extends StatelessWidget {
  const _PriorityPanel({required this.data});

  final _AuditorDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor =
        isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;
    final course = data?.courses.isNotEmpty == true ? data!.courses.first : null;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            auditorText('priority_review', lang),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
          ),
          const SizedBox(height: 16),
          if (course == null)
            Text(
              auditorText('queue_empty_hint', lang),
              style: TextStyle(color: secondary),
            )
          else ...[
            Text(
              course.title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: titleColor,
                  ),
            ),
            const SizedBox(height: 10),
            Text(
              course.description,
              style: TextStyle(color: secondary, height: 1.4),
            ),
            const SizedBox(height: 16),
            AuditorStatusChip(
              label: course.status,
              tone: course.status.toLowerCase().contains('review')
                  ? AuditorStatusTone.warn
                  : AuditorStatusTone.info,
            ),
          ],
        ],
      ),
    );
  }
}

class _QuickQueuePanel extends StatelessWidget {
  const _QuickQueuePanel({required this.data});

  final _AuditorDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final lang = localeNotifier.value.languageCode;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor =
        isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            auditorText('queue', lang),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: titleColor,
                ),
          ),
          const SizedBox(height: 14),
          if (data?.courses.isEmpty ?? true)
            Text(
              auditorText('queue_empty_hint', lang),
              style: TextStyle(color: secondary),
            )
          else
            for (final course in data!.courses.take(4))
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: .05)
                        : AfaqColors.slate100.withValues(alpha: .6),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.article_outlined, color: AfaqColors.primary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          course.title,
                          style: TextStyle(
                            color: titleColor,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
