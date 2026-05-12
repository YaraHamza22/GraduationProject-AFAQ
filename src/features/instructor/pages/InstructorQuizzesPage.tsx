"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, BadgeCheck, CheckCircle2, ClipboardCheck, Clock, Loader2, RefreshCw, Search } from "lucide-react";
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

function stringifyAnswerValue(value: unknown): string {
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
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "graded">("all");

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

        // Try standard grading sheet endpoint
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
          setErrorMessage("Failed to load grading sheet. This attempt may not be available for review yet.");
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

  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => {
      if (activeTab === "pending") return a.status === "submitted" || a.status === "pending_review";
      if (activeTab === "graded") return a.status === "graded" || a.status === "completed";
      return true;
    });
  }, [attempts, activeTab]);

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
      // The user specifically mentioned "grade-attempt", we use the instructor-grade endpoint as primary
      // but we could also try a fallback if needed.
      await requestWithProxyFallback(`/attempts/${sheet.attemptId}/instructor-grade`, {
        method: "POST",
        headers,
        data: { answers },
      });
      setSuccessMessage("Grading submitted successfully!");
      await Promise.all([loadSheet(sheet.attemptId), loadAttempts()]);
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Failed to submit grading. Please check if the API /instructor-grade is correctly configured.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--background) p-4 md:p-8 lg:p-12 text-(--foreground)">
      {/* Header Section */}
      <div className={`mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 ${isRTL ? "md:flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <div className="flex items-center gap-3 mb-4 opacity-50 uppercase tracking-[0.2em] text-[10px] font-black">
            <ClipboardCheck className="w-4 h-4" />
            <span>Assessment Management</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">
            {t("nav.quizzes")}
          </h1>
          <p className="text-lg opacity-40 font-medium max-w-xl">
            Review student submissions, provide feedback, and assign scores to manually graded questions.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => void loadAttempts()}
            disabled={isAttemptsLoading}
            className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 transition-all duration-300 group"
          >
            <RefreshCw className={`w-5 h-5 transition-transform duration-700 ${isAttemptsLoading ? "animate-spin" : "group-hover:rotate-180"}`} />
          </button>
        </div>
      </div>

      {/* Stats/Tabs Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-8 bg-slate-200/50 dark:bg-white/5 p-2 rounded-2xl backdrop-blur-xl w-fit">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "all" ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xl scale-105" : "opacity-50 hover:opacity-100"}`}
        >
          All Attempts
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "pending" ? "bg-white dark:bg-amber-600 text-amber-600 dark:text-white shadow-xl scale-105" : "opacity-50 hover:opacity-100"}`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setActiveTab("graded")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "graded" ? "bg-white dark:bg-emerald-600 text-emerald-600 dark:text-white shadow-xl scale-105" : "opacity-50 hover:opacity-100"}`}
        >
          Graded
        </button>
      </div>

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

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[380px_1fr]">
        {/* Sidebar: Attempts List */}
        <section className="space-y-6">
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm flex flex-col h-[70vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black tracking-tight">Recent Submissions</h2>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                {filteredAttempts.length}
              </span>
            </div>

            <div className="relative mb-6">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 ${isRTL ? "right-4" : "left-4"}`} />
              <input
                value={attemptInput}
                onChange={(e) => setAttemptInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoadByInput()}
                placeholder="Find Attempt ID..."
                className={`h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 text-sm outline-none focus:border-indigo-500/50 transition-all ${isRTL ? "pr-11 pl-4" : "pl-11 pr-4"}`}
              />
            </div>

            <div className="flex-1 overflow-auto pr-2 space-y-3 custom-scrollbar">
              {isAttemptsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-30">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs font-bold uppercase tracking-widest">Syncing Data...</p>
                </div>
              ) : filteredAttempts.length === 0 ? (
                <div className="text-center py-12 opacity-30">
                  <p className="text-sm font-bold italic">No submissions found</p>
                </div>
              ) : (
                filteredAttempts.map((attempt) => (
                  <button
                    key={attempt.id}
                    onClick={() => void loadSheet(attempt.id)}
                    className={`w-full group relative rounded-2xl border p-4 text-left transition-all duration-300 ${
                      selectedAttemptId === attempt.id
                        ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                        : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/1 hover:border-indigo-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">ID #{attempt.id}</p>
                        <p className="font-bold text-sm group-hover:text-indigo-400 transition-colors line-clamp-1">{attempt.studentName}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${statusBadgeColor(attempt.status)}`}>
                        {attempt.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs opacity-40 font-medium line-clamp-1">{attempt.quizTitle}</p>
                    {attempt.submittedAt && (
                      <div className="mt-3 flex items-center gap-1.5 opacity-20 text-[10px] font-bold">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(attempt.submittedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Main: Grading Interface */}
        <section>
          <div className="rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 shadow-sm min-h-[70vh]">
            {!sheet ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 blur-3xl bg-indigo-500/10 rounded-full" />
                  <ClipboardCheck className="w-24 h-24 opacity-10 relative" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight opacity-40">Ready to Grade</h3>
                  <p className="text-sm opacity-20 mt-2 max-w-xs">Select a student submission from the left sidebar to begin the review process.</p>
                </div>
              </div>
            ) : isSheetLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 opacity-30">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-sm font-bold uppercase tracking-[0.2em]">Assembling Grading Sheet...</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Grading Sheet Header */}
                <div className="flex flex-wrap items-start justify-between gap-6 pb-8 border-b border-slate-200 dark:border-white/10">
                  <div className={isRTL ? "text-right" : "text-left"}>
                    <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Grading Session</p>
                    <h2 className="text-4xl font-black tracking-tighter mb-2">{sheet.studentName}</h2>
                    <div className="flex items-center gap-4 text-sm opacity-50 font-medium">
                      <span>{sheet.quizTitle}</span>
                      <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                      <span>Attempt #{sheet.attemptId}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-4xl border border-slate-200 dark:border-white/10 text-center min-w-[160px]">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Max Potential</p>
                    <p className="text-3xl font-black tracking-tighter text-indigo-500">{sheet.maxScore ?? "--"}</p>
                    <p className="text-[10px] font-bold opacity-30 mt-1">Pass: {sheet.passingScore ?? "--"}</p>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                  {sheet.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="group relative rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/1 p-6 md:p-8 transition-all hover:border-indigo-500/30"
                    >
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-widest">Question {index + 1}</span>
                          <h4 className="text-lg font-bold leading-tight">{question.text}</h4>
                          <p className="text-[10px] opacity-30 font-bold uppercase">{question.type.replace("_", " ")}</p>
                        </div>
                        <div className="shrink-0 px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black opacity-60">
                          {question.point ?? 0} PTS
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Submission Content */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-3">Student Submission</p>
                            <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium leading-relaxed italic text-indigo-600 dark:text-indigo-400">
                              "{question.studentAnswerText}"
                            </div>
                          </div>

                          {question.options.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2">Available Options</p>
                              <div className="flex flex-wrap gap-2">
                                {question.options.map(opt => (
                                  <span key={opt.id} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-[10px] font-bold opacity-50">
                                    {opt.text}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Grading Controls */}
                        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col justify-center space-y-6">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest opacity-30">Assign Score</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={question.point ?? 100}
                                step="0.5"
                                value={draftByQuestion[question.id]?.earnedScore ?? "0"}
                                onChange={(e) => updateDraft(question.id, { earnedScore: e.target.value })}
                                className="w-20 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center font-black text-indigo-500 outline-none focus:border-indigo-500 transition-all"
                              />
                              <span className="text-xs opacity-30 font-bold">/ {question.point ?? "--"}</span>
                            </div>
                          </div>

                          <div className="h-px bg-slate-100 dark:bg-white/5" />

                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest opacity-30">Mark Validity</p>
                            <label className="relative inline-flex items-center cursor-pointer group/toggle">
                              <input
                                type="checkbox"
                                checked={draftByQuestion[question.id]?.isCorrect}
                                onChange={(e) => updateDraft(question.id, { isCorrect: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-14 h-7 bg-slate-200 dark:bg-white/10 rounded-full peer peer-checked:bg-emerald-500 transition-all duration-500 peer-focus:ring-2 peer-focus:ring-indigo-500/30">
                                <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 peer-checked:translate-x-7 flex items-center justify-center">
                                  {draftByQuestion[question.id]?.isCorrect && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                </div>
                              </div>
                              <span className={`ml-3 text-[10px] font-black uppercase tracking-widest transition-colors ${draftByQuestion[question.id]?.isCorrect ? "text-emerald-500" : "opacity-30"}`}>
                                {draftByQuestion[question.id]?.isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                  <div className="hidden md:block">
                    <p className="text-xs font-bold opacity-30 italic">Total questions: {sheet.questions.length}</p>
                  </div>
                  <button
                    onClick={() => void submitGrading()}
                    disabled={isSubmitting || !sheet.questions.length}
                    className="relative group overflow-hidden px-8 py-4 rounded-2xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-indigo-600/40 disabled:opacity-50 disabled:scale-100"
                  >
                    <div className="relative z-10 flex items-center gap-3">
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <BadgeCheck className="w-5 h-5" />
                      )}
                      <span>{isSubmitting ? "Finalizing Grades..." : "Confirm & Submit Grading"}</span>
                    </div>
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


