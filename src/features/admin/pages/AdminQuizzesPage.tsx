"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, BadgeCheck, BookOpen, Loader2, Plus, RefreshCw, Save, Search, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { getAdminToken } from "@/features/admin/adminSession";

type LocalizedText = { en?: string; ar?: string };

type Quiz = {
  id: number | string;
  quiz_id?: number | string;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  status?: string;
  type?: string;
  quizable_type?: string;
  quizable_id?: number | string;
  instructor_id?: number | string;
  duration_minutes?: number;
};

type Question = {
  id: number | string;
  question_text?: string | LocalizedText;
  type?: string;
  point?: number;
  order_index?: number;
  is_required?: boolean;
};

type QuizFormState = {
  title: string;
  description: string;
  duration_minutes: string;
};

type QuestionFormState = {
  questionText: string;
  point: string;
  orderIndex: string;
  isRequired: boolean;
  isMcq: boolean;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  trueFalseAnswer: boolean;
};

const QUIZZES_API_PATH = "/super-admin/quizzes";
const QUESTIONS_API_PATH = "/super-admin/questions";
const QUESTION_OPTIONS_API_PATH = "/super-admin/question-options";
const QUIZ_INSTRUCTOR_ID = 1;

const initialQuizForm: QuizFormState = {
  title: "",
  description: "",
  duration_minutes: "30",
};

const initialQuestionForm: QuestionFormState = {
  questionText: "",
  point: "5",
  orderIndex: "1",
  isRequired: true,
  isMcq: true,
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  trueFalseAnswer: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getLocalizedValue(value: unknown, locale: "en" | "ar", fallbackLocale: "en" | "ar" = "en") {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  const localized = getStringValue(value[locale]);
  if (localized) return localized;
  return getStringValue(value[fallbackLocale]);
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.data)) return data.data;
  return [];
}

function extractItem(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data) && isRecord(payload.data.data)) return payload.data.data;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const msg = error.response?.data?.message;
  if (typeof msg === "string") return msg;
  if (!error.response) return "Cannot reach server. Please check your connection.";
  return fallback;
}

function getQuizId(quiz: Quiz) {
  return quiz.quiz_id || quiz.id;
}

export default function AdminQuizzesPage() {
  const { language, isRTL } = useLanguage();
  const currentLocale = language as "en" | "ar";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizForm, setQuizForm] = useState<QuizFormState>(initialQuizForm);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(initialQuestionForm);
  const [questionsByQuiz, setQuestionsByQuiz] = useState<Record<string, Question[]>>({});

  const getHeaders = useCallback((locale?: string) => {
    const token = getAdminToken();
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(locale ? { "Accept-Language": locale, "X-Locale": locale } : {}),
    };
  }, []);

  const listQuizzes = useCallback(async () => {
    const res = await axios.get(getAdminApiRequestUrl(QUIZZES_API_PATH), {
      headers: getHeaders(currentLocale),
      params: { quizable_type: "course", type: "quiz", instructor_id: QUIZ_INSTRUCTOR_ID },
    });
    return extractList(res.data) as Quiz[];
  }, [currentLocale, getHeaders]);

  const listQuestions = useCallback(async (quizId: string | number, type?: string) => {
    const res = await axios.get(getAdminApiRequestUrl(QUESTIONS_API_PATH), {
      headers: getHeaders(currentLocale),
      params: { quiz_id: Number(quizId), ...(type ? { type } : {}) },
    });
    return extractList(res.data) as Question[];
  }, [currentLocale, getHeaders]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const rows = await listQuizzes();
      setQuizzes(rows);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to load quizzes."));
    } finally {
      setIsLoading(false);
    }
  }, [listQuizzes]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredQuizzes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return quizzes;
    return quizzes.filter((quiz) => {
      const title = getLocalizedValue(quiz.title, currentLocale).toLowerCase();
      const description = getLocalizedValue(quiz.description, currentLocale).toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  }, [currentLocale, quizzes, searchQuery]);

  const handleCreateQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setListError(null);
    try {
      const payload = {
        title: { en: quizForm.title.trim(), ar: quizForm.title.trim() },
        description: { en: quizForm.description.trim(), ar: quizForm.description.trim() },
        max_score: 100,
        passing_score: 60,
        type: "quiz",
        status: "draft",
        instructor_id: QUIZ_INSTRUCTOR_ID,
        quizable_type: "course",
        quizable_id: 1,
        auto_grade_enabled: true,
        duration_minutes: Number(quizForm.duration_minutes || 30),
      };
      const res = await axios.post(getAdminApiRequestUrl(QUIZZES_API_PATH), payload, {
        headers: getHeaders(currentLocale),
      });
      const createdQuiz = extractItem(res.data) as Quiz | null;
      if (!createdQuiz) throw new Error("empty_quiz_response");

      setQuizzes((prev) => [createdQuiz, ...prev]);
      setSelectedQuiz(createdQuiz);
      setIsQuizModalOpen(false);
      setQuizForm(initialQuizForm);
      setIsQuestionModalOpen(true);
      setSuccessMessage("Quiz created successfully. Now add questions.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to create quiz."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedQuiz) return;

    setIsSubmitting(true);
    setListError(null);
    try {
      const quizId = getQuizId(selectedQuiz);
      const questionPayload = {
        quiz_id: Number(quizId),
        question_text: {
          en: questionForm.questionText.trim(),
          ar: questionForm.questionText.trim(),
        },
        type: questionForm.isMcq ? "multiple_choice" : "true_false",
        point: Number(questionForm.point || 5),
        order_index: Number(questionForm.orderIndex || 1),
        is_required: questionForm.isRequired,
      };

      const questionRes = await axios.post(getAdminApiRequestUrl(QUESTIONS_API_PATH), questionPayload, {
        headers: getHeaders(currentLocale),
      });
      const createdQuestion = extractItem(questionRes.data) as Question | null;
      if (!createdQuestion) throw new Error("empty_question_response");

      const questionId = Number(createdQuestion.id);
      if (questionForm.isMcq) {
        const options = [
          { label: "A", text: questionForm.optionA },
          { label: "B", text: questionForm.optionB },
          { label: "C", text: questionForm.optionC },
          { label: "D", text: questionForm.optionD },
        ].filter((opt) => opt.text.trim().length > 0);

        await Promise.all(
          options.map((opt) =>
            axios.post(
              getAdminApiRequestUrl(QUESTION_OPTIONS_API_PATH),
              {
                question_id: questionId,
                option_text: { en: opt.text.trim(), ar: opt.text.trim() },
                is_correct: questionForm.correctOption === opt.label,
              },
              { headers: getHeaders(currentLocale) },
            ),
          ),
        );
      } else {
        await Promise.all(
          ["True", "False"].map((label) =>
            axios.post(
              getAdminApiRequestUrl(QUESTION_OPTIONS_API_PATH),
              {
                question_id: questionId,
                option_text: { en: label, ar: label === "True" ? "صح" : "خطأ" },
                is_correct: questionForm.trueFalseAnswer === (label === "True"),
              },
              { headers: getHeaders(currentLocale) },
            ),
          ),
        );
      }

      setQuestionsByQuiz((prev) => {
        const key = String(quizId);
        return { ...prev, [key]: [createdQuestion, ...(prev[key] || [])] };
      });
      setQuestionForm((prev) => ({ ...initialQuestionForm, isMcq: prev.isMcq }));
      setSuccessMessage("Question added successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to add question."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openQuestionModal = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsQuestionModalOpen(true);
    try {
      const quizId = getQuizId(quiz);
      const rows = await listQuestions(quizId);
      setQuestionsByQuiz((prev) => ({ ...prev, [String(quizId)]: rows }));
    } catch {
      // Keep modal open even if list fails.
    }
  };

  return (
    <div className={`p-6 md:p-10 min-h-screen bg-slate-50 dark:bg-transparent ${isRTL ? "text-right" : ""}`}>
      <div className="max-w-[1400px] mx-auto">
        <header className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 ${isRTL ? "md:flex-row-reverse" : ""}`}>
          <div>
            <div className={`flex items-center gap-2 text-indigo-500 font-bold uppercase tracking-[0.25em] text-[10px] mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <BookOpen className="w-3 h-3" />
              Quiz Management
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Admin Quizzes</h1>
          </div>
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => void loadData()}
              className="p-4 rounded-2xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsQuizModalOpen(true)}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <Plus className="w-4 h-4" />
              Create Quiz
            </button>
          </div>
        </header>

        <AnimatePresence>
          {successMessage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4" />
              <span className="font-semibold text-sm">{successMessage}</span>
            </motion.div>
          )}
          {listError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-semibold text-sm">{listError}</span>
              </div>
              <button type="button" onClick={() => setListError(null)} className="text-rose-500">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 relative">
          <Search className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-5" : "left-5"}`} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search quizzes..."
            className={`w-full py-5 rounded-3xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 outline-none text-slate-900 dark:text-white font-bold ${isRTL ? "pr-14 pl-5 text-right" : "pl-14 pr-5"}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredQuizzes.map((quiz) => (
            <div key={String(getQuizId(quiz))} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#11182B] p-6">
              <div className={`flex flex-col md:flex-row md:items-start justify-between gap-4 ${isRTL ? "md:flex-row-reverse" : ""}`}>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{getLocalizedValue(quiz.title, currentLocale) || "Untitled quiz"}</h3>
                  <p className="text-sm text-slate-500 dark:text-white/50 mt-1">{getLocalizedValue(quiz.description, currentLocale) || "No description"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void openQuestionModal(quiz)}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300"
                >
                  Add Questions
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isQuizModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuizModalOpen(false)} className="absolute inset-0 bg-slate-950/70" />
            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onSubmit={handleCreateQuiz} className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-white/10 p-8 space-y-5">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Create Quiz</h2>
              <input required value={quizForm.title} onChange={(e) => setQuizForm((p) => ({ ...p, title: e.target.value }))} placeholder="Quiz title" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
              <textarea required rows={4} value={quizForm.description} onChange={(e) => setQuizForm((p) => ({ ...p, description: e.target.value }))} placeholder="Quiz description" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
              <input type="number" min={1} value={quizForm.duration_minutes} onChange={(e) => setQuizForm((p) => ({ ...p, duration_minutes: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsQuizModalOpen(false)} className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold inline-flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Quiz
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQuestionModalOpen && selectedQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuestionModalOpen(false)} className="absolute inset-0 bg-slate-950/70" />
            <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onSubmit={handleAddQuestion} className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-white/10 p-8 space-y-5 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Add Question</h2>
              <p className="text-sm text-slate-500 dark:text-white/50">Quiz: {getLocalizedValue(selectedQuiz.title, currentLocale) || `#${getQuizId(selectedQuiz)}`}</p>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-4">
                <span className="font-bold text-slate-700 dark:text-white/80">MCQ Question</span>
                <input type="checkbox" checked={questionForm.isMcq} onChange={(e) => setQuestionForm((p) => ({ ...p, isMcq: e.target.checked }))} className="w-5 h-5 accent-indigo-600" />
              </label>

              <textarea required rows={3} value={questionForm.questionText} onChange={(e) => setQuestionForm((p) => ({ ...p, questionText: e.target.value }))} placeholder="Question text" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="number" min={1} value={questionForm.point} onChange={(e) => setQuestionForm((p) => ({ ...p, point: e.target.value }))} placeholder="Point" className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                <input type="number" min={1} value={questionForm.orderIndex} onChange={(e) => setQuestionForm((p) => ({ ...p, orderIndex: e.target.value }))} placeholder="Order index" className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
                  <span className="text-sm font-bold">Required</span>
                  <input type="checkbox" checked={questionForm.isRequired} onChange={(e) => setQuestionForm((p) => ({ ...p, isRequired: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                </label>
              </div>

              {questionForm.isMcq ? (
                <div className="space-y-3">
                  <input value={questionForm.optionA} onChange={(e) => setQuestionForm((p) => ({ ...p, optionA: e.target.value }))} placeholder="Option A" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                  <input value={questionForm.optionB} onChange={(e) => setQuestionForm((p) => ({ ...p, optionB: e.target.value }))} placeholder="Option B" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                  <input value={questionForm.optionC} onChange={(e) => setQuestionForm((p) => ({ ...p, optionC: e.target.value }))} placeholder="Option C" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                  <input value={questionForm.optionD} onChange={(e) => setQuestionForm((p) => ({ ...p, optionD: e.target.value }))} placeholder="Option D" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                  <select value={questionForm.correctOption} onChange={(e) => setQuestionForm((p) => ({ ...p, correctOption: e.target.value as "A" | "B" | "C" | "D" }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
                    <option value="A">Correct: A</option>
                    <option value="B">Correct: B</option>
                    <option value="C">Correct: C</option>
                    <option value="D">Correct: D</option>
                  </select>
                </div>
              ) : (
                <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-4">
                  <span className="font-bold text-slate-700 dark:text-white/80">Correct answer is True</span>
                  <input type="checkbox" checked={questionForm.trueFalseAnswer} onChange={(e) => setQuestionForm((p) => ({ ...p, trueFalseAnswer: e.target.checked }))} className="w-5 h-5 accent-indigo-600" />
                </label>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10">Close</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold inline-flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Question
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-white/60 mb-3">
                  Existing Questions
                </h3>
                <div className="space-y-2">
                  {(questionsByQuiz[String(getQuizId(selectedQuiz))] || []).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-white/50">No questions yet.</p>
                  ) : (
                    (questionsByQuiz[String(getQuizId(selectedQuiz))] || []).map((q) => (
                      <div
                        key={String(q.id)}
                        className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                      >
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {getLocalizedValue(q.question_text, currentLocale) || "Untitled question"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                          Type: {q.type || "unknown"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
