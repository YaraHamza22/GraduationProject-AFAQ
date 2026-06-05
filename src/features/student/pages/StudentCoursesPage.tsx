"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import axios, { type AxiosRequestConfig } from "axios";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  User
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getStudentApiBaseUrl,
  getStudentApiCached,
  getStudentApiEndpoint,
  getStudentApiRequestUrl,
  invalidateStudentApiCache,
} from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";
import { motion, AnimatePresence } from "framer-motion";

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

type CourseCategory = {
  id: number;
  name: string | LocalizedText;
  slug: string;
  description?: string;
  is_active?: boolean;
};

type Instructor = {
  id: number;
  name: string;
  email?: string;
  is_primary?: boolean;
};

type CourseSummary = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  title_translations?: LocalizedText;
  description_translations?: LocalizedText;
  cover_url?: string;
  intro_video_url?: string;
  actual_duration_hours?: number;
  difficulty_level?: string;
  course_category?: CourseCategory;
  creator?: { name: string; email?: string };
  instructors?: Instructor[];
  units?: Array<Record<string, unknown>>;
};

type Enrollment = {
  id: number;
  course_id?: number;
  progress_percentage?: number;
  enrolled_at?: string;
  is_completed?: boolean;
  course?: CourseSummary;
};

type ProgressDetails = {
  enrollment_id: number;
  progress_percentage: number;
  total_units: number;
  total_lessons: number;
  completed_lessons: number;
  remaining_lessons: number;
  is_completed: boolean;
};

type EnrolledCourse = CourseSummary & {
  enrollment?: Enrollment;
};

type ApiEnvelope<T> = {
  data?: T | { data?: T };
  message?: string;
  status?: string;
  pagination?: PaginationMeta;
};

type PaginationMeta = {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
};

type EnrollmentCreateResponse = {
  status?: string;
  message?: string;
  data?: Enrollment & {
    learner_id?: number;
    enrollment_type?: string;
    enrollment_status?: string;
    final_grade?: number | null;
    enrolled_by?: number | null;
    created_at?: string;
    updated_at?: string;
    enrollment_duration_days?: number;
  };
};

const ITEMS_PER_PAGE = 6;
const DISCOVERABLE_ENDPOINTS = [
  "/courses/enrollable/list",
  "/courses/discoverable",
  "/discover-courses",
] as const;

type ActiveTab = "learning" | "discover";

function buildStudentHeaders(token: string, language: "en" | "ar") {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Accept-Language": language,
    "X-Locale": language,
  };
}

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

function normalizeMediaUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";

  const raw = value.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const baseUrl = getStudentApiBaseUrl();
  if (!baseUrl) return raw;

  try {
    const origin = new URL(baseUrl).origin;
    return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
  } catch {
    return raw;
  }
}

function parseCourseSummary(raw: unknown): CourseSummary | null {
  if (!isRecord(raw)) return null;

  const id = asNumber(raw.id);
  if (!id) return null;

  return {
    id,
    title: asString(raw.title, `Course #${id}`),
    slug: asString(raw.slug, String(id)),
    description: asString(raw.description),
    title_translations: isRecord(raw.title_translations) ? (raw.title_translations as LocalizedText) : undefined,
    description_translations: isRecord(raw.description_translations) ? (raw.description_translations as LocalizedText) : undefined,
    cover_url: asString(raw.cover_url),
    intro_video_url: asString(raw.intro_video_url),
    actual_duration_hours: asNumber(raw.actual_duration_hours),
    difficulty_level: asString(raw.difficulty_level),
    course_category: isRecord(raw.course_category) ? (raw.course_category as CourseCategory) : undefined,
    creator: isRecord(raw.creator) ? { name: asString(raw.creator.name, "System"), email: asString(raw.creator.email) } : undefined,
    instructors: Array.isArray(raw.instructors) ? raw.instructors.filter(isRecord).map((item) => ({
      id: asNumber(item.id),
      name: asString(item.name, "Instructor"),
      email: asString(item.email),
      is_primary: typeof item.is_primary === "boolean" ? item.is_primary : undefined,
    })) : undefined,
    units: Array.isArray(raw.units) ? raw.units.filter(isRecord) : undefined,
  };
}

function parseCoursesArray<T>(payload: unknown) {
  const root = isRecord(payload) ? payload : {};
  const data = root.data;

  if (Array.isArray(data)) return data as T[];
  if (isRecord(data) && Array.isArray(data.data)) return data.data as T[];
  if (Array.isArray(payload)) return payload as T[];

  return [] as T[];
}

function parseEnrollments(payload: unknown): Enrollment[] {
  const rows = parseCoursesArray<unknown>(payload);
  const enrollments: Enrollment[] = [];

  for (const raw of rows) {
    if (!isRecord(raw)) continue;

    const course = parseCourseSummary(isRecord(raw.course) ? raw.course : raw);
    const enrollment: Enrollment = {
      id: asNumber(raw.id),
      course_id: asNumber(raw.course_id) || course?.id,
      progress_percentage: asNumber(raw.progress_percentage),
      enrolled_at: asString(raw.enrolled_at),
      is_completed: Boolean(raw.is_completed),
      course: course ?? undefined,
    };

    if (enrollment.id > 0) {
      enrollments.push(enrollment);
    }
  }

  return enrollments;
}

function parseCourseList(payload: unknown) {
  return parseCoursesArray<unknown>(payload)
    .map(parseCourseSummary)
    .filter((course): course is CourseSummary => course !== null);
}

function parsePagination(payload: unknown, fallbackCount = 0): PaginationMeta {
  const root = isRecord(payload) ? payload : {};
  const pagination = isRecord(root.pagination) ? root.pagination : {};
  const count = asNumber(pagination.count, fallbackCount);
  const perPage = Math.max(1, asNumber(pagination.per_page, ITEMS_PER_PAGE));
  const total = Math.max(count, asNumber(pagination.total, fallbackCount));
  const totalPages = Math.max(1, asNumber(pagination.total_pages, Math.ceil(total / perPage) || 1));
  const currentPage = Math.max(1, asNumber(pagination.current_page, 1));

  return {
    total,
    count,
    per_page: perPage,
    current_page: currentPage,
    total_pages: totalPages,
  };
}

async function getFirstAvailableStudentGet<T>(
  paths: readonly string[],
  config: AxiosRequestConfig,
  force = false
) {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await getStudentApiCached<T>(path, config, { ttlMs: 20_000, force });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("no_endpoint_available");
}

async function requestStudentApi<T>(config: AxiosRequestConfig) {
  const rawUrl = String(config.url ?? "");

  try {
    return await axios.request<T>({
      ...config,
      url: getStudentApiRequestUrl(rawUrl),
    });
  } catch (error) {
    if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
      throw error;
    }

    return axios.request<T>({
      ...config,
      url: getStudentApiEndpoint(rawUrl),
    });
  }
}

export default function StudentCoursesPage() {
  const { t, isRTL, language } = useLanguage();

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [discoverableCourses, setDiscoverableCourses] = useState<CourseSummary[]>([]);
  const [learningMeta, setLearningMeta] = useState<PaginationMeta>({
    total: 0,
    count: 0,
    per_page: ITEMS_PER_PAGE,
    current_page: 1,
    total_pages: 1,
  });
  const [discoverMeta, setDiscoverMeta] = useState<PaginationMeta>({
    total: 0,
    count: 0,
    per_page: ITEMS_PER_PAGE,
    current_page: 1,
    total_pages: 1,
  });
  const [progressData, setProgressData] = useState<Record<number, ProgressDetails>>({});
  const [progressLoading, setProgressLoading] = useState<Record<number, boolean>>({});
  const [progressErrors, setProgressErrors] = useState<Record<number, string>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [learningLoading, setLearningLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("learning");
  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(null);
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [discoverablePage, setDiscoverablePage] = useState(1);
  const [hasLoadedDiscover, setHasLoadedDiscover] = useState(false);

  const fetchLearningPage = useCallback(async (page: number, force = false) => {
    setLearningLoading(true);
    setErrorMessage(null);

    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const headers = buildStudentHeaders(token, language);

      const [learningRes, enrollmentsRes] = await Promise.all([
        getStudentApiCached<ApiEnvelope<CourseSummary[]>>("/my-learning", {
          headers,
          params: { page, per_page: ITEMS_PER_PAGE },
        }, { ttlMs: 20_000, force }),
        getStudentApiCached<ApiEnvelope<Enrollment[]>>("/enrollments", {
          headers,
          params: { page, per_page: ITEMS_PER_PAGE },
        }, { ttlMs: 20_000, force }),
      ]);

      const learningCourses = parseCourseList(learningRes.data);
      const enrollments = parseEnrollments(enrollmentsRes.data);
      const pagination = parsePagination(learningRes.data, learningCourses.length);

      const enrollmentByCourseId = new Map<number, Enrollment>();
      for (const enrollment of enrollments) {
        const courseId = enrollment.course?.id ?? enrollment.course_id;
        if (courseId) {
          enrollmentByCourseId.set(courseId, enrollment);
        }
      }

      const enrolledMerged = learningCourses.map((course) => ({
        ...course,
        ...enrollmentByCourseId.get(course.id)?.course,
        enrollment: enrollmentByCourseId.get(course.id),
      }));

      setEnrolledCourses(enrolledMerged);
      setLearningMeta(pagination);
    } catch (error) {
      console.error("Failed to load my learning courses:", error);
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Student token is missing. Please log in again.");
      } else {
        setErrorMessage("Failed to load My Learning.");
      }
    } finally {
      setLearningLoading(false);
      setIsInitialLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void fetchLearningPage(enrolledPage);
  }, [enrolledPage, fetchLearningPage]);

  const fetchDiscoverPage = useCallback(async (page: number, force = false) => {
    setDiscoverLoading(true);
    setErrorMessage(null);

    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const headers = buildStudentHeaders(token, language);

      const response = await getFirstAvailableStudentGet<ApiEnvelope<CourseSummary[]>>(
        DISCOVERABLE_ENDPOINTS,
        {
          headers,
          params: { page, per_page: ITEMS_PER_PAGE },
        },
        force
      );

      const discoverable = parseCourseList(response.data);
      const pagination = parsePagination(response.data, discoverable.length);

      setDiscoverableCourses(discoverable);
      setDiscoverMeta(pagination);
      setHasLoadedDiscover(true);
    } catch (error) {
      console.error("Failed to load discoverable courses:", error);
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Student token is missing. Please log in again.");
      } else {
        setErrorMessage("Failed to load discover courses.");
      }
    } finally {
      setDiscoverLoading(false);
      setIsInitialLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (activeTab !== "discover") return;
    void fetchDiscoverPage(discoverablePage);
  }, [activeTab, discoverablePage, fetchDiscoverPage]);

  const refreshActiveTab = useCallback(async () => {
    setSuccessMessage(null);
    if (activeTab === "learning") {
      await fetchLearningPage(enrolledPage, true);
      return;
    }
    await fetchDiscoverPage(discoverablePage, true);
  }, [activeTab, discoverablePage, enrolledPage, fetchDiscoverPage, fetchLearningPage]);

  const enrollInCourse = async (course: CourseSummary) => {
    const token = getStudentToken();
    if (!token) {
      setErrorMessage("Student token is missing. Please log in again.");
      return;
    }

    setEnrollingCourseId(course.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await requestStudentApi<EnrollmentCreateResponse>({
        method: "POST",
        url: "/enrollments",
        headers: {
          ...buildStudentHeaders(token, language),
          "Content-Type": "application/json",
        },
        data: {
          course_id: course.id,
          enrollment_type: "self",
          enrolled_by: null,
        },
      });

      const createdEnrollment = response.data?.data;
      const normalizedEnrollment: Enrollment = {
        id: asNumber(createdEnrollment?.id),
        course_id: asNumber(createdEnrollment?.course_id, course.id),
        progress_percentage: asNumber(createdEnrollment?.progress_percentage),
        enrolled_at: asString(createdEnrollment?.enrolled_at),
        is_completed: Boolean(createdEnrollment?.is_completed),
        course: parseCourseSummary(createdEnrollment?.course) ?? course,
      };

      const enrolledCourse: EnrolledCourse = {
        ...course,
        ...(normalizedEnrollment.course ?? {}),
        enrollment: normalizedEnrollment,
      };

      setDiscoverableCourses((prev) => prev.filter((item) => item.id !== course.id));
      setEnrolledCourses((prev) => {
        const exists = prev.some((item) => item.id === enrolledCourse.id);
        if (exists) return prev;
        return [enrolledCourse, ...prev];
      });
      setLearningMeta((prev) => ({
        ...prev,
        total: prev.total + 1,
        total_pages: Math.max(1, Math.ceil((prev.total + 1) / prev.per_page)),
        current_page: 1,
      }));
      setDiscoverMeta((prev) => {
        const nextTotal = Math.max(0, prev.total - 1);
        return {
          ...prev,
          total: nextTotal,
          count: Math.max(0, prev.count - 1),
          total_pages: Math.max(1, Math.ceil(Math.max(1, nextTotal) / prev.per_page)),
        };
      });
      setProgressData((prev) => ({
        ...prev,
        [normalizedEnrollment.id]: {
          enrollment_id: normalizedEnrollment.id,
          progress_percentage: normalizedEnrollment.progress_percentage ?? 0,
          total_units: 0,
          total_lessons: 0,
          completed_lessons: 0,
          remaining_lessons: 0,
          is_completed: normalizedEnrollment.is_completed ?? false,
        },
      }));

      invalidateStudentApiCache("/my-learning");
      invalidateStudentApiCache("/enrollments");
      invalidateStudentApiCache("/courses/enrollable/list");

      setActiveTab("learning");
      setEnrolledPage(1);
      setSuccessMessage(response.data?.message || "Enrollment created successfully.");
      void fetchLearningPage(1, true);
    } catch (error) {
      console.error("Failed to create enrollment:", error);
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Failed to enroll in course.");
      }
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const fetchProgress = async (enrollmentId: number) => {
    if (progressData[enrollmentId] || progressLoading[enrollmentId]) return;

    try {
      setProgressLoading((prev) => ({ ...prev, [enrollmentId]: true }));
      setProgressErrors((prev) => {
        if (!prev[enrollmentId]) return prev;
        const next = { ...prev };
        delete next[enrollmentId];
        return next;
      });

      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const response = await getStudentApiCached<{ data: ProgressDetails }>(
        `/enrollments/${enrollmentId}/progress`,
        {
          headers: buildStudentHeaders(token, language),
        },
        { ttlMs: 30_000 }
      );

      setProgressData((prev) => ({ ...prev, [enrollmentId]: response.data.data }));
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      const apiMessage =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Progress details are unavailable right now.";
      setProgressErrors((prev) => ({ ...prev, [enrollmentId]: apiMessage }));
    } finally {
      setProgressLoading((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const isLoading = isInitialLoading || (activeTab === "learning" ? learningLoading && enrolledCourses.length === 0 : discoverLoading && !hasLoadedDiscover);

  return (
    <div className="min-h-screen bg-(--background) p-4 text-(--foreground) md:p-8 lg:p-12">
      <div className={`mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${isRTL ? "md:flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="mb-4 text-5xl font-black leading-none tracking-tighter">{t("std.courses")}</h1>
          <p className="text-lg font-medium opacity-40">{t("std.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={() => void refreshActiveTab()}
          disabled={learningLoading || discoverLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {learningLoading || discoverLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <AnimatePresence mode="wait">
        {errorMessage ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-8 flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-500 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">{errorMessage}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {successMessage ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-8 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">{successMessage}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <div className="absolute inset-0 animate-pulse bg-indigo-500/20 blur-xl" />
          </div>
          <p className="animate-pulse text-sm font-bold uppercase tracking-widest opacity-30">
            Loading Platform Content...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className={`flex flex-wrap items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <TabButton
              label={`${t("std.my_learning")} (${learningMeta.total})`}
              icon={BookOpen}
              isActive={activeTab === "learning"}
              onClick={() => setActiveTab("learning")}
            />
            <TabButton
              label={`${t("std.discover")} (${discoverMeta.total})`}
              icon={Sparkles}
              isActive={activeTab === "discover"}
              onClick={() => setActiveTab("discover")}
            />
          </div>

          {activeTab === "learning" ? (
            <CourseSection
              title={t("std.my_learning")}
              subtitle="Only courses you are enrolled in."
              isRTL={isRTL}
              currentPage={enrolledPage}
              totalPages={learningMeta.total_pages}
              onChangePage={setEnrolledPage}
              isSectionLoading={learningLoading}
            >
              {enrolledCourses.length > 0 ? (
                enrolledCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    type="enrolled"
                    data={course}
                    progress={course.enrollment ? progressData[course.enrollment.id] : undefined}
                    progressError={course.enrollment ? progressErrors[course.enrollment.id] : undefined}
                    isProgressLoading={course.enrollment ? progressLoading[course.enrollment.id] === true : false}
                    onFetchProgress={course.enrollment ? () => void fetchProgress(course.enrollment!.id) : undefined}
                    isRTL={isRTL}
                    language={language}
                    t={t}
                  />
                ))
              ) : (
                <EmptyState icon={BookOpen} message="No courses enrolled yet." />
              )}
            </CourseSection>
          ) : (
            <CourseSection
              title={t("std.discover")}
              subtitle="Courses available to you that you have not enrolled in yet."
              isRTL={isRTL}
              currentPage={discoverablePage}
              totalPages={discoverMeta.total_pages}
              onChangePage={setDiscoverablePage}
              isSectionLoading={discoverLoading}
            >
              {discoverableCourses.length > 0 ? (
                discoverableCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    type="enrollable"
                    data={course}
                    isRTL={isRTL}
                    language={language}
                    t={t}
                    onEnroll={() => void enrollInCourse(course)}
                    isActionLoading={enrollingCourseId === course.id}
                  />
                ))
              ) : (
                <EmptyState icon={BookOpen} message="No discoverable courses right now." />
              )}
            </CourseSection>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${
        isActive
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
          : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-500/40 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function CourseSection({
  title,
  subtitle,
  currentPage,
  totalPages,
  onChangePage,
  isRTL,
  isSectionLoading,
  children,
}: {
  title: string;
  subtitle: string;
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
  isRTL: boolean;
  isSectionLoading?: boolean;
  children: React.ReactNode;
}) {
  const changePage = (nextPage: number) => {
    const boundedPage = Math.max(1, Math.min(nextPage, totalPages));
    onChangePage(boundedPage);
  };

  return (
    <section className="space-y-6">
      <div className={`flex flex-col gap-2 ${isRTL ? "text-right" : ""}`}>
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        <p className="text-sm opacity-50">{subtitle}</p>
      </div>

      {isSectionLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading this page...
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </div>

      {totalPages > 1 ? (
        <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${isRTL ? "md:flex-row-reverse" : ""}`}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] opacity-40">
            Page {currentPage} of {totalPages}
          </p>
          <div className={`flex flex-wrap gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition hover:border-indigo-500/40 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => changePage(pageNumber)}
                className={`min-w-11 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${
                  pageNumber === currentPage
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "border border-slate-200 hover:border-indigo-500/40 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition hover:border-indigo-500/40 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CourseCard({
  type,
  data,
  progress,
  progressError,
  isProgressLoading,
  onFetchProgress,
  onEnroll,
  isActionLoading,
  isRTL,
  language,
  t
}: {
  type: "enrolled" | "enrollable";
  data: EnrolledCourse | CourseSummary;
  progress?: ProgressDetails;
  progressError?: string;
  isProgressLoading?: boolean;
  onFetchProgress?: () => void;
  onEnroll?: () => void;
  isActionLoading?: boolean;
  isRTL: boolean;
  language: "en" | "ar";
  t: (key: string) => string;
}) {
  const [showProgress, setShowProgress] = useState(false);
  const [isMediaHovered, setIsMediaHovered] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const isEnrolled = type === "enrolled";
  const course = data;
  const enrolledData = isEnrolled ? (data as EnrolledCourse).enrollment : undefined;
  const progressPercent = enrolledData?.progress_percentage ?? progress?.progress_percentage ?? 0;
  const isCompleted = enrolledData?.is_completed ?? progress?.is_completed ?? false;
  const locale = language === "ar" ? "ar" : "en";
  const fallbackLocale = locale === "ar" ? "en" : "ar";

  const getLocalizedValue = (value: unknown, fallback = "") => {
    if (typeof value === "string" && value.trim()) return value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
    const map = value as LocalizedText;
    return map[locale]?.trim() || map[fallbackLocale]?.trim() || fallback;
  };

  const localizedTitle =
    getLocalizedValue(course.title_translations, "") ||
    (typeof course.title === "string" ? course.title : "Untitled");
  const localizedDescription =
    getLocalizedValue(course.description_translations, "") ||
    (typeof course.description === "string" && course.description.trim() ? course.description : "No description provided.");
  const localizedCategory =
    getLocalizedValue(course.course_category?.name, "") ||
    (typeof course.course_category?.name === "string" ? course.course_category.name : "Academic");
  const normalizedCoverUrl = normalizeMediaUrl(course.cover_url);
  const normalizedVideoUrl = normalizeMediaUrl(course.intro_video_url);
  const shouldPreferVideo = !normalizedCoverUrl && Boolean(normalizedVideoUrl);
  const shouldShowHoverVideo = Boolean(normalizedCoverUrl && normalizedVideoUrl && isMediaHovered);

  const toggleProgress = () => {
    if (!showProgress && onFetchProgress && !progress && !progressError && !isProgressLoading) onFetchProgress();
    setShowProgress(!showProgress);
  };

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPreferVideo || shouldShowHoverVideo) {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {});
      }
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [shouldPreferVideo, shouldShowHoverVideo]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:border-indigo-500/30 hover:shadow-2xl dark:border-white/10 dark:bg-white/5"
    >
      <div
        className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-900"
        onMouseEnter={() => setIsMediaHovered(true)}
        onMouseLeave={() => setIsMediaHovered(false)}
      >
        {normalizedCoverUrl ? (
          <Image
            src={normalizedCoverUrl}
            alt={localizedTitle}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
              shouldShowHoverVideo ? "scale-105 opacity-0" : "opacity-100 group-hover:scale-110"
            }`}
          />
        ) : null}

        {normalizedVideoUrl ? (
          <video
            ref={videoRef}
            src={normalizedVideoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              shouldPreferVideo || shouldShowHoverVideo ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}

        {!normalizedCoverUrl && !normalizedVideoUrl ? (
          <div className="flex h-full w-full items-center justify-center opacity-10">
            <BookOpen className="h-24 w-24" />
          </div>
        ) : null}

        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

        <div className={`absolute bottom-4 left-6 right-6 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
            {localizedCategory}
          </div>
          {isEnrolled && isCompleted ? (
            <div className="rounded-full bg-emerald-500 p-1.5 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : null}
        </div>
      </div>

      <div className={`flex flex-1 flex-col p-6 ${isRTL ? "text-right" : "text-left"}`}>
        <h3 className="mb-2 text-xl font-black leading-tight tracking-tight transition-colors group-hover:text-indigo-500">
          {localizedTitle}
        </h3>
        <p className="mb-6 line-clamp-2 text-xs font-medium leading-relaxed opacity-50">
          {localizedDescription}
        </p>

        <div className="mt-auto space-y-4">
          <div className={`flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{course.actual_duration_hours ?? 0}h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>{course.creator?.name || "System"}</span>
            </div>
          </div>

          {type === "enrolled" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                <span className="opacity-40">{t("std.progress")}</span>
                <span className="text-indigo-500">{progressPercent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                />
              </div>

              {enrolledData ? (
                <div className="pt-2">
                  <button
                    onClick={toggleProgress}
                    className="group/btn flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600/5 py-3 text-xs font-black uppercase tracking-widest text-indigo-600 transition-all duration-300 hover:bg-indigo-600 hover:text-white"
                  >
                    <Info className="h-4 w-4" />
                    {t("std.progress_details")}
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${showProgress ? "rotate-90" : ""} ${isRTL ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {showProgress ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200/50 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5">
                          {progress ? (
                            <div className="grid grid-cols-2 gap-4">
                              <ProgressStat label="Units" value={progress.total_units} />
                              <ProgressStat label="Lessons" value={progress.total_lessons} />
                              <ProgressStat label="Completed" value={progress.completed_lessons} />
                              <ProgressStat label="Remaining" value={progress.remaining_lessons} />
                            </div>
                          ) : progressError ? (
                            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <p className="text-xs font-semibold leading-relaxed">{progressError}</p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin opacity-20" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={onEnroll}
              disabled={isActionLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:opacity-50"
              title={t("std.join_course")}
            >
              {isActionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" />
                  {t("std.join_course")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200/50 bg-white p-3 dark:border-white/5 dark:bg-white/5">
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest opacity-30">{label}</p>
      <p className="text-xl font-black tracking-tighter">{value}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="col-span-full flex flex-col items-center justify-center gap-6 py-24 text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl" />
        <Icon className="relative h-20 w-20 opacity-10" />
      </div>
      <div>
        <p className="text-xl font-bold opacity-30">{message}</p>
        <p className="mt-2 text-sm opacity-20">Explore the platform to find more amazing content.</p>
      </div>
    </motion.div>
  );
}
