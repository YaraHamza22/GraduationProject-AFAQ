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
};

type Question = {
  id: number | string;
  question_text?: string | LocalizedText;
  type?: string;
};

type QuizFormState = {
  title: string;
  description: string;
  duration_minutes: string;
  course_id: string;
};

type McqOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuestionFormState = {
  questionText: string;
  point: string;
  orderIndex: string;
  isRequired: boolean;
  isMcq: boolean;
  trueFalseAnswer: boolean;
  mcqOptions: McqOption[];
};

const QUIZZES_API_PATH = "/super-admin/quizzes";
const QUESTIONS_API_PATH = "/super-admin/questions";
const QUESTION_OPTIONS_API_PATH = "/super-admin/question-options";
const QUIZ_INSTRUCTOR_ID = 1;

const initialQuizForm: QuizFormState = {
  title: "",
  description: "",
  duration_minutes: "30",
  course_id: "",
};

const getInitialOptions = (): McqOption[] => [
  { id: crypto.randomUUID(), text: "", isCorrect: true },
  { id: crypto.randomUUID(), text: "", isCorrect: false },
];

const initialQuestionForm: QuestionFormState = {
  questionText: "",
  point: "5",
  orderIndex: "1",
  isRequired: true,
  isMcq: true,
  trueFalseAnswer: true,
  mcqOptions: getInitialOptions(),
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

function isSuccessfulStatus(status: number) {
  return status >= 200 && status < 300;
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

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [quizForm, setQuizForm] = useState<QuizFormState>(initialQuizForm);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(initialQuestionForm);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
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

  const openWizard = () => {
    setWizardStep(1);
    setSelectedQuiz(null);
    setQuizForm(initialQuizForm);
    setQuestionForm({ ...initialQuestionForm, mcqOptions: getInitialOptions() });
    setIsWizardOpen(true);
  };

  const handleStep1CreateQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setListError(null);
    try {
      const resolvedCourseId = Number(quizForm.course_id);
      if (!Number.isFinite(resolvedCourseId) || resolvedCourseId <= 0) {
        throw new Error("Please enter a valid course id.");
      }

      const payload = {
        title: { en: quizForm.title.trim(), ar: quizForm.title.trim() },
        description: { en: quizForm.description.trim(), ar: quizForm.description.trim() },
        max_score: 100,
        passing_score: 60,
        type: "quiz",
        status: "draft",
        instructor_id: QUIZ_INSTRUCTOR_ID,
        course_id: resolvedCourseId,
        courseId: resolvedCourseId,
        quizable_type: "course",
        quizable_id: resolvedCourseId,
        auto_grade_enabled: true,
        duration_minutes: Number(quizForm.duration_minutes || 30),
      };

      const res = await axios.post(getAdminApiRequestUrl(QUIZZES_API_PATH), payload, {
        headers: getHeaders(currentLocale),
      });

      if (!isSuccessfulStatus(res.status)) {
        throw new Error(`Quiz creation failed with status ${res.status}.`);
      }

      const createdQuiz = extractItem(res.data) as Quiz | null;
      if (!createdQuiz) throw new Error("empty_quiz_response");

      setQuizzes((prev) => [createdQuiz, ...prev]);
      setSelectedQuiz(createdQuiz);
      setWizardStep(2);
      setSuccessMessage("Step 1 complete: Quiz created.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (error) {
      if (error instanceof Error && error.message === "Please enter a valid course id.") {
        setListError(error.message);
      } else {
        setListError(getErrorMessage(error, "Failed to create quiz."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMcqOption = () => {
    setQuestionForm((prev) => ({
      ...prev,
      mcqOptions: [...prev.mcqOptions, { id: crypto.randomUUID(), text: "", isCorrect: false }],
    }));
  };

  const removeMcqOption = (id: string) => {
    setQuestionForm((prev) => {
      const next = prev.mcqOptions.filter((opt) => opt.id !== id);
      if (!next.some((opt) => opt.isCorrect) && next.length) {
        next[0] = { ...next[0], isCorrect: true };
      }
      return { ...prev, mcqOptions: next };
    });
  };

  const setCorrectMcqOption = (id: string) => {
    setQuestionForm((prev) => ({
      ...prev,
      mcqOptions: prev.mcqOptions.map((opt) => ({ ...opt, isCorrect: opt.id === id })),
    }));
  };

  const updateMcqOptionText = (id: string, text: string) => {
    setQuestionForm((prev) => ({
      ...prev,
      mcqOptions: prev.mcqOptions.map((opt) => (opt.id === id ? { ...opt, text } : opt)),
    }));
  };

  const handleStep2AddQuestion = async (event: React.FormEvent) => {
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

      if (!isSuccessfulStatus(questionRes.status)) {
        throw new Error(`Question creation failed with status ${questionRes.status}.`);
      }

      const createdQuestion = extractItem(questionRes.data) as Question | null;
      if (!createdQuestion) throw new Error("empty_question_response");

      const questionId = Number(createdQuestion.id);

      if (questionForm.isMcq) {
        const validOptions = questionForm.mcqOptions.filter((opt) => opt.text.trim());
        if (validOptions.length < 2) {
          throw new Error("Add at least 2 MCQ options.");
        }
        if (!validOptions.some((opt) => opt.isCorrect)) {
          throw new Error("Select one correct MCQ option.");
        }

        for (const opt of validOptions) {
          const optionRes = await axios.post(
            getAdminApiRequestUrl(QUESTION_OPTIONS_API_PATH),
            {
              question_id: questionId,
              option_text: { en: opt.text.trim(), ar: opt.text.trim() },
              is_correct: opt.isCorrect,
            },
            { headers: getHeaders(currentLocale) },
          );

          if (!isSuccessfulStatus(optionRes.status)) {
            throw new Error(`Question option creation failed with status ${optionRes.status}.`);
          }
        }
      } else {
        const trueRes = await axios.post(
          getAdminApiRequestUrl(QUESTION_OPTIONS_API_PATH),
          {
            question_id: questionId,
            option_text: { en: "True", ar: "??" },
            is_correct: questionForm.trueFalseAnswer,
          },
          { headers: getHeaders(currentLocale) },
        );
        if (!isSuccessfulStatus(trueRes.status)) throw new Error(`True option creation failed with status ${trueRes.status}.`);

        const falseRes = await axios.post(
          getAdminApiRequestUrl(QUESTION_OPTIONS_API_PATH),
          {
            question_id: questionId,
            option_text: { en: "False", ar: "???" },
            is_correct: !questionForm.trueFalseAnswer,
          },
          { headers: getHeaders(currentLocale) },
        );
        if (!isSuccessfulStatus(falseRes.status)) throw new Error(`False option creation failed with status ${falseRes.status}.`);
      }

      setQuestionsByQuiz((prev) => {
        const key = String(quizId);
        return { ...prev, [key]: [createdQuestion, ...(prev[key] || [])] };
      });

      setQuestionForm((prev) => ({
        ...initialQuestionForm,
        isMcq: prev.isMcq,
        mcqOptions: getInitialOptions(),
      }));

      setSuccessMessage("Step 2 complete: Question and options created.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to add question/options."));
    } finally {
      setIsSubmitting(false);
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
            <button type="button" onClick={() => void loadData()} className="p-4 rounded-2xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10">
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={openWizard} className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
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
              <button type="button" onClick={() => setListError(null)} className="text-rose-500"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 relative">
          <Search className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-5" : "left-5"}`} />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search quizzes..." className={`w-full py-5 rounded-3xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 outline-none text-slate-900 dark:text-white font-bold ${isRTL ? "pr-14 pl-5 text-right" : "pl-14 pr-5"}`} />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredQuizzes.map((quiz) => (
            <div key={String(getQuizId(quiz))} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#11182B] p-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{getLocalizedValue(quiz.title, currentLocale) || "Untitled quiz"}</h3>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">{getLocalizedValue(quiz.description, currentLocale) || "No description"}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsWizardOpen(false)} className="absolute inset-0 bg-slate-950/70" />

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-white/10 p-8 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Create Quiz Wizard</h2>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">Step {wizardStep} / 2</div>
              </div>

              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: wizardStep === 1 ? "50%" : "100%" }} />
              </div>

              {wizardStep === 1 ? (
                <form onSubmit={handleStep1CreateQuiz} className="space-y-4">
                  <p className="text-sm text-slate-500 dark:text-white/50">Step 1: POST /super-admin/quizzes</p>
                  <input
                    required
                    type="number"
                    min={1}
                    value={quizForm.course_id}
                    onChange={(e) => setQuizForm((p) => ({ ...p, course_id: e.target.value }))}
                    placeholder="Course ID (e.g. 2)"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                  />
                  <input required value={quizForm.title} onChange={(e) => setQuizForm((p) => ({ ...p, title: e.target.value }))} placeholder="Quiz title" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                  <textarea required rows={4} value={quizForm.description} onChange={(e) => setQuizForm((p) => ({ ...p, description: e.target.value }))} placeholder="Quiz description" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                  <input type="number" min={1} value={quizForm.duration_minutes} onChange={(e) => setQuizForm((p) => ({ ...p, duration_minutes: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsWizardOpen(false)} className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold inline-flex items-center gap-2">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Create Quiz (Step 1)
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleStep2AddQuestion} className="space-y-4">
                  <p className="text-sm text-slate-500 dark:text-white/50">Step 2: POST /super-admin/questions then /super-admin/question-options</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-white/80">Quiz: {selectedQuiz ? getLocalizedValue(selectedQuiz.title, currentLocale) : "-"}</p>

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
                      {questionForm.mcqOptions.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input value={opt.text} onChange={(e) => updateMcqOptionText(opt.id, e.target.value)} placeholder={`Option ${idx + 1}`} className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                          <button type="button" onClick={() => setCorrectMcqOption(opt.id)} className={`px-3 py-2 rounded-lg text-xs font-bold ${opt.isCorrect ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-white/10"}`}>
                            Correct
                          </button>
                          <button type="button" onClick={() => removeMcqOption(opt.id)} className="px-3 py-2 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">-</button>
                        </div>
                      ))}
                      <button type="button" onClick={addMcqOption} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                        <Plus className="w-4 h-4" /> Add Option
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-4">
                      <span className="font-bold text-slate-700 dark:text-white/80">Correct answer is True</span>
                      <input type="checkbox" checked={questionForm.trueFalseAnswer} onChange={(e) => setQuestionForm((p) => ({ ...p, trueFalseAnswer: e.target.checked }))} className="w-5 h-5 accent-indigo-600" />
                    </label>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setWizardStep(1)} className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10">Back</button>
                    <button type="submit" disabled={isSubmitting} className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold inline-flex items-center gap-2">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save Question + Options
                    </button>
                  </div>
                </form>
              )}

              {selectedQuiz && (
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-white/60 mb-3">Existing Questions</h3>
                  <div className="space-y-2">
                    {(questionsByQuiz[String(getQuizId(selectedQuiz))] || []).length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-white/50">No questions yet.</p>
                    ) : (
                      (questionsByQuiz[String(getQuizId(selectedQuiz))] || []).map((q) => (
                        <div key={String(q.id)} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{getLocalizedValue(q.question_text, currentLocale) || "Untitled question"}</p>
                          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Type: {q.type || "unknown"}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
