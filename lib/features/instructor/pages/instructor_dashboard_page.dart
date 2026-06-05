import 'dart:math' as math;

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
  bool _assessmentLoading = false;
  String? _error;
  _InstructorDashboardData? _data;
  List<_InstructorStudent> _students = const [];
  int? _selectedCourseId;
  int? _selectedStudentId;
  String _search = '';
  _AssessmentData? _assessment;
  final Map<String, _AssessmentData> _assessmentCache = {};

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
        _service.getStudents(),
      ]);

      final dashboard = unwrapInstructorMap(results[0].data);
      final courses = unwrapInstructorList(results[1].data);
      final students = unwrapInstructorList(results[2].data);
      final data = _InstructorDashboardData.fromPayload(dashboard, courses);
      final parsedStudents = students
          .map(_InstructorStudent.fromMap)
          .where((student) => student.id != 0)
          .toList(growable: false);

      final nextCourseId = _selectedCourseId != null &&
              data.courseOptions.any((course) => course.id == _selectedCourseId)
          ? _selectedCourseId
          : data.courseOptions.isNotEmpty
              ? data.courseOptions.first.id
              : null;
      final nextStudentId = _selectedStudentId != null &&
              parsedStudents.any((student) => student.id == _selectedStudentId)
          ? _selectedStudentId
          : parsedStudents.isNotEmpty
              ? parsedStudents.first.id
              : null;

      if (!mounted) return;
      setState(() {
        _data = data;
        _students = parsedStudents;
        _selectedCourseId = nextCourseId;
        _selectedStudentId = nextStudentId;
        _loading = false;
      });

      await _loadAssessment();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadAssessment() async {
    final courseId = _selectedCourseId;
    final studentId = _selectedStudentId;
    if (courseId == null || studentId == null) {
      if (!mounted) return;
      setState(() => _assessment = null);
      return;
    }

    final cacheKey = '$courseId:$studentId';
    final cached = _assessmentCache[cacheKey];
    if (cached != null) {
      setState(() => _assessment = cached);
      return;
    }

    setState(() => _assessmentLoading = true);
    try {
      final response = await _service.getAssessmentProgress(
        courseId: courseId,
        studentId: studentId,
      );
      final parsed = _AssessmentData.fromPayload(unwrapInstructorMap(response.data));
      _assessmentCache[cacheKey] = parsed;
      if (!mounted) return;
      setState(() {
        _assessment = parsed;
        _assessmentLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _assessment = null;
        _assessmentLoading = false;
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
              : data == null
                  ? InstructorEmptyPanel(
                      message: instructorText('empty', lang),
                      icon: Icons.dashboard_outlined,
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _DashboardHero(
                          data: data,
                          onManageCourses: () {},
                        ),
                        const SizedBox(height: 20),
                        _DashboardStatsRow(data: data),
                        const SizedBox(height: 24),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final stacked = constraints.maxWidth < 1120;
                            if (stacked) {
                              return Column(
                                children: [
                                  _CoursePerformancePanel(data: data),
                                  const SizedBox(height: 16),
                                  _AssessmentSpotlightPanel(
                                    data: data,
                                    students: _students,
                                    selectedCourseId: _selectedCourseId,
                                    selectedStudentId: _selectedStudentId,
                                    assessment: _assessment,
                                    loading: _assessmentLoading,
                                    onSelectCourse: (value) async {
                                      setState(() => _selectedCourseId = value);
                                      await _loadAssessment();
                                    },
                                    onSelectStudent: (value) async {
                                      setState(() => _selectedStudentId = value);
                                      await _loadAssessment();
                                    },
                                  ),
                                ],
                              );
                            }

                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  flex: 7,
                                  child: _CoursePerformancePanel(data: data),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  flex: 5,
                                  child: _AssessmentSpotlightPanel(
                                    data: data,
                                    students: _students,
                                    selectedCourseId: _selectedCourseId,
                                    selectedStudentId: _selectedStudentId,
                                    assessment: _assessment,
                                    loading: _assessmentLoading,
                                    onSelectCourse: (value) async {
                                      setState(() => _selectedCourseId = value);
                                      await _loadAssessment();
                                    },
                                    onSelectStudent: (value) async {
                                      setState(() => _selectedStudentId = value);
                                      await _loadAssessment();
                                    },
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 24),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final filteredStudents = _students.where((student) {
                              final query = _search.trim().toLowerCase();
                              if (query.isEmpty) return true;
                              return student.searchBlob.contains(query);
                            }).toList(growable: false);
                            final graph = _buildStudentGraph(filteredStudents);
                            final stacked = constraints.maxWidth < 1120;
                            if (stacked) {
                              return Column(
                                children: [
                                  _StudentGraphPanel(graph: graph),
                                  const SizedBox(height: 16),
                                  _StudentRosterPanel(
                                    students: filteredStudents,
                                    selectedStudentId: _selectedStudentId,
                                    search: _search,
                                    onSearchChanged: (value) {
                                      setState(() => _search = value);
                                    },
                                    onSelectStudent: (value) async {
                                      setState(() => _selectedStudentId = value);
                                      await _loadAssessment();
                                    },
                                  ),
                                ],
                              );
                            }

                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  flex: 4,
                                  child: _StudentGraphPanel(graph: graph),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  flex: 6,
                                  child: _StudentRosterPanel(
                                    students: filteredStudents,
                                    selectedStudentId: _selectedStudentId,
                                    search: _search,
                                    onSearchChanged: (value) {
                                      setState(() => _search = value);
                                    },
                                    onSelectStudent: (value) async {
                                      setState(() => _selectedStudentId = value);
                                      await _loadAssessment();
                                    },
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 24),
                        _TopCoursesPanel(courses: data.topCourses),
                      ],
                    ),
    );
  }

  List<_GraphBucket> _buildStudentGraph(List<_InstructorStudent> students) {
    final counts = <String, int>{};
    for (final student in students) {
      final label = student.name.trim().isEmpty
          ? '#'
          : student.name.trim().substring(0, 1).toUpperCase();
      counts[label] = (counts[label] ?? 0) + 1;
    }
    final buckets = counts.entries
        .map((entry) => _GraphBucket(label: entry.key, value: entry.value))
        .toList(growable: false)
      ..sort((a, b) => b.value.compareTo(a.value));
    return buckets.take(8).toList(growable: false);
  }
}

class _InstructorDashboardData {
  const _InstructorDashboardData({
    required this.summary,
    required this.courseStats,
    required this.topCourses,
    required this.courseOptions,
  });

  final _DashboardSummary summary;
  final List<_CourseStat> courseStats;
  final List<_TopCourse> topCourses;
  final List<_CourseOption> courseOptions;

  factory _InstructorDashboardData.fromPayload(
    Map<String, dynamic> dashboard,
    List<Map<String, dynamic>> coursesPayload,
  ) {
    final summary = instructorMap(dashboard['summary']) ?? <String, dynamic>{};
    final courseStats = instructorList(dashboard['course_statistics'])
        .map(_CourseStat.fromMap)
        .where((item) => item.id != 0)
        .toList(growable: false);
    final topCourses = instructorList(dashboard['top_performing_courses'])
        .map(_TopCourse.fromMap)
        .where((item) => item.id != 0)
        .toList(growable: false);
    final courseOptions = courseStats.isNotEmpty
        ? courseStats
            .map((item) => _CourseOption(id: item.id, title: item.title))
            .toList(growable: false)
        : coursesPayload
            .map(_CourseOption.fromMap)
            .where((item) => item.id != 0)
            .toList(growable: false);

    return _InstructorDashboardData(
      summary: _DashboardSummary(
        totalCourses: instructorInt(
          summary['total_courses'],
          fallback: courseOptions.length,
        ),
        totalStudents: instructorInt(summary['total_students']),
        pendingAssignments: instructorInt(summary['pending_assignments']),
      ),
      courseStats: courseStats,
      topCourses: topCourses,
      courseOptions: courseOptions,
    );
  }

  double get averageProgress {
    if (courseStats.isEmpty) return 0;
    final total = courseStats.fold<double>(
      0,
      (sum, item) => sum + item.averageProgress,
    );
    return total / courseStats.length;
  }
}

class _DashboardSummary {
  const _DashboardSummary({
    required this.totalCourses,
    required this.totalStudents,
    required this.pendingAssignments,
  });

  final int totalCourses;
  final int totalStudents;
  final int pendingAssignments;
}

class _CourseOption {
  const _CourseOption({
    required this.id,
    required this.title,
  });

  final int id;
  final String title;

  factory _CourseOption.fromMap(Map<String, dynamic> map) {
    final lang = localeNotifier.value.languageCode;
    return _CourseOption(
      id: instructorInt(map['id']),
      title: instructorLocalized(
        map['title_translations'] ?? map['title'],
        lang,
        fallback: instructorString(map['title'], fallback: 'Course'),
      ),
    );
  }
}

class _CourseStat {
  const _CourseStat({
    required this.id,
    required this.title,
    required this.totalStudents,
    required this.activeStudents,
    required this.completedStudents,
    required this.averageProgress,
  });

  final int id;
  final String title;
  final int totalStudents;
  final int activeStudents;
  final int completedStudents;
  final double averageProgress;

  factory _CourseStat.fromMap(Map<String, dynamic> map) {
    return _CourseStat(
      id: instructorInt(map['course_id']),
      title: instructorString(map['title'], fallback: 'Untitled'),
      totalStudents: instructorInt(map['total_students']),
      activeStudents: instructorInt(map['active_students']),
      completedStudents: instructorInt(map['completed_students']),
      averageProgress: instructorDouble(map['average_progress']),
    );
  }
}

class _TopCourse {
  const _TopCourse({
    required this.id,
    required this.title,
    required this.averageProgress,
    required this.completionCount,
  });

  final int id;
  final String title;
  final double averageProgress;
  final int completionCount;

  factory _TopCourse.fromMap(Map<String, dynamic> map) {
    return _TopCourse(
      id: instructorInt(map['course_id']),
      title: instructorString(map['title'], fallback: 'Untitled'),
      averageProgress: instructorDouble(map['average_progress']),
      completionCount: instructorInt(map['completion_count']),
    );
  }
}

class _InstructorStudent {
  const _InstructorStudent({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
  });

  final int id;
  final String name;
  final String email;
  final String phone;

  String get searchBlob => '$name $email $phone'.toLowerCase();

  factory _InstructorStudent.fromMap(Map<String, dynamic> map) {
    return _InstructorStudent(
      id: instructorInt(map['id']),
      name: instructorString(map['name'], fallback: 'Student'),
      email: instructorString(map['email']),
      phone: instructorString(map['phone']),
    );
  }
}

class _AssessmentData {
  const _AssessmentData({
    required this.progress,
    required this.certificateEligible,
  });

  final _AssessmentProgress? progress;
  final bool certificateEligible;

  factory _AssessmentData.fromPayload(Map<String, dynamic> payload) {
    final progressMap = instructorMap(payload['progress']);
    final certificateMap = instructorMap(payload['certificate']);
    return _AssessmentData(
      progress: progressMap == null ? null : _AssessmentProgress.fromMap(progressMap),
      certificateEligible: certificateMap?['eligible'] == true,
    );
  }
}

class _AssessmentProgress {
  const _AssessmentProgress({
    required this.requiredQuizzesCount,
    required this.allRequiredQuizzesGraded,
    required this.passedRequiredQuizzesCount,
    required this.failedRequiredQuizzesCount,
    required this.weightedPercentage,
    required this.averagePercentage,
    required this.quizzes,
  });

  final int requiredQuizzesCount;
  final bool allRequiredQuizzesGraded;
  final int passedRequiredQuizzesCount;
  final int failedRequiredQuizzesCount;
  final double weightedPercentage;
  final double averagePercentage;
  final List<_AssessmentQuiz> quizzes;

  factory _AssessmentProgress.fromMap(Map<String, dynamic> map) {
    return _AssessmentProgress(
      requiredQuizzesCount: instructorInt(map['required_quizzes_count']),
      allRequiredQuizzesGraded: map['all_required_quizzes_graded'] == true,
      passedRequiredQuizzesCount: instructorInt(map['passed_required_quizzes_count']),
      failedRequiredQuizzesCount: instructorInt(map['failed_required_quizzes_count']),
      weightedPercentage: instructorDouble(map['weighted_percentage']),
      averagePercentage: instructorDouble(map['average_percentage']),
      quizzes: instructorList(map['quizzes'])
          .map(_AssessmentQuiz.fromMap)
          .toList(growable: false),
    );
  }
}

class _AssessmentQuiz {
  const _AssessmentQuiz({
    required this.quizId,
    required this.quizableType,
    required this.quizableId,
    required this.maxScore,
    required this.bestScore,
    required this.attemptsUsed,
    required this.isPassed,
  });

  final int quizId;
  final String quizableType;
  final int quizableId;
  final int maxScore;
  final int bestScore;
  final int attemptsUsed;
  final bool isPassed;

  factory _AssessmentQuiz.fromMap(Map<String, dynamic> map) {
    return _AssessmentQuiz(
      quizId: instructorInt(map['quiz_id']),
      quizableType: instructorString(map['quizable_type'], fallback: 'quiz'),
      quizableId: instructorInt(map['quizable_id']),
      maxScore: instructorInt(map['max_score']),
      bestScore: instructorInt(map['best_score']),
      attemptsUsed: instructorInt(map['attempts_used']),
      isPassed: map['is_passed'] == true,
    );
  }
}

class _GraphBucket {
  const _GraphBucket({
    required this.label,
    required this.value,
  });

  final String label;
  final int value;
}

class _DashboardHero extends StatelessWidget {
  const _DashboardHero({
    required this.data,
    required this.onManageCourses,
  });

  final _InstructorDashboardData data;
  final VoidCallback onManageCourses;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF0F172A),
            Color(0xFF12324B),
            Color(0xFF0F766E),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(34),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .10),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'INSTRUCTOR COMMAND DECK',
              style: TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.3,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'A sharper view of students, courses, and assessment momentum.',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 10),
          Text(
            'Track course performance, learner activity, and quiz readiness from the same instructor dashboard APIs used by the website.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: .72),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _HeroPill(
                label: 'Learners',
                value: '${data.summary.totalStudents}',
              ),
              _HeroPill(
                label: 'Courses',
                value: '${data.summary.totalCourses}',
              ),
              _HeroPill(
                label: 'Avg Progress',
                value: '${data.averageProgress.toStringAsFixed(1)}%',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DashboardStatsRow extends StatelessWidget {
  const _DashboardStatsRow({required this.data});

  final _InstructorDashboardData data;

  @override
  Widget build(BuildContext context) {
    final cards = [
      (
        label: 'Unique learners',
        value: '${data.summary.totalStudents}',
        note: 'Across your courses',
        color: AfaqColors.sky400,
        icon: Icons.groups_rounded,
      ),
      (
        label: 'Active courses',
        value: '${data.summary.totalCourses}',
        note: 'Courses you currently teach',
        color: AfaqColors.emerald500,
        icon: Icons.menu_book_rounded,
      ),
      (
        label: 'Course momentum',
        value: '${data.averageProgress.toStringAsFixed(1)}%',
        note: 'Average progress across course stats',
        color: AfaqColors.fuchsia500,
        icon: Icons.trending_up_rounded,
      ),
      (
        label: 'Top courses',
        value: '${data.topCourses.length}',
        note: 'Courses with the best completed performance',
        color: AfaqColors.amber500,
        icon: Icons.workspace_premium_rounded,
      ),
    ];

    return GridView.builder(
      itemCount: cards.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 360,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 1.35,
      ),
      itemBuilder: (context, index) {
        final card = cards[index];
        return AfaqPanel(
          radius: 28,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: card.color.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(card.icon, color: card.color),
              ),
              const Spacer(),
              Text(
                card.label.toUpperCase(),
                style: const TextStyle(
                  color: AfaqColors.slate500,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .9,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                card.value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                card.note,
                style: const TextStyle(
                  color: AfaqColors.slate500,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CoursePerformancePanel extends StatelessWidget {
  const _CoursePerformancePanel({required this.data});

  final _InstructorDashboardData data;

  @override
  Widget build(BuildContext context) {
    final strongest = data.courseStats.fold<double>(
      1,
      (max, item) => math.max(max, item.averageProgress),
    );

    return AfaqPanel(
      radius: 32,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'COURSE PERFORMANCE',
            title: 'Progress pulse across your teaching load',
            body:
                'Each bar blends course progress with active and completed student counts so healthy courses stand out immediately.',
          ),
          const SizedBox(height: 18),
          if (data.courseStats.isEmpty)
            const Text('No course statistics available yet.')
          else
            for (final course in data.courseStats)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AfaqColors.slate100.withValues(alpha: .70),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AfaqColors.slate200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  course.title,
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.w900,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    _MetaPill(label: '${course.totalStudents} students'),
                                    _MetaPill(label: '${course.activeStudents} active'),
                                    _MetaPill(label: '${course.completedStudents} completed'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text(
                                'AVERAGE PROGRESS',
                                style: TextStyle(
                                  color: AfaqColors.slate500,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: .9,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${course.averageProgress.toStringAsFixed(1)}%',
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF0891B2),
                                    ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: (course.averageProgress / strongest).clamp(0, 1),
                          minHeight: 12,
                          backgroundColor: AfaqColors.slate200,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            Color(0xFF0EA5E9),
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

class _AssessmentSpotlightPanel extends StatelessWidget {
  const _AssessmentSpotlightPanel({
    required this.data,
    required this.students,
    required this.selectedCourseId,
    required this.selectedStudentId,
    required this.assessment,
    required this.loading,
    required this.onSelectCourse,
    required this.onSelectStudent,
  });

  final _InstructorDashboardData data;
  final List<_InstructorStudent> students;
  final int? selectedCourseId;
  final int? selectedStudentId;
  final _AssessmentData? assessment;
  final bool loading;
  final Future<void> Function(int?) onSelectCourse;
  final Future<void> Function(int?) onSelectStudent;

  @override
  Widget build(BuildContext context) {
    final progress = assessment?.progress;

    return AfaqPanel(
      radius: 32,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'ASSESSMENT FOCUS',
            title: 'Student assessment spotlight',
            body:
                'Pick a course and student to inspect quiz completion, pass/fail balance, and certificate readiness.',
          ),
          const SizedBox(height: 18),
          DropdownButtonFormField<int>(
            key: ValueKey('course-$selectedCourseId'),
            initialValue: selectedCourseId,
            items: data.courseOptions
                .map(
                  (course) => DropdownMenuItem<int>(
                    value: course.id,
                    child: Text(course.title),
                  ),
                )
                .toList(growable: false),
            onChanged: (value) => onSelectCourse(value),
            decoration: _dashboardFieldDecoration(),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            key: ValueKey('student-$selectedStudentId'),
            initialValue: selectedStudentId,
            items: students
                .map(
                  (student) => DropdownMenuItem<int>(
                    value: student.id,
                    child: Text(student.name),
                  ),
                )
                .toList(growable: false),
            onChanged: (value) => onSelectStudent(value),
            decoration: _dashboardFieldDecoration(),
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF0F172A),
                  Color(0xFF0F3A56),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(28),
            ),
            child: loading
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Center(child: CircularProgressIndicator(color: Colors.white)),
                  )
                : progress == null
                    ? Text(
                        'Choose a valid course and student to see assessment progress.',
                        style: TextStyle(color: Colors.white.withValues(alpha: .72)),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${progress.averagePercentage.toStringAsFixed(1)}%',
                                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                          ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Average assessment score',
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: .70),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: .06),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.white.withValues(alpha: .08)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'CERTIFICATE',
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: .52),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      assessment?.certificateEligible == true
                                          ? 'Eligible'
                                          : 'In Progress',
                                      style: TextStyle(
                                        color: assessment?.certificateEligible == true
                                            ? const Color(0xFF86EFAC)
                                            : const Color(0xFFFDE68A),
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          GridView.count(
                            crossAxisCount: 2,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                            childAspectRatio: 1.2,
                            children: [
                              _MiniMetric(label: 'Required quizzes', value: '${progress.requiredQuizzesCount}'),
                              _MiniMetric(label: 'Passed', value: '${progress.passedRequiredQuizzesCount}'),
                              _MiniMetric(label: 'Failed', value: '${progress.failedRequiredQuizzesCount}'),
                              _MiniMetric(
                                label: 'Weighted score',
                                value: '${progress.weightedPercentage.toStringAsFixed(1)}%',
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          _ProgressStrip(
                            label: 'Completion readiness',
                            value: progress.allRequiredQuizzesGraded ? 100 : 60,
                          ),
                          const SizedBox(height: 12),
                          _ProgressStrip(
                            label: 'Pass rate',
                            value: progress.requiredQuizzesCount == 0
                                ? 0
                                : (progress.passedRequiredQuizzesCount / progress.requiredQuizzesCount) * 100,
                          ),
                          const SizedBox(height: 16),
                          for (final quiz in progress.quizzes.take(4))
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: .06),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.white.withValues(alpha: .08)),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${quiz.quizableType} #${quiz.quizableId}',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Best ${quiz.bestScore}/${quiz.maxScore} | ${quiz.attemptsUsed} attempts used',
                                            style: TextStyle(
                                              color: Colors.white.withValues(alpha: .58),
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: quiz.isPassed
                                            ? const Color(0xFF22C55E).withValues(alpha: .14)
                                            : const Color(0xFFF59E0B).withValues(alpha: .16),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        quiz.isPassed ? 'Passed' : 'Pending',
                                        style: TextStyle(
                                          color: quiz.isPassed
                                              ? const Color(0xFF86EFAC)
                                              : const Color(0xFFFDE68A),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
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

class _StudentGraphPanel extends StatelessWidget {
  const _StudentGraphPanel({required this.graph});

  final List<_GraphBucket> graph;

  @override
  Widget build(BuildContext context) {
    final maxBucket = graph.fold<int>(1, (max, item) => math.max(max, item.value));
    return AfaqPanel(
      radius: 32,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'STUDENT GRAPH',
            title: 'Student clusters by name initial',
            body: 'A quick visual grouping of learners currently enrolled across your courses.',
          ),
          const SizedBox(height: 18),
          if (graph.isEmpty)
            const Text('No students available yet.')
          else
            for (final bucket in graph)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            bucket.label,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                        Text(
                          '${bucket.value}',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: (bucket.value / maxBucket).clamp(0, 1),
                        minHeight: 12,
                        backgroundColor: AfaqColors.slate200,
                        valueColor: const AlwaysStoppedAnimation<Color>(AfaqColors.fuchsia500),
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

class _StudentRosterPanel extends StatelessWidget {
  const _StudentRosterPanel({
    required this.students,
    required this.selectedStudentId,
    required this.search,
    required this.onSearchChanged,
    required this.onSelectStudent,
  });

  final List<_InstructorStudent> students;
  final int? selectedStudentId;
  final String search;
  final ValueChanged<String> onSearchChanged;
  final Future<void> Function(int) onSelectStudent;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 32,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'STUDENT LIST',
            title: 'Your learner roster',
            body: 'Search and inspect the students attached to your teaching assignments.',
          ),
          const SizedBox(height: 18),
          TextField(
            onChanged: onSearchChanged,
            decoration: _dashboardFieldDecoration(
              hintText: 'Search by name, email, or phone',
              prefixIcon: const Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: 16),
          if (students.isEmpty)
            const Text('No students match your current search.')
          else
            for (final student in students.take(10))
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () => onSelectStudent(student.id),
                  borderRadius: BorderRadius.circular(24),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: selectedStudentId == student.id
                          ? const Color(0xFF06B6D4).withValues(alpha: .10)
                          : AfaqColors.slate100.withValues(alpha: .60),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: selectedStudentId == student.id
                            ? const Color(0xFF22D3EE)
                            : AfaqColors.slate200,
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                student.name,
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.w900,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                student.email.isEmpty ? 'No email' : student.email,
                                style: const TextStyle(
                                  color: AfaqColors.slate500,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        if (student.phone.isNotEmpty) _MetaPill(label: student.phone),
                      ],
                    ),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _TopCoursesPanel extends StatelessWidget {
  const _TopCoursesPanel({required this.courses});

  final List<_TopCourse> courses;

  @override
  Widget build(BuildContext context) {
    return AfaqPanel(
      radius: 32,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'TOP PERFORMING COURSES',
            title: 'Completion leaders',
            body: 'Highest-performing courses based on completed learner progress captured by the instructor dashboard API.',
          ),
          const SizedBox(height: 18),
          if (courses.isEmpty)
            const Text('No top-performing course data yet.')
          else
            GridView.builder(
              itemCount: courses.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 260,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: .82,
              ),
              itemBuilder: (context, index) {
                final course = courses[index];
                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFFF8FAFC),
                        Color(0xFFECFEFF),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AfaqColors.slate200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AfaqColors.slate900,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(
                          Icons.workspace_premium_rounded,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        course.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        '${course.averageProgress.toStringAsFixed(1)}%',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF0891B2),
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${course.completionCount} completions',
                        style: const TextStyle(
                          color: AfaqColors.slate500,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.eyebrow,
    required this.title,
    required this.body,
  });

  final String eyebrow;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: const TextStyle(
            color: AfaqColors.slate500,
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: const TextStyle(
            color: AfaqColors.slate500,
            height: 1.5,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: .10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: .60),
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AfaqColors.slate200),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AfaqColors.slate600,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  const _MiniMetric({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label.toUpperCase(),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white.withValues(alpha: .56),
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: .8,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressStrip extends StatelessWidget {
  const _ProgressStrip({
    required this.label,
    required this.value,
  });

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    final safeValue = value.clamp(0, 100);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: Colors.white.withValues(alpha: .58),
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .8,
                ),
              ),
            ),
            Text(
              '${safeValue.toStringAsFixed(0)}%',
              style: TextStyle(
                color: Colors.white.withValues(alpha: .70),
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: safeValue / 100,
            minHeight: 10,
            backgroundColor: Colors.white.withValues(alpha: .10),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34D399)),
          ),
        ),
      ],
    );
  }
}

InputDecoration _dashboardFieldDecoration({
  String? hintText,
  Widget? prefixIcon,
}) {
  return InputDecoration(
    hintText: hintText,
    prefixIcon: prefixIcon,
    filled: true,
    fillColor: const Color(0xFFF8FAFC),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: AfaqColors.slate200),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: AfaqColors.slate200),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(22),
      borderSide: const BorderSide(color: Color(0xFF06B6D4), width: 1.4),
    ),
  );
}
