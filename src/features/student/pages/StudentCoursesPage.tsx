"use client";

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
  RefreshCw,
  Trophy,
  User
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";
import { motion, AnimatePresence } from "framer-motion";

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
    actual_duration_hours: number;
    course_category?: CourseCategory;
    creator?: { name: string };
  };
  // Keep optional direct course fields for backward compatibility.
  title?: string;
  slug?: string;
  description?: string;
  description_translations?: LocalizedText;
  actual_duration_hours?: number;
  title_translations?: LocalizedText;
  course_category?: CourseCategory;
  creator?: { name: string };
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

// --- Main Component ---

export default function StudentCoursesPage() {
  const { t, isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"my-learning" | "discover">("my-learning");

  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [discoverCourses, setDiscoverCourses] = useState<EnrollableCourse[]>([]);
  const [progressData, setProgressData] = useState<Record<number, ProgressDetails>>({});
  const [progressLoading, setProgressLoading] = useState<Record<number, boolean>>({});
  const [progressErrors, setProgressErrors] = useState<Record<number, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      // Fetch enrolled courses from /enrollments (supports filters + pagination)
      const enrolledRes = await axios.get(getStudentApiRequestUrl("/enrollments"), {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        params: { per_page: 100 },
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
        params: { per_page: 100 },
      });
      const discoverPayload = discoverRes.data?.data;
      const allDiscoverable: EnrollableCourse[] = Array.isArray(discoverPayload)
        ? discoverPayload
        : Array.isArray(discoverPayload?.data)
          ? discoverPayload.data
          : [];

      // Filter out courses that are already enrolled.
      const enrolledCourseIds = new Set(
        enrollments
          .map((enrollment) => enrollment.course?.id ?? enrollment.course_id)
          .filter((id): id is number => typeof id === "number")
      );
      const trulyDiscoverable = allDiscoverable.filter((c: any) => !enrolledCourseIds.has(c.id));

      setDiscoverCourses(trulyDiscoverable);

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

  const handleEnroll = async (courseId: number) => {
    setIsActionLoading(courseId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = getStudentToken();
      await axios.post(getStudentApiRequestUrl("/enrollments"),
        { course_id: courseId },
        { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage("Successfully enrolled in the course!");
      void fetchData(); // Refresh both lists
      setActiveTab("my-learning");
    } catch (error) {
      setErrorMessage("Failed to enroll in the course.");
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <AnimatePresence mode="popLayout">
            {activeTab === "my-learning" ? (
              enrolledCourses.length > 0 ? (
                enrolledCourses.map((enrollment) => (
                  <CourseCard
                    key={enrollment.id}
                    type="enrolled"
                    data={enrollment}
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
                <EmptyState t={t} icon={BookOpen} message="No courses enrolled yet." />
              )
            ) : (
              discoverCourses.length > 0 ? (
                discoverCourses.map((course) => (
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
                <EmptyState t={t} icon={Compass} message="No new courses available at the moment." />
              )
            )}
          </AnimatePresence>
        </div>
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
  isRTL,
  language,
  t
}: {
  type: "enrolled" | "enrollable";
  data: any; // data structure varies significantly between enrolled (Enrollment) and enrollable (EnrollableCourse)
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

  const toggleProgress = () => {
    if (!showProgress && onFetchProgress && !progress && !progressError && !isProgressLoading) onFetchProgress();
    setShowProgress(!showProgress);
  };

  const isEnrolled = type === "enrolled";
  const course = isEnrolled && data.course ? data.course : data;
  const progressPercent = isEnrolled ? (data.progress_percentage ?? 0) : 0;
  const isCompleted = isEnrolled ? (data.is_completed ?? false) : false;
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
    (typeof course.description === "string" ? course.description : "No description provided.");
  const localizedCategory =
    getLocalizedValue(course.course_category?.name, "") ||
    (typeof course.course_category?.name === "string" ? course.course_category.name : "Academic");

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
      <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-900">
        {course.cover_url ? (
          <img src={course.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-10">
            <BookOpen className="w-24 h-24" />
          </div>
        )}
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
              <span>{course.creator?.name || "System"}</span>
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

function EmptyState({ t, icon: Icon, message }: { t: (key: string) => string, icon: React.ComponentType<{ className?: string }>, message: string }) {
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
