"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileQuestion,
  Filter,
  Layers3,
  Loader2,
  Mail,
  RefreshCcw,
  Search,
  Send,
  UserCircle,
} from "lucide-react";
import {
  auditorGet,
  auditorPost,
  normalizeList,
  payloadData,
  payloadMessage,
} from "@/features/auditor/auditorApi";
import {
  AuditorUser,
  ContentReview,
  CourseCategory,
  CourseSummary,
  CourseUnit,
  formatStatus,
  LessonSummary,
  NotificationItem,
  QuestionSummary,
  QuizSummary,
  textOf,
} from "@/features/auditor/auditorTypes";

type WorkspaceMode = "dashboard" | "profile" | "courses" | "quizzes" | "notifications";
type Verdict = "approved" | "changes_requested" | "rejected";

type LoadState = {
  loading: boolean;
  error: string | null;
};

const verdicts: { value: Verdict; label: string; tone: string }[] = [
  { value: "approved", label: "Approved", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { value: "changes_requested", label: "Changes", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300" },
  { value: "rejected", label: "Rejected", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300" },
];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function extractSingle<T>(payload: unknown): T | null {
  const data = payloadData<unknown>(payload);
  return data && typeof data === "object" && !Array.isArray(data) ? (data as T) : null;
}

function compactDate(value?: string | null) {
  if (!value) {
    return "Now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "hot" }) {
  const styles = {
    neutral: "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
    hot: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  };

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${styles[tone]}`}>{children}</span>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03] ${className}`}>{children}</section>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/35">
      {label}
    </div>
  );
}

export default function AuditorWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [state, setState] = React.useState<LoadState>({ loading: true, error: null });
  const [actionState, setActionState] = React.useState<LoadState>({ loading: false, error: null });
  const [notice, setNotice] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<AuditorUser | null>(null);
  const [categories, setCategories] = React.useState<CourseCategory[]>([]);
  const [courses, setCourses] = React.useState<CourseSummary[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<CourseSummary | null>(null);
  const [selectedCourseDetail, setSelectedCourseDetail] = React.useState<CourseSummary | null>(null);
  const [units, setUnits] = React.useState<CourseUnit[]>([]);
  const [selectedLesson, setSelectedLesson] = React.useState<LessonSummary | null>(null);
  const [quizzes, setQuizzes] = React.useState<QuizSummary[]>([]);
  const [selectedQuiz, setSelectedQuiz] = React.useState<QuizSummary | null>(null);
  const [questions, setQuestions] = React.useState<QuestionSummary[]>([]);
  const [selectedQuestion, setSelectedQuestion] = React.useState<QuestionSummary | null>(null);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("review");
  const [verdict, setVerdict] = React.useState<Verdict>("changes_requested");
  const [notes, setNotes] = React.useState("");
  const [lastReview, setLastReview] = React.useState<ContentReview | null>(null);

  const loadAll = React.useCallback(async () => {
    setState({ loading: true, error: null });
    setNotice(null);
    try {
      const [profilePayload, categoryPayload, coursePayload, quizPayload, questionPayload, notificationPayload] = await Promise.all([
        auditorGet<AuditorUser>("/auth/profile"),
        auditorGet<CourseCategory[]>("/course-categories"),
        auditorGet<CourseSummary[]>("/courses", statusFilter ? { status: statusFilter, per_page: 15 } : { per_page: 15 }),
        auditorGet<QuizSummary[]>("/quizzes"),
        auditorGet<QuestionSummary[]>("/questions"),
        auditorGet<NotificationItem[]>("/notifications", { unread_only: true }),
      ]);

      const nextProfile = extractSingle<AuditorUser>(profilePayload);
      const nextCourses = normalizeList<CourseSummary>(coursePayload);
      const nextQuizzes = normalizeList<QuizSummary>(quizPayload);
      const nextQuestions = normalizeList<QuestionSummary>(questionPayload);

      setProfile(nextProfile);
      setCategories(normalizeList<CourseCategory>(categoryPayload));
      setCourses(nextCourses);
      setQuizzes(nextQuizzes);
      setQuestions(nextQuestions);
      setNotifications(normalizeList<NotificationItem>(notificationPayload));
      setSelectedCourse((current) => current ?? nextCourses[0] ?? null);
      setSelectedQuiz((current) => current ?? nextQuizzes[0] ?? null);
      setSelectedQuestion((current) => current ?? nextQuestions[0] ?? null);
    } catch (error) {
      console.error("Auditor workspace load failed:", error);
      setState({ loading: false, error: "Could not load auditor data. Check the API server and auditor token." });
      return;
    }

    setState({ loading: false, error: null });
  }, [statusFilter]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    if (!selectedCourse?.slug && !selectedCourse?.id) {
      setSelectedCourseDetail(null);
      setUnits([]);
      setSelectedLesson(null);
      return;
    }

    let ignore = false;
    const courseKey = selectedCourse.slug || String(selectedCourse.id);

    void (async () => {
      try {
        const [detailPayload, unitPayload] = await Promise.all([
          auditorGet<CourseSummary>(`/courses/${encodeURIComponent(courseKey)}`),
          auditorGet<CourseUnit[]>(`/courses/${encodeURIComponent(courseKey)}/units`),
        ]);

        if (ignore) {
          return;
        }

        const nextUnits = normalizeList<CourseUnit>(unitPayload);
        setSelectedCourseDetail(extractSingle<CourseSummary>(detailPayload) ?? selectedCourse);
        setUnits(nextUnits);
        setSelectedLesson(nextUnits.flatMap((unit) => unit.lessons ?? [])[0] ?? null);
      } catch (error) {
        console.error("Course detail load failed:", error);
        if (!ignore) {
          setSelectedCourseDetail(selectedCourse);
          setUnits([]);
          setSelectedLesson(null);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedCourse]);

  React.useEffect(() => {
    if (!selectedQuiz?.id) {
      return;
    }

    let ignore = false;
    void auditorGet<QuizSummary>(`/quizzes/${selectedQuiz.id}`)
      .then((payload) => {
        if (!ignore) {
          setSelectedQuiz((current) => extractSingle<QuizSummary>(payload) ?? current);
        }
      })
      .catch((error) => console.error("Quiz detail load failed:", error));

    return () => {
      ignore = true;
    };
  }, [selectedQuiz?.id]);

  const filteredCourses = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return courses;
    }

    return courses.filter((course) => [course.title, course.slug, course.status, course.course_category?.name].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [courses, query]);

  const filteredQuestions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return questions;
    }

    return questions.filter((question) => [textOf(question.question_text), question.type, question.id].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [questions, query]);

  const allLessons = React.useMemo(() => units.flatMap((unit) => (unit.lessons ?? []).map((lesson) => ({ ...lesson, unitTitle: unit.title }))), [units]);

  const submitReview = async () => {
    setActionState({ loading: true, error: null });
    setNotice(null);

    if (!selectedCourse?.id) {
      setActionState({ loading: false, error: "Select a course before submitting a review." });
      return;
    }

    if (!selectedLesson?.id) {
      setActionState({ loading: false, error: "Select a lesson before submitting a review." });
      return;
    }

    try {
      const payload = await auditorPost<ContentReview>(`/auditor/courses/${selectedCourse.id}/content-reviews`, {
        verdict,
        notes: notes.trim() || "Reviewed by auditor.",
        lesson_id: selectedLesson.id,
      });

      setLastReview(extractSingle<ContentReview>(payload));
      setNotice(payloadMessage(payload, "Content review submitted."));
      setNotes("");
    } catch (error) {
      console.error("Review submit failed:", error);
      setActionState({ loading: false, error: "Could not submit the content review. Check the selected course and lesson." });
      return;
    }

    setActionState({ loading: false, error: null });
  };

  const markAllRead = async () => {
    setActionState({ loading: true, error: null });
    try {
      const payload = await auditorPost<{ updated?: number }>("/notifications/read-all");
      setNotice(payloadMessage(payload, "Notifications marked as read."));
      await loadAll();
    } catch (error) {
      console.error("Mark notifications failed:", error);
      setActionState({ loading: false, error: "Could not mark notifications as read." });
      return;
    }
    setActionState({ loading: false, error: null });
  };

  const pageTitle = {
    dashboard: "Auditor command",
    profile: "Auditor profile",
    courses: "Content review",
    quizzes: "Quizzes and questions",
    notifications: "Notification inbox",
  }[mode];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <StatusPill tone="hot">2027 Review Desk</StatusPill>
              <StatusPill tone="good">Auditor</StatusPill>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{pageTitle}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 dark:text-white/50">
              {profile?.name ? `Signed in as ${profile.name}` : "Quality control workspace"}{profile?.email ? ` - ${profile.email}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={state.loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </motion.header>

        {state.error ? (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {state.error}
          </div>
        ) : null}

        {notice ? (
          <div className="flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            {notice}
          </div>
        ) : null}

        {actionState.error ? (
          <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {actionState.error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Review courses", value: courses.length, icon: BookOpenCheck, tone: "from-indigo-500 to-sky-400" },
            { label: "Categories", value: categories.length, icon: Layers3, tone: "from-emerald-500 to-teal-400" },
            { label: "Quizzes", value: quizzes.length, icon: ClipboardCheck, tone: "from-fuchsia-500 to-rose-400" },
            { label: "Unread", value: notifications.length, icon: Bell, tone: "from-amber-500 to-orange-400" },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Panel key={metric.label} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
                    <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{metric.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${metric.tone} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Panel>
            );
          })}
        </section>

        {state.loading ? (
          <Panel className="flex min-h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </Panel>
        ) : (
          <>
            {(mode === "dashboard" || mode === "courses") && (
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
                <Panel className="p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search courses"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-8 text-sm font-black outline-none transition dark:border-white/10 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="review">Review</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="">All</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredCourses.map((course) => {
                      const isActive = selectedCourse?.id === course.id;
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => setSelectedCourse(course)}
                          className={classNames(
                            "w-full rounded-3xl border p-4 text-left transition",
                            isActive
                              ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-950/15 dark:border-white dark:bg-white dark:text-slate-950"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:hover:bg-white/[0.05]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-black">{textOf(course.title)}</p>
                              <p className={`mt-2 text-xs font-semibold ${isActive ? "text-white/65 dark:text-slate-500" : "text-slate-500 dark:text-white/45"}`}>{course.slug || `course-${course.id}`}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <StatusPill tone={course.status === "published" ? "good" : course.status === "review" ? "warn" : "neutral"}>{formatStatus(course.status)}</StatusPill>
                            {course.course_category?.name ? <StatusPill>{course.course_category.name}</StatusPill> : null}
                          </div>
                        </button>
                      );
                    })}
                    {filteredCourses.length === 0 ? <EmptyState label="No courses found" /> : null}
                  </div>
                </Panel>

                <Panel className="overflow-hidden">
                  <div className="border-b border-slate-200 p-5 dark:border-white/10">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Selected course</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{textOf(selectedCourseDetail?.title ?? selectedCourse?.title)}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/50">{selectedCourseDetail?.description || selectedCourse?.description || "No description available."}</p>
                      </div>
                      <StatusPill tone="hot">{allLessons.length} lessons</StatusPill>
                    </div>
                  </div>

                  <div className="grid gap-0 xl:grid-cols-[0.85fr_1fr]">
                    <div className="border-b border-slate-200 p-5 dark:border-white/10 xl:border-b-0 xl:border-r">
                      <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Lessons</p>
                      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {allLessons.map((lesson) => {
                          const isActive = selectedLesson?.id === lesson.id;
                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => setSelectedLesson(lesson)}
                              className={classNames(
                                "w-full rounded-2xl border p-3 text-left transition",
                                isActive
                                  ? "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-white"
                                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                              )}
                            >
                              <p className="text-sm font-black">{textOf(lesson.title)}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/45">{lesson.unitTitle || `Unit ${lesson.unit_id ?? ""}`}</p>
                            </button>
                          );
                        })}
                        {allLessons.length === 0 ? <EmptyState label="No lessons returned for this course" /> : null}
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Submit review</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {verdicts.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setVerdict(item.value)}
                            className={classNames(
                              "rounded-2xl border px-3 py-3 text-xs font-black transition",
                              verdict === item.value ? item.tone : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/50"
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={6}
                        placeholder="Review notes"
                        className="mt-4 w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:bg-white/10"
                      />

                      <button
                        type="button"
                        onClick={() => void submitReview()}
                        disabled={actionState.loading}
                        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:brightness-110 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                      >
                        {actionState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send review
                      </button>

                      {lastReview ? (
                        <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                          <p className="font-black">Review #{lastReview.id}</p>
                          <p className="mt-1 font-semibold">{formatStatus(lastReview.verdict)} - {compactDate(lastReview.created_at)}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {(mode === "dashboard" || mode === "quizzes") && (
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Quizzes</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Assessment scan</h2>
                    </div>
                    <FileQuestion className="h-6 w-6 text-fuchsia-500" />
                  </div>
                  <div className="space-y-3">
                    {quizzes.map((quiz) => (
                      <button
                        key={quiz.id}
                        type="button"
                        onClick={() => setSelectedQuiz(quiz)}
                        className={classNames(
                          "w-full rounded-3xl border p-4 text-left transition",
                          selectedQuiz?.id === quiz.id
                            ? "border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/10"
                            : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                        )}
                      >
                        <p className="font-black text-slate-950 dark:text-white">{textOf(quiz.title, `Quiz ${quiz.id}`)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusPill tone="hot">{formatStatus(quiz.status)}</StatusPill>
                          <StatusPill>{quiz.questions?.length ?? 0} questions</StatusPill>
                        </div>
                      </button>
                    ))}
                    {quizzes.length === 0 ? <EmptyState label="No quizzes found" /> : null}
                  </div>
                </Panel>

                <Panel className="p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Questions</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{textOf(selectedQuiz?.title, "Question bank")}</h2>
                    </div>
                    <div className="relative min-w-64">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search questions"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[0.95fr_1fr]">
                    <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                      {filteredQuestions.map((question) => (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => setSelectedQuestion(question)}
                          className={classNames(
                            "w-full rounded-2xl border p-3 text-left transition",
                            selectedQuestion?.id === question.id
                              ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                              : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:hover:bg-white/[0.05]"
                          )}
                        >
                          <p className="line-clamp-2 text-sm font-black">{textOf(question.question_text, `Question ${question.id}`)}</p>
                          <p className="mt-2 text-xs font-semibold opacity-60">{formatStatus(question.type)} - {question.point ?? 0} pts</p>
                        </button>
                      ))}
                      {filteredQuestions.length === 0 ? <EmptyState label="No questions found" /> : null}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Question detail</p>
                      <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-white">{textOf(selectedQuestion?.question_text, "Select a question")}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill>{formatStatus(selectedQuestion?.type)}</StatusPill>
                        <StatusPill tone="good">{selectedQuestion?.point ?? 0} points</StatusPill>
                        <StatusPill tone={selectedQuestion?.is_required ? "warn" : "neutral"}>{selectedQuestion?.is_required ? "Required" : "Optional"}</StatusPill>
                      </div>
                      <div className="mt-5 space-y-2">
                        {(selectedQuestion?.options ?? []).map((option) => (
                          <div key={option.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold dark:border-white/10 dark:bg-white/5">
                            <span>{textOf(option.option_text, `Option ${option.id}`)}</span>
                            {option.is_correct ? <StatusPill tone="good">Correct</StatusPill> : null}
                          </div>
                        ))}
                        {selectedQuestion && (selectedQuestion.options ?? []).length === 0 ? <EmptyState label="No options on this question" /> : null}
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {(mode === "dashboard" || mode === "notifications") && (
              <Panel className="p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Notifications</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Auditor inbox</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    disabled={actionState.loading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {actionState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Mark all read
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <Bell className="h-5 w-5 text-amber-500" />
                        <StatusPill tone={notification.read_at ? "neutral" : "warn"}>{notification.read_at ? "Read" : "Unread"}</StatusPill>
                      </div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">{notification.data?.title || notification.data?.type || `Notification ${notification.id}`}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/50">{notification.data?.body || "No body content."}</p>
                      <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">{compactDate(notification.created_at)}</p>
                    </div>
                  ))}
                  {notifications.length === 0 ? <EmptyState label="No unread notifications" /> : null}
                </div>
              </Panel>
            )}

            {mode === "profile" && (
              <Panel className="overflow-hidden">
                <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
                  <div className="bg-slate-950 p-8 text-white dark:bg-white dark:text-slate-950">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 dark:bg-slate-950/10">
                      <UserCircle className="h-10 w-10" />
                    </div>
                    <h2 className="mt-6 text-4xl font-black tracking-tight">{profile?.name || "Auditor"}</h2>
                    <p className="mt-3 flex items-center gap-2 text-sm font-bold opacity-70">
                      <Mail className="h-4 w-4" />
                      {profile?.email || "No email"}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-2">
                      {(profile?.roles ?? [{ name: "auditor" }]).map((role) => <StatusPill key={role.id ?? role.name} tone="good">{role.name}</StatusPill>)}
                    </div>
                  </div>

                  <div className="grid gap-4 p-6 sm:grid-cols-2">
                    {[
                      ["User ID", profile?.id],
                      ["Phone", profile?.phone],
                      ["Gender", formatStatus(profile?.gender)],
                      ["Address", profile?.address],
                      ["Birth date", profile?.date_of_birth ? compactDate(profile.date_of_birth) : null],
                      ["Access", "Content auditor"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
                        <p className="mt-3 break-words text-lg font-black text-slate-950 dark:text-white">{value || "Not provided"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
