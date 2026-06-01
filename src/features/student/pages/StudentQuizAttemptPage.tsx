"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Save, Send } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { extractStudentUser, getStoredStudentId, getStudentToken, updateStoredStudentUser } from "@/features/student/studentSession";

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

type SubmitAnswerPayload = {
  question_id: number;
  selected_option_id: number | null;
  boolean_answer: boolean | null;
  answer_text: { en: string } | null;
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

function extractAttemptData(payload: unknown): Record<string, unknown> | null {
  const unwrapped = unwrapApiPayload(payload);
  return isRecord(unwrapped) ? unwrapped : null;
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

function buildSubmitAnswerPayload(question: AttemptQuestion, draft: AnswerDraft): SubmitAnswerPayload | null {
  if (question.type === "multiple_choice") {
    if (!draft.selected_option_id) return null;
    return {
      question_id: question.id,
      selected_option_id: draft.selected_option_id,
      boolean_answer: null,
      answer_text: null,
    };
  }

  if (question.type === "true_false") {
    if (draft.boolean_answer == null) return null;
    return {
      question_id: question.id,
      selected_option_id: null,
      boolean_answer: draft.boolean_answer,
      answer_text: null,
    };
  }

  const text = draft.answer_text.trim();
  if (!text) return null;
  return {
    question_id: question.id,
    selected_option_id: null,
    boolean_answer: null,
    answer_text: { en: text },
  };
}

function extractList(payload: unknown) {
  const unwrapped = unwrapApiPayload(payload);
  if (Array.isArray(unwrapped)) return unwrapped;
  if (isRecord(unwrapped) && Array.isArray(unwrapped.data)) return unwrapped.data;
  return [];
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

function extractAssessmentProgressRows(payload: unknown) {
  const unwrapped = unwrapApiPayload(payload);
  if (!isRecord(unwrapped)) return [];

  if (Array.isArray(unwrapped.quizzes)) {
    return unwrapped.quizzes.filter(isRecord);
  }

  const progress = isRecord(unwrapped.progress) ? unwrapped.progress : null;
  if (progress && Array.isArray(progress.quizzes)) {
    return progress.quizzes.filter(isRecord);
  }

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

function normalizeQuestionsFromQuizRecord(quizRecord: Record<string, unknown>) {
  const questions = Array.isArray(quizRecord.questions) ? quizRecord.questions.filter(isRecord) : [];

  return questions
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
    .sort((a, b) => (a.order_index ?? 999999) - (b.order_index ?? 999999));
}

function normalizeAttemptFromQuizPayload(payload: unknown, attemptId: number): AttemptDetails | null {
  const quizRecord = extractAttemptData(payload);
  if (!quizRecord) return null;

  const normalizedQuizId = readNumber(quizRecord.id) ?? readNumber(quizRecord.quiz_id) ?? 0;
  if (!normalizedQuizId) return null;

  return {
    id: attemptId,
    quiz_id: normalizedQuizId,
    attempt_number: undefined,
    status: "in_progress",
    remaining_seconds: undefined,
    is_time_up: false,
    quiz: {
      id: normalizedQuizId,
      title: quizRecord.title as string | LocalizedText | undefined,
      duration_minutes: readNumber(quizRecord.duration_minutes) ?? undefined,
      questions: normalizeQuestionsFromQuizRecord(quizRecord),
    },
    answers: [],
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

    const isLocalProxy404 =
      error.response?.status === 404 &&
      (String(error.config?.url ?? "").startsWith("/api/") ||
        String(error.config?.url ?? "").includes("localhost:3000/api/"));

    const isHtml404 =
      error.response?.status === 404 &&
      ((typeof error.response?.data === "string" && error.response.data.includes("<!DOCTYPE html")) ||
        String(error.response?.headers?.["content-type"] ?? "").includes("text/html"));

    if (!isHtml404 && !isLocalProxy404) throw error;

    // Fallback to direct backend URL when the local /api rewrite is unavailable.
    return axios.request<T>({
      ...config,
      url: getStudentApiEndpoint(path),
    });
  }
}

export default function StudentQuizAttemptPage() {
  const { language, isRTL } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizId = String(searchParams.get("quiz_id") ?? "");
  const courseId = searchParams.get("course_id");
  const explicitAttemptId = readNumber(searchParams.get("attempt_id"));

  const locale = language === "ar" ? "ar" : "en";
  const fallbackLocale = locale === "ar" ? "en" : "ar";
  const currentStudentId = getStoredStudentId();

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

  const attemptStorageKey = useMemo(
    () => `student_quiz_attempt:${currentStudentId ?? "anon"}:${quizId}`,
    [currentStudentId, quizId]
  );

  const headers = useMemo(() => {
    const token = getStudentToken();
    if (!token) return null;
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const resolveStudentId = useCallback(async () => {
    if (!headers) return currentStudentId;

    try {
      const response = await requestWithProxyFallback("/auth/profile", {
        method: "GET",
        headers,
      });
      const profile = extractStudentUser(response.data);
      if (profile) {
        updateStoredStudentUser(profile);
        return readNumber(profile.id) ?? currentStudentId;
      }
    } catch {
      // Fall back to the locally stored id when profile refresh fails.
    }

    return currentStudentId;
  }, [currentStudentId, headers]);

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
  const isAttemptReadOnly = attempt ? !["pending", "in_progress"].includes((attempt.status ?? "").toLowerCase()) : false;

  const hydrateAttempt = useCallback(
    (normalized: AttemptDetails) => {
      localStorage.setItem(attemptStorageKey, String(normalized.id));
      setAttempt(normalized);
      setDrafts(getInitialDrafts(normalized.quiz.questions, normalized.answers, locale, fallbackLocale));
      setQuestionError({});
      setSavedByQuestion({});
    },
    [attemptStorageKey, fallbackLocale, locale]
  );

  const loadWorkspace = useCallback(async () => {
    if (!headers) throw new Error("missing_token");

    const resolvedStudentId = await resolveStudentId();
    const response = await requestWithProxyFallback(`/attempts/workspace/${quizId}`, {
      method: "GET",
      headers,
      params: resolvedStudentId ? { student_id: resolvedStudentId } : undefined,
    });

    const normalized = normalizeAttempt(response.data);
    if (!normalized || !normalized.id) {
      throw new Error("invalid_workspace_payload");
    }

    hydrateAttempt(normalized);
    return normalized.id;
  }, [headers, hydrateAttempt, quizId, resolveStudentId]);

  const resolveAttemptId = useCallback(async (options?: { ignoreCache?: boolean }) => {
    if (!headers) throw new Error("missing_token");
    const resolvedStudentId = await resolveStudentId();

    if (!options?.ignoreCache && explicitAttemptId && explicitAttemptId > 0) {
      localStorage.setItem(attemptStorageKey, String(explicitAttemptId));
      return explicitAttemptId;
    }

    const cachedAttemptId = options?.ignoreCache ? null : readNumber(localStorage.getItem(attemptStorageKey));
    if (cachedAttemptId && cachedAttemptId > 0) {
      return cachedAttemptId;
    }

    const createPayload: Record<string, unknown> = {
      quiz_id: Number(quizId),
    };
    if (resolvedStudentId) createPayload.student_id = resolvedStudentId;

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

    if (courseId) {
      try {
        const progressResponse = await requestWithProxyFallback(`/courses/${courseId}/assessment-progress`, {
          method: "GET",
          headers,
          params: resolvedStudentId ? { student_id: resolvedStudentId } : undefined,
        });
        const match = extractAssessmentProgressRows(progressResponse.data).find((item) => {
          const progressQuizId = readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) : null);
          return progressQuizId === Number(quizId);
        });
        const progressAttemptId = match ? getAttemptIdFromProgress(match) : null;

        if (progressAttemptId) {
          localStorage.setItem(attemptStorageKey, String(progressAttemptId));
          return progressAttemptId;
        }
      } catch {
        // No-op.
      }
    }

    try {
      const listResponse = await requestWithProxyFallback("/attempts", {
        method: "GET",
        headers,
        params: {
          quiz_id: Number(quizId),
          ...(resolvedStudentId ? { student_id: resolvedStudentId } : {}),
          per_page: 15,
        },
      });
      const attempts = extractList(listResponse.data).filter(isRecord);
      const match = attempts
        .map((item) => ({
          id: readNumber(item.id) ?? 0,
          quiz_id: readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) ?? 0 : 0),
          student_id: readNumber(item.student_id) ?? (isRecord(item.student) ? readNumber(item.student.id) ?? 0 : 0),
          status: readString(item.status, "") || readString(item.attempt_status, "") || readString(item.grading_status, ""),
        }))
        .filter(
          (item) =>
            item.id > 0 &&
            item.quiz_id === Number(quizId) &&
            (!resolvedStudentId || item.student_id === resolvedStudentId)
        )
        .sort((a, b) => b.id - a.id)
        .find((item) => item.status === "in_progress") ??
        attempts
          .map((item) => ({
            id: readNumber(item.id) ?? 0,
            quiz_id: readNumber(item.quiz_id) ?? 0,
            student_id: readNumber(item.student_id) ?? 0,
          }))
          .filter(
            (item) =>
              item.id > 0 &&
              item.quiz_id === Number(quizId) &&
              (!resolvedStudentId || item.student_id === resolvedStudentId)
          )
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

    try {
      const listResponse = await requestWithProxyFallback("/attempts", {
        method: "GET",
        headers,
        params: { per_page: 15 },
      });
      const attempts = extractList(listResponse.data).filter(isRecord);
      const strictMatch = attempts
        .map((item) => ({
          id: readNumber(item.id) ?? 0,
          quiz_id: readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) ?? 0 : 0),
          student_id: readNumber(item.student_id) ?? (isRecord(item.student) ? readNumber(item.student.id) ?? 0 : 0),
          status: readString(item.status, "") || readString(item.attempt_status, "") || readString(item.grading_status, ""),
        }))
        .filter(
          (item) =>
            item.id > 0 &&
            item.quiz_id === Number(quizId) &&
            (!resolvedStudentId || item.student_id === resolvedStudentId)
        );

      const match =
        strictMatch.sort((a, b) => b.id - a.id).find((item) => item.status === "in_progress") ??
        strictMatch.sort((a, b) => b.id - a.id)[0] ??
        attempts
          .map((item) => ({
            id: readNumber(item.id) ?? 0,
            quiz_id: readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) ?? 0 : 0),
            status: readString(item.status, "") || readString(item.attempt_status, "") || readString(item.grading_status, ""),
          }))
          .filter((item) => item.id > 0 && item.quiz_id === Number(quizId))
          .sort((a, b) => b.id - a.id)
          .find((item) => item.status === "in_progress") ??
        attempts
          .map((item) => ({
            id: readNumber(item.id) ?? 0,
            quiz_id: readNumber(item.quiz_id) ?? (isRecord(item.quiz) ? readNumber(item.quiz.id) ?? 0 : 0),
          }))
          .filter((item) => item.id > 0 && item.quiz_id === Number(quizId))
          .sort((a, b) => b.id - a.id)[0];

      if (match?.id) {
        localStorage.setItem(attemptStorageKey, String(match.id));
        return match.id;
      }
    } catch {
      // No-op.
    }

    return null;
  }, [attemptStorageKey, courseId, explicitAttemptId, headers, quizId, resolveStudentId]);

  const loadAttempt = useCallback(
    async (attemptOrQuizId: number) => {
      if (!headers) throw new Error("missing_token");

      let normalized: AttemptDetails | null = null;

      try {
        const response = await requestWithProxyFallback(`/attempts/${attemptOrQuizId}`, {
          method: "GET",
          headers,
        });
        normalized = normalizeAttempt(response.data);
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
          throw error;
        }

        const quizResponse = await requestWithProxyFallback(`/quizzes/${quizId}`, {
          method: "GET",
          headers,
        });
        normalized = normalizeAttemptFromQuizPayload(quizResponse.data, attemptOrQuizId);
      }

      if (!normalized || !normalized.id) {
        throw new Error("invalid_attempt_payload");
      }

      hydrateAttempt(normalized);
    },
    [headers, hydrateAttempt, quizId]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        if (!cancelled) {
          await loadWorkspace();
        }
      } catch (error) {
        if (!cancelled) {
          try {
            const attemptId = await resolveAttemptId({ ignoreCache: true });
            if (attemptId) {
              await loadAttempt(attemptId);
              setIsLoading(false);
              return;
            }
          } catch {
            // fall through to existing error handling
          }
        }
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
  }, [loadAttempt, loadWorkspace, quizId, resolveAttemptId]);

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
          return buildSubmitAnswerPayload(question, draft);
        })
        .filter((item): item is SubmitAnswerPayload => item !== null);

      const submitPayload = { answers };

      await requestWithProxyFallback(`/attempts/${attempt.id}/submit`, {
        method: "POST",
        data: submitPayload,
        headers,
      });
      const nextQuery = new URLSearchParams({
        attempt_id: String(attempt.id),
        pending_review: "1",
        ...(courseId ? { course_id: courseId } : {}),
      });
      nextQuery.set("quiz_id", quizId);
      router.replace(`/student/quiz-grade?${nextQuery.toString()}`);
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
        onClick={() => {
          const query = new URLSearchParams({ quiz_id: quizId });
          if (courseId) query.set("course_id", courseId);
          router.push(`/student/quiz?${query.toString()}`);
        }}
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
                              disabled={isAttemptReadOnly}
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
                        disabled={isAttemptReadOnly}
                        onClick={() => updateDraft(question.id, { boolean_answer: true })}
                        className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${draft.boolean_answer === true ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]"}`}
                      >
                        True
                      </button>
                      <button
                        type="button"
                        disabled={isAttemptReadOnly}
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
                      disabled={isAttemptReadOnly}
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
                      disabled={isAttemptReadOnly || savingByQuestion[question.id]}
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
              disabled={isSubmittingAttempt || isAttemptReadOnly || !attempt.quiz.questions.length}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-300"
            >
              {isSubmittingAttempt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmittingAttempt ? "Submitting..." : "Submit Attempt"}
            </button>
            <span className="text-xs opacity-60">{attempt.status || "in_progress"}</span>
          </div>
          {isTimeUp && !isAttemptReadOnly ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              The timer has ended, but this attempt is still open, so you can finish and submit your answers.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
