"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type StudentQuizzesData = {
  student: {
    name: string;
    email: string;
    phone: string;
    country: string;
    education_level: string;
    specialization: string;
  };
  quizzes: Array<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = "N/A") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function parseQuizzes(payload: unknown): StudentQuizzesData {
  const root = isRecord(payload) && isRecord(payload.data) ? payload.data : {};
  const student = isRecord(root.student) ? root.student : {};
  const profile = isRecord(student.student_profile) ? student.student_profile : {};

  return {
    student: {
      name: readString(student.name),
      email: readString(student.email),
      phone: readString(student.phone),
      country: readString(profile.country),
      education_level: readString(profile.education_level),
      specialization: readString(profile.specialization),
    },
    quizzes: Array.isArray(root.quizzes) ? root.quizzes.map((q) => (isRecord(q) ? q : {})) : [],
  };
}

export default function StudentQuizzesPage() {
  const { t, isRTL } = useLanguage();
  const [data, setData] = useState<StudentQuizzesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const response = await axios.get(getStudentApiRequestUrl("/me/with-quizzes"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setData(parseQuizzes(response.data));
    } catch (error) {
      let message = "Failed to load quizzes.";
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        const serverMsg = error.response.data.message;
        // Hide raw database errors from the UI
        if (!serverMsg.includes("SQLSTATE") && !serverMsg.includes("Base table or view not found")) {
          message = serverMsg;
        }
      }
      setErrorMessage(message);

      // Fallback: Try to at least load the student profile if the quizzes table is broken in the backend
      try {
        const token = getStudentToken();
        const fallbackResponse = await axios.get(getStudentApiRequestUrl("/me/with-courses"), {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const fallbackData = parseQuizzes(fallbackResponse.data);
        // Keep the quizzes array empty since we are using the courses endpoint just for the student profile
        setData({ student: fallbackData.student, quizzes: [] });
      } catch (_) {
        // If the fallback also fails, silently ignore and rely on the original error message
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  const quizRows = useMemo(() => data?.quizzes ?? [], [data]);

  return (
    <div className="p-8 md:p-12 min-h-screen bg-(--background) text-(--foreground)">
      <div className={`mb-8 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-4xl font-black tracking-tighter">{t("std.quizzes")}</h1>
          <p className="opacity-50 mt-2">All quiz access from API.</p>
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

      <section className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
          <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Student</p>
          <p className="text-xl font-black">{data?.student.name ?? "N/A"}</p>
          <p className="text-sm opacity-60 mt-1">{data?.student.email ?? "N/A"}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
          <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Education Level</p>
          <p className="text-xl font-black capitalize">{data?.student.education_level ?? "N/A"}</p>
          <p className="text-sm opacity-60 mt-1">{data?.student.specialization ?? "N/A"}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
          <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Country / Phone</p>
          <p className="text-xl font-black">{data?.student.country ?? "N/A"}</p>
          <p className="text-sm opacity-60 mt-1">{data?.student.phone ?? "N/A"}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <h2 className="text-2xl font-black tracking-tight mb-4">Quizzes</h2>
        {quizRows.length ? (
          <div className="space-y-3">
            {quizRows.map((quiz, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-3">
                <p className="font-bold">{readString(quiz.title, `Quiz #${i + 1}`)}</p>
                <p className="text-xs opacity-60 mt-1">ID: {readString(quiz.id, "--")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="opacity-50">No quizzes assigned yet.</p>
        )}
      </section>
    </div>
  );
}

