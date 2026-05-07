"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type AttemptListItem = {
  id: number;
  quizId: number | null;
  quizTitle: string;
  studentName: string;
  status: string;
  submittedAt: string | null;
};

type SheetQuestion = {
  id: number;
  text: string;
  type: string;
  point: number | null;
  options: Array<{ id: number; text: string }>;
  studentAnswerText: string;
  earnedScore: number | null;
  isCorrect: boolean | null;
};

type GradingSheet = {
  attemptId: number;
  status: string;
  studentName: string;
  quizTitle: string;
  maxScore: number | null;
  passingScore: number | null;
  questions: SheetQuestion[];
};

type GradeDraft = {
  earnedScore: string;
  isCorrect: boolean;
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

function extractItem(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data) && isRecord(payload.data.data)) return payload.data.data;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function extractList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data.filter(isRecord);
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) {
    return payload.data.data.filter(isRecord);
  }
  return [];
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

function stringifyAnswerValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "True" : "False";
  if (isRecord(value)) {
    const en = readString(value.en, "");
    const ar = readString(value.ar, "");
    return en || ar || "";
  }
  if (Array.isArray(value)) {
    return value.map((item) => stringifyAnswerValue(item)).filter(Boolean).join(", ");
  }
  return "";
}

function normalizeAttemptRow(row: Record<string, unknown>): AttemptListItem | null {
  const id = readNumber(row.id);
  if (!id) return null;

  const quizRecord = isRecord(row.quiz) ? row.quiz : null;
  const studentRecord = isRecord(row.student) ? row.student : null;

  return {
    id,
    quizId: readNumber(row.quiz_id) ?? readNumber(quizRecord?.id),
    quizTitle:
      readString(quizRecord?.title, "") ||
      stringifyAnswerValue(quizRecord?.title) ||
      readString(row.quiz_title, "") ||
      "Quiz",
    studentName:
      readString(studentRecord?.name, "") ||
      readString(row.student_name, "") ||
      `Student #${readNumber(row.student_id) ?? "--"}`,
    status:
      readString(row.status, "") ||
      readString(row.attempt_status, "") ||
      readString(row.grading_status, "") ||
      "unknown",
    submittedAt: readString(row.submitted_at, "") || null,
  };
}

function normalizeGradingSheet(payload: unknown): GradingSheet | null {
  const root = extractItem(payload);
  if (!root) return null;

  const attemptRecord = isRecord(root.attempt) ? root.attempt : root;
  const quizRecord = isRecord(root.quiz)
    ? root.quiz
    : isRecord(attemptRecord.quiz)
      ? attemptRecord.quiz
      : null;
  const studentRecord = isRecord(root.student)
    ? root.student
    : isRecord(attemptRecord.student)
      ? attemptRecord.student
      : null;

  const attemptId = readNumber(attemptRecord.id);
  if (!attemptId) return null;

  const answersPool: Record<string, unknown>[] = [];
  const candidateAnswerLists = [
    root.answers,
    attemptRecord.answers,
    root.student_answers,
  ];
  for (const list of candidateAnswerLists) {
    if (Array.isArray(list)) {
      answersPool.push(...list.filter(isRecord));
    }
  }
  const answerByQuestionId = new Map<number, Record<string, unknown>>();
  for (const answer of answersPool) {
    const qid = readNumber(answer.question_id);
    if (qid && !answerByQuestionId.has(qid)) {
      answerByQuestionId.set(qid, answer);
    }
  }

  const questionCandidates = [
    root.questions,
    root.quiz_questions,
    quizRecord?.questions,
  ];

  let questionRows: Record<string, unknown>[] = [];
  for (const candidate of questionCandidates) {
    if (Array.isArray(candidate)) {
      questionRows = candidate.filter(isRecord);
      if (questionRows.length) break;
    }
  }

  const questions: SheetQuestion[] = questionRows
    .map((row) => {
      const qid = readNumber(row.question_id) ?? readNumber(row.id);
      if (!qid) return null;

      const answerRecordCandidates: Array<unknown> = [
        row.student_answer,
        row.answer,
        row.attempt_answer,
      ];
      let rowAnswer: Record<string, unknown> | null = null;
      for (const candidate of answerRecordCandidates) {
        if (isRecord(candidate)) {
          rowAnswer = candidate;
          break;
        }
      }
      if (!rowAnswer) {
        rowAnswer = answerByQuestionId.get(qid) ?? null;
      }

      const options = Array.isArray(row.options)
        ? row.options
            .filter(isRecord)
            .map((option) => ({
              id: readNumber(option.id) ?? 0,
              text: stringifyAnswerValue(option.option_text) || stringifyAnswerValue(option.text) || `Option #${readNumber(option.id) ?? "--"}`,
            }))
            .filter((option) => option.id > 0)
        : [];

      const selectedOptionId =
        readNumber(rowAnswer?.selected_option_id) ??
        readNumber(row.selected_option_id);
      const selectedOption = selectedOptionId
        ? options.find((option) => option.id === selectedOptionId)
        : null;

      const freeText =
        stringifyAnswerValue(rowAnswer?.answer_text) ||
        stringifyAnswerValue(row.answer_text) ||
        "";

      const boolValue =
        typeof rowAnswer?.boolean_answer === "boolean"
          ? rowAnswer.boolean_answer
          : typeof row.boolean_answer === "boolean"
            ? row.boolean_answer
            : null;

      const studentAnswerText =
        selectedOption?.text ||
        (typeof boolValue === "boolean" ? (boolValue ? "True" : "False") : "") ||
        freeText ||
        "No submitted answer";

      return {
        id: qid,
        text:
          stringifyAnswerValue(row.question_text) ||
          stringifyAnswerValue(row.text) ||
          stringifyAnswerValue(row.title) ||
          `Question #${qid}`,
        type: readString(row.type, "unknown"),
        point: readNumber(row.point) ?? readNumber(row.max_score),
        options,
        studentAnswerText,
        earnedScore:
          readNumber(rowAnswer?.earned_score) ??
          readNumber(row.earned_score),
        isCorrect:
          typeof rowAnswer?.is_correct === "boolean"
            ? rowAnswer.is_correct
            : typeof row.is_correct === "boolean"
              ? row.is_correct
              : null,
      } satisfies SheetQuestion;
    })
    .filter((question): question is SheetQuestion => question !== null);

  return {
    attemptId,
    status: readString(attemptRecord.status, "unknown"),
    studentName:
      readString(studentRecord?.name, "") ||
      readString(root.student_name, "") ||
      `Student #${readNumber(attemptRecord.student_id) ?? "--"}`,
    quizTitle:
      stringifyAnswerValue(quizRecord?.title) ||
      readString(root.quiz_title, "") ||
      "Quiz",
    maxScore: readNumber(quizRecord?.max_score) ?? readNumber(root.max_score),
    passingScore: readNumber(quizRecord?.passing_score) ?? readNumber(root.passing_score),
    questions,
  };
}

function statusBadgeColor(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "graded" || normalized === "passed" || normalized === "completed") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  }
  if (normalized === "submitted" || normalized === "pending_review" || normalized === "under_review") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  }
  return "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/70";
}

export default function InstructorQuizzesPage() {
  const { t, isRTL } = useLanguage();
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [isAttemptsLoading, setIsAttemptsLoading] = useState(true);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [attemptInput, setAttemptInput] = useState("");
  const [sheet, setSheet] = useState<GradingSheet | null>(null);
  const [draftByQuestion, setDraftByQuestion] = useState<Record<number, GradeDraft>>({});
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const headers = useMemo(() => {
    const token = getStudentToken();
    if (!token) return null;
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const buildDrafts = useCallback((questions: SheetQuestion[]) => {
    const next: Record<number, GradeDraft> = {};
    for (const question of questions) {
      next[question.id] = {
        earnedScore: String(question.earnedScore ?? 0),
        isCorrect: Boolean(question.isCorrect),
      };
    }
    return next;
  }, []);

  const loadAttempts = useCallback(async () => {
    setIsAttemptsLoading(true);
    setErrorMessage(null);
    try {
      if (!headers) throw new Error("missing_token");

      const response = await requestWithProxyFallback("/attempts", {
        method: "GET",
        headers,
        params: { per_page: 200 },
      });
      const rows = extractList(response.data)
        .map(normalizeAttemptRow)
        .filter((row): row is AttemptListItem => row !== null)
        .sort((a, b) => b.id - a.id);

      setAttempts(rows);
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Failed to load attempts.");
      }
    } finally {
      setIsAttemptsLoading(false);
    }
  }, [headers]);

  const loadSheet = useCallback(
    async (attemptId: number) => {
      setIsSheetLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        if (!headers) throw new Error("missing_token");

        const response = await requestWithProxyFallback(`/attempts/${attemptId}/grading-sheet`, {
          method: "GET",
          headers,
        });
        const normalized = normalizeGradingSheet(response.data);
        if (!normalized) throw new Error("invalid_grading_sheet");

        setSelectedAttemptId(attemptId);
        setAttemptInput(String(attemptId));
        setSheet(normalized);
        setDraftByQuestion(buildDrafts(normalized.questions));
      } catch (error) {
        if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
          setErrorMessage(error.response.data.message);
        } else {
          setErrorMessage("Failed to load grading sheet.");
        }
      } finally {
        setIsSheetLoading(false);
      }
    },
    [buildDrafts, headers]
  );

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  const handleLoadByInput = async () => {
    const id = readNumber(attemptInput);
    if (!id) {
      setErrorMessage("Enter a valid attempt id.");
      return;
    }
    await loadSheet(id);
  };

  const updateDraft = (questionId: number, patch: Partial<GradeDraft>) => {
    setDraftByQuestion((current) => ({
      ...current,
      [questionId]: {
        earnedScore: current[questionId]?.earnedScore ?? "0",
        isCorrect: current[questionId]?.isCorrect ?? false,
        ...patch,
      },
    }));
  };

  const submitGrading = async () => {
    if (!sheet || !headers) return;

    const answers = sheet.questions.map((question) => {
      const draft = draftByQuestion[question.id];
      const earnedScore = readNumber(draft?.earnedScore) ?? 0;
      return {
        question_id: question.id,
        earned_score: earnedScore < 0 ? 0 : earnedScore,
        is_correct: Boolean(draft?.isCorrect),
      };
    });

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await requestWithProxyFallback(`/attempts/${sheet.attemptId}/instructor-grade`, {
        method: "POST",
        headers,
        data: { answers },
      });
      setSuccessMessage("Grading submitted successfully.");
      await Promise.all([loadSheet(sheet.attemptId), loadAttempts()]);
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Failed to submit grading.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--background) p-8 text-(--foreground) md:p-12">
      <div className={`mb-8 flex items-center justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-4xl font-black tracking-tighter">{t("nav.quizzes")}</h1>
          <p className="mt-2 text-sm opacity-60">Review submissions and send instructor grades.</p>
        </div>
        <button
          onClick={() => void loadAttempts()}
          disabled={isAttemptsLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white disabled:opacity-70 dark:bg-white dark:text-slate-900"
        >
          {isAttemptsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {errorMessage ? (
        <div className={`mb-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {successMessage ? (
        <div className={`mb-4 flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <h2 className="mb-3 text-lg font-black">Attempts</h2>

          <div className="mb-4 flex items-center gap-2">
            <input
              value={attemptInput}
              onChange={(event) => setAttemptInput(event.target.value)}
              placeholder="Attempt ID"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.02]"
            />
            <button
              onClick={() => void handleLoadByInput()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-3 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-500"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {isAttemptsLoading ? (
            <div className="flex items-center gap-2 text-sm opacity-60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading attempts...
            </div>
          ) : attempts.length === 0 ? (
            <p className="text-sm opacity-60">No attempts found.</p>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
              {attempts.map((attempt) => (
                <button
                  key={attempt.id}
                  onClick={() => void loadSheet(attempt.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${selectedAttemptId === attempt.id ? "border-indigo-400 bg-indigo-50 dark:border-indigo-400/70 dark:bg-indigo-500/10" : "border-slate-200 bg-slate-50 hover:border-indigo-300 dark:border-white/10 dark:bg-white/[0.02]"}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black">Attempt #{attempt.id}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeColor(attempt.status)}`}>
                      {attempt.status}
                    </span>
                  </div>
                  <p className="truncate text-xs opacity-70">{attempt.quizTitle}</p>
                  <p className="truncate text-xs opacity-60">{attempt.studentName}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
          {!sheet ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 text-center dark:border-white/10">
              <ClipboardCheck className="h-9 w-9 opacity-30" />
              <p className="text-sm opacity-60">Select an attempt to load grading sheet.</p>
            </div>
          ) : isSheetLoading ? (
            <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm opacity-60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading grading sheet...
            </div>
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-50">Attempt #{sheet.attemptId}</p>
                  <h2 className="text-2xl font-black">{sheet.quizTitle}</h2>
                  <p className="text-sm opacity-70">{sheet.studentName}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">
                    Max: {sheet.maxScore ?? "--"} | Pass: {sheet.passingScore ?? "--"}
                  </p>
                  <p className="opacity-60">Status: {sheet.status}</p>
                </div>
              </div>

              <div className="space-y-4">
                {sheet.questions.map((question, index) => (
                  <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-black">
                        Q{index + 1}. {question.text}
                      </p>
                      <span className="text-xs font-bold opacity-60">{question.point ?? 0} pts</span>
                    </div>

                    <p className="mb-2 text-xs uppercase tracking-wider opacity-50">Student Answer</p>
                    <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                      {question.studentAnswerText}
                    </div>

                    {question.options.length ? (
                      <div className="mb-3">
                        <p className="mb-1 text-xs uppercase tracking-wider opacity-50">Options</p>
                        <ul className="space-y-1 text-xs opacity-70">
                          {question.options.map((option) => (
                            <li key={option.id}>#{option.id}: {option.text}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_auto] md:items-end">
                      <div>
                        <label className="mb-1 block text-xs uppercase tracking-wider opacity-50">Earned Score</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={draftByQuestion[question.id]?.earnedScore ?? "0"}
                          onChange={(event) => updateDraft(question.id, { earnedScore: event.target.value })}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.03]"
                        />
                      </div>
                      <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.03]">
                        <input
                          type="checkbox"
                          checked={Boolean(draftByQuestion[question.id]?.isCorrect)}
                          onChange={(event) => updateDraft(question.id, { isCorrect: event.target.checked })}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        Correct
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => void submitGrading()}
                  disabled={isSubmitting || !sheet.questions.length}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-indigo-500 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isSubmitting ? "Submitting..." : "Submit Instructor Grade"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

