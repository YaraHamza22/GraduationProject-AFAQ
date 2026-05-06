"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

type EnrollmentRow = {
  course_id?: number;
  course?: {
    id: number;
    title?: string;
    title_translations?: LocalizedText;
  };
};

type StudentQuiz = {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string | LocalizedText;
  description?: string | LocalizedText;
  status?: string;
  is_published?: boolean;
  duration_minutes?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function getLocalizedValue(value: unknown, locale: "en" | "ar", fallbackLocale: "en" | "ar" = "en") {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  const direct = readString(value[locale], "");
  if (direct) return direct;
  return readString(value[fallbackLocale], "");
}

function parseList(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

export default function StudentQuizzesPage() {
  const { t, isRTL, language } = useLanguage();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const locale = language === "ar" ? "ar" : "en";
  const fallbackLocale = locale === "ar" ? "en" : "ar";

  const loadQuizzes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const enrollmentsResponse = await axios.get(getStudentApiRequestUrl("/enrollments"), {
        headers,
        params: { per_page: 100 },
      });
      const enrollments = parseList(enrollmentsResponse.data) as EnrollmentRow[];

      const enrolledCourses = enrollments
        .map((enrollment) => {
          const courseId = enrollment.course?.id ?? enrollment.course_id;
          if (typeof courseId !== "number") return null;
          const courseTitle =
            getLocalizedValue(enrollment.course?.title_translations, locale, fallbackLocale) ||
            readString(enrollment.course?.title, `Course #${courseId}`);

          return { id: courseId, title: courseTitle };
        })
        .filter((item): item is { id: number; title: string } => item !== null);

      const uniqueCourses = Array.from(new Map(enrolledCourses.map((course) => [course.id, course])).values());

      const quizResults = await Promise.all(
        uniqueCourses.map(async (course) => {
          try {
            const response = await axios.get(getStudentApiRequestUrl("/quizzes"), {
              headers,
              params: { course_id: course.id, per_page: 100 },
            });
            const rows = parseList(response.data);
            return rows
              .filter(isRecord)
              .filter((quiz) => {
                const status = readString(quiz.status, "").toLowerCase();
                const isPublished = Boolean(quiz.is_published);
                return status === "published" || isPublished;
              })
              .map((quiz): StudentQuiz => ({
                id: Number(quiz.id),
                courseId: course.id,
                courseTitle: course.title,
                title: (quiz.title as string | LocalizedText) ?? `Quiz #${quiz.id}`,
                description: quiz.description as string | LocalizedText | undefined,
                status: readString(quiz.status, ""),
                is_published: Boolean(quiz.is_published),
                duration_minutes: typeof quiz.duration_minutes === "number" ? quiz.duration_minutes : undefined,
              }));
          } catch {
            return [];
          }
        })
      );

      const merged = quizResults.flat();
      // Keep one card per course/title to avoid duplicate rows from repeated quiz records.
      const dedupeKey = (quiz: StudentQuiz) =>
        `${quiz.courseId}:${getLocalizedValue(quiz.title, locale, fallbackLocale).trim().toLowerCase()}`;
      const dedupedByCourseTitle = Array.from(
        new Map(
          [...merged]
            .sort((a, b) => b.id - a.id)
            .map((quiz) => [dedupeKey(quiz), quiz])
        ).values()
      );

      const deduped = Array.from(new Map(dedupedByCourseTitle.map((quiz) => [quiz.id, quiz])).values());
      setQuizzes(deduped);
    } catch (error) {
      let message = "Failed to load quizzes.";
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        message = error.response.data.message;
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [fallbackLocale, locale]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  const quizRows = useMemo(() => quizzes, [quizzes]);

  return (
    <div className="p-8 md:p-12 min-h-screen bg-(--background) text-(--foreground)">
      <div className={`mb-8 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-4xl font-black tracking-tighter">{t("std.quizzes")}</h1>
          <p className="opacity-50 mt-2">Published quizzes from your enrolled courses.</p>
        </div>
        <button
          onClick={() => void loadQuizzes()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-[0.18em] dark:bg-white dark:text-slate-900"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {errorMessage ? (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <h2 className="text-2xl font-black tracking-tight mb-4">Quizzes</h2>
        {quizRows.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizRows.map((quiz, i) => (
              <div key={quiz.id} className="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-4 bg-slate-50 dark:bg-white/[0.02]">
                <p className="text-xs uppercase tracking-widest opacity-50 mb-2">{quiz.courseTitle}</p>
                <p className="font-black text-lg">
                  {getLocalizedValue(quiz.title, locale, fallbackLocale) || `Quiz #${i + 1}`}
                </p>
                <p className="text-sm opacity-70 mt-1 line-clamp-2">
                  {getLocalizedValue(quiz.description, locale, fallbackLocale) || "No description"}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs opacity-60 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {quiz.duration_minutes ?? 0} min
                  </div>
                  <button
                    onClick={() => router.push(`/student/quizzes/${quiz.id}?course_id=${quiz.courseId}`)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-500 transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {language === "ar" ? "ابدأ الاختبار" : "Take Quiz"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="opacity-50">No quizzes available for your enrolled courses yet.</p>
        )}
      </section>
    </div>
  );
}
