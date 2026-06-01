import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/theme/afaq_colors.dart';
import '../../../core/widgets/afaq_panel.dart';
import '../data/student_dashboard_service.dart';
import 'student_page_shared.dart';

class StudentDashboardPage extends StatefulWidget {
  const StudentDashboardPage({super.key});

  @override
  State<StudentDashboardPage> createState() => _StudentDashboardPageState();
}

class _StudentDashboardPageState extends State<StudentDashboardPage> {
  final _service = const StudentDashboardService();

  bool _loading = true;
  String? _error;
  _DashboardData? _data;

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
      final response = await _service.getDashboard(
        locale: localeNotifier.value.languageCode,
      );
      if (!mounted) return;
      setState(() {
        _data = _DashboardData.fromMap(response.data ?? <String, dynamic>{});
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

    return StudentPageScaffold(
      title: studentText('dashboard', lang),
      subtitle: studentText('dashboard_subtitle', lang),
      onRefresh: _load,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? StudentErrorPanel(message: _error!, onRetry: _load)
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
                      childAspectRatio: MediaQuery.sizeOf(context).width >= 1100
                          ? 1.25
                          : 2.1,
                      children: [
                        _StatCard(
                          label: studentText('total_courses', lang),
                          value: '${_data?.totalCourses ?? 0}',
                          icon: Icons.menu_book_outlined,
                          color: AfaqColors.blue500,
                        ),
                        _StatCard(
                          label: studentText('average_progress', lang),
                          value: '${(_data?.averageProgress ?? 0).toStringAsFixed(1)}%',
                          icon: Icons.trending_up_rounded,
                          color: AfaqColors.emerald500,
                        ),
                        _StatCard(
                          label: studentText('active_courses', lang),
                          value: '${_data?.activeCourses ?? 0}',
                          icon: Icons.play_circle_fill_rounded,
                          color: AfaqColors.purple500,
                        ),
                        _StatCard(
                          label: studentText('completed_courses', lang),
                          value: '${_data?.completedCourses ?? 0}',
                          icon: Icons.workspace_premium_rounded,
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
                              _CoursesPanel(
                                title: studentText('recent_courses', lang),
                                courses: _data?.recentCourses ?? const [],
                              ),
                              const SizedBox(height: 16),
                              _ProgressPanel(
                                title: studentText('progress_by_course', lang),
                                rows: _data?.progressByCourse ?? const [],
                              ),
                            ],
                          );
                        }

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: _CoursesPanel(
                                title: studentText('recent_courses', lang),
                                courses: _data?.recentCourses ?? const [],
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _ProgressPanel(
                                title: studentText('progress_by_course', lang),
                                rows: _data?.progressByCourse ?? const [],
                              ),
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

class _DashboardData {
  const _DashboardData({
    required this.totalCourses,
    required this.activeCourses,
    required this.completedCourses,
    required this.averageProgress,
    required this.recentCourses,
    required this.progressByCourse,
  });

  final int totalCourses;
  final int activeCourses;
  final int completedCourses;
  final double averageProgress;
  final List<_CourseRow> recentCourses;
  final List<_ProgressRow> progressByCourse;

  factory _DashboardData.fromMap(Map<String, dynamic> payload) {
    final data = unwrapDataMap(payload);
    final summary = asMap(data['summary']) ?? <String, dynamic>{};

    return _DashboardData(
      totalCourses: readInt(summary['total_courses']),
      activeCourses: readInt(summary['active_courses']),
      completedCourses: readInt(summary['completed_courses']),
      averageProgress: readDouble(summary['average_progress']),
      recentCourses: asListOfMaps(data['recent_courses'])
          .map(_CourseRow.fromMap)
          .toList(growable: false),
      progressByCourse: asListOfMaps(data['progress_by_course'])
          .map(_ProgressRow.fromMap)
          .toList(growable: false),
    );
  }
}

class _CourseRow {
  const _CourseRow({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;

  factory _CourseRow.fromMap(Map<String, dynamic> map) {
    return _CourseRow(
      id: readInt(map['id'] ?? map['course_id']),
      title: readString(map['title'] ?? map['name'], fallback: 'Untitled Course'),
    );
  }
}

class _ProgressRow {
  const _ProgressRow({
    required this.title,
    required this.progress,
  });

  final String title;
  final double progress;

  factory _ProgressRow.fromMap(Map<String, dynamic> map) {
    return _ProgressRow(
      title: readString(
        map['course_title'] ?? map['title'] ?? map['name'],
        fallback: 'Untitled Course',
      ),
      progress: readDouble(
        map['average_progress'] ?? map['progress'],
      ).clamp(0, 100),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
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
    final valueColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;

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
            style: TextStyle(
              color: labelColor,
              fontWeight: FontWeight.w800,
              fontSize: 12,
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

class _CoursesPanel extends StatelessWidget {
  const _CoursesPanel({
    required this.title,
    required this.courses,
  });

  final String title;
  final List<_CourseRow> courses;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final itemBg = isDark
        ? Colors.white.withValues(alpha: .06)
        : AfaqColors.slate100.withValues(alpha: .55);
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 16),
          if (courses.isEmpty)
            Text(
              'No recent courses yet.',
              style: TextStyle(color: secondary),
            )
          else
            for (final course in courses)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: itemBg,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.book_outlined, color: AfaqColors.blue500),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        course.title,
                        style: TextStyle(color: titleColor),
                      ),
                    ),
                    Text(
                      '#${course.id}',
                      style: TextStyle(color: secondary),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

class _ProgressPanel extends StatelessWidget {
  const _ProgressPanel({
    required this.title,
    required this.rows,
  });

  final String title;
  final List<_ProgressRow> rows;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? AfaqColors.foregroundDark : AfaqColors.foregroundLight;
    final secondary = isDark ? AfaqColors.slate300 : AfaqColors.slate500;

    return AfaqPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 16),
          if (rows.isEmpty)
            Text(
              'No progress records yet.',
              style: TextStyle(color: secondary),
            )
          else
            for (final row in rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            row.title,
                            style: TextStyle(color: titleColor),
                          ),
                        ),
                        Text(
                          '${row.progress.toStringAsFixed(1)}%',
                          style: TextStyle(
                            color: titleColor,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: row.progress / 100,
                      minHeight: 8,
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
