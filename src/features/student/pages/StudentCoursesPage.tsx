"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Info,
  Loader2,
  PlayCircle,
  User
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentId, getStudentToken } from "@/features/student/studentSession";
import { motion, AnimatePresence } from "framer-motion";
import { getStudentApiBaseUrl } from "@/features/student/studentApi";

// --- Types ---

type CourseCategory = {
  id: number;
  name: string | LocalizedText;
  slug: string;
};

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

type Instructor = {
  id: number;
  name: string;
  email: string;
  is_primary: boolean;
};

type EnrollableCourse = {
  id: number;
  title: string;
  title_translations?: LocalizedText;
  slug: string;
  description: string;
  description_translations?: LocalizedText;
  cover_url: string;
  intro_video_url?: string;
  actual_duration_hours: number;
  difficulty_level: string;
  course_category: CourseCategory;
  creator: { name: string };
  instructors: Instructor[];
};

type Enrollment = {
  id: number;
  course_id?: number;
  progress_percentage?: number;
  enrolled_at?: string;
  is_completed?: boolean;
  course?: {
    id: number;
    title: string;
    title_translations?: LocalizedText;
    slug: string;
    description: string;
    description_translations?: LocalizedText;
    cover_url?: string;
    intro_video_url?: string;
    actual_duration_hours: number;
    course_category?: CourseCategory;
    creator?: { name: string };
  };
  // Keep optional direct course fields for backward compatibility.
  title?: string;
  slug?: string;
  description?: string;
  description_translations?: LocalizedText;
  cover_url?: string;
  intro_video_url?: string;
  actual_duration_hours?: number;
  title_translations?: LocalizedText;
  course_category?: CourseCategory;
  creator?: { name: string };
};

type CourseMediaDetails = {
  cover_url?: string;
  intro_video_url?: string;
  title_translations?: LocalizedText;
  description_translations?: LocalizedText;
  course_category?: CourseCategory;
  creator?: { name: string };
};

type CourseMediaEntry = readonly [number, CourseMediaDetails];

type ProgressDetails = {
  enrollment_id: number;
  progress_percentage: number;
  total_units: number;
  total_lessons: number;
  completed_lessons: number;
  remaining_lessons: number;
  is_completed: boolean;
};

type CourseCardData = Enrollment | EnrollableCourse;

function normalizeMediaUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";

  const raw = value.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const baseUrl = getStudentApiBaseUrl();
  if (!baseUrl) return raw;

  const origin = (() => {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return "";
    }
  })();

  if (!origin) return raw;
  return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

// --- Main Component ---

export default function StudentCoursesPage() {
  const { t, isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"my-learning" | "discover">("my-learning");
  const ITEMS_PER_PAGE = 6;

  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [discoverCourses, setDiscoverCourses] = useState<EnrollableCourse[]>([]);
  const [courseMediaById, setCourseMediaById] = useState<Record<number, CourseMediaDetails>>({});
  const [progressData, setProgressData] = useState<Record<number, ProgressDetails>>({});
  const [progressLoading, setProgressLoading] = useState<Record<number, boolean>>({});
  const [progressErrors, setProgressErrors] = useState<Record<number, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [enrolledPage, setEnrolledPage] = useState(1);
  const [discoverPage, setDiscoverPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      // Fetch enrolled courses from /enrollments (supports filters + pagination)
      const enrolledRes = await axios.get(getStudentApiRequestUrl("/enrollments"), {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        params: { per_page: 15 },
      });

      const enrolledPayload = enrolledRes.data?.data;
      const enrollments: Enrollment[] = Array.isArray(enrolledPayload)
        ? enrolledPayload
        : Array.isArray(enrolledPayload?.data)
          ? enrolledPayload.data
          : [];

      setEnrolledCourses(enrollments);

      // Fetch visible courses, then exclude already enrolled ones client-side.
      const discoverRes = await axios.get(getStudentApiRequestUrl("/courses"), {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        params: { per_page: 15 },
      });
      const discoverPayload = discoverRes.data?.data;
      const allDiscoverable: EnrollableCourse[] = Array.isArray(discoverPayload)
        ? discoverPayload
        : Array.isArray(discoverPayload?.data)
          ? discoverPayload.data
          : [];

      // Filter out courses that are already enrolled.
      const enrolledCourseIdSet = new Set(
        enrollments
          .map((enrollment) => enrollment.course?.id ?? enrollment.course_id)
          .filter((id): id is number => typeof id === "number")
      );
      const trulyDiscoverable = allDiscoverable.filter((course) => !enrolledCourseIdSet.has(course.id));

      setDiscoverCourses(trulyDiscoverable);

      const enrolledCourseIds = Array.from(enrolledCourseIdSet);

      const mediaEntries: Array<CourseMediaEntry | null> = await Promise.all(
        enrolledCourseIds.map(async (courseId: number) => {
          try {
            const response = await axios.get(getStudentApiRequestUrl(`/courses/${courseId}`), {
              headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            });
            const coursePayload = response.data?.data?.data ?? response.data?.data ?? response.data;
            if (!coursePayload || typeof coursePayload !== "object") return null;
            const courseMedia: CourseMediaDetails = {
              cover_url: typeof (coursePayload as { cover_url?: unknown }).cover_url === "string" ? (coursePayload as { cover_url?: string }).cover_url : undefined,
              intro_video_url: typeof (coursePayload as { intro_video_url?: unknown }).intro_video_url === "string" ? (coursePayload as { intro_video_url?: string }).intro_video_url : undefined,
              title_translations: (coursePayload as { title_translations?: LocalizedText }).title_translations,
              description_translations: (coursePayload as { description_translations?: LocalizedText }).description_translations,
              course_category: (coursePayload as { course_category?: CourseCategory }).course_category,
              creator: (coursePayload as { creator?: { name: string } }).creator,
            };
            return [
              courseId,
              courseMedia,
            ] as CourseMediaEntry;
          } catch {
            return null;
          }
        })
      );

      setCourseMediaById(
        Object.fromEntries(mediaEntries.filter((entry): entry is CourseMediaEntry => entry !== null))
      );

    } catch (error) {
      console.error("Fetch error:", error);
      setErrorMessage("Failed to load course data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setEnrolledPage(1);
  }, [enrolledCourses.length]);

  useEffect(() => {
    setDiscoverPage(1);
  }, [discoverCourses.length]);

  const handleEnroll = async (courseId: number) => {
    setIsActionLoading(courseId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = getStudentToken();
      const learnerId = getStoredStudentId();

      if (!token || learnerId === null) {
        throw new Error("missing_student_session");
      }

      await axios.post(getStudentApiRequestUrl("/enrollments"),
        { course_id: courseId, learner_id: learnerId },
        { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage("Successfully enrolled in the course!");
      void fetchData(); // Refresh both lists
      setActiveTab("my-learning");
    } catch (error) {
      const apiMessage =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : null;

      setErrorMessage(apiMessage || "Failed to enroll in the course.");
    } finally {
      setIsActionLoading(null);
    }
  };

  const fetchProgress = async (enrollmentId: number) => {
    if (progressData[enrollmentId] || progressLoading[enrollmentId]) return; // Already fetched/in flight

    try {
      setProgressLoading((prev) => ({ ...prev, [enrollmentId]: true }));
      setProgressErrors((prev) => {
        if (!prev[enrollmentId]) return prev;
        const next = { ...prev };
        delete next[enrollmentId];
        return next;
      });
      const token = getStudentToken();
      const res = await axios.get(getStudentApiRequestUrl(`/enrollments/${enrollmentId}/progress`), {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      setProgressData(prev => ({ ...prev, [enrollmentId]: res.data.data }));
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      const fallback = "Progress details are unavailable right now.";
      const apiMessage = axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
        ? error.response.data.message
        : null;
      setProgressErrors((prev) => ({ ...prev, [enrollmentId]: apiMessage || fallback }));
    } finally {
      setProgressLoading((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const enrolledTotalPages = Math.max(1, Math.ceil(enrolledCourses.length / ITEMS_PER_PAGE));
  const discoverTotalPages = Math.max(1, Math.ceil(discoverCourses.length / ITEMS_PER_PAGE));

  const pagedEnrolledCourses = enrolledCourses.slice(
    (enrolledPage - 1) * ITEMS_PER_PAGE,
    enrolledPage * ITEMS_PER_PAGE
  );
  const pagedDiscoverCourses = discoverCourses.slice(
    (discoverPage - 1) * ITEMS_PER_PAGE,
    discoverPage * ITEMS_PER_PAGE
  );

  const currentPage = activeTab === "my-learning" ? enrolledPage : discoverPage;
  const totalPages = activeTab === "my-learning" ? enrolledTotalPages : discoverTotalPages;

  const changePage = (nextPage: number) => {
    const boundedPage = Math.max(1, Math.min(nextPage, totalPages));
    if (activeTab === "my-learning") {
      setEnrolledPage(boundedPage);
      return;
    }
    setDiscoverPage(boundedPage);
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 min-h-screen bg-(--background) text-(--foreground)">
      {/* Header */}
      <div className={`mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 ${isRTL ? "md:flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">
            {t("std.courses")}
          </h1>
          <p className="text-lg opacity-40 font-medium">
            {activeTab === "my-learning" ? t("std.subtitle") : t("std.discover")}
          </p>
        </div>

        <div className="flex bg-slate-200/50 dark:bg-white/5 p-1.5 rounded-2xl backdrop-blur-xl">
          <button
            onClick={() => setActiveTab("my-learning")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "my-learning"
              ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl scale-105"
              : "opacity-50 hover:opacity-100"
              }`}
          >
            {t("std.my_learning")}
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "discover"
              ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl scale-105"
              : "opacity-50 hover:opacity-100"
              }`}
          >
            {t("std.discover")}
          </button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">{errorMessage}</p>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">{successMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
          </div>
          <p className="text-sm font-bold opacity-30 uppercase tracking-widest animate-pulse">Loading Platform Content...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <AnimatePresence mode="popLayout">
              {activeTab === "my-learning" ? (
                enrolledCourses.length > 0 ? (
                  pagedEnrolledCourses.map((enrollment) => (
                  <CourseCard
                    key={enrollment.id}
                    type="enrolled"
                    data={enrollment}
                    courseMedia={courseMediaById[enrollment.course?.id ?? enrollment.course_id ?? 0]}
                    progress={progressData[enrollment.id]}
                    progressError={progressErrors[enrollment.id]}
                    isProgressLoading={progressLoading[enrollment.id] === true}
                      onFetchProgress={() => void fetchProgress(enrollment.id)}
                      isRTL={isRTL}
                      language={language}
                      t={t}
                    />
                  ))
                ) : (
                  <EmptyState icon={BookOpen} message="No courses enrolled yet." />
                )
              ) : (
                discoverCourses.length > 0 ? (
                  pagedDiscoverCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      type="enrollable"
                      data={course}
                      isRTL={isRTL}
                      language={language}
                      t={t}
                      onEnroll={() => void handleEnroll(course.id)}
                      isActionLoading={isActionLoading === course.id}
                    />
                  ))
                ) : (
                  <EmptyState icon={Compass} message="No new courses available at the moment." />
                )
              )}
            </AnimatePresence>
          </div>

          {totalPages > 1 ? (
            <div className={`mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${isRTL ? "md:flex-row-reverse" : ""}`}>
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
        </>
      )}
    </div>
  );
}

// --- Sub-components ---

function CourseCard({
  type,
  data,
  progress,
  progressError,
  isProgressLoading,
  onFetchProgress,
  onEnroll,
  isActionLoading,
  courseMedia,
  isRTL,
  language,
  t
}: {
  type: "enrolled" | "enrollable";
  data: CourseCardData;
  courseMedia?: CourseMediaDetails;
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

  const toggleProgress = () => {
    if (!showProgress && onFetchProgress && !progress && !progressError && !isProgressLoading) onFetchProgress();
    setShowProgress(!showProgress);
  };

  const isEnrolled = type === "enrolled";
  const enrolledData = isEnrolled ? (data as Enrollment) : null;
  const course = enrolledData?.course ? enrolledData.course : data;
  const courseWithMedia = isEnrolled && courseMedia ? { ...course, ...courseMedia } : course;
  const progressPercent = enrolledData?.progress_percentage ?? 0;
  const isCompleted = enrolledData?.is_completed ?? false;
  const locale = language === "ar" ? "ar" : "en";
  const fallbackLocale = locale === "ar" ? "en" : "ar";

  const getLocalizedValue = (value: unknown, fallback = "") => {
    if (typeof value === "string" && value.trim()) return value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
    const map = value as LocalizedText;
    return map[locale]?.trim() || map[fallbackLocale]?.trim() || fallback;
  };

  const localizedTitle =
    getLocalizedValue(courseWithMedia.title_translations, "") ||
    (typeof courseWithMedia.title === "string" ? courseWithMedia.title : "Untitled");
  const localizedDescription =
    getLocalizedValue(courseWithMedia.description_translations, "") ||
    (typeof courseWithMedia.description === "string" ? courseWithMedia.description : "No description provided.");
  const localizedCategory =
    getLocalizedValue(courseWithMedia.course_category?.name, "") ||
    (typeof courseWithMedia.course_category?.name === "string" ? courseWithMedia.course_category.name : "Academic");
  const normalizedCoverUrl = normalizeMediaUrl(courseWithMedia.cover_url);
  const normalizedVideoUrl = normalizeMediaUrl(courseWithMedia.intro_video_url);
  const shouldPreferVideo = !normalizedCoverUrl && Boolean(normalizedVideoUrl);
  const shouldShowHoverVideo = Boolean(normalizedCoverUrl && normalizedVideoUrl && isMediaHovered);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPreferVideo || shouldShowHoverVideo) {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {
          // Ignore autoplay rejections; the cover/fallback remains visible.
        });
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
      className="group relative bg-white dark:bg-white/5 rounded-[2.5rem] border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col shadow-sm hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-500"
    >
      {/* Visual Header */}
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
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
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
          <div className="w-full h-full flex items-center justify-center opacity-10">
            <BookOpen className="w-24 h-24" />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

        <div className={`absolute bottom-4 left-6 right-6 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={`px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-black text-white uppercase tracking-widest`}>
            {localizedCategory}
          </div>
          {isEnrolled && isCompleted && (
            <div className="p-1.5 rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`p-6 flex-1 flex flex-col ${isRTL ? "text-right" : "text-left"}`}>
        <h3 className="text-xl font-black tracking-tight leading-tight mb-2 group-hover:text-indigo-500 transition-colors">
          {localizedTitle}
        </h3>
        <p className="text-xs opacity-50 line-clamp-2 mb-6 font-medium leading-relaxed">
          {localizedDescription}
        </p>

        <div className={`mt-auto space-y-4`}>
          {/* Metadata */}
          <div className={`flex items-center gap-4 text-[10px] font-bold opacity-40 uppercase tracking-widest ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{course.actual_duration_hours}h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{courseWithMedia.creator?.name || "System"}</span>
            </div>
          </div>

          {type === "enrolled" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                <span className="opacity-40">{t("std.progress")}</span>
                <span className="text-indigo-500">{progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={toggleProgress}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600/5 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-black uppercase tracking-widest transition-all duration-300 group/btn`}
                >
                  <Info className="w-4 h-4" />
                  {t("std.progress_details")}
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showProgress ? "rotate-90" : ""} ${isRTL ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showProgress && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-3 border border-slate-200/50 dark:border-white/5">
                        {progress ? (
                          <div className="grid grid-cols-2 gap-4">
                            <ProgressStat label="Units" value={progress.total_units} />
                            <ProgressStat label="Lessons" value={progress.total_lessons} />
                            <ProgressStat label="Completed" value={progress.completed_lessons} />
                            <ProgressStat label="Remaining" value={progress.remaining_lessons} />
                          </div>
                        ) : progressError ? (
                          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold leading-relaxed">{progressError}</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin opacity-20" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <button
              onClick={onEnroll}
              disabled={isActionLoading}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50`}
            >
              {isActionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
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

function ProgressStat({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
      <p className="text-[9px] font-black uppercase opacity-30 tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black tracking-tighter">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>, message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="col-span-full flex flex-col items-center justify-center py-24 gap-6 text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 blur-2xl bg-indigo-500/10 rounded-full" />
        <Icon className="w-20 h-20 opacity-10 relative" />
      </div>
      <div>
        <p className="text-xl font-bold opacity-30">{message}</p>
        <p className="text-sm opacity-20 mt-2">Explore the platform to find more amazing content.</p>
      </div>
    </motion.div>
  );
}
