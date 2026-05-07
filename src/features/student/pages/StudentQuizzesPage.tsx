"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

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
  duration_minutes?: number;
  attemptsLeft?: number;
  isPassed?: boolean;
  attemptId?: number | null;
  isTaken?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

function parseItem(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data) && isRecord(payload.data.data)) return payload.data.data;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function isHtml404AxiosError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const contentType = String(error.response?.headers?.["content-type"] ?? "");
  return (
    error.response?.status === 404 &&
    ((typeof error.response?.data === "string" && error.response.data.includes("<!DOCTYPE html")) ||
      contentType.includes("text/html"))
  );
}

async function requestWithProxyFallback<T>(path: string, config: Parameters<typeof axios.request>[0]) {
  try {
    return await axios.request<T>({ ...config, url: getStudentApiRequestUrl(path) });
  } catch (error) {
    if (!isHtml404AxiosError(error)) throw error;
    return axios.request<T>({ ...config, url: getStudentApiEndpoint(path) });
  }
}

function getAttemptIdFromProgress(item: Record<string, unknown>) {
  const candidates = [
    item.attempt_id,
    item.current_attempt_id,
    item.active_attempt_id,
    item.in_progress_attempt_id,
    isRecord(item.attempt) ? item.attempt.id : null,
  ];

  for (const value of candidates) {
    const parsed = readNumber(value);
    if (parsed && parsed > 0) return parsed;
  }

  return null;
}

function isPublishedQuiz(quiz: Record<string, unknown>) {
  const status = readString(quiz.status, "").toLowerCase();
  const isPublishedFlag = Boolean(quiz.is_published);
  return status === "published" || isPublishedFlag;
}

function isTakenStatus(status: string) {
  const normalized = status.toLowerCase();
  return normalized === "submitted" || normalized === "graded" || normalized === "passed" || normalized === "completed";
}

export default function StudentQuizzesPage() {
  const { t, isRTL, language } = useLanguage();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startingQuizId, setStartingQuizId] = useState<number | null>(null);

  const locale = language === "ar" ? "ar" : "en";
  const fallbackLocale = locale === "ar" ? "en" : "ar";

  const headers = useMemo(() => {
    const token = getStudentToken();
    if (!token) return null;
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const loadQuizzes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (!headers) throw new Error("missing_token");

      const enrollmentsResponse = await requestWithProxyFallback("/enrollments", {
        method: "GET",
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
      let merged: StudentQuiz[] = [];

      // Primary flow.
      for (const course of uniqueCourses) {
        try {
          const availabilityResponse = await requestWithProxyFallback(`/courses/${course.id}/quiz-availability`, {
            method: "GET",
            headers,
          });
          const availability = parseItem(availabilityResponse.data);
          const isEnrolled = availability ? Boolean(availability.is_enrolled) : true;
          const hasQuiz = availability ? Boolean(availability.has_quiz) : false;
          const quizzesCount = availability ? readNumber(availability.quizzes_count) ?? 0 : 0;
          if (!isEnrolled || !hasQuiz || quizzesCount <= 0) continue;

          const progressResponse = await requestWithProxyFallback(`/courses/${course.id}/assessment-progress`, {
            method: "GET",
            headers,
          });
          const progressRows = parseList(progressResponse.data).filter(isRecord);

          const available = progressRows
            .map((row) => {
              const quizId = readNumber(row.quiz_id) ?? (isRecord(row.quiz) ? readNumber(row.quiz.id) : null);
              if (!quizId) return null;
              const attemptsLeft = readNumber(row.attempts_left) ?? 0;
              const isPassed = Boolean(row.is_passed);
              const attemptId = getAttemptIdFromProgress(row);
              const attemptStatus = readString(row.status, "");
              const isTaken = isPassed || attemptsLeft <= 0 || isTakenStatus(attemptStatus);
              return { quizId, attemptsLeft, isPassed, attemptId, isTaken };
            })
            .filter(
              (item): item is { quizId: number; attemptsLeft: number; isPassed: boolean; attemptId: number | null; isTaken: boolean } =>
                item !== null
            );

          for (const item of available) {
            try {
              const quizResponse = await requestWithProxyFallback(`/quizzes/${item.quizId}`, {
                method: "GET",
                headers,
              });
              const quizItem = parseItem(quizResponse.data);
              if (!quizItem || !isPublishedQuiz(quizItem)) continue;
              merged.push({
                id: readNumber(quizItem.id) ?? item.quizId,
                courseId: course.id,
                courseTitle: course.title,
                title: (quizItem.title as string | LocalizedText) ?? `Quiz #${item.quizId}`,
                description: quizItem.description as string | LocalizedText | undefined,
                duration_minutes: readNumber(quizItem.duration_minutes) ?? undefined,
                attemptsLeft: item.attemptsLeft,
                isPassed: item.isPassed,
                attemptId: item.attemptId,
                isTaken: item.isTaken,
              });
            } catch {
              // skip bad quiz row
            }
          }
        } catch {
          // skip this course
        }
      }

      // Fallback 1: enrolled course quizzes list.
      if (!merged.length) {
        const legacyRows = await Promise.all(
          uniqueCourses.map(async (course) => {
            try {
              const response = await requestWithProxyFallback("/quizzes", {
                method: "GET",
                headers,
                params: { course_id: course.id, per_page: 100 },
              });
              return parseList(response.data)
                .filter(isRecord)
                .filter(isPublishedQuiz)
                .map((quiz): StudentQuiz | null => {
                  const id = readNumber(quiz.id);
                  if (!id) return null;
                  return {
                    id,
                    courseId: course.id,
                    courseTitle: course.title,
                    title: (quiz.title as string | LocalizedText) ?? `Quiz #${id}`,
                    description: quiz.description as string | LocalizedText | undefined,
                    duration_minutes: readNumber(quiz.duration_minutes) ?? undefined,
                    attemptsLeft: undefined,
                    isPassed: false,
                    attemptId: null,
                    isTaken: false,
                  };
                })
                .filter((item): item is StudentQuiz => item !== null);
            } catch {
              return [];
            }
          })
        );
        merged = legacyRows.flat();
      }

      // Fallback 2: global quizzes list.
      if (!merged.length) {
        try {
          const allResponse = await requestWithProxyFallback("/quizzes", {
            method: "GET",
            headers,
            params: { per_page: 100 },
          });
          merged = parseList(allResponse.data)
            .filter(isRecord)
            .filter(isPublishedQuiz)
            .map((quiz): StudentQuiz | null => {
              const id = readNumber(quiz.id);
              if (!id) return null;
              const courseId = readNumber(quiz.course_id) ?? readNumber(quiz.quizable_id) ?? 0;
              return {
                id,
                courseId,
                courseTitle: courseId ? `Course #${courseId}` : "Course",
                title: (quiz.title as string | LocalizedText) ?? `Quiz #${id}`,
                description: quiz.description as string | LocalizedText | undefined,
                duration_minutes: readNumber(quiz.duration_minutes) ?? undefined,
                attemptsLeft: undefined,
                isPassed: false,
                attemptId: null,
                isTaken: false,
              };
            })
            .filter((item): item is StudentQuiz => item !== null);
        } catch {
          // keep empty
        }
      }

      const deduped = Array.from(new Map(merged.map((quiz) => [quiz.id, quiz])).values());

      // Final safety check: mark quizzes as taken from attempts list (covers fallback quiz-loading flows).
      try {
        const studentId = readNumber(getStoredStudentUser()?.id);
        const attemptsResponse = await requestWithProxyFallback("/attempts", {
          method: "GET",
          headers,
          params: {
            ...(studentId ? { student_id: studentId } : {}),
            per_page: 200,
          },
        });
        const attempts = parseList(attemptsResponse.data).filter(isRecord);
        const takenQuizIds = new Set(
          attempts
            .map((item) => ({
              quizId: readNumber(item.quiz_id),
              status: readString(item.status, ""),
            }))
            .filter((item) => item.quizId && isTakenStatus(item.status))
            .map((item) => item.quizId as number)
        );

        setQuizzes(deduped.map((quiz) => ({ ...quiz, isTaken: quiz.isTaken || takenQuizIds.has(quiz.id) })));
      } catch {
        setQuizzes(deduped);
      }
    } catch (error) {
      let message = "Failed to load quizzes.";
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        message = error.response.data.message;
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [fallbackLocale, headers, locale]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  const startQuiz = useCallback(
    async (quiz: StudentQuiz) => {
      if (!headers) {
        setErrorMessage("Missing auth token.");
        return;
      }
      if (quiz.isTaken || quiz.isPassed || (typeof quiz.attemptsLeft === "number" && quiz.attemptsLeft <= 0)) {
        setErrorMessage("This quiz is already completed and cannot be taken again.");
        return;
      }
      setStartingQuizId(quiz.id);
      setErrorMessage(null);
      try {
        const studentId = readNumber(getStoredStudentUser()?.id);

        if (quiz.courseId) {
          try {
            const progressResponse = await requestWithProxyFallback(`/courses/${quiz.courseId}/assessment-progress`, {
              method: "GET",
              headers,
            });
            const latestProgress = parseList(progressResponse.data)
              .filter(isRecord)
              .map((item) => ({
                quizId: readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) : null),
                attemptsLeft: readNumber(item.attempts_left) ?? 0,
                isPassed: Boolean(item.is_passed),
                isTaken: isTakenStatus(readString(item.status, "")),
              }))
              .find((item) => item.quizId === quiz.id);

            if (latestProgress && (latestProgress.isPassed || latestProgress.attemptsLeft <= 0 || latestProgress.isTaken)) {
              setErrorMessage("This quiz is already completed and cannot be taken again.");
              return;
            }
          } catch {
            // keep start flow
          }
        }

        const createPayload: Record<string, unknown> = {
          quiz_id: quiz.id,
          ...(studentId ? { student_id: studentId } : {}),
        };

        let attemptId: number | null = quiz.attemptId ?? null;

        try {
          const createResponse = await requestWithProxyFallback("/attempts", {
            method: "POST",
            headers,
            data: createPayload,
          });
          const createItem = parseItem(createResponse.data);
          attemptId = (createItem ? readNumber(createItem.id) : null) ?? attemptId;
        } catch {
          // keep fallback paths
        }

        if (!attemptId && quiz.courseId) {
          try {
            const progressResponse = await requestWithProxyFallback(`/courses/${quiz.courseId}/assessment-progress`, {
              method: "GET",
              headers,
            });
            const row = parseList(progressResponse.data)
              .filter(isRecord)
              .find((item) => (readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) : null)) === quiz.id);
            attemptId = row ? getAttemptIdFromProgress(row) : null;
          } catch {
            // keep null
          }
        }

        if (!attemptId) {
          // Fallback: load attempts list and reuse latest in_progress attempt for this quiz.
          try {
            const attemptsResponse = await requestWithProxyFallback("/attempts", {
              method: "GET",
              headers,
              params: {
                quiz_id: quiz.id,
                ...(studentId ? { student_id: studentId } : {}),
                per_page: 50,
              },
            });
            const attempts = parseList(attemptsResponse.data).filter(isRecord);
            const openAttempt = attempts
              .map((item) => ({
                id: readNumber(item.id) ?? 0,
                quizId: readNumber(item.quiz_id) ?? 0,
                status: readString(item.status, ""),
              }))
              .filter((item) => item.id > 0 && item.quizId === quiz.id)
              .sort((a, b) => b.id - a.id)
              .find((item) => item.status === "in_progress");

            if (openAttempt?.id) {
              attemptId = openAttempt.id;
            }
          } catch {
            // keep null
          }
        }

        if (!attemptId) throw new Error("attempt_not_found");

        try {
          await requestWithProxyFallback(`/attempts/${attemptId}/start`, {
            method: "POST",
            headers,
            data: {},
          });
        } catch {
          // ignore already-started/invalid-state
        }

        router.push(`/student/quizzes/${quiz.id}/attempt?course_id=${quiz.courseId}&attempt_id=${attemptId}`);
      } catch (error) {
        if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
          setErrorMessage(error.response.data.message);
        } else {
          setErrorMessage("Could not start quiz attempt.");
        }
      } finally {
        setStartingQuizId(null);
      }
    },
    [headers, router]
  );

  return (
    <div className="min-h-screen bg-(--background) p-8 text-(--foreground) md:p-12">
      <div className={`mb-8 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-4xl font-black tracking-tighter">{t("std.quizzes")}</h1>
          <p className="mt-2 opacity-50">Available quizzes from your courses.</p>
        </div>
        <button
          onClick={() => void loadQuizzes()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-900"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {errorMessage ? (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-4 text-2xl font-black tracking-tight">Quizzes</h2>
        {quizzes.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {quizzes.map((quiz, i) => (
              <div key={quiz.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.02]">
                <p className="mb-2 text-xs uppercase tracking-widest opacity-50">{quiz.courseTitle}</p>
                <p className="text-lg font-black">
                  {getLocalizedValue(quiz.title, locale, fallbackLocale) || `Quiz #${i + 1}`}
                </p>
                <p className="mt-1 line-clamp-2 text-sm opacity-70">
                  {getLocalizedValue(quiz.description, locale, fallbackLocale) || "No description"}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-3 text-xs opacity-60">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {quiz.duration_minutes ?? 0} min
                    </span>
                    <span>Left: {quiz.attemptsLeft ?? "--"}</span>
                  </div>
                  <button
                    onClick={() => void startQuiz(quiz)}
                    disabled={startingQuizId === quiz.id || Boolean(quiz.isTaken)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {startingQuizId === quiz.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                    {quiz.isTaken ? (language === "ar" ? "تم الحل" : "Taken") : language === "ar" ? "ابدأ الاختبار" : "Start Quiz"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="opacity-50">No quizzes available right now.</p>
        )}
      </section>
    </div>
  );
}
