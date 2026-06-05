"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiCached } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type CourseItem = {
  id: number | string;
  title?: string;
  title_translations?: Record<string, string>;
};

type CourseStatistic = {
  course_id: number;
  title: string;
  total_students: number;
  active_students: number;
  completed_students: number;
  average_progress: number;
};

type TopCourse = {
  course_id: number;
  title: string;
  average_progress: number;
  completion_count: number;
};

type DashboardSummary = {
  total_courses: number;
  total_students: number;
  pending_assignments: number;
};

type DashboardData = {
  summary: DashboardSummary;
  course_statistics: CourseStatistic[];
  top_performing_courses: TopCourse[];
};

type StudentItem = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
};

type AssessmentProgress = {
  required_quizzes_count: number;
  all_required_quizzes_graded: boolean;
  passed_required_quizzes_count: number;
  failed_required_quizzes_count: number;
  earned_total: number;
  max_total: number;
  weighted_percentage: number;
  average_percentage: number;
  quizzes: AssessmentQuiz[];
};

type AssessmentQuiz = {
  quiz_id: number;
  quizable_type: string;
  quizable_id: number;
  max_score: number;
  passing_score: number;
  best_score: number;
  quiz_percentage: number;
  attempts_used: number;
  attempts_left: number;
  is_graded: boolean;
  is_passed: boolean;
  pass_lock: boolean;
};

type CertificateData = {
  eligible?: boolean;
  issued?: boolean;
  reason?: string;
  average_percentage?: number;
  weighted_percentage?: number;
};

type AssessmentData = {
  progress: AssessmentProgress | null;
  certificate: CertificateData | null;
};

const dashboardCopy = {
  en: {
    untitled: "Untitled",
    studentFallback: "Student",
    courseFallback: "Course",
    inWord: "in",
    missingSession: "Session token is missing. Please log in again.",
    loadError: "Failed to load instructor analytics.",
    heroBadge: "Instructor Command Deck",
    heroTitle: "A sharper view of your students, courses, and assessment momentum.",
    heroBody:
      "Track classroom health from one screen: student distribution, course performance, and live assessment progress for any learner in your roster.",
    manageCourses: "Manage Courses",
    refresh: "Refresh",
    loadingAnalytics: "Loading instructor analytics",
    live: "Live",
    uniqueLearners: "Unique learners across your courses",
    activeCoursesNote: "Courses you currently teach",
    courseMomentum: "Course Momentum",
    courseMomentumNote: "Average progress across your course portfolio",
    topCourses: "Top Courses",
    topCoursesNote: "Courses with the best completed performance",
    coursePerformance: "Course Performance",
    coursePerformanceTitle: "Progress pulse across your teaching load",
    coursePerformanceBody:
      "Each bar blends average learning progress with active and completed student counts, so you can spot healthy courses at a glance.",
    openCourseWorkspace: "Open course workspace",
    studentsLabel: "students",
    activeLabel: "active",
    completedLabel: "completed",
    averageProgress: "Average Progress",
    noCourseStats: "No course statistics available yet.",
    assessmentFocus: "Assessment Focus",
    assessmentTitle: "Student assessment spotlight",
    assessmentBody: "Pick a course and student to inspect quiz completion, pass/fail balance, and certificate readiness.",
    loadingAssessment: "Loading assessment progress...",
    averageAssessmentScore: "Average assessment score",
    certificate: "Certificate",
    eligible: "Eligible",
    inProgress: "In Progress",
    requiredQuizzes: "Required Quizzes",
    passed: "Passed",
    failed: "Failed",
    weightedScore: "Weighted Score",
    completionReadiness: "Completion Readiness",
    passRate: "Pass Rate",
    bestScore: "Best score",
    attemptsUsed: "attempts used",
    pending: "Pending",
    chooseCourseStudent: "Choose a valid course and student to see assessment progress.",
    studentGraph: "Student Graph",
    studentGraphTitle: "Student clusters by name initial",
    studentGraphBody: "A quick visual grouping of the learners currently enrolled across your courses.",
    noStudentsYet: "No students available yet.",
    studentList: "Student List",
    studentListTitle: "Your learner roster",
    studentListBody: "Search and inspect the students attached to your teaching assignments.",
    searchPlaceholder: "Search by name, email, or phone",
    studentTag: "Student",
    noStudentsMatch: "No students match your current search.",
    topPerformingCourses: "Top Performing Courses",
    completionLeaders: "Completion leaders",
    completionLeadersBody:
      "Highest-performing courses based on completed learner progress captured by the instructor dashboard API.",
    completions: "completions",
    noTopCourses: "No top-performing course data yet.",
  },
  ar: {
    untitled: "بدون عنوان",
    studentFallback: "طالب",
    courseFallback: "دورة",
    inWord: "في",
    missingSession: "رمز الجلسة مفقود. يرجى تسجيل الدخول مرة أخرى.",
    loadError: "فشل تحميل تحليلات المدرّس.",
    heroBadge: "لوحة تحكم المدرّس",
    heroTitle: "رؤية أوضح لطلابك ودوراتك وزخم التقييم.",
    heroBody:
      "تابع حالة الصف من شاشة واحدة: توزيع الطلاب، أداء الدورات، وتقدم التقييم المباشر لأي متعلم ضمن قائمتك.",
    manageCourses: "إدارة الدورات",
    refresh: "تحديث",
    loadingAnalytics: "جاري تحميل تحليلات المدرّس",
    live: "مباشر",
    uniqueLearners: "عدد المتعلمين الفريدين عبر دوراتك",
    activeCoursesNote: "الدورات التي تقوم بتدريسها حاليا",
    courseMomentum: "زخم الدورات",
    courseMomentumNote: "متوسط التقدم عبر جميع دوراتك",
    topCourses: "أفضل الدورات",
    topCoursesNote: "الدورات ذات أفضل أداء مكتمل",
    coursePerformance: "أداء الدورات",
    coursePerformanceTitle: "نبض التقدم عبر حملك التدريسي",
    coursePerformanceBody:
      "يمزج كل شريط بين متوسط تقدم التعلم وعدد الطلاب النشطين والمكتملين حتى تكتشف الدورات الصحية بسرعة.",
    openCourseWorkspace: "فتح مساحة الدورات",
    studentsLabel: "طلاب",
    activeLabel: "نشط",
    completedLabel: "مكتمل",
    averageProgress: "متوسط التقدم",
    noCourseStats: "لا توجد إحصاءات دورات متاحة حتى الآن.",
    assessmentFocus: "تركيز التقييم",
    assessmentTitle: "إضاءة على تقييم الطالب",
    assessmentBody: "اختر دورة وطالبا لمراجعة اكتمال الاختبارات والتوازن بين النجاح والرسوب وجاهزية الشهادة.",
    loadingAssessment: "جاري تحميل تقدم التقييم...",
    averageAssessmentScore: "متوسط درجة التقييم",
    certificate: "الشهادة",
    eligible: "مؤهل",
    inProgress: "قيد التقدم",
    requiredQuizzes: "الاختبارات المطلوبة",
    passed: "ناجح",
    failed: "راسب",
    weightedScore: "الدرجة الموزونة",
    completionReadiness: "جاهزية الإكمال",
    passRate: "معدل النجاح",
    bestScore: "أفضل درجة",
    attemptsUsed: "محاولات مستخدمة",
    pending: "قيد الانتظار",
    chooseCourseStudent: "اختر دورة وطالبا صالحين لعرض تقدم التقييم.",
    studentGraph: "رسم الطلاب",
    studentGraphTitle: "تجمعات الطلاب حسب الحرف الأول",
    studentGraphBody: "تصور سريع لتوزيع المتعلمين المسجلين حاليا عبر دوراتك.",
    noStudentsYet: "لا يوجد طلاب متاحون حتى الآن.",
    studentList: "قائمة الطلاب",
    studentListTitle: "سجل المتعلمين لديك",
    studentListBody: "ابحث واستعرض الطلاب المرتبطين بتكليفاتك التدريسية.",
    searchPlaceholder: "ابحث بالاسم أو البريد أو الهاتف",
    studentTag: "طالب",
    noStudentsMatch: "لا يوجد طلاب يطابقون البحث الحالي.",
    topPerformingCourses: "أفضل الدورات أداءً",
    completionLeaders: "قادة الإكمال",
    completionLeadersBody: "أعلى الدورات أداءً بحسب تقدم المتعلمين المكتمل في واجهة المدرّس.",
    completions: "إكمال",
    noTopCourses: "لا توجد بيانات للدورات الأفضل أداءً حتى الآن.",
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function buildHeaders(token: string, language: "en" | "ar") {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Accept-Language": language,
    "X-Locale": language,
  };
}

function getLocalizedText(primary: string | undefined, translations: Record<string, string> | undefined, language: "en" | "ar") {
  if (translations?.[language]?.trim()) return translations[language];
  if (translations?.en?.trim()) return translations.en;
  if (primary?.trim()) return primary;
  return dashboardCopy[language].untitled;
}

function extractArray(payload: unknown) {
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function extractObject(payload: unknown) {
  if (!isRecord(payload)) return {};
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function parseDashboard(payload: unknown): DashboardData {
  const root = extractObject(payload);
  const summaryRaw = isRecord(root.summary) ? root.summary : {};
  const courseStatsRaw = Array.isArray(root.course_statistics) ? root.course_statistics : [];
  const topCoursesRaw = Array.isArray(root.top_performing_courses) ? root.top_performing_courses : [];

  return {
    summary: {
      total_courses: asNumber(summaryRaw.total_courses),
      total_students: asNumber(summaryRaw.total_students),
      pending_assignments: asNumber(summaryRaw.pending_assignments),
    },
    course_statistics: courseStatsRaw
      .filter(isRecord)
      .map((item) => ({
        course_id: asNumber(item.course_id),
        title: asString(item.title, "Untitled"),
        total_students: asNumber(item.total_students),
        active_students: asNumber(item.active_students),
        completed_students: asNumber(item.completed_students),
        average_progress: asNumber(item.average_progress),
      }))
      .filter((item) => item.course_id > 0),
    top_performing_courses: topCoursesRaw
      .filter(isRecord)
      .map((item) => ({
        course_id: asNumber(item.course_id),
        title: asString(item.title, "Untitled"),
        average_progress: asNumber(item.average_progress),
        completion_count: asNumber(item.completion_count),
      }))
      .filter((item) => item.course_id > 0),
  };
}

function parseStudents(payload: unknown): StudentItem[] {
  return extractArray(payload)
    .filter(isRecord)
    .map((item) => ({
      id: asNumber(item.id),
      name: asString(item.name, "Student"),
      email: asString(item.email),
      phone: asString(item.phone) || null,
    }))
    .filter((item) => item.id > 0);
}

function parseAssessment(payload: unknown): AssessmentData {
  const root = extractObject(payload);
  const progressRaw = isRecord(root.progress) ? root.progress : null;
  const certificateRaw = isRecord(root.certificate) ? root.certificate : null;

  return {
    progress: progressRaw
      ? {
          required_quizzes_count: asNumber(progressRaw.required_quizzes_count),
          all_required_quizzes_graded: Boolean(progressRaw.all_required_quizzes_graded),
          passed_required_quizzes_count: asNumber(progressRaw.passed_required_quizzes_count),
          failed_required_quizzes_count: asNumber(progressRaw.failed_required_quizzes_count),
          earned_total: asNumber(progressRaw.earned_total),
          max_total: asNumber(progressRaw.max_total),
          weighted_percentage: asNumber(progressRaw.weighted_percentage),
          average_percentage: asNumber(progressRaw.average_percentage),
          quizzes: Array.isArray(progressRaw.quizzes)
            ? progressRaw.quizzes.filter(isRecord).map((quiz) => ({
                quiz_id: asNumber(quiz.quiz_id),
                quizable_type: asString(quiz.quizable_type),
                quizable_id: asNumber(quiz.quizable_id),
                max_score: asNumber(quiz.max_score),
                passing_score: asNumber(quiz.passing_score),
                best_score: asNumber(quiz.best_score),
                quiz_percentage: asNumber(quiz.quiz_percentage),
                attempts_used: asNumber(quiz.attempts_used),
                attempts_left: asNumber(quiz.attempts_left),
                is_graded: Boolean(quiz.is_graded),
                is_passed: Boolean(quiz.is_passed),
                pass_lock: Boolean(quiz.pass_lock),
              }))
            : [],
        }
      : null,
    certificate: certificateRaw
      ? {
          eligible: typeof certificateRaw.eligible === "boolean" ? certificateRaw.eligible : undefined,
          issued: typeof certificateRaw.issued === "boolean" ? certificateRaw.issued : undefined,
          reason: asString(certificateRaw.reason),
          average_percentage: asNumber(certificateRaw.average_percentage),
          weighted_percentage: asNumber(certificateRaw.weighted_percentage),
        }
      : null,
  };
}

function buildCourseOptions(courseStatistics: CourseStatistic[]): CourseItem[] {
  return courseStatistics.map((course) => ({
    id: course.course_id,
    title: course.title,
  }));
}

export default function InstructorDashboardApi() {
  const router = useRouter();
  const { t, isRTL, language } = useLanguage();
  const copy = dashboardCopy[language];

  const [dashboard, setDashboard] = useState<DashboardData>({
    summary: { total_courses: 0, total_students: 0, pending_assignments: 0 },
    course_statistics: [],
    top_performing_courses: [],
  });
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData>({ progress: null, certificate: null });
  const [assessmentCache, setAssessmentCache] = useState<Record<string, AssessmentData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadDashboard = React.useCallback(async (force = false) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const headers = buildHeaders(token, language);
      const [dashboardRes, studentsRes] = await Promise.all([
        getStudentApiCached("/instructor/dashboard", { headers }, { ttlMs: 45_000, force }),
        getStudentApiCached("/instructor/students", { headers, params: { limit: 100 } }, { ttlMs: 45_000, force }),
      ]);

      const nextDashboard = parseDashboard(dashboardRes.data);
      const nextCourses = buildCourseOptions(nextDashboard.course_statistics);
      const nextStudents = parseStudents(studentsRes.data);

      setDashboard(nextDashboard);
      setCourses(nextCourses);
      setStudents(nextStudents);
      setSelectedCourseId((prev) => (prev && nextCourses.some((course) => toNumberId(course.id) === prev) ? prev : toNumberId(nextCourses[0]?.id)));
      setSelectedStudentId((prev) => (prev && nextStudents.some((student) => student.id === prev) ? prev : nextStudents[0]?.id ?? null));
    } catch (error) {
      if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage(copy.missingSession);
      } else {
        setErrorMessage(copy.loadError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, copy.missingSession, language]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const loadAssessment = async () => {
      if (!selectedCourseId || !selectedStudentId) {
        setAssessment({ progress: null, certificate: null });
        return;
      }

      const cacheKey = `${selectedCourseId}:${selectedStudentId}:${language}`;
      const cachedAssessment = assessmentCache[cacheKey];
      if (cachedAssessment) {
        setAssessment(cachedAssessment);
        return;
      }

      setIsAssessmentLoading(true);
      try {
        const token = getStudentToken();
        if (!token) throw new Error("missing_token");

        const response = await getStudentApiCached(
          `/my-courses/${selectedCourseId}/assessment-progress`,
          {
            headers: buildHeaders(token, language),
            params: { student_id: selectedStudentId },
          },
          { ttlMs: 60_000 }
        );

        const parsedAssessment = parseAssessment(response.data);
        setAssessment(parsedAssessment);
        setAssessmentCache((prev) => ({ ...prev, [cacheKey]: parsedAssessment }));
      } catch (error) {
        console.error("Failed to load assessment progress:", error);
        setAssessment({ progress: null, certificate: null });
      } finally {
        setIsAssessmentLoading(false);
      }
    };

    void loadAssessment();
  }, [assessmentCache, language, selectedCourseId, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [student.name, student.email, student.phone ?? ""].some((value) => value.toLowerCase().includes(term))
    );
  }, [searchTerm, students]);

  const studentGraph = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const student of students) {
      const initial = student.name.trim().charAt(0).toUpperCase() || "#";
      buckets.set(initial, (buckets.get(initial) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [students]);

  const maxStudentBucket = Math.max(1, ...studentGraph.map((item) => item.value));
  const strongestCourseProgress = Math.max(1, ...dashboard.course_statistics.map((course) => course.average_progress));

  const dashboardCards = [
    {
      label: t("stats.students"),
      value: dashboard.summary.total_students.toLocaleString(),
      accent: "from-cyan-400 via-sky-500 to-blue-600",
      icon: Users,
      note: copy.uniqueLearners,
    },
    {
      label: t("stats.courses"),
      value: dashboard.summary.total_courses.toLocaleString(),
      accent: "from-emerald-400 via-teal-500 to-cyan-600",
      icon: BookOpen,
      note: copy.activeCoursesNote,
    },
    {
      label: copy.courseMomentum,
      value: `${Math.round(
        dashboard.course_statistics.reduce((sum, course) => sum + course.average_progress, 0) /
          Math.max(1, dashboard.course_statistics.length)
      )}%`,
      accent: "from-amber-300 via-orange-500 to-rose-600",
      icon: TrendingUp,
      note: copy.courseMomentumNote,
    },
    {
      label: copy.topCourses,
      value: dashboard.top_performing_courses.length.toLocaleString(),
      accent: "from-fuchsia-400 via-violet-500 to-indigo-600",
      icon: Sparkles,
      note: copy.topCoursesNote,
    },
  ];

  const selectedCourse = courses.find((course) => toNumberId(course.id) === selectedCourseId) ?? null;
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;

  return (
    <div className="min-h-screen bg-(--background) p-4 text-(--foreground) md:p-8 lg:p-12">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-300 bg-[linear-gradient(135deg,#fdf2f8_0%,#ecfeff_32%,#f8fafc_68%,#eef2ff_100%)] p-6 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(135deg,#1e1b4b_0%,#0f172a_42%,#082f49_72%,#111827_100%)] md:p-10">
        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-400/10" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl dark:bg-cyan-400/10" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-cyan-100">
              <GraduationCap className="h-3.5 w-3.5" />
              {copy.heroBadge}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 md:text-base">
              {copy.heroBody}
            </p>
          </div>

          <div className={`flex flex-wrap gap-3 ${isRTL ? "xl:flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => router.push("/instructor/courses")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-900/10 bg-white/80 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-800 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              <BookOpen className="h-4 w-4" />
              {copy.manageCourses}
            </button>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <RefreshCw className="h-4 w-4" />
              {copy.refresh}
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
          <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">{copy.loadingAnalytics}</p>
        </div>
      ) : (
        <div className="space-y-8 pt-8">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {dashboardCards.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="relative overflow-hidden rounded-[2rem] border border-slate-300 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
                <div className="mb-5 flex items-center justify-between">
                  <div className={`rounded-2xl bg-gradient-to-br ${card.accent} p-3 text-white shadow-lg`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/10 dark:text-white/55">
                    {copy.live}
                  </span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">{card.label}</p>
                <p className="mt-2 text-4xl font-black tracking-tight">{card.value}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.note}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
            <section className="rounded-[2rem] border border-slate-300 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">{copy.coursePerformance}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">{copy.coursePerformanceTitle}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                    {copy.coursePerformanceBody}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/instructor/courses")}
                  className="inline-flex items-center gap-2 text-sm font-black text-cyan-700 transition hover:text-cyan-500 dark:text-cyan-300"
                >
                  {copy.openCourseWorkspace}
                  <ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                </button>
              </div>

              <div className="mt-8 space-y-4">
                {dashboard.course_statistics.length > 0 ? (
                  dashboard.course_statistics.map((course) => {
                    const width = `${Math.max(6, (course.average_progress / strongestCourseProgress) * 100)}%`;
                    return (
                      <div key={course.course_id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black">{course.title}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-white/45">
                              <span>{course.total_students} {copy.studentsLabel}</span>
                              <span>{course.active_students} {copy.activeLabel}</span>
                              <span>{course.completed_students} {copy.completedLabel}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">{copy.averageProgress}</p>
                            <p className="text-2xl font-black text-cyan-600 dark:text-cyan-300">{course.average_progress.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600" style={{ width }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-500 dark:border-white/15 dark:text-slate-400">
                    {copy.noCourseStats}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-300 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">{copy.assessmentFocus}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">{copy.assessmentTitle}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {copy.assessmentBody}
              </p>

              <div className="mt-6 grid gap-3">
                <select
                  value={selectedCourseId ?? ""}
                  onChange={(event) => setSelectedCourseId(asNumber(event.target.value) || null)}
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  {courses.map((course) => (
                    <option key={String(course.id)} value={String(course.id)}>
                      {getLocalizedText(course.title, course.title_translations, language)}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedStudentId ?? ""}
                  onChange={(event) => setSelectedStudentId(asNumber(event.target.value) || null)}
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-[linear-gradient(145deg,#0f172a_0%,#0f3a56_100%)] p-5 text-white">
                {isAssessmentLoading ? (
                  <div className="flex items-center gap-3 py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-semibold">{copy.loadingAssessment}</span>
                  </div>
                ) : assessment.progress ? (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/80">
                          {selectedStudent?.name || copy.studentFallback} {copy.inWord}{" "}
                          {selectedCourse ? getLocalizedText(selectedCourse.title, selectedCourse.title_translations, language) : copy.courseFallback}
                        </p>
                        <p className="mt-2 text-4xl font-black">{assessment.progress.average_percentage.toFixed(1)}%</p>
                        <p className="mt-1 text-sm text-white/65">{copy.averageAssessmentScore}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{copy.certificate}</p>
                        <p className={`mt-1 text-sm font-black ${assessment.certificate?.eligible ? "text-emerald-300" : "text-amber-300"}`}>
                          {assessment.certificate?.eligible ? copy.eligible : copy.inProgress}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <MiniMetric label={copy.requiredQuizzes} value={assessment.progress.required_quizzes_count} icon={BarChart3} />
                      <MiniMetric label={copy.passed} value={assessment.progress.passed_required_quizzes_count} icon={Award} />
                      <MiniMetric label={copy.failed} value={assessment.progress.failed_required_quizzes_count} icon={Target} />
                      <MiniMetric label={copy.weightedScore} value={`${assessment.progress.weighted_percentage.toFixed(1)}%`} icon={TrendingUp} />
                    </div>

                    <div className="space-y-3">
                      <ProgressStrip label={copy.completionReadiness} value={assessment.progress.all_required_quizzes_graded ? 100 : 60} />
                      <ProgressStrip label={copy.passRate} value={assessment.progress.required_quizzes_count > 0 ? (assessment.progress.passed_required_quizzes_count / assessment.progress.required_quizzes_count) * 100 : 0} />
                    </div>

                    <div className="space-y-2">
                      {assessment.progress.quizzes.slice(0, 4).map((quiz) => (
                        <div key={quiz.quiz_id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{quiz.quizable_type} #{quiz.quizable_id}</p>
                              <p className="text-xs text-white/55">
                                {copy.bestScore} {quiz.best_score}/{quiz.max_score} | {quiz.attempts_used} {copy.attemptsUsed}
                              </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                              quiz.is_passed ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
                            }`}>
                              {quiz.is_passed ? copy.passed : copy.pending}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-sm font-semibold text-white/65">
                    {copy.chooseCourseStudent}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-8 xl:grid-cols-[0.95fr_1.25fr]">
            <section className="rounded-[2rem] border border-slate-300 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">{copy.studentGraph}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">{copy.studentGraphTitle}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {copy.studentGraphBody}
              </p>

              <div className="mt-8 space-y-4">
                {studentGraph.length > 0 ? (
                  studentGraph.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: isRTL ? 18 : -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500"
                          style={{ width: `${Math.max(10, (item.value / maxStudentBucket) * 100)}%` }}
                        />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-500 dark:border-white/15 dark:text-slate-400">
                    {copy.noStudentsYet}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-300 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">{copy.studentList}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">{copy.studentListTitle}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {copy.studentListBody}
                  </p>
                </div>
                <div className="relative w-full md:max-w-xs">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-cyan-500 dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                        selectedStudentId === student.id
                          ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_12px_30px_rgba(6,182,212,0.15)]"
                          : "border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black">{student.name}</p>
                          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                        </div>
                        <div className={`flex flex-wrap gap-2 ${isRTL ? "md:justify-end" : ""}`}>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 dark:bg-white/10 dark:text-white/60">
                            <Users className="h-3 w-3" />
                            {copy.studentTag}
                          </span>
                          {student.phone ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 dark:bg-white/10 dark:text-white/60">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-500 dark:border-white/15 dark:text-slate-400">
                    {copy.noStudentsMatch}
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-[2rem] border border-slate-300 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">{copy.topPerformingCourses}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{copy.completionLeaders}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {copy.completionLeadersBody}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {dashboard.top_performing_courses.length > 0 ? (
                dashboard.top_performing_courses.map((course, index) => (
                  <motion.div
                    key={course.course_id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(145deg,#f8fafc_0%,#ecfeff_100%)] p-5 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.04)_0%,rgba(34,211,238,0.06)_100%)]"
                  >
                    <div className="mb-4 inline-flex rounded-2xl bg-slate-950 p-3 text-white dark:bg-white dark:text-slate-950">
                      <Award className="h-5 w-5" />
                    </div>
                    <p className="line-clamp-2 text-lg font-black">{course.title}</p>
                    <p className="mt-3 text-3xl font-black text-cyan-600 dark:text-cyan-300">{course.average_progress.toFixed(1)}%</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.completion_count} {copy.completions}</p>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-8 text-sm font-semibold text-slate-500 dark:border-white/15 dark:text-slate-400">
                  {copy.noTopCourses}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-3 inline-flex rounded-xl bg-white/10 p-2">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function ProgressStrip({ label, value }: { label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/60">
        <span>{label}</span>
        <span>{safeValue.toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
