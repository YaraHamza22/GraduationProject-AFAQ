"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BookOpen, Clock, Layers, RefreshCcw } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type CourseListItem = {
  id: number | string;
  title?: string;
  title_translations?: Record<string, string>;
  description?: string;
  description_translations?: Record<string, string>;
  status?: string;
  actual_duration_hours?: number | string | null;
  units?: Array<{ id?: number | string; title?: string; title_translations?: Record<string, string> }>;
  creator?: { id?: number | string };
  instructors?: Array<{ id?: number | string }>;
};

type CourseDetails = CourseListItem & {
  objectives?: string;
  prerequisites?: string;
};

function getLocalizedText(
  primary: string | undefined,
  translations: Record<string, string> | undefined,
  language: "en" | "ar"
) {
  if (translations?.[language]?.trim()) return translations[language];
  if (translations?.en?.trim()) return translations.en;
  if (primary?.trim()) return primary;
  return "";
}

function extractList(payload: unknown): CourseListItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  if (Array.isArray(root.data)) return root.data as CourseListItem[];
  if (root.data && typeof root.data === "object") {
    const nested = root.data as { data?: unknown };
    if (Array.isArray(nested.data)) return nested.data as CourseListItem[];
  }
  return [];
}

function toNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function isOwnedByInstructor(course: CourseListItem, instructorId: number | null) {
  if (instructorId === null) return true;
  const creatorId = toNumberId(course.creator?.id);
  if (creatorId === instructorId) return true;
  if (Array.isArray(course.instructors)) {
    return course.instructors.some((instructor) => toNumberId(instructor.id) === instructorId);
  }
  return false;
}

export default function InstructorCoursesPage() {
  const { t, language } = useLanguage();
  const currentInstructorId = toNumberId(getStoredStudentUser()?.id);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [selected, setSelected] = useState<CourseDetails | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCourses = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const response = await axios.get(getStudentApiRequestUrl("/my-courses"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const allCourses = extractList(response.data);
      const ownCourses = allCourses.filter((course) => isOwnedByInstructor(course, currentInstructorId));
      setCourses(ownCourses);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load courses.");
      } else if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Session token is missing. Please log in again.");
      } else {
        setErrorMessage("Failed to load courses.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseDetails = async (courseId: number | string) => {
    setIsDetailsLoading(true);
    setErrorMessage(null);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const response = await axios.get(getStudentApiRequestUrl(`/my-courses/${courseId}`), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const details = (response.data?.data ?? null) as CourseDetails | null;
      setSelected(details);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load course details.");
      } else if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Session token is missing. Please log in again.");
      } else {
        setErrorMessage("Failed to load course details.");
      }
    } finally {
      setIsDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const term = search.trim().toLowerCase();
    return courses.filter((course) => {
      const title = getLocalizedText(course.title, course.title_translations, language).toLowerCase();
      return title.includes(term);
    });
  }, [courses, language, search]);

  return (
    <div className="p-8 md:p-12 min-h-screen bg-(--background) text-(--foreground)">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">{t("nav.courses")}</h1>
          <p className="opacity-50 mt-2">Loaded from GET /my-courses and GET /my-courses/:course.</p>
        </div>

        <button
          onClick={() => void loadCourses()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-sm font-bold hover:border-indigo-400/60"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search courses..."
          className="h-11 w-full max-w-md rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-sm opacity-60">
              Loading courses...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-sm opacity-60">
              No courses found.
            </div>
          ) : (
            filteredCourses.map((course) => {
              const unitsCount = Array.isArray(course.units) ? course.units.length : 0;
              const durationHours = Number(course.actual_duration_hours ?? 0);
              const title = getLocalizedText(course.title, course.title_translations, language) || `Course #${course.id}`;
              const description =
                getLocalizedText(course.description, course.description_translations, language) || "No description.";

              return (
                <div key={String(course.id)} className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{title}</h3>
                      <p className="mt-2 text-sm opacity-70 line-clamp-2">{description}</p>
                    </div>
                    <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs font-bold uppercase text-indigo-400">
                      {course.status ?? "unknown"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm opacity-70">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      {unitsCount} units
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {durationHours}h
                    </span>
                  </div>

                  <button
                    onClick={() => void loadCourseDetails(course.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500"
                  >
                    <BookOpen className="h-4 w-4" />
                    View details
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-5 h-fit">
          <h2 className="text-xl font-bold mb-4">Course details</h2>
          {isDetailsLoading ? (
            <p className="text-sm opacity-60">Loading details...</p>
          ) : selected ? (
            <div className="space-y-3 text-sm">
              <p className="font-bold text-base">
                {getLocalizedText(selected.title, selected.title_translations, language) || `Course #${selected.id}`}
              </p>
              <p className="opacity-70">
                {getLocalizedText(selected.description, selected.description_translations, language) || "No description."}
              </p>
              {selected.objectives ? <p><span className="font-semibold">Objectives:</span> {selected.objectives}</p> : null}
              {selected.prerequisites ? <p><span className="font-semibold">Prerequisites:</span> {selected.prerequisites}</p> : null}

              <div>
                <p className="font-semibold mb-2">Units</p>
                {Array.isArray(selected.units) && selected.units.length > 0 ? (
                  <ul className="space-y-1 opacity-80">
                    {selected.units.map((unit, idx) => (
                      <li key={`${unit.id ?? idx}`}>
                        {idx + 1}. {getLocalizedText(unit.title, unit.title_translations, language) || `Unit #${unit.id ?? idx + 1}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="opacity-60">No units in this course.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-60">Select a course to load GET /my-courses/:course details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
