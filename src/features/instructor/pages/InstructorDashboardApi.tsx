"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, Clock, Layers, Star, Users } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type CourseItem = {
  id: number | string;
  title?: string;
  title_translations?: Record<string, string>;
  status?: string;
  actual_duration_hours?: number | string | null;
  cover_url?: string | null;
  units?: Array<{ id?: number | string }>;
  creator?: { id?: number | string };
  instructors?: Array<{ id?: number | string }>;
};

type DashboardSummary = {
  total_courses: number;
  total_students: number;
  pending_assignments: number;
};

function getLocalizedText(
  primary: string | undefined,
  translations: Record<string, string> | undefined,
  language: "en" | "ar"
) {
  if (translations?.[language]?.trim()) return translations[language];
  if (translations?.en?.trim()) return translations.en;
  if (primary?.trim()) return primary;
  return "Untitled course";
}

function extractCourseList(payload: unknown): CourseItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  if (Array.isArray(root.data)) return root.data as CourseItem[];
  if (root.data && typeof root.data === "object") {
    const nested = root.data as { data?: unknown };
    if (Array.isArray(nested.data)) return nested.data as CourseItem[];
  }
  return [];
}

function toNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function isOwnedByInstructor(course: CourseItem, instructorId: number | null) {
  if (instructorId === null) return true;
  const creatorId = toNumberId(course.creator?.id);
  if (creatorId === instructorId) return true;
  if (Array.isArray(course.instructors)) {
    return course.instructors.some((instructor) => toNumberId(instructor.id) === instructorId);
  }
  return false;
}

export default function InstructorDashboardApi() {
  const router = useRouter();
  const { t, isRTL, language } = useLanguage();
  const [summary, setSummary] = useState<DashboardSummary>({
    total_courses: 0,
    total_students: 0,
    pending_assignments: 0,
  });
  const [topCourseCount, setTopCourseCount] = useState(0);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentInstructorId = toNumberId(getStoredStudentUser()?.id);

  useEffect(() => {
    const load = async () => {
      setErrorMessage(null);
      setIsLoading(true);

      try {
        const token = getStudentToken();
        if (!token) throw new Error("missing_token");

        const headers = {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [dashboardRes, coursesRes] = await Promise.all([
          axios.get(getStudentApiRequestUrl("/instructor/dashboard"), { headers }),
          axios.get(getStudentApiRequestUrl("/my-courses"), { headers }),
        ]);

        const dashboardData = dashboardRes.data?.data ?? {};
        const nextSummary = dashboardData.summary ?? {};

        setSummary({
          total_courses: Number(nextSummary.total_courses ?? 0),
          total_students: Number(nextSummary.total_students ?? 0),
          pending_assignments: Number(nextSummary.pending_assignments ?? 0),
        });

        setTopCourseCount(
          Array.isArray(dashboardData.top_performing_courses)
            ? dashboardData.top_performing_courses.length
            : 0
        );

        const allCourses = extractCourseList(coursesRes.data);
        const ownCourses = allCourses.filter((course) => isOwnedByInstructor(course, currentInstructorId));
        setCourses(ownCourses);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setErrorMessage(error.response?.data?.message || "Failed to load instructor dashboard.");
        } else if (error instanceof Error && error.message === "missing_token") {
          setErrorMessage("Session token is missing. Please log in again.");
        } else {
          setErrorMessage("Failed to load instructor dashboard.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const dashboardCards = useMemo(
    () => [
      { label: t("stats.students"), value: summary.total_students.toLocaleString(), icon: Users },
      { label: t("stats.courses"), value: summary.total_courses.toLocaleString(), icon: BookOpen },
      { label: "Pending Assignments", value: summary.pending_assignments.toLocaleString(), icon: Clock },
      { label: "Top Courses", value: topCourseCount.toLocaleString(), icon: Star },
    ],
    [summary, t, topCourseCount]
  );

  return (
    <div className="p-8 md:p-12 min-h-screen bg-(--background) text-(--foreground)">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{t("dash.welcome")} Instructor</h1>
        <p className="opacity-50 mt-2">{t("dash.subtitle")}</p>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {dashboardCards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-5">
            <div className="mb-3 inline-flex rounded-xl bg-indigo-500/10 p-2">
              <card.icon className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-xs uppercase tracking-wider opacity-60">{card.label}</p>
            <p className="mt-1 text-3xl font-black">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t("dash.active")}</h2>
        <button
          onClick={() => router.push("/instructor/courses")}
          className="inline-flex items-center gap-1 text-sm font-bold text-indigo-400 hover:text-indigo-300"
        >
          {t("dash.viewall")}
          <ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-sm opacity-60">
          Loading courses...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-sm opacity-60">
          No courses found for this instructor.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {courses.slice(0, 6).map((course) => {
            const unitsCount = Array.isArray(course.units) ? course.units.length : 0;
            const durationHours = Number(course.actual_duration_hours ?? 0);
            return (
              <div key={String(course.id)} className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                <p className="text-xl font-bold truncate">
                  {getLocalizedText(course.title, course.title_translations, language)}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm opacity-70">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    {unitsCount} units
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {durationHours}h
                  </span>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-bold uppercase text-indigo-400">
                    {course.status ?? "unknown"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
