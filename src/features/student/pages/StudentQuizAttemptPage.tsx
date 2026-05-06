"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function StudentQuizAttemptPage() {
  const { language, isRTL } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const quizId = String(params.quizId ?? "");

  return (
    <div className="p-8 md:p-12 min-h-screen bg-(--background) text-(--foreground)">
      <button
        onClick={() => router.push(`/student/quizzes/${quizId}`)}
        className={`mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:hover:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
        {language === "ar" ? "العودة إلى الاختبار" : "Back to Quiz"}
      </button>

      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8">
        <p className="text-xs uppercase tracking-widest opacity-50 mb-2">
          {language === "ar" ? "محاولة الاختبار" : "Quiz Attempt"}
        </p>
        <h1 className="text-3xl font-black tracking-tight mb-3">
          {language === "ar" ? `بدء الاختبار #${quizId}` : `Start Quiz #${quizId}`}
        </h1>
        <p className="opacity-70 mb-6">
          {language === "ar"
            ? "تم فتح صفحة بدء الاختبار. يمكن الآن ربطها بواجهة الأسئلة وتسليم الإجابات."
            : "Quiz start page is now open. You can now wire this to questions/answers endpoints."}
        </p>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-indigo-500 transition-colors">
          <PlayCircle className="w-4 h-4" />
          {language === "ar" ? "ابدأ الآن" : "Start Now"}
        </button>
      </div>
    </div>
  );
}

