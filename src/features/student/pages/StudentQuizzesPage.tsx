"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Loader2, PlayCircle, RefreshCw, Trophy } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiCached, getStudentApiEndpoint, getStudentApiRequestUrl, invalidateStudentApiCache } from "@/features/student/studentApi";
import { extractStudentUser, getStudentToken, updateStoredStudentUser } from "@/features/student/studentSession";

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
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

type AggregatePayload = {
  student: Record<string, unknown> | null;
  quizzes: Record<string, unknown>[];
  courses: Record<string, unknown>[];
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

function unwrapApiPayload(payload: unknown): unknown {
  let current = payload;

  for (let depth = 0; depth < 6; depth += 1) {
    if (!isRecord(current)) return current;
    if (!("data" in current)) return current;

    const next = current.data;
    const looksLikeWrapper =
      typeof current.status === "string" ||
      typeof current.success === "boolean" ||
      typeof current.message === "string" ||
      typeof current.code === "number";

    if (!looksLikeWrapper || next == null) return current;
    current = next;
  }

  return current;
}

function parseList(payload: unknown) {
  const unwrapped = unwrapApiPayload(payload);
  if (Array.isArray(unwrapped)) return unwrapped;
  if (isRecord(unwrapped) && Array.isArray(unwrapped.data)) return unwrapped.data;
  return [];
}

function parseItem(payload: unknown): Record<string, unknown> | null {
  const unwrapped = unwrapApiPayload(payload);
  return isRecord(unwrapped) ? unwrapped : null;
}

function parseAggregatePayload(payload: unknown): AggregatePayload {
  const item = parseItem(payload);
  if (!item) {
    return { student: null, quizzes: [], courses: [] };
  }

  return {
    student: isRecord(item.student) ? item.student : null,
    quizzes: Array.isArray(item.quizzes) ? item.quizzes.filter(isRecord) : [],
    courses: Array.isArray(item.courses) ? item.courses.filter(isRecord) : [],
  };
}

function getCourseTitleFromRecord(
  course: Record<string, unknown> | null | undefined,
  locale: "en" | "ar",
  fallbackLocale: "en" | "ar"
) {
  if (!course) return "";

  return (
    getLocalizedValue(course.title_translations, locale, fallbackLocale) ||
    getLocalizedValue(course.title, locale, fallbackLocale) ||
    readString(course.title, "")
  );
}

function getCourseIdFromQuiz(quiz: Record<string, unknown>) {
  const directCourseId = readNumber(quiz.course_id);
  if (directCourseId) return directCourseId;

  const quizableType = readString(quiz.quizable_type, "").toLowerCase();
  if (quizableType === "course") {
    const quizableId = readNumber(quiz.quizable_id);
    if (quizableId) return quizableId;
  }

  const quizable = isRecord(quiz.quizable) ? quiz.quizable : null;
  const quizableCourseId =
    readNumber(quizable?.course_id) ??
    readNumber(quizable?.id);

  return quizableType === "course" ? (quizableCourseId ?? 0) : readNumber(quizable?.course_id) ?? 0;
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

function isLocalProxy404(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 404) return false;

  const requestedUrl = String(error.config?.url ?? "");
  return requestedUrl.startsWith("/api/") || requestedUrl.includes("localhost:3000/api/");
}

async function requestWithProxyFallback<T>(path: string, config: Parameters<typeof axios.request>[0]) {
  try {
    return await axios.request<T>({ ...config, url: getStudentApiRequestUrl(path) });
  } catch (error) {
    if (!isHtml404AxiosError(error) && !isLocalProxy404(error)) throw error;
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
  return (
    normalized === "submitted" ||
    normalized === "graded" ||
    normalized === "passed" ||
    normalized === "completed" ||
    normalized === "pending_review" ||
    normalized === "under_review" ||
    normalized === "awaiting_grading"
  );
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
      const [aggregateResponse, attemptsResponse] = await Promise.all([
        getStudentApiCached("/me/with-quizzes", { headers }, { force: true, ttlMs: 5_000 }),
        getStudentApiCached("/attempts", { headers, params: { per_page: 100 } }, { force: true, ttlMs: 5_000 }),
      ]);

      const aggregate = parseAggregatePayload(aggregateResponse.data);
      const profile = extractStudentUser(aggregate.student);
      if (profile) {
        updateStoredStudentUser(profile);
      }

      const courseMap = new Map<number, string>();
      aggregate.courses.forEach((course) => {
        const courseId = readNumber(course.course_id) ?? readNumber(course.id);
        if (!courseId) return;
        courseMap.set(courseId, getCourseTitleFromRecord(course, locale, fallbackLocale) || `Course #${courseId}`);
      });

      const courseIds = Array.from(courseMap.keys());
      const courseQuizResponses = await Promise.all(
        courseIds.map(async (courseId) => {
          try {
            const response = await getStudentApiCached(
              "/quizzes",
              {
                headers,
                params: {
                  course_id: courseId,
                  per_page: 100,
                  include_questions: false,
                },
              },
              { force: true, ttlMs: 5_000 }
            );

            return parseList(response.data).filter(isRecord);
          } catch {
            return [];
          }
        })
      );

      const attempts = parseList(attemptsResponse.data).filter(isRecord);
      const latestAttemptByQuiz = new Map<number, { id: number; status: string; isPassed: boolean }>();

      attempts
        .map((item) => ({
          id: readNumber(item.id) ?? 0,
          quizId: readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) ?? 0 : 0),
          status:
            readString(item.status, "") ||
            readString(item.attempt_status, "") ||
            readString(item.grading_status, ""),
          isPassed: Boolean(item.is_passed),
        }))
        .filter((item) => item.id > 0 && item.quizId > 0)
        .sort((a, b) => b.id - a.id)
        .forEach((item) => {
          if (!latestAttemptByQuiz.has(item.quizId)) {
            latestAttemptByQuiz.set(item.quizId, item);
          }
        });

      const mergedQuizRecords = [...aggregate.quizzes, ...courseQuizResponses.flat()];

      const normalized = mergedQuizRecords
        .filter(isPublishedQuiz)
        .map((quiz): StudentQuiz | null => {
          const id = readNumber(quiz.id);
          if (!id) return null;

          const courseId = getCourseIdFromQuiz(quiz);
          const latestAttempt = latestAttemptByQuiz.get(id);

          return {
            id,
            courseId,
            courseTitle: courseMap.get(courseId) ?? (courseId ? `Course #${courseId}` : "Your course"),
            title: (quiz.title as string | LocalizedText) ?? `Quiz #${id}`,
            description: quiz.description as string | LocalizedText | undefined,
            duration_minutes: readNumber(quiz.duration_minutes) ?? undefined,
            attemptsLeft: readNumber(quiz.attempts_left) ?? undefined,
            isPassed: Boolean(quiz.is_passed) || latestAttempt?.isPassed || false,
            attemptId: latestAttempt?.id ?? getAttemptIdFromProgress(quiz) ?? null,
            isTaken:
              Boolean(quiz.is_taken) ||
              Boolean(quiz.is_completed) ||
              Boolean(quiz.is_passed) ||
              Boolean(latestAttempt && isTakenStatus(latestAttempt.status)),
          };
        })
        .filter((item): item is StudentQuiz => item !== null);

      setQuizzes(Array.from(new Map(normalized.map((quiz) => [quiz.id, quiz])).values()));
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
        const workspaceResponse = await requestWithProxyFallback(`/attempts/workspace/${quiz.id}`, {
          method: "GET",
          headers,
        });
        const workspace = parseItem(workspaceResponse.data);
        const attemptId = readNumber(workspace?.id) ?? readNumber(workspace?.attempt_id) ?? quiz.attemptId ?? null;

        invalidateStudentApiCache("/attempts");
        invalidateStudentApiCache("/me/with-quizzes");

        const query = new URLSearchParams();
        if (quiz.courseId) {
          query.set("course_id", String(quiz.courseId));
        }
        if (attemptId) {
          query.set("attempt_id", String(attemptId));
        }

        query.set("quiz_id", String(quiz.id));
        router.push(`/student/quiz-attempt${query.toString() ? `?${query.toString()}` : ""}`);
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

  const openGrade = useCallback(
    (quiz: StudentQuiz) => {
      if (!quiz.attemptId) {
        setErrorMessage("No attempt was found for this quiz grade.");
        return;
      }

      const query = new URLSearchParams({
        attempt_id: String(quiz.attemptId),
        ...(quiz.courseId ? { course_id: String(quiz.courseId) } : {}),
      });
      query.set("quiz_id", String(quiz.id));
      router.push(`/student/quiz-grade?${query.toString()}`);
    },
    [router]
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
                    onClick={() => {
                      if (quiz.isTaken) {
                        openGrade(quiz);
                        return;
                      }
                      void startQuiz(quiz);
                    }}
                    disabled={startingQuizId === quiz.id || Boolean(quiz.isTaken && !quiz.attemptId)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                      quiz.isTaken ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"
                    }`}
                  >
                    {startingQuizId === quiz.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : quiz.isTaken ? (
                      <Trophy className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                    {quiz.isTaken ? "Taken" : "Start Quiz"}
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
