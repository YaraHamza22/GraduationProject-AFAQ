"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Clock, Loader2, PlayCircle, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

type QuizDetails = {
  id: number;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  status?: string;
  is_published?: boolean;
  duration_minutes?: number;
  passing_score?: number;
  max_score?: number;
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

function extractItem(payload: unknown) {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function extractList(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

export default function StudentTakeQuizPage() {
  const { language, isRTL } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quizId = String(params.quizId ?? "");
  const courseId = searchParams.get("course_id");

  const locale = language === "ar" ? "ar" : "en";
  const fallbackLocale = locale === "ar" ? "en" : "ar";

  const loadQuiz = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      let item: Record<string, unknown> | null = null;

      try {
        const response = await axios.get(getStudentApiRequestUrl(`/quizzes/${quizId}`), {
          headers,
        });
        item = extractItem(response.data);
      } catch {
        if (courseId) {
          const fallbackResponse = await axios.get(getStudentApiRequestUrl("/quizzes"), {
            headers,
            params: { course_id: Number(courseId), per_page: 100 },
          });
          const rows = extractList(fallbackResponse.data);
          const found = rows.find((row) => isRecord(row) && String(row.id) === String(quizId));
          item = isRecord(found) ? found : null;
        }
      }

      if (!item) throw new Error("empty_response");

      setQuiz({
        id: Number(item.id ?? quizId),
        title: item.title as string | LocalizedText | undefined,
        description: item.description as string | LocalizedText | undefined,
        status: readString(item.status, ""),
        is_published: Boolean(item.is_published),
        duration_minutes: typeof item.duration_minutes === "number" ? item.duration_minutes : 0,
        passing_score: typeof item.passing_score === "number" ? item.passing_score : 0,
        max_score: typeof item.max_score === "number" ? item.max_score : 0,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Failed to load quiz details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId, quizId]);

  useEffect(() => {
    if (quizId) {
      void loadQuiz();
    }
  }, [loadQuiz, quizId]);

  const title = useMemo(() => {
    return getLocalizedValue(quiz?.title, locale, fallbackLocale) || `${language === "ar" ? "اختبار" : "Quiz"} #${quizId}`;
  }, [fallbackLocale, language, locale, quiz?.title, quizId]);

  const description = useMemo(() => {
    return getLocalizedValue(quiz?.description, locale, fallbackLocale) || (language === "ar" ? "لا يوجد وصف." : "No description.");
  }, [fallbackLocale, language, locale, quiz?.description]);

  return (
    <div className="p-8 md:p-12 min-h-screen bg-(--background) text-(--foreground)">
      <button
        onClick={() => router.push("/student/quizzes")}
        className={`mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:hover:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
        {language === "ar" ? "العودة إلى الاختبارات" : "Back to Quizzes"}
      </button>

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm opacity-70">
          <Loader2 className="w-5 h-5 animate-spin" />
          {language === "ar" ? "جار تحميل الاختبار..." : "Loading quiz..."}
        </div>
      ) : errorMessage ? (
        <div className={`flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : (
        <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 md:p-8">
          <p className="text-xs uppercase tracking-widest opacity-50 mb-2">
            {courseId ? `${language === "ar" ? "الدورة" : "Course"} #${courseId}` : language === "ar" ? "اختبار" : "Quiz"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
          <p className="mt-3 text-sm opacity-70 max-w-3xl">{description}</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest opacity-50 mb-1">{language === "ar" ? "الحالة" : "Status"}</p>
              <p className="font-black">{quiz?.status || "--"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest opacity-50 mb-1">{language === "ar" ? "المدة" : "Duration"}</p>
              <p className="font-black inline-flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-70" />
                {quiz?.duration_minutes ?? 0} min
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest opacity-50 mb-1">{language === "ar" ? "درجة النجاح" : "Passing Score"}</p>
              <p className="font-black">{quiz?.passing_score ?? 0} / {quiz?.max_score ?? 0}</p>
            </div>
          </div>

          <div className={`mt-8 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-indigo-500 transition-colors"
              onClick={() => router.push(`/student/quizzes/${quizId}/attempt${courseId ? `?course_id=${courseId}` : ""}`)}
            >
              <PlayCircle className="w-4 h-4" />
              {language === "ar" ? "بدء الاختبار" : "Start Quiz"}
            </button>
            <span className="text-xs opacity-60 inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {language === "ar" ? "جاهز للبدء" : "Ready to attempt"}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
