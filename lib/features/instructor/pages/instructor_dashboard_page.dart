import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/instructor_dashboard_service.dart';
import 'instructor_page_shared.dart';

class InstructorDashboardPage extends StatefulWidget {
  const InstructorDashboardPage({super.key});

  @override
  State<InstructorDashboardPage> createState() => _InstructorDashboardPageState();
}

class _InstructorDashboardPageState extends State<InstructorDashboardPage> {
  final _service = const InstructorDashboardService();

  bool _loading = true;
  String? _error;
  _InstructorDashboardData? _data;

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
      final results = await Future.wait([
        _service.getDashboard(),
        _service.getMyCourses(),
      ]);

      final dashboard = unwrapInstructorMap(results[0].data);
      final courses = unwrapInstructorList(results[1].data);
      if (!mounted) return;
      setState(() {
        _data = _InstructorDashboardData.fromPayload(dashboard, courses);
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

    return InstructorPageScaffold(
      title: instructorText('dashboard', lang),
      subtitle: instructorText('dashboard_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? InstructorErrorPanel(message: _error!, onRetry: _load)
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
                      childAspectRatio: MediaQuery.sizeOf(context).width >= 1100 ? 1.25 : 2.0,
                      children: [
                        _InstructorStatCard(
                          label: 'Students',
                          value: '${data?.totalStudents ?? 0}',
                          icon: Icons.groups_outlined,
                          color: AfaqColors.blue500,
                        ),
                        _InstructorStatCard(
                          label: 'Courses',
                          value: '${data?.totalCourses ?? 0}',
                          icon: Icons.menu_book_outlined,
                          color: AfaqColors.purple500,
                        ),
                        _InstructorStatCard(
                          label: 'Pending Assignments',
                          value: '${data?.pendingAssignments ?? 0}',
                          icon: Icons.assignment_late_outlined,
                          color: AfaqColors.emerald500,
                        ),
                        _InstructorStatCard(
                          label: 'Top Courses',
                          value: '${data?.topCourseCount ?? 0}',
                          icon: Icons.star_outline,
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
                              _InstructorCoursesPanel(courses: data?.courses ?? const []),
                              const SizedBox(height: 16),
                              _InstructorMetricsPanel(data: data),
                            ],
                          );
                        }

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 3,
                              child: _InstructorCoursesPanel(courses: data?.courses ?? const []),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              flex: 2,
                              child: _InstructorMetricsPanel(data: data),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
    );
  }
}

class _InstructorDashboardData {
  const _InstructorDashboardData({
    required this.totalCourses,
    required this.totalStudents,
    required this.pendingAssignments,
    required this.topCourseCount,
    required this.courses,
  });

  final int totalCourses;
  final int totalStudents;
  final int pendingAssignments;
  final int topCourseCount;
  final List<_InstructorCourseSummary> courses;

  factory _InstructorDashboardData.fromPayload(
    Map<String, dynamic> dashboard,
    List<Map<String, dynamic>> coursesPayload,
  ) {
    final summary = instructorMap(dashboard['summary']) ?? <String, dynamic>{};
    final topRows = instructorList(dashboard['top_performing_courses']);
    return _InstructorDashboardData(
      totalCourses: instructorInt(summary['total_courses'], fallback: coursesPayload.length),
      totalStudents: instructorInt(summary['total_students']),
      pendingAssignments: instructorInt(summary['pending_assignments']),
      topCourseCount: topRows.length,
      courses: coursesPayload
          .map(_InstructorCourseSummary.fromMap)
          .toList(growable: false),
    );
  }
}

class _InstructorCourseSummary {
  const _InstructorCourseSummary({
    required this.id,
    required this.title,
    required this.status,
    required this.unitsCount,
  });

  final int id;
  final String title;
  final String status;
  final int unitsCount;

  factory _InstructorCourseSummary.fromMap(Map<String, dynamic> map) {
    final units = map['units'];
    final unitsCount = units is List ? units.length : instructorInt(map['units_count']);
    return _InstructorCourseSummary(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'],
        localeNotifier.value.languageCode,
        fallback: instructorString(map['title'], fallback: 'Untitled Course'),
      ),
      status: instructorString(map['status'], fallback: 'draft'),
      unitsCount: unitsCount,
    );
  }
}

class _InstructorStatCard extends StatelessWidget {
  const _InstructorStatCard({
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
          Text(
            label,
            style: const TextStyle(
              color: AfaqColors.slate500,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _InstructorCoursesPanel extends StatelessWidget {
  const _InstructorCoursesPanel({required this.courses});

  final List<_InstructorCourseSummary> courses;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Active Courses',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          if (courses.isEmpty)
            const Text('No courses found for this instructor.')
          else
            for (final course in courses.take(6))
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AfaqColors.slate100.withValues(alpha: .55),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: AfaqColors.primary.withValues(alpha: .12),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.play_lesson_outlined, color: AfaqColors.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.title,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${course.unitsCount} units • ${course.status}',
                            style: const TextStyle(color: AfaqColors.slate500),
                          ),
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

class _InstructorMetricsPanel extends StatelessWidget {
  const _InstructorMetricsPanel({required this.data});

  final _InstructorDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final totalCourses = (data?.totalCourses ?? 0).toDouble();
    final students = (data?.totalStudents ?? 0).toDouble();
    final pending = (data?.pendingAssignments ?? 0).toDouble();

    final completion = totalCourses == 0
        ? 0.0
        : (students / (totalCourses * 25)).clamp(0, 1).toDouble();
    final engagement = totalCourses == 0
        ? 0.0
        : ((totalCourses - pending) / totalCourses).clamp(0, 1).toDouble();

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AfaqColors.primaryButton, Color(0xFF7E22CE)],
            ),
            borderRadius: BorderRadius.circular(32),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lightbulb_outline, color: Colors.white),
              SizedBox(height: 12),
              Text(
                'Teaching Tip',
                style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 8),
              Text(
                'Review the courses with the highest pending workload before publishing the next unit.',
                style: TextStyle(color: Colors.white70, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AfaqPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Performance',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 16),
              _MetricBar(label: 'Completion', value: completion),
              const SizedBox(height: 12),
              _MetricBar(label: 'Engagement', value: engagement),
            ],
          ),
        ),
      ],
    );
  }
}

class _MetricBar extends StatelessWidget {
  const _MetricBar({required this.label, required this.value});

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            Text('${(value * 100).round()}%'),
          ],
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: value,
          minHeight: 8,
          borderRadius: BorderRadius.circular(999),
        ),
      ],
    );
  }
}
