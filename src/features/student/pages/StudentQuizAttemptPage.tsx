"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Save, Send } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

type AttemptOption = {
  id: number;
  option_text?: string | LocalizedText;
};

type AttemptQuestion = {
  id: number;
  type: string;
  question_text?: string | LocalizedText;
  point?: number;
  is_required?: boolean;
  order_index?: number;
  options: AttemptOption[];
};

type AttemptAnswer = {
  question_id: number;
  selected_option_id?: number | null;
  boolean_answer?: boolean | null;
  answer_text?: string | LocalizedText | null;
};

type AttemptDetails = {
  id: number;
  quiz_id: number;
  attempt_number?: number;
  status?: string;
  remaining_seconds?: number;
  is_time_up?: boolean;
  quiz: {
    id: number;
    title?: string | LocalizedText;
    duration_minutes?: number;
    questions: AttemptQuestion[];
  };
  answers: AttemptAnswer[];
};

type AnswerDraft = {
  selected_option_id: number | null;
  boolean_answer: boolean | null;
  answer_text: string;
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

function extractAttemptData(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;

  if (isRecord(payload.data) && isRecord(payload.data.data)) return payload.data.data;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function extractAttemptId(payload: unknown): number | null {
  const first = extractAttemptData(payload);
  const direct = readNumber(first?.id);
  if (direct) return direct;

  if (isRecord(payload) && isRecord(payload.data) && isRecord(payload.data.error)) {
    const nested = readNumber(payload.data.error.id);
    if (nested) return nested;
  }

  return null;
}

function extractList(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function normalizeAttempt(payload: unknown): AttemptDetails | null {
  const record = extractAttemptData(payload);
  if (!record) return null;

  const quizRecord = isRecord(record.quiz) ? record.quiz : null;
  const questions = Array.isArray(quizRecord?.questions) ? quizRecord.questions.filter(isRecord) : [];
  const answers = Array.isArray(record.answers) ? record.answers.filter(isRecord) : [];

  return {
    id: readNumber(record.id) ?? 0,
    quiz_id: readNumber(record.quiz_id) ?? 0,
    attempt_number: readNumber(record.attempt_number) ?? undefined,
    status: readString(record.status, ""),
    remaining_seconds: readNumber(record.remaining_seconds) ?? undefined,
    is_time_up: Boolean(record.is_time_up),
    quiz: {
      id: readNumber(quizRecord?.id) ?? 0,
      title: quizRecord?.title as string | LocalizedText | undefined,
      duration_minutes: readNumber(quizRecord?.duration_minutes) ?? undefined,
      questions: questions
        .map(
          (question): AttemptQuestion => ({
            id: readNumber(question.id) ?? 0,
            type: readString(question.type, ""),
            question_text: question.question_text as string | LocalizedText | undefined,
            point: readNumber(question.point) ?? undefined,
            is_required: Boolean(question.is_required),
            order_index: readNumber(question.order_index) ?? undefined,
            options: Array.isArray(question.options)
              ? question.options
                  .filter(isRecord)
                  .map((option): AttemptOption => ({
                    id: readNumber(option.id) ?? 0,
                    option_text: option.option_text as string | LocalizedText | undefined,
                  }))
                  .filter((option) => option.id > 0)
              : [],
          })
        )
        .filter((question) => question.id > 0)
        .sort((a, b) => (a.order_index ?? 999999) - (b.order_index ?? 999999)),
    },
    answers: answers
      .map(
        (answer): AttemptAnswer => ({
          question_id: readNumber(answer.question_id) ?? 0,
          selected_option_id: readNumber(answer.selected_option_id),
          boolean_answer: typeof answer.boolean_answer === "boolean" ? answer.boolean_answer : null,
          answer_text: (answer.answer_text as string | LocalizedText | null) ?? null,
        })
      )
      .filter((answer) => answer.question_id > 0),
  };
}

function getInitialDrafts(
  questions: AttemptQuestion[],
  answers: AttemptAnswer[],
  locale: "en" | "ar",
  fallbackLocale: "en" | "ar"
) {
  const answerMap = new Map<number, AttemptAnswer>(answers.map((answer) => [answer.question_id, answer]));
  const drafts: Record<number, AnswerDraft> = {};

  for (const question of questions) {
    const answer = answerMap.get(question.id);
    drafts[question.id] = {
      selected_option_id: answer?.selected_option_id ?? null,
      boolean_answer: answer?.boolean_answer ?? null,
      answer_text:
        typeof answer?.answer_text === "string"
          ? answer.answer_text
          : getLocalizedValue(answer?.answer_text, locale, fallbackLocale),
    };
  }

  return drafts;
}

async function requestWithProxyFallback<T>(path: string, config: Parameters<typeof axios.request>[0]) {
  const requestUrl = getStudentApiRequestUrl(path);

  try {
    return await axios.request<T>({
      ...config,
      url: requestUrl,
    });
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;

    const isHtml404 =
      error.response?.status === 404 &&
      ((typeof error.response?.data === "string" && error.response.data.includes("<!DOCTYPE html")) ||
        String(error.response?.headers?.["content-type"] ?? "").includes("text/html"));

    if (!isHtml404) throw error;

    // Fallback to direct backend URL when the local /api rewrite is unavailable.
    return axios.request<T>({
      ...config,
      url: getStudentApiEndpoint(path),
    });
  }
}

export default function StudentQuizAttemptPage() {
  const { language, isRTL } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizId = String(params.quizId ?? "");
  const courseId = searchParams.get("course_id");
  const explicitAttemptId = readNumber(searchParams.get("attempt_id"));

  const locale = language === "ar" ? "ar" : "en";
  const fallbackLocale = locale === "ar" ? "en" : "ar";

  const [attempt, setAttempt] = useState<AttemptDetails | null>(null);
  const [drafts, setDrafts] = useState<Record<number, AnswerDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingByQuestion, setSavingByQuestion] = useState<Record<number, boolean>>({});
  const [savedByQuestion, setSavedByQuestion] = useState<Record<number, boolean>>({});
  const [questionError, setQuestionError] = useState<Record<number, string | null>>({});
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isQuizPageActive, setIsQuizPageActive] = useState(true);

  const attemptStorageKey = useMemo(() => `student_quiz_attempt:${quizId}`, [quizId]);

  const headers = useMemo(() => {
    const token = getStudentToken();
    if (!token) return null;
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  useEffect(() => {
    if (attempt?.remaining_seconds != null) {
      setRemainingSeconds(Math.max(0, Math.floor(attempt.remaining_seconds)));
    } else {
      setRemainingSeconds(null);
    }
  }, [attempt?.remaining_seconds]);

  useEffect(() => {
    if (remainingSeconds == null || remainingSeconds <= 0 || !isQuizPageActive) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current == null) return null;
        return current > 0 ? current - 1 : 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isQuizPageActive, remainingSeconds]);

  useEffect(() => {
    const setActiveFromVisibility = () => setIsQuizPageActive(!document.hidden);
    const setInactive = () => setIsQuizPageActive(false);
    const setActive = () => setIsQuizPageActive(true);

    setActiveFromVisibility();
    document.addEventListener("visibilitychange", setActiveFromVisibility);
    window.addEventListener("blur", setInactive);
    window.addEventListener("focus", setActive);

    return () => {
      document.removeEventListener("visibilitychange", setActiveFromVisibility);
      window.removeEventListener("blur", setInactive);
      window.removeEventListener("focus", setActive);
    };
  }, []);

  const isTimeUp = Boolean(attempt?.is_time_up) || (remainingSeconds != null && remainingSeconds <= 0);

  const resolveAttemptId = useCallback(async () => {
    if (!headers) throw new Error("missing_token");

    if (explicitAttemptId && explicitAttemptId > 0) {
      localStorage.setItem(attemptStorageKey, String(explicitAttemptId));
      return explicitAttemptId;
    }

    const cachedAttemptId = readNumber(localStorage.getItem(attemptStorageKey));
    if (cachedAttemptId && cachedAttemptId > 0) {
      return cachedAttemptId;
    }

    const storedUser = getStoredStudentUser();
    const parsedStudentId = readNumber(storedUser?.id);
    const createPayload: Record<string, unknown> = {
      quiz_id: Number(quizId),
    };
    if (parsedStudentId) createPayload.student_id = parsedStudentId;

    try {
      const createResponse = await requestWithProxyFallback("/attempts", {
        method: "POST",
        data: createPayload,
        headers,
      });
      const createdAttemptId = extractAttemptId(createResponse.data);
      if (createdAttemptId) {
        try {
          await requestWithProxyFallback(`/attempts/${createdAttemptId}/start`, {
            method: "POST",
            data: {},
            headers,
          });
        } catch {
          // Ignore invalid state / already started responses.
        }
        localStorage.setItem(attemptStorageKey, String(createdAttemptId));
        return createdAttemptId;
      }
    } catch {
      // No-op, continue with fallbacks for existing open attempts.
    }

    try {
      const listResponse = await requestWithProxyFallback("/attempts", {
        method: "GET",
        headers,
        params: {
          quiz_id: Number(quizId),
          ...(parsedStudentId ? { student_id: parsedStudentId } : {}),
          per_page: 50,
        },
      });
      const attempts = extractList(listResponse.data).filter(isRecord);
      const match = attempts
        .map((item) => ({
          id: readNumber(item.id) ?? 0,
          quiz_id: readNumber(item.quiz_id) ?? 0,
          status: readString(item.status, ""),
        }))
        .filter((item) => item.id > 0 && item.quiz_id === Number(quizId))
        .sort((a, b) => b.id - a.id)
        .find((item) => item.status === "in_progress") ??
        attempts
          .map((item) => ({
            id: readNumber(item.id) ?? 0,
            quiz_id: readNumber(item.quiz_id) ?? 0,
          }))
          .filter((item) => item.id > 0 && item.quiz_id === Number(quizId))
          .sort((a, b) => b.id - a.id)[0];

      if (match?.id) {
        try {
          await requestWithProxyFallback(`/attempts/${match.id}/start`, {
            method: "POST",
            data: {},
            headers,
          });
        } catch {
          // Ignore invalid state / already started responses.
        }
        localStorage.setItem(attemptStorageKey, String(match.id));
        return match.id;
      }
    } catch {
      // No-op.
    }

    // Backend in current setup often uses the same numeric id in /attempts/{id} that the UI route passes.
    // This fallback allows direct question loading from GET /attempts/{quizId} when create/list endpoints don't return an id.
    const numericQuizId = readNumber(quizId);
    if (numericQuizId && numericQuizId > 0) {
      localStorage.setItem(attemptStorageKey, String(numericQuizId));
      return numericQuizId;
    }

    return null;
  }, [attemptStorageKey, explicitAttemptId, headers, quizId]);

  const loadAttempt = useCallback(
    async (attemptId: number) => {
      if (!headers) throw new Error("missing_token");

      const response = await requestWithProxyFallback(`/attempts/${attemptId}`, {
        method: "GET",
        headers,
      });
      const normalized = normalizeAttempt(response.data);
      if (!normalized || !normalized.id) {
        throw new Error("invalid_attempt_payload");
      }

      localStorage.setItem(attemptStorageKey, String(normalized.id));
      setAttempt(normalized);
      setDrafts(getInitialDrafts(normalized.quiz.questions, normalized.answers, locale, fallbackLocale));
      setQuestionError({});
      setSavedByQuestion({});
    },
    [attemptStorageKey, fallbackLocale, headers, locale]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const attemptId = await resolveAttemptId();
        if (!attemptId) {
          throw new Error("attempt_not_found");
        }

        if (!cancelled) {
          await loadAttempt(attemptId);
        }
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
          setErrorMessage(error.response.data.message);
        } else {
          setErrorMessage("Could not open quiz attempt. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (quizId) {
      void bootstrap();
    }

    return () => {
      cancelled = true;
    };
  }, [loadAttempt, quizId, resolveAttemptId]);

  const updateDraft = (questionId: number, patch: Partial<AnswerDraft>) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: {
        selected_option_id: current[questionId]?.selected_option_id ?? null,
        boolean_answer: current[questionId]?.boolean_answer ?? null,
        answer_text: current[questionId]?.answer_text ?? "",
        ...patch,
      },
    }));

    setSavedByQuestion((current) => ({ ...current, [questionId]: false }));
    setQuestionError((current) => ({ ...current, [questionId]: null }));
  };

  const saveAnswer = async (question: AttemptQuestion) => {
    if (!attempt || !headers) return;

    const draft = drafts[question.id] ?? {
      selected_option_id: null,
      boolean_answer: null,
      answer_text: "",
    };

    let answerPayload: Record<string, unknown> | null = null;
    if (question.type === "multiple_choice") {
      if (!draft.selected_option_id) {
        setQuestionError((current) => ({ ...current, [question.id]: "Select one option first." }));
        return;
      }
      answerPayload = {
        question_id: question.id,
        selected_option_id: draft.selected_option_id,
      };
    } else if (question.type === "true_false") {
      if (draft.boolean_answer == null) {
        setQuestionError((current) => ({ ...current, [question.id]: "Choose True or False first." }));
        return;
      }
      answerPayload = {
        question_id: question.id,
        boolean_answer: draft.boolean_answer,
      };
    } else {
      if (!draft.answer_text.trim()) {
        setQuestionError((current) => ({ ...current, [question.id]: "Write an answer first." }));
        return;
      }
      answerPayload = {
        question_id: question.id,
        answer_text: { en: draft.answer_text.trim() },
      };
    }

    setSavingByQuestion((current) => ({ ...current, [question.id]: true }));
    setQuestionError((current) => ({ ...current, [question.id]: null }));

    try {
      // Primary update contract: PUT /attempts/{id} with answers array.
      await requestWithProxyFallback(`/attempts/${attempt.id}`, {
        method: "PUT",
        headers,
        data: { status: "in_progress", answers: [answerPayload] },
      });

      setSavedByQuestion((current) => ({ ...current, [question.id]: true }));
    } catch (error) {
      try {
        // Compatibility fallback if backend expects flattened shape.
        await requestWithProxyFallback(`/attempts/${attempt.id}`, {
          method: "PUT",
          headers,
          data: { attempt_id: attempt.id, status: "in_progress", ...answerPayload },
        });
        setSavedByQuestion((current) => ({ ...current, [question.id]: true }));
      } catch (fallbackError) {
        if (axios.isAxiosError(fallbackError) && typeof fallbackError.response?.data?.message === "string") {
          setQuestionError((current) => ({ ...current, [question.id]: fallbackError.response?.data?.message ?? "Failed to save answer." }));
        } else if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
          setQuestionError((current) => ({ ...current, [question.id]: error.response?.data?.message ?? "Failed to save answer." }));
        } else {
          setQuestionError((current) => ({ ...current, [question.id]: "Failed to save answer." }));
        }
      }
    } finally {
      setSavingByQuestion((current) => ({ ...current, [question.id]: false }));
    }
  };

  const submitAttempt = async () => {
    if (!attempt || !headers) return;

    setIsSubmittingAttempt(true);
    setErrorMessage(null);
    try {
      const answers = attempt.quiz.questions
        .map((question) => {
          const draft = drafts[question.id];
          if (!draft) return null;

          if (question.type === "multiple_choice") {
            if (!draft.selected_option_id) return null;
            return { question_id: question.id, selected_option_id: draft.selected_option_id };
          }

          if (question.type === "true_false") {
            if (draft.boolean_answer == null) return null;
            return { question_id: question.id, boolean_answer: draft.boolean_answer };
          }

          const text = draft.answer_text.trim();
          if (!text) return null;
          return { question_id: question.id, answer_text: { en: text } };
        })
        .filter((item): item is Record<string, unknown> => item !== null);

      const submitPayload = { answers };

      await requestWithProxyFallback(`/attempts/${attempt.id}/submit`, {
        method: "POST",
        data: submitPayload,
        headers,
      });
      router.replace("/student");
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Failed to submit attempt.");
      }
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  const title = useMemo(() => {
    return (
      getLocalizedValue(attempt?.quiz?.title, locale, fallbackLocale) ||
      `${language === "ar" ? "Quiz" : "Quiz"} #${quizId}`
    );
  }, [attempt?.quiz?.title, fallbackLocale, language, locale, quizId]);

  const formattedTime = useMemo(() => {
    if (remainingSeconds == null) return "--:--";
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [remainingSeconds]);

  return (
    <div className="min-h-screen bg-(--background) p-8 text-(--foreground) md:p-12">
      <button
        onClick={() => router.push(courseId ? `/student/quizzes/${quizId}?course_id=${courseId}` : `/student/quizzes/${quizId}`)}
        className={`mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
        Back
      </button>

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm opacity-70">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading attempt...
        </div>
      ) : errorMessage ? (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : attempt ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5 md:p-8">
          <div className={`mb-6 flex flex-wrap items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className={isRTL ? "text-right" : ""}>
              <p className="mb-2 text-xs uppercase tracking-widest opacity-50">
                Attempt #{attempt.attempt_number ?? attempt.id}
              </p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-2 text-sm opacity-70">
                {attempt.quiz.questions.length} questions
              </p>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${isTimeUp ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200" : "border-slate-200 dark:border-white/10"}`}>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {isTimeUp ? "Time is up" : isQuizPageActive ? `Time left: ${formattedTime}` : `Timer paused: ${formattedTime}`}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {attempt.quiz.questions.map((question, index) => {
              const draft = drafts[question.id] ?? {
                selected_option_id: null,
                boolean_answer: null,
                answer_text: "",
              };

              return (
                <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02] md:p-5">
                  <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={isRTL ? "text-right" : ""}>
                      <p className="mb-1 text-xs uppercase tracking-widest opacity-50">
                        Question {index + 1}
                      </p>
                      <h3 className="text-base font-black md:text-lg">
                        {getLocalizedValue(question.question_text, locale, fallbackLocale) || `Question #${index + 1}`}
                      </h3>
                    </div>
                    <div className="text-xs font-bold opacity-60">
                      {question.point ?? 0} pts
                    </div>
                  </div>

                  {question.type === "multiple_choice" ? (
                    <div className="space-y-2">
                      {question.options.length ? (
                        question.options.map((option) => (
                          <label
                            key={option.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.02] ${isRTL ? "flex-row-reverse text-right" : ""}`}
                          >
                            <input
                              type="radio"
                              name={`q-${question.id}`}
                              checked={draft.selected_option_id === option.id}
                              disabled={isTimeUp}
                              onChange={() => updateDraft(question.id, { selected_option_id: option.id })}
                            />
                            <span>{getLocalizedValue(option.option_text, locale, fallbackLocale) || `Option #${option.id}`}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm opacity-60">No options available for this question.</p>
                      )}
                    </div>
                  ) : null}

                  {question.type === "true_false" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isTimeUp}
                        onClick={() => updateDraft(question.id, { boolean_answer: true })}
                        className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${draft.boolean_answer === true ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]"}`}
                      >
                        True
                      </button>
                      <button
                        type="button"
                        disabled={isTimeUp}
                        onClick={() => updateDraft(question.id, { boolean_answer: false })}
                        className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${draft.boolean_answer === false ? "border-rose-500 bg-rose-500 text-white" : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]"}`}
                      >
                        False
                      </button>
                    </div>
                  ) : null}

                  {question.type === "short_answer" ? (
                    <textarea
                      value={draft.answer_text}
                      disabled={isTimeUp}
                      onChange={(event) => updateDraft(question.id, { answer_text: event.target.value })}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.02]"
                      placeholder="Write your answer..."
                    />
                  ) : null}

                  {questionError[question.id] ? (
                    <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{questionError[question.id]}</p>
                  ) : null}

                  <div className={`mt-4 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <button
                      type="button"
                      disabled={isTimeUp || savingByQuestion[question.id]}
                      onClick={() => void saveAnswer(question)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {savingByQuestion[question.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingByQuestion[question.id] ? "Saving..." : "Save Answer"}
                    </button>
                    {savedByQuestion[question.id] ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Saved
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-8 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => void submitAttempt()}
              disabled={isSubmittingAttempt || !attempt.quiz.questions.length}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-300"
            >
              {isSubmittingAttempt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmittingAttempt ? "Submitting..." : "Submit Attempt"}
            </button>
            <span className="text-xs opacity-60">{attempt.status || "in_progress"}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
