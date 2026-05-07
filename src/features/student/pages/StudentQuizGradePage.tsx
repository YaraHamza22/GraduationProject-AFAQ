"use client";

import React, { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type GradeSnapshot = {
  score: number | null;
  max_score: number | null;
  passing_score: number | null;
  percentage: number | null;
  status: string;
  grade_available: boolean;
  message: string | null;
  graded_at: string | null;
  submitted_at: string | null;
  updated_at: string | null;
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

function normalizeGrade(payload: unknown): GradeSnapshot | null {
  const root = isRecord(payload) ? payload : null;
  const item = extractItem(payload);
  if (!item) return null;

  const gradeAvailableFromItem = item.grade_available;
  const gradeAvailableFromRootData = isRecord(root?.data) ? root.data.grade_available : null;
  const gradeAvailableFromRoot = root?.grade_available;
  const rawGradeAvailable =
    gradeAvailableFromItem ?? gradeAvailableFromRootData ?? gradeAvailableFromRoot;
  const gradeAvailable =
    typeof rawGradeAvailable === "boolean" ? rawGradeAvailable : readNumber(item.score) != null;

  const messageFromItem = readString(item.message, "");
  const messageFromRootData = isRecord(root?.data) ? readString(root.data.message, "") : "";
  const messageFromRoot = readString(root?.message, "");

  return {
    score: readNumber(item.score),
    max_score: readNumber(item.max_score),
    passing_score: readNumber(item.passing_score),
    percentage: readNumber(item.percentage),
    status: readString(item.status, "unknown"),
    grade_available: gradeAvailable,
    message: messageFromItem || messageFromRootData || messageFromRoot || null,
    graded_at: readString(item.graded_at, "") || null,
    submitted_at: readString(item.submitted_at, "") || null,
    updated_at: readString(item.updated_at, "") || null,
  };
}

function formatDate(value: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function StudentQuizGradePage() {
  const { isRTL } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const quizId = String(params.quizId ?? "");
  const courseId = searchParams.get("course_id");
  const explicitAttemptId = readNumber(searchParams.get("attempt_id"));
  const attemptStorageKey = useMemo(() => `student_quiz_attempt:${quizId}`, [quizId]);

  const [grade, setGrade] = useState<GradeSnapshot | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(explicitAttemptId ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const headers = useMemo(() => {
    const token = getStudentToken();
    if (!token) return null;
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const loadGrade = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      if (!headers) throw new Error("missing_token");

      const resolvedAttemptId = explicitAttemptId ?? readNumber(localStorage.getItem(attemptStorageKey));
      if (!resolvedAttemptId) throw new Error("missing_attempt_id");

      const response = await requestWithProxyFallback(`/attempts/${resolvedAttemptId}/grade`, {
        method: "GET",
        headers,
      });
      const snapshot = normalizeGrade(response.data);
      if (!snapshot) throw new Error("invalid_grade_payload");

      setAttemptId(resolvedAttemptId);
      setGrade(snapshot);
      localStorage.setItem(attemptStorageKey, String(resolvedAttemptId));
    } catch (error) {
      if (error instanceof Error && error.message === "missing_attempt_id") {
        setErrorMessage("No attempt id found for this grade view.");
      } else if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Failed to load grade snapshot.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [attemptStorageKey, explicitAttemptId, headers]);

  React.useEffect(() => {
    void loadGrade();
  }, [loadGrade]);

  const normalizedStatus = (grade?.status ?? "").toLowerCase();
  const isPassedStatus = normalizedStatus === "passed" || normalizedStatus === "completed";
  const isPassedByScore =
    grade?.score != null && grade.passing_score != null ? grade.score >= grade.passing_score : false;
  const showPassed = isPassedStatus || isPassedByScore;
  const percentage = grade?.percentage ?? null;
  const gradeAvailable = Boolean(grade?.grade_available);

  return (
    <div className="min-h-screen bg-(--background) p-8 text-(--foreground) md:p-12">
      <div className={`mb-6 flex items-center justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <button
          onClick={() => router.push(courseId ? `/student/quizzes/${quizId}?course_id=${courseId}` : `/student/quizzes/${quizId}`)}
          className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
          Back
        </button>

        <button
          onClick={() => void loadGrade()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-900 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5 md:p-8">
        <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={isRTL ? "text-right" : ""}>
            <p className="text-xs uppercase tracking-widest opacity-50">Quiz #{quizId}</p>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Grade Snapshot</h1>
            <p className="mt-1 text-xs opacity-60">Attempt #{attemptId ?? "--"}</p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider ${
              !gradeAvailable
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                : showPassed
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
          >
            {!gradeAvailable ? (
              <Clock className="h-4 w-4" />
            ) : showPassed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {!gradeAvailable ? "Pending Review" : showPassed ? "Passed" : "Not Passed"}
          </span>
        </div>

        {grade && !gradeAvailable ? (
          <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{grade.message ?? "You will be notified when the quiz gets corrected."}</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-widest opacity-50">Score</p>
            <p className="mt-1 text-2xl font-black">
              {gradeAvailable ? grade?.score ?? "--" : "--"} / {gradeAvailable ? grade?.max_score ?? "--" : "--"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-widest opacity-50">Passing Score</p>
            <p className="mt-1 text-2xl font-black">{gradeAvailable ? grade?.passing_score ?? "--" : "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-widest opacity-50">Percentage</p>
            <p className="mt-1 text-2xl font-black">{gradeAvailable && percentage != null ? `${percentage}%` : "--"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-widest opacity-50">Status</p>
            <p className="mt-1 text-2xl font-black">{gradeAvailable ? grade?.status ?? "--" : "pending_review"}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
            <Clock className="h-4 w-4 opacity-70" />
            <span>Submitted: {formatDate(grade?.submitted_at ?? null)}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
            <Clock className="h-4 w-4 opacity-70" />
            <span>Graded: {formatDate(grade?.graded_at ?? null)}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
            <Clock className="h-4 w-4 opacity-70" />
            <span>Updated: {formatDate(grade?.updated_at ?? null)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
