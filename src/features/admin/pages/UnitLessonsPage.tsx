"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Clock,
  Edit3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Upload,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { getAdminToken } from "@/features/admin/adminSession";

type LocalizedText = {
  en?: string;
  ar?: string;
};

type Lesson = {
  id: number | string;
  lesson_id?: number | string;
  unit_id?: number | string;
  unitId?: number | string;
  title: string | LocalizedText;
  description?: string | LocalizedText;
  lesson_type?: string;
  is_required?: number | boolean;
  actual_duration_minutes?: number;
  lesson_order?: number;
};

type Quiz = {
  id: number | string;
  quiz_id?: number | string;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  max_score?: number;
  passing_score?: number;
  type?: string;
  status?: string;
  instructor_id?: number | string;
  quizable_type?: string;
  quizable_id?: number | string;
  auto_grade_enabled?: boolean;
  duration_minutes?: number;
};

type Question = {
  id: number | string;
  quiz_id?: number | string;
  question_text?: string | LocalizedText;
  type?: string;
  point?: number;
  order_index?: number;
  is_required?: boolean;
  options?: QuestionOption[];
};

type QuestionOption = {
  id: number | string;
  question_id?: number | string;
  option_text?: string | LocalizedText;
  is_correct?: boolean;
};

type McqOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuestionFormState = {
  questionTextEn: string;
  questionTextAr: string;
  point: string;
  orderIndex: string;
  isRequired: boolean;
  questionType: "text" | "mcq" | "true_false";
  trueOptionTextEn: string;
  trueOptionTextAr: string;
  falseOptionTextEn: string;
  falseOptionTextAr: string;
  trueFalseCorrect: "true" | "false";
  mcqOptions: McqOption[];
};

type FormState = {
  title: string;
  description: string;
  lesson_type: string;
  is_required: boolean;
  actual_duration_minutes: string;
  lesson_order: string;
};

type QuizCreateFormState = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  maxScore: string;
  passingScore: string;
  status: "draft" | "published";
  quizableType: "course";
  autoGradeEnabled: boolean;
  durationMinutes: string;
};

const LESSONS_API_PATH = "/super-admin/lessons";
const UNITS_API_PATH = "/super-admin/units";
const COURSES_API_PATH = "/super-admin/courses";
const QUIZZES_API_PATH = "/super-admin/quizzes";
const QUESTIONS_API_PATH = "/super-admin/questions";
const QUESTION_OPTIONS_API_PATH = "/super-admin/question-options";
const QUIZ_INSTRUCTOR_ID = 1;

const initialForm: FormState = {
  title: "",
  description: "",
  lesson_type: "video",
  is_required: true,
  actual_duration_minutes: "30",
  lesson_order: "",
};

const initialQuizCreateForm: QuizCreateFormState = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  maxScore: "",
  passingScore: "",
  status: "draft",
  quizableType: "course",
  autoGradeEnabled: true,
  durationMinutes: "",
};

const getInitialOptions = (): McqOption[] => [
  { id: crypto.randomUUID(), text: "", isCorrect: true },
  { id: crypto.randomUUID(), text: "", isCorrect: false },
];

const initialQuestionForm: QuestionFormState = {
  questionTextEn: "",
  questionTextAr: "",
  point: "5",
  orderIndex: "1",
  isRequired: true,
  questionType: "text",
  trueOptionTextEn: "True",
  trueOptionTextAr: "صح",
  falseOptionTextEn: "False",
  falseOptionTextAr: "خطأ",
  trueFalseCorrect: "true",
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
  // Fallback for some API structures that might return the list directly in payload
  const values = Object.values(payload).find(val => Array.isArray(val));
  if (Array.isArray(values)) return values;
  
  return [];
}

function extractItem(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data) && isRecord(payload.data.data)) return payload.data.data;
  if (isRecord(payload.data)) return payload.data;
  if (isRecord(payload)) return payload;
  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return "Cannot reach server. Please check your connection.";
  
  const data = error.response.data;
  if (data?.errors) {
    const firstErrorKey = Object.keys(data.errors)[0];
    const firstError = data.errors[firstErrorKey];
    if (Array.isArray(firstError) && firstError.length > 0) return firstError[0];
    if (typeof firstError === "string") return firstError;
  }
  
  const msg = data?.message;
  return typeof msg === "string" ? msg : fallback;
}

function normalizeRequired(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
}

function getLessonId(lesson: Lesson) {
  return lesson.lesson_id || lesson.id;
}

function getLessonUnitId(lesson: Lesson) {
  return lesson.unit_id || lesson.unitId;
}

function getQuizId(quiz: Quiz) {
  return quiz.quiz_id || quiz.id;
}

function getLessonQuizStorageKey(courseId: string, unitId: string) {
  return `lesson-quiz-map:${courseId}:${unitId}`;
}

export default function UnitLessonsPage() {
  const params = useParams();
  const router = useRouter();
  const { isRTL, language } = useLanguage();
  const currentLocale = language as "en" | "ar";

  const courseId = String(params.id || "");
  const unitId = String(params.unitId || "");

  const [courseTitle, setCourseTitle] = useState("");
  const [unitTitle, setUnitTitle] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLesson, setIsFetchingLesson] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [lessonQuizMap, setLessonQuizMap] = useState<Record<string, Quiz[]>>({});
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState(false);
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState<Lesson | null>(null);
  const [selectedQuizForLesson, setSelectedQuizForLesson] = useState<Quiz | null>(null);
  const [quizModalMode, setQuizModalMode] = useState<"create" | "update">("create");
  const [quizWizardStep, setQuizWizardStep] = useState<1 | 2>(1);
  const [activeQuizForQuestion, setActiveQuizForQuestion] = useState<Quiz | null>(null);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [selectedQuizForView, setSelectedQuizForView] = useState<Quiz | null>(null);
  const [questionsForSelectedQuiz, setQuestionsForSelectedQuiz] = useState<Question[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, QuestionOption[]>>({});
  const [questionsByQuiz, setQuestionsByQuiz] = useState<Record<string, Question[]>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [selectedQuestionForEdit, setSelectedQuestionForEdit] = useState<Question | null>(null);
  const [lessonQuizOverrides, setLessonQuizOverrides] = useState<Record<string, string>>({});
  const [quizCreateForm, setQuizCreateForm] = useState<QuizCreateFormState>(() => ({
    ...initialQuizCreateForm,
  }));
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(initialQuestionForm);

  const uiText = {
    quizQuestions: currentLocale === "ar" ? "أسئلة الاختبار" : "Quiz Questions",
    loadingQuestions: currentLocale === "ar" ? "جار تحميل الأسئلة..." : "Loading questions...",
    noQuestions: currentLocale === "ar" ? "لا توجد أسئلة لهذا الاختبار." : "No questions found for this quiz.",
    correct: currentLocale === "ar" ? "صحيح" : "Correct",
    answers: currentLocale === "ar" ? "الإجابات" : "Answers",
    shortAnswer: currentLocale === "ar" ? "إجابة قصيرة" : "Short Answer",
    noFixedAnswer: currentLocale === "ar" ? "لا يوجد جواب نموذجي ثابت" : "No fixed correct option",
  };

  const getHeaders = useCallback((locale?: string) => {
    const token = getAdminToken();
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(locale ? { "Accept-Language": locale, "X-Locale": locale } : {}),
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(getLessonQuizStorageKey(courseId, unitId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (isRecord(parsed)) {
        const normalized: Record<string, string> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === "string" || typeof v === "number") {
            normalized[String(k)] = String(v);
          }
        });
        setLessonQuizOverrides(normalized);
      }
    } catch {
      // ignore malformed local storage
    }
  }, [courseId, unitId]);

  const saveLessonQuizOverride = useCallback((lessonId: string | number, quizId: string | number) => {
    const next = {
      ...lessonQuizOverrides,
      [String(lessonId)]: String(quizId),
    };
    setLessonQuizOverrides(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getLessonQuizStorageKey(courseId, unitId), JSON.stringify(next));
    }
  }, [courseId, lessonQuizOverrides, unitId]);

  const loadLessons = useCallback(async () => {
    try {
      const lessonsRes = await axios.get(getAdminApiRequestUrl(`${LESSONS_API_PATH}/unit/${unitId}`), {
        headers: getHeaders(currentLocale),
      });
      const byUnit = extractList(lessonsRes.data);
      if (Array.isArray(byUnit) && byUnit.length) {
        setLessons(byUnit as Lesson[]);
        return;
      }
    } catch {
      // Continue into fallback call below.
    }

    const allLessonsRes = await axios.get(getAdminApiRequestUrl(LESSONS_API_PATH), {
      headers: getHeaders(currentLocale),
      params: { locale: currentLocale },
    });
    const allLessons = extractList(allLessonsRes.data);
    const filtered = allLessons.filter((item) => {
      if (!isRecord(item)) return false;
      const lUnitId = item.unit_id ?? item.unitId;
      return String(lUnitId ?? "") === String(unitId);
    });
    setLessons(filtered as Lesson[]);
  }, [currentLocale, getHeaders, unitId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const [courseRes, unitRes] = await Promise.all([
        axios.get(getAdminApiRequestUrl(`${COURSES_API_PATH}/${courseId}`), { headers: getHeaders(currentLocale) }),
        axios.get(getAdminApiRequestUrl(`${UNITS_API_PATH}/${unitId}`), { headers: getHeaders(currentLocale) }),
      ]);

      const courseItem = extractItem(courseRes.data);
      const unitItem = extractItem(unitRes.data);

      setCourseTitle(getLocalizedValue(courseItem?.title, currentLocale) || `Course #${courseId}`);
      setUnitTitle(getLocalizedValue(unitItem?.title, currentLocale) || `Unit #${unitId}`);

      await loadLessons();
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to load lessons for this unit."));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, currentLocale, getHeaders, loadLessons, unitId]);

  const createQuiz = useCallback(async (payloadOverrides?: Record<string, unknown>) => {
    const payload = {
      title: {
        en: form.title.trim(),
        ar: form.title.trim(),
      },
      description: {
        en: form.description.trim(),
        ar: form.description.trim(),
      },
      max_score: 100,
      passing_score: 60,
      type: "quiz",
      status: "published",
      instructor_id: QUIZ_INSTRUCTOR_ID,
      quizable_type: "course",
      quizable_id: Number(courseId),
      auto_grade_enabled: true,
      duration_minutes: Number(form.actual_duration_minutes || 30),
      ...(payloadOverrides || {}),
    };

    const res = await axios.post(getAdminApiRequestUrl(QUIZZES_API_PATH), payload, {
      headers: getHeaders(currentLocale),
    });
    if (res.status !== 200) {
      throw new Error("Quiz creation did not return 200.");
    }
    return extractItem(res.data) as Quiz | null;
  }, [courseId, currentLocale, form.actual_duration_minutes, form.description, form.title, getHeaders]);

  const updateQuiz = useCallback(async (quizId: string | number) => {
    const payload = {
      title: {
        en: form.title.trim(),
        ar: form.title.trim(),
      },
      description: {
        en: form.description.trim(),
        ar: form.description.trim(),
      },
      max_score: 100,
      passing_score: 60,
      type: "quiz",
      status: "draft",
      instructor_id: QUIZ_INSTRUCTOR_ID,
      quizable_type: "course",
      quizable_id: Number(courseId),
      auto_grade_enabled: true,
      duration_minutes: Number(form.actual_duration_minutes || 30),
    };

    const res = await axios.put(getAdminApiRequestUrl(`${QUIZZES_API_PATH}/${quizId}`), payload, {
      headers: getHeaders(currentLocale),
    });
    return extractItem(res.data) as Quiz | null;
  }, [courseId, currentLocale, form.actual_duration_minutes, form.description, form.title, getHeaders]);

  const getQuizById = useCallback(async (quizId: string | number) => {
    const res = await axios.get(getAdminApiRequestUrl(`${QUIZZES_API_PATH}/${quizId}`), {
      headers: getHeaders(currentLocale),
    });
    return extractItem(res.data) as Quiz | null;
  }, [currentLocale, getHeaders]);

  const getAllQuizzes = useCallback(async () => {
    const res = await axios.get(getAdminApiRequestUrl(QUIZZES_API_PATH), {
      headers: getHeaders(currentLocale),
    });
    return extractList(res.data) as Quiz[];
  }, [currentLocale, getHeaders]);

  const deleteQuiz = useCallback(async (quiz_id: string | number) => {
    await axios.delete(getAdminApiRequestUrl(`${QUIZZES_API_PATH}/${quiz_id}`), {
      headers: getHeaders(currentLocale),
    });
  }, [currentLocale, getHeaders]);

  const listQuizzes = useCallback(async () => {
    const res = await axios.get(getAdminApiRequestUrl(QUIZZES_API_PATH), {
      headers: getHeaders(currentLocale),
      params: {
        quizable_type: "course",
        type: "quiz",
        instructor_id: QUIZ_INSTRUCTOR_ID,
      },
    });
    return extractList(res.data) as Quiz[];
  }, [currentLocale, getHeaders]);

  useEffect(() => {
    if (courseId && unitId) void loadData();
  }, [courseId, loadData, unitId]);

  useEffect(() => {
    const loadQuizLinks = async () => {
      try {
        const [filteredQuizzes, allQuizzes] = await Promise.all([listQuizzes(), getAllQuizzes()]);
        const merged = [...filteredQuizzes, ...allQuizzes];
        const nextMap: Record<string, Quiz[]> = {};
        merged.forEach((quiz) => {
          const raw = quiz as Record<string, unknown>;
          const key = raw.lesson_id ? String(raw.lesson_id) : "unlinked";
          if (!nextMap[key]) nextMap[key] = [];
          if (!nextMap[key].some((item) => String(getQuizId(item)) === String(getQuizId(quiz)))) {
            nextMap[key].push(quiz);
          }
        });

        Object.entries(lessonQuizOverrides).forEach(([lessonId, quizId]) => {
          const matched = merged.find((q) => String(getQuizId(q)) === String(quizId));
          if (!matched) return;
          if (!nextMap[lessonId]) nextMap[lessonId] = [];
          if (!nextMap[lessonId].some((q) => String(getQuizId(q)) === String(getQuizId(matched)))) {
            nextMap[lessonId].push(matched);
          }
        });

        setLessonQuizMap(nextMap);
      } catch {
        // Quiz linking is optional for rendering lessons.
      }
    };

    if (courseId && unitId) {
      void loadQuizLinks();
    }
  }, [courseId, getAllQuizzes, lessonQuizOverrides, listQuizzes, unitId]);

  const filteredLessons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return lessons;
    return lessons.filter((lesson) => {
      const title = getLocalizedValue(lesson.title, currentLocale).toLowerCase();
      const description = getLocalizedValue(lesson.description, currentLocale).toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  }, [currentLocale, lessons, searchQuery]);

  const resetForm = () => {
    setForm(initialForm);
    setVideoFile(null);
    setAttachments([]);
    setEditingLesson(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
    setIsModalOpen(true);
  };

  const openEditModal = async (lesson: Lesson) => {
    setModalMode("edit");
    setIsModalOpen(true);
    setIsFetchingLesson(true);
    try {
      const lessonId = getLessonId(lesson);
      const res = await axios.get(getAdminApiRequestUrl(`${LESSONS_API_PATH}/${lessonId}`), { headers: getHeaders(currentLocale) });
      const item = extractItem(res.data);
      const merged: Lesson = {
        ...lesson,
        ...(item as Lesson),
      };
      setEditingLesson(merged);
      setForm({
        title: getLocalizedValue(merged.title, currentLocale),
        description: getLocalizedValue(merged.description, currentLocale),
        lesson_type: merged.lesson_type || "video",
        is_required: normalizeRequired(merged.is_required),
        actual_duration_minutes: String(merged.actual_duration_minutes ?? 30),
        lesson_order: merged.lesson_order ? String(merged.lesson_order) : "",
      });
    } catch {
      setEditingLesson(lesson);
      setForm({
        title: getLocalizedValue(lesson.title, currentLocale),
        description: getLocalizedValue(lesson.description, currentLocale),
        lesson_type: lesson.lesson_type || "video",
        is_required: normalizeRequired(lesson.is_required),
        actual_duration_minutes: String(lesson.actual_duration_minutes ?? 30),
        lesson_order: lesson.lesson_order ? String(lesson.lesson_order) : "",
      });
    } finally {
      setIsFetchingLesson(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setListError(null);

    try {
      const payload = {
        unit_id: Number(unitId),
        title: form.title.trim(),
        description: form.description.trim(),
        lesson_type: form.lesson_type,
        is_required: form.is_required ? 1 : 0,
        actual_duration_minutes: Number(form.actual_duration_minutes),
        ...(form.lesson_order.trim() ? { lesson_order: Number(form.lesson_order) } : {}),
      };

      if (modalMode === "create") {
        if (videoFile || attachments.length > 0) {
          const formData = new FormData();
          formData.append("unit_id", String(payload.unit_id));
          formData.append("title", payload.title);
          formData.append("description", payload.description);
          formData.append("lesson_type", payload.lesson_type);
          formData.append("is_required", String(payload.is_required));
          formData.append("actual_duration_minutes", String(payload.actual_duration_minutes));
          if (payload.lesson_order !== undefined) {
            formData.append("lesson_order", String(payload.lesson_order));
          }
          if (videoFile) {
            formData.append("video", videoFile);
          }
          attachments.forEach((file) => formData.append("attachments[]", file));

          await axios.post(getAdminApiRequestUrl(LESSONS_API_PATH), formData, {
            headers: {
              ...getHeaders(currentLocale),
              "Content-Type": "multipart/form-data",
            },
          });
        } else {
          await axios.post(getAdminApiRequestUrl(LESSONS_API_PATH), payload, { headers: getHeaders(currentLocale) });
        }
        setSuccessMessage("Lesson created successfully.");
        if (form.lesson_type === "quiz") {
          const createdQuiz = await createQuiz();
          if (createdQuiz) {
            const createdQuizId = getQuizId(createdQuiz);
            const freshQuiz = await getQuizById(createdQuizId);
            const lessonKey = "unlinked";
            setLessonQuizMap((prev) => ({
              ...prev,
              [lessonKey]: [...(prev[lessonKey] || []), freshQuiz || createdQuiz],
            }));
          }
        }
      } else if (editingLesson) {
        await axios.put(getAdminApiRequestUrl(`${LESSONS_API_PATH}/${getLessonId(editingLesson)}`), payload, {
          headers: getHeaders(currentLocale),
        });
        setSuccessMessage("Lesson updated successfully.");
        if (form.lesson_type === "quiz") {
          const lessonKey = String(getLessonId(editingLesson));
          const existing = lessonQuizMap[lessonKey]?.[0];
          if (existing) {
            await updateQuiz(getQuizId(existing));
          } else {
            const createdQuiz = await createQuiz();
            if (createdQuiz) {
              setLessonQuizMap((prev) => ({
                ...prev,
                [lessonKey]: [...(prev[lessonKey] || []), createdQuiz],
              }));
            }
          }
        }
      }

      setIsModalOpen(false);
      resetForm();
      await loadLessons();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to save lesson."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (lesson: Lesson) => {
    try {
      const lessonKey = String(getLessonId(lesson));
      const lessonQuizzes = lessonQuizMap[lessonKey] || [];
      const linkedQuiz = lessonQuizzes[lessonQuizzes.length - 1] || lessonQuizMap.unlinked?.[0];
      if (!linkedQuiz) {
        setListError("No linked quiz found for this lesson.");
        return;
      }
      await deleteQuiz(getQuizId(linkedQuiz));
      setLessonQuizMap((prev) => ({
        ...prev,
        [lessonKey]: (prev[lessonKey] || []).filter((quiz) => String(getQuizId(quiz)) !== String(getQuizId(linkedQuiz))),
      }));
      setSuccessMessage("Quiz deleted successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to delete quiz."));
    }
  };

  const handleCreateQuizForLesson = (lesson: Lesson) => {
    const lessonId = getLessonId(lesson);
    const lessonKey = String(lessonId);
    const existingQuiz = (lessonQuizMap[lessonKey] || [])[0] || null;
    setSelectedLessonForQuiz(lesson);
    setSelectedQuizForLesson(existingQuiz);

    if (existingQuiz) {
      const quizTitleEn = getLocalizedValue((existingQuiz as Record<string, unknown>).title, "en");
      const quizTitleAr = getLocalizedValue((existingQuiz as Record<string, unknown>).title, "ar");
      const quizDescriptionEn = getLocalizedValue((existingQuiz as Record<string, unknown>).description, "en");
      const quizDescriptionAr = getLocalizedValue((existingQuiz as Record<string, unknown>).description, "ar");
      setQuizModalMode("update");
      setQuizCreateForm({
        titleEn: quizTitleEn,
        titleAr: quizTitleAr,
        descriptionEn: quizDescriptionEn,
        descriptionAr: quizDescriptionAr,
        maxScore: String(existingQuiz.max_score ?? 100),
        passingScore: String(existingQuiz.passing_score ?? 60),
        status: existingQuiz.status === "draft" ? "draft" : "published",
        quizableType: "course",
        autoGradeEnabled: Boolean(existingQuiz.auto_grade_enabled ?? true),
        durationMinutes: String(existingQuiz.duration_minutes ?? lesson.actual_duration_minutes ?? 30),
      });
      setActiveQuizForQuestion(existingQuiz);
    } else {
      setQuizModalMode("create");
      setQuizCreateForm({
        ...initialQuizCreateForm,
        titleEn: "",
        titleAr: "",
        descriptionEn: "",
        descriptionAr: "",
        maxScore: "",
        passingScore: "",
        durationMinutes: "",
      });
      setActiveQuizForQuestion(null);
    }
    setQuestionForm({ ...initialQuestionForm, mcqOptions: getInitialOptions() });
    setQuizWizardStep(1);
    setIsCreateQuizModalOpen(true);
  };

  const handleConfirmCreateQuizForLesson = async () => {
    if (!selectedLessonForQuiz) return;
    try {
      const lessonId = getLessonId(selectedLessonForQuiz);
      let activeQuiz: Quiz | null = null;
      const fallbackTitle = getLocalizedValue(selectedLessonForQuiz.title, currentLocale) || `Lesson ${lessonId}`;
      const payload = {
        title: {
          en: quizCreateForm.titleEn.trim() || fallbackTitle,
          ar: quizCreateForm.titleAr.trim() || quizCreateForm.titleEn.trim() || fallbackTitle,
        },
        description: {
          en: quizCreateForm.descriptionEn.trim() || fallbackTitle,
          ar: quizCreateForm.descriptionAr.trim() || quizCreateForm.descriptionEn.trim() || fallbackTitle,
        },
        max_score: Number(quizCreateForm.maxScore || 100),
        passing_score: Number(quizCreateForm.passingScore || 60),
        type: "quiz",
        status: quizCreateForm.status,
        instructor_id: QUIZ_INSTRUCTOR_ID,
        quizable_type: quizCreateForm.quizableType,
        quizable_id: Number(courseId),
        auto_grade_enabled: quizCreateForm.autoGradeEnabled,
        duration_minutes: Number(quizCreateForm.durationMinutes || 30),
      };

      if (quizModalMode === "update" && selectedQuizForLesson) {
        const updatedRes = await axios.put(
          getAdminApiRequestUrl(`${QUIZZES_API_PATH}/${getQuizId(selectedQuizForLesson)}`),
          payload,
          { headers: getHeaders(currentLocale) }
        );
        if (updatedRes.status !== 200) {
          throw new Error("Quiz update did not return 200.");
        }
        const updatedQuiz = (extractItem(updatedRes.data) as Quiz | null) || selectedQuizForLesson;
        const lessonKey = String(lessonId);
        setLessonQuizMap((prev) => ({
          ...prev,
          [lessonKey]: [updatedQuiz, ...(prev[lessonKey] || []).filter((q) => String(getQuizId(q)) !== String(getQuizId(selectedQuizForLesson)))],
        }));
        saveLessonQuizOverride(lessonId, getQuizId(updatedQuiz));
        activeQuiz = updatedQuiz;
        setActiveQuizForQuestion(updatedQuiz);
        setSuccessMessage("Quiz updated for this lesson.");
      } else {
        const createdQuiz = await createQuiz(payload);

        if (!createdQuiz) {
          setListError("Quiz was not created. Empty response from server.");
          return;
        }

        const lessonKey = String(lessonId);
        setLessonQuizMap((prev) => ({
          ...prev,
          [lessonKey]: [...(prev[lessonKey] || []), createdQuiz],
        }));
        saveLessonQuizOverride(lessonId, getQuizId(createdQuiz));
        activeQuiz = createdQuiz;
        setActiveQuizForQuestion(createdQuiz);
        setSuccessMessage("Quiz created for this lesson.");
      }
      
      let nextIdx = 1;
      const qid = getQuizId(activeQuiz);
      if (qid) {
        try {
          const questionsRes = await axios.get(getAdminApiRequestUrl(QUESTIONS_API_PATH), {
            headers: getHeaders(currentLocale),
            params: { quiz_id: qid },
          });
          const existingQuestions = extractList(questionsRes.data) as Question[];
          setQuestionsByQuiz(prev => ({ ...prev, [String(qid)]: existingQuestions }));
          
          if (existingQuestions.length > 0) {
            const maxOrder = existingQuestions.reduce((max, q) => Math.max(max, Number(q.order_index || 0)), 0);
            nextIdx = maxOrder + 1;
          }
        } catch (err) {
          console.error("Failed to fetch existing questions for order sync", err);
        }
      }

      setQuestionForm(prev => ({ ...prev, orderIndex: String(nextIdx) }));
      setQuizWizardStep(2);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to create quiz for this lesson."));
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
      if (!next.some((opt) => opt.isCorrect) && next.length > 0) {
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

  const handleAddQuestionToQuiz = async () => {
    if (!activeQuizForQuestion) return;
    setIsSubmitting(true);
    try {
      const quizId = Number(getQuizId(activeQuizForQuestion));
      const isEditing = !!selectedQuestionForEdit;
      
      const typeMapping: Record<string, string> = {
        text: "short_answer",
        mcq: "multiple_choice",
        true_false: "multiple_choice", // Bypasses backend limitation: "Options are allowed only for MCQ"
      };
      
      const mappedType = typeMapping[questionForm.questionType] || questionForm.questionType;

      const questionPayload = {
        quiz_id: quizId,
        question_text: {
          en: questionForm.questionTextEn.trim() || "Question",
          ar: questionForm.questionTextAr.trim() || questionForm.questionTextEn.trim() || "Question",
        },
        type: mappedType,
        point: Number(questionForm.point || 5),
        order_index: Number(questionForm.orderIndex || 1),
        is_required: questionForm.isRequired,
      };

      let questionId: string | number;
      let questionData: Question;

      if (isEditing) {
        const url = getAdminApiRequestUrl(`${QUESTIONS_API_PATH}/${selectedQuestionForEdit.id}`);
        const res = await axios.put(url, questionPayload, { headers: getHeaders(currentLocale) });
        questionData = extractItem(res.data) as Question;
        questionId = selectedQuestionForEdit.id;
      } else {
        const res = await axios.post(getAdminApiRequestUrl(QUESTIONS_API_PATH), questionPayload, { headers: getHeaders(currentLocale) });
        questionData = extractItem(res.data) as Question;
        questionId = questionData.id;
      }

      if (!questionId) throw new Error("Question operation failed.");

      // Handle Options
      const optionsToProcess: any[] = [];
      if (questionForm.questionType === "mcq") {
        optionsToProcess.push(...questionForm.mcqOptions.filter(opt => opt.text.trim()));
      } else if (questionForm.questionType === "true_false") {
        optionsToProcess.push(
          { text: questionForm.trueOptionTextEn || "True", isCorrect: questionForm.trueFalseCorrect === "true", isTF: true, tfType: 'true' },
          { text: questionForm.falseOptionTextEn || "False", isCorrect: questionForm.trueFalseCorrect === "false", isTF: true, tfType: 'false' }
        );
      }

      // 1. Delete removed options (only in edit mode)
      if (isEditing) {
        const originalOptions = optionsByQuestion[String(questionId)] || [];
        const currentOptionIds = new Set(optionsToProcess.map(o => String(o.id)).filter(id => !id.includes("-"))); // Filter out UUIDs
        for (const oldOpt of originalOptions) {
          if (!currentOptionIds.has(String(oldOpt.id))) {
            await axios.delete(getAdminApiRequestUrl(`${QUESTION_OPTIONS_API_PATH}/${oldOpt.id}`), { headers: getHeaders(currentLocale) });
          }
        }
      }

      // 2. Create or Update current options
      const processedOptions: QuestionOption[] = [];
      for (const opt of optionsToProcess) {
        const optionPayload = {
          question_id: Number(questionId),
          option_text: {
            en: opt.text.trim(),
            ar: opt.tfType === 'true' ? (questionForm.trueOptionTextAr || "صح") : 
                opt.tfType === 'false' ? (questionForm.falseOptionTextAr || "خطأ") : 
                opt.text.trim(),
          },
          is_correct: opt.isCorrect,
        };

        const isNewOption = !opt.id || String(opt.id).includes("-"); // UUID detection
        
        if (!isNewOption && isEditing) {
          const res = await axios.put(getAdminApiRequestUrl(`${QUESTION_OPTIONS_API_PATH}/${opt.id}`), optionPayload, { headers: getHeaders(currentLocale) });
          processedOptions.push(extractItem(res.data) as QuestionOption);
        } else {
          const res = await axios.post(getAdminApiRequestUrl(QUESTION_OPTIONS_API_PATH), optionPayload, { headers: getHeaders(currentLocale) });
          processedOptions.push(extractItem(res.data) as QuestionOption);
        }
      }

      setSuccessMessage(isEditing ? "Question updated successfully." : "Question and options added.");
      
      // Update local state
      const questionWithLatestOptions = { ...questionData, id: questionId, options: processedOptions };
      setOptionsByQuestion(prev => ({ ...prev, [String(questionId)]: processedOptions }));
      
      if (isEditing) {
        setQuestionsForSelectedQuiz(prev => prev.map(q => String(q.id) === String(questionId) ? questionWithLatestOptions : q));
        setSelectedQuestionForEdit(null);
        setIsCreateQuizModalOpen(false);
        if (selectedQuizForView) {
          handleShowQuestionsForLesson(selectedLessonForQuiz!);
        }
      } else {
        const existing = questionsByQuiz[String(quizId)] || [];
        const updatedQuestions = [questionWithLatestOptions, ...existing];
        setQuestionsByQuiz(prev => ({ ...prev, [String(quizId)]: updatedQuestions }));
        
        const nextOrder = updatedQuestions.reduce((max, q) => Math.max(max, Number(q.order_index || 0)), 0) + 1;
        setQuestionForm({
          ...initialQuestionForm,
          orderIndex: String(nextOrder),
          mcqOptions: getInitialOptions(),
        });
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to save question/options."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowQuestionsForLesson = async (lesson: Lesson) => {
    try {
      setListError(null);
      setIsLoadingQuestions(true);
      const lessonKey = String(getLessonId(lesson));
      const lessonQuizzes = lessonQuizMap[lessonKey] || [];
      const linkedQuiz = lessonQuizzes[lessonQuizzes.length - 1] || lessonQuizMap.unlinked?.[0];
      if (!linkedQuiz) {
        setListError("No linked quiz found for this lesson.");
        return;
      }

      const quizId = Number(getQuizId(linkedQuiz));
      const questionsRes = await axios.get(getAdminApiRequestUrl(QUESTIONS_API_PATH), {
        headers: getHeaders(currentLocale),
        params: { quiz_id: quizId },
      });
      if (questionsRes.status !== 200) {
        throw new Error("Questions listing did not return 200.");
      }

      // Robust extraction for Laravel paginated or standard collection responses
      const rawData = questionsRes.data;
      let questions: Question[] = [];
      
      if (rawData.data && Array.isArray(rawData.data.data)) {
        // Paginated: { data: { data: [...] } }
        questions = rawData.data.data;
      } else if (rawData.data && Array.isArray(rawData.data)) {
        // Simple collection: { data: [...] }
        questions = rawData.data;
      } else if (Array.isArray(rawData)) {
        // Bare array: [...]
        questions = rawData;
      }
      
      const sortedQuestions = [...questions].sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));

      const optionsMap: Record<string, QuestionOption[]> = {};
      for (const q of sortedQuestions) {
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          optionsMap[String(q.id)] = q.options;
        } else {
          try {
            const optRes = await axios.get(getAdminApiRequestUrl(QUESTION_OPTIONS_API_PATH), {
              params: { question_id: q.id },
              headers: getHeaders(currentLocale),
            });
            optionsMap[String(q.id)] = extractList(optRes.data) as QuestionOption[];
          } catch (e) {
            optionsMap[String(q.id)] = [];
          }
        }
      }

      setSelectedLessonForQuiz(lesson);
      setSelectedQuizForView(linkedQuiz);
      setQuestionsForSelectedQuiz(sortedQuestions);
      setOptionsByQuestion(optionsMap);
      setSelectedQuestionIds(new Set()); // Reset selection
      setIsQuestionsModalOpen(true);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to load quiz questions."));
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const url = getAdminApiRequestUrl(`${QUESTIONS_API_PATH}/${questionId}`);
      await axios.delete(url, { headers: getHeaders(currentLocale) });
      
      setQuestionsForSelectedQuiz(prev => prev.filter(q => String(q.id) !== String(questionId)));
      setSuccessMessage("Question deleted successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to delete question."));
    }
  };

  const handleBulkDeleteQuestions = async () => {
    if (selectedQuestionIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedQuestionIds.size} questions?`)) return;
    
    setIsDeletingBulk(true);
    try {
      const url = getAdminApiRequestUrl(`${QUESTIONS_API_PATH}/bulk`);
      await axios.delete(url, { 
        headers: getHeaders(currentLocale),
        data: { ids: Array.from(selectedQuestionIds) }
      });
      
      setQuestionsForSelectedQuiz(prev => prev.filter(q => !selectedQuestionIds.has(String(q.id))));
      setSelectedQuestionIds(new Set());
      setSuccessMessage("Questions deleted successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to bulk delete questions."));
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const toggleQuestionSelection = (id: string | number) => {
    const sid = String(id);
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleEditQuestion = (question: Question) => {
    setActiveQuizForQuestion(selectedQuizForView);
    setSelectedQuestionForEdit(question);
    setQuizModalMode("update");
    setQuizWizardStep(2);
    
    // Safely extract localized values
    const qText = question.question_text;
    const qTextEn = typeof qText === 'string' ? qText : qText?.en || "";
    const qTextAr = typeof qText === 'string' ? qText : qText?.ar || "";

    // Reverse map the backend type to the frontend type
    const reverseTypeMapping: Record<string, "text" | "mcq" | "true_false"> = {
      short_answer: "text",
      text: "text",
      multiple_choice: "mcq",
      mcq: "mcq",
      true_false: "true_false",
    };
    
    const mappedType = reverseTypeMapping[question.type as string] || "mcq";

    setQuestionForm({
      questionType: mappedType,
      questionTextEn: qTextEn,
      questionTextAr: qTextAr,
      point: String(question.point || "1"),
      orderIndex: String(question.order_index || "1"),
      isRequired: question.is_required ?? true,
      // The true/false fields are typically derived from options in the form if it's true_false type
      trueOptionTextEn: "",
      trueOptionTextAr: "",
      falseOptionTextEn: "",
      falseOptionTextAr: "",
      trueFalseCorrect: "true",
      mcqOptions: (optionsByQuestion[String(question.id)] || []).map(opt => {
        const oText = opt.option_text;
        const oTextVal = typeof oText === 'string' ? oText : oText?.en || oText?.ar || "";
        return {
          id: String(opt.id),
          text: oTextVal,
          isCorrect: opt.is_correct ?? false
        };
      })
    });

    // Special handling for true_false to populate the specific fields
    if (question.type === "true_false") {
      const opts = optionsByQuestion[String(question.id)] || [];
      const trueOpt = opts[0];
      const falseOpt = opts[1];
      if (trueOpt) {
        const tText = trueOpt.option_text;
        setQuestionForm(prev => ({
          ...prev,
          trueOptionTextEn: typeof tText === 'string' ? tText : tText?.en || "",
          trueOptionTextAr: typeof tText === 'string' ? tText : tText?.ar || "",
          trueFalseCorrect: trueOpt.is_correct ? "true" : "false"
        }));
      }
      if (falseOpt) {
        const fText = falseOpt.option_text;
        setQuestionForm(prev => ({
          ...prev,
          falseOptionTextEn: typeof fText === 'string' ? fText : fText?.en || "",
          falseOptionTextAr: typeof fText === 'string' ? fText : fText?.ar || "",
          trueFalseCorrect: falseOpt.is_correct ? "false" : prev.trueFalseCorrect
        }));
      }
    }

    setIsQuestionsModalOpen(false);
    setIsCreateQuizModalOpen(true);
  };

  const handleOpenQuestionModalForLesson = (lesson: Lesson) => {
    const lessonKey = String(getLessonId(lesson));
    const lessonQuizzes = lessonQuizMap[lessonKey] || [];
    const linkedQuiz = lessonQuizzes[lessonQuizzes.length - 1] || lessonQuizMap.unlinked?.[0];
    if (!linkedQuiz) {
      setListError("No linked quiz found for this lesson.");
      return;
    }

    setSelectedLessonForQuiz(lesson);
    setSelectedQuizForLesson(linkedQuiz);
    setActiveQuizForQuestion(linkedQuiz);
    setQuizModalMode("update");
    setQuizWizardStep(2);
    setQuestionForm((prev) => ({
      ...initialQuestionForm,
      orderIndex: prev.orderIndex || "1",
      mcqOptions: getInitialOptions(),
    }));
    setIsCreateQuizModalOpen(true);
  };

  return (
    <div className={`p-6 md:p-10 min-h-screen bg-slate-50 dark:bg-transparent transition-colors duration-500 ${isRTL ? "text-right" : ""}`}>
      <div className="fixed top-0 right-0 w-[700px] h-[700px] bg-indigo-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="max-w-[1400px] mx-auto relative z-10">
        <button
          type="button"
          onClick={() => router.push(`/admin/courses/${courseId}/units`)}
          className={`mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-white/50 hover:text-indigo-600 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          Back To Units
        </button>

        <header className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 ${isRTL ? "md:flex-row-reverse" : ""}`}>
          <div>
            <div className={`flex items-center gap-2 text-indigo-500 font-bold uppercase tracking-[0.25em] text-[10px] mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <BookOpen className="w-3 h-3" />
              Unit Lessons
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {unitTitle || `Unit #${unitId}`}
            </h1>
            <p className="text-slate-500 dark:text-slate-300 mt-2 font-medium">
              {courseTitle || `Course #${courseId}`}
            </p>
          </div>

          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => void loadData()}
              className="p-4 rounded-2xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-[#1A2340] hover:text-indigo-500 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-colors shadow-2xl shadow-indigo-500/30"
            >
              <Plus className="w-4 h-4" />
              Add Lesson
            </button>
          </div>
        </header>

        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 flex items-center gap-2"
            >
              <BadgeCheck className="w-4 h-4" />
              <span className="font-semibold text-sm">{successMessage}</span>
            </motion.div>
          )}
          {listError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-semibold text-sm">{listError}</span>
              </div>
              <button type="button" onClick={() => setListError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 relative group">
          <Search className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors ${isRTL ? "right-5" : "left-5"}`} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search lessons..."
            className={`w-full py-5 rounded-3xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 outline-none focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all text-slate-900 dark:text-white font-bold text-base ${isRTL ? "pr-14 pl-5 text-right" : "pl-14 pr-5"}`}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-28 rounded-3xl bg-slate-100 dark:bg-[#11182B] border border-slate-200 dark:border-white/10 animate-pulse" />
            ))}
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="rounded-[40px] border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#11182B] p-12 md:p-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-white/15 mx-auto mb-4" />
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">No Lessons Found</h3>
            <p className="text-base text-slate-500 dark:text-white/40">Create the first lesson for this unit or adjust your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredLessons
              .sort((a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0))
              .map((lesson) => (
                <div key={String(getLessonId(lesson))} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#11182B] p-6 md:p-7 hover:border-indigo-500/30 transition-all">
                  {(() => {
                    const lessonKey = String(getLessonId(lesson));
                    const hasQuizForLesson = (lessonQuizMap[lessonKey] || []).length > 0;
                    return (
                  <div className={`flex flex-col md:flex-row md:items-start justify-between gap-4 ${isRTL ? "md:flex-row-reverse" : ""}`}>
                    <div className="min-w-0">
                      <h3 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white line-clamp-1">
                        {getLocalizedValue(lesson.title, currentLocale) || "Untitled lesson"}
                      </h3>
                      <p className="text-sm md:text-base text-slate-500 dark:text-white/40 mt-2 line-clamp-2">
                        {getLocalizedValue(lesson.description, currentLocale) || "No description"}
                      </p>
                      <div className={`mt-3 flex flex-wrap items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 uppercase">
                          {lesson.lesson_type || "lesson"}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 uppercase">
                          {normalizeRequired(lesson.is_required) ? "Required" : "Optional"}
                        </span>
                        {lesson.lesson_order !== undefined && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80">
                            Order {lesson.lesson_order}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80">
                          <Clock className="w-3 h-3" />
                          {lesson.actual_duration_minutes ?? 0} min
                        </span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <button
                        type="button"
                        onClick={() => void openEditModal(lesson)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1A2340] px-4 py-2 text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#22305A]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      {!hasQuizForLesson ? (
                        <button
                          type="button"
                          onClick={() => void handleCreateQuizForLesson(lesson)}
                          className="group relative inline-flex items-center gap-2.5 rounded-2xl border border-indigo-300/80 dark:border-indigo-400/40 bg-linear-to-r from-indigo-600 to-blue-600 px-4.5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/35 active:translate-y-0"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-white/95 group-hover:rotate-12 transition-transform" />
                          <span>Create Quiz</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleOpenQuestionModalForLesson(lesson)}
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Question
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleShowQuestionsForLesson(lesson)}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Show Questions
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteQuiz(lesson)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20"
                          >
                            Delete Quiz
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                    );
                  })()}
                </div>
              ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isQuestionsModalOpen && selectedQuizForView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsQuestionsModalOpen(false);
                setSelectedQuizForView(null);
                setQuestionsForSelectedQuiz([]);
                setOptionsByQuestion({});
              }}
              className="absolute inset-0 bg-slate-950/70"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-white/10"
            >
              <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{uiText.quizQuestions}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider border border-slate-200 dark:border-white/10">
                      Quiz #{getQuizId(selectedQuizForView)}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border border-indigo-100 dark:border-indigo-500/20">
                      {questionsForSelectedQuiz.length} Questions
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider border border-amber-100 dark:border-amber-500/20">
                      {questionsForSelectedQuiz.reduce((acc, q) => acc + (q.point ?? 0), 0)} Total PTS
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                        if (selectedLessonForQuiz) {
                          handleOpenQuestionModalForLesson(selectedLessonForQuiz);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Question
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuestionsModalOpen(false);
                      setSelectedQuizForView(null);
                      setQuestionsForSelectedQuiz([]);
                      setOptionsByQuestion({});
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] bg-slate-50/50 dark:bg-transparent">
                {isLoadingQuestions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm font-bold text-slate-500 dark:text-white/40">{uiText.loadingQuestions}</p>
                  </div>
                ) : questionsForSelectedQuiz.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-slate-300 dark:text-white/20" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{uiText.noQuestions}</h4>
                    <p className="text-sm text-slate-500 dark:text-white/40 mt-1">Start by adding some questions to this quiz.</p>
                  </div>
                ) : (
                  questionsForSelectedQuiz.map((q, idx) => (
                    <motion.div 
                      key={String(q.id)} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group relative rounded-4xl border transition-all duration-300 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 ${
                        selectedQuestionIds.has(String(q.id))
                          ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10"
                          : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#11182B] hover:border-indigo-500/30"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="mt-1">
                            <input
                              type="checkbox"
                              checked={selectedQuestionIds.has(String(q.id))}
                              onChange={() => toggleQuestionSelection(q.id)}
                              className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-white/20 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                              {idx + 1}
                            </span>
                            {q.type === 'mcq' || q.type === 'multiple_choice' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider border border-purple-100 dark:border-purple-500/20">
                                <Sparkles className="w-3 h-3" />
                                Multiple Choice
                              </span>
                            ) : q.type === 'true_false' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-500/20">
                                <BadgeCheck className="w-3 h-3" />
                                True / False
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border border-slate-100 dark:border-white/10">
                                <FileText className="w-3 h-3" />
                                {q.type || 'Short Answer'}
                              </span>
                            )}
                            <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[10px] font-black shadow-lg shadow-amber-500/20 border border-amber-400/30">
                              {q.point ?? 0} POINTS
                            </span>
                          </div>
                          <h4 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight mt-1">
                            {getLocalizedValue(q.question_text, currentLocale) || "Untitled question"}
                          </h4>
                        </div>
                      </div>

                        <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            title="Edit Question"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const qOptions = optionsByQuestion[String(q.id)] || [];
                        const isInteractiveType = q.type === 'mcq' || q.type === 'multiple_choice' || q.type === 'true_false';

                        if (qOptions.length > 0) {
                          return (
                            <div className="mt-6">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 mb-3 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                {uiText.answers}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {qOptions.map((opt, optIdx) => (
                                  <div
                                    key={String(opt.id)}
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${
                                      opt.is_correct
                                        ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20"
                                        : "bg-white dark:bg-white/2 border-slate-100 dark:border-white/5 hover:border-indigo-500/30"
                                    }`}
                                  >
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black shrink-0 ${
                                      opt.is_correct 
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/40"
                                    }`}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-sm font-bold block truncate ${
                                        opt.is_correct ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-white/70"
                                      }`}>
                                        {getLocalizedValue(opt.option_text, currentLocale) || "--"}
                                      </span>
                                    </div>
                                    {opt.is_correct && (
                                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                                        <BadgeCheck className="w-3 h-3" />
                                        Correct
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="mt-4 p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-sm italic text-slate-500 dark:text-white/40">
                            {isInteractiveType ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                                  <AlertCircle className="w-5 h-5 text-rose-500" />
                                </div>
                                <div>
                                  <span className="font-black uppercase text-[10px] block not-italic text-rose-500 tracking-wider">Missing Options</span>
                                  <p className="not-italic text-slate-600 dark:text-white/60">This {q.type?.replace('_', ' ')} question requires options but none were found.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                  <span className="font-black uppercase text-[10px] block not-italic text-indigo-500 tracking-wider">{uiText.shortAnswer}</span>
                                  <p className="not-italic text-slate-600 dark:text-white/60">{uiText.noFixedAnswer}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </motion.div>
                  ))
                )}
              </div>

              {selectedQuestionIds.size > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-lg">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-900 dark:bg-indigo-600 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                        {selectedQuestionIds.size}
                      </div>
                      <span className="font-bold text-sm tracking-tight">Questions Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedQuestionIds(new Set())}
                        className="px-4 py-2 rounded-xl hover:bg-white/10 text-sm font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void handleBulkDeleteQuestions()}
                        disabled={isDeletingBulk}
                        className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                      >
                        {isDeletingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete Selected
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateQuizModalOpen && selectedLessonForQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCreateQuizModalOpen(false);
                setSelectedLessonForQuiz(null);
                setSelectedQuizForLesson(null);
                setSelectedQuestionForEdit(null);
              }}
              className="absolute inset-0 bg-slate-950/70"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-white/10 p-8 space-y-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {quizWizardStep === 2 && activeQuizForQuestion ? "Add Question" : quizModalMode === "update" ? "Update Quiz" : "Create Quiz"}
                </h3>
                <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden text-xs font-bold">
                  <span className={`px-3 py-1.5 ${quizWizardStep === 1 ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60"}`}>1. Quiz</span>
                  <span className={`px-3 py-1.5 ${quizWizardStep === 2 ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60"}`}>2. Question</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-white/50">
                Lesson: {getLocalizedValue(selectedLessonForQuiz.title, currentLocale) || `#${getLessonId(selectedLessonForQuiz)}`}
              </p>
              {quizWizardStep === 1 && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={quizCreateForm.titleEn}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                  placeholder="Title (EN)"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
                <input
                  value={quizCreateForm.titleAr}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, titleAr: e.target.value }))}
                  placeholder="Title (AR)"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
                <textarea
                  rows={3}
                  value={quizCreateForm.descriptionEn}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                  placeholder="Description (EN)"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
                <textarea
                  rows={3}
                  value={quizCreateForm.descriptionAr}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, descriptionAr: e.target.value }))}
                  placeholder="Description (AR)"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <input
                  type="number"
                  min={1}
                  value={quizCreateForm.maxScore}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, maxScore: e.target.value }))}
                  placeholder="Max score"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
                <input
                  type="number"
                  min={1}
                  value={quizCreateForm.passingScore}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, passingScore: e.target.value }))}
                  placeholder="Passing score"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
                <input
                  type="number"
                  min={1}
                  value={quizCreateForm.durationMinutes}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  placeholder="Duration minutes"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <select
                  value={quizCreateForm.status}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, status: e.target.value as "draft" | "published" }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
                <input
                  value={quizCreateForm.quizableType}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 px-4 py-3 text-slate-500"
                />
                <input
                  value={`Course #${courseId}`}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 px-4 py-3 text-slate-500"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
                <input
                  type="checkbox"
                  checked={quizCreateForm.autoGradeEnabled}
                  onChange={(e) => setQuizCreateForm((prev) => ({ ...prev, autoGradeEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
                Auto grade enabled
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateQuizModalOpen(false);
                    setSelectedLessonForQuiz(null);
                    setSelectedQuizForLesson(null);
                    setSelectedQuestionForEdit(null);
                  }}
                  className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmCreateQuizForLesson()}
                  className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {quizModalMode === "update" ? "Update Quiz & Continue" : "Create Quiz & Continue"}
                </button>
              </div>
              </>
              )}

              {quizWizardStep === 2 && (
              <>
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Quiz ready. Add question and MCQ options.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setQuestionForm((prev) => ({ ...prev, questionType: "text" }))}
                  className={`rounded-xl px-4 py-3 text-sm font-bold border transition-all ${
                    questionForm.questionType === "text"
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/70"
                  }`}
                >
                  Short Answer
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionForm((prev) => ({ ...prev, questionType: "mcq" }))}
                  className={`rounded-xl px-4 py-3 text-sm font-bold border transition-all ${
                    questionForm.questionType === "mcq"
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/70"
                  }`}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionForm((prev) => ({ ...prev, questionType: "true_false" }))}
                  className={`rounded-xl px-4 py-3 text-sm font-bold border transition-all ${
                    questionForm.questionType === "true_false"
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/70"
                  }`}
                >
                  True / False
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea
                  rows={3}
                  value={questionForm.questionTextEn}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, questionTextEn: e.target.value }))}
                  placeholder="Question (EN)"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
                <textarea
                  rows={3}
                  value={questionForm.questionTextAr}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, questionTextAr: e.target.value }))}
                  placeholder="Question (AR)"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input type="number" min={1} value={questionForm.point} onChange={(e) => setQuestionForm((prev) => ({ ...prev, point: e.target.value }))} placeholder="Point" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                <input type="number" min={1} value={questionForm.orderIndex} onChange={(e) => setQuestionForm((prev) => ({ ...prev, orderIndex: e.target.value }))} placeholder="Order index" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3" />
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm font-semibold">
                  <input type="checkbox" checked={questionForm.isRequired} onChange={(e) => setQuestionForm((prev) => ({ ...prev, isRequired: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                  Required
                </label>
              </div>
              {questionForm.questionType === "mcq" && (
                <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Question Options</p>
                  {questionForm.mcqOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <input type="checkbox" checked={opt.isCorrect} onChange={() => setCorrectMcqOption(opt.id)} className="w-4 h-4 accent-emerald-600" />
                      <input value={opt.text} onChange={(e) => updateMcqOptionText(opt.id, e.target.value)} placeholder={`Choice ${idx + 1}`} className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D152A] px-4 py-3" />
                      {questionForm.mcqOptions.length > 2 && (
                        <button type="button" onClick={() => removeMcqOption(opt.id)} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-600">Remove</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addMcqOption} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0D152A]">
                    <Plus className="w-4 h-4" />
                    Add Choice
                  </button>
                </div>
              )}
              {questionForm.questionType === "true_false" && (
                <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">True / False Answers</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={questionForm.trueOptionTextEn}
                      onChange={(e) => setQuestionForm((prev) => ({ ...prev, trueOptionTextEn: e.target.value }))}
                      placeholder="True text (EN)"
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D152A] px-4 py-3"
                    />
                    <input
                      value={questionForm.trueOptionTextAr}
                      onChange={(e) => setQuestionForm((prev) => ({ ...prev, trueOptionTextAr: e.target.value }))}
                      placeholder="True text (AR)"
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D152A] px-4 py-3"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
                    <input
                      type="checkbox"
                      checked={questionForm.trueFalseCorrect === "true"}
                      onChange={() => setQuestionForm((prev) => ({ ...prev, trueFalseCorrect: "true" }))}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    Mark True as correct
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={questionForm.falseOptionTextEn}
                      onChange={(e) => setQuestionForm((prev) => ({ ...prev, falseOptionTextEn: e.target.value }))}
                      placeholder="False text (EN)"
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D152A] px-4 py-3"
                    />
                    <input
                      value={questionForm.falseOptionTextAr}
                      onChange={(e) => setQuestionForm((prev) => ({ ...prev, falseOptionTextAr: e.target.value }))}
                      placeholder="False text (AR)"
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D152A] px-4 py-3"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
                    <input
                      type="checkbox"
                      checked={questionForm.trueFalseCorrect === "false"}
                      onChange={() => setQuestionForm((prev) => ({ ...prev, trueFalseCorrect: "false" }))}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    Mark False as correct
                  </label>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setQuizWizardStep(1)}
                  className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10"
                >
                  Back To Quiz
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddQuestionToQuiz()}
                  className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {questionForm.questionType === "text"
                    ? "Add Short Answer Question"
                    : questionForm.questionType === "mcq"
                      ? "Add MCQ Question"
                      : "Add True/False Question"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateQuizModalOpen(false);
                    setSelectedLessonForQuiz(null);
                    setSelectedQuizForLesson(null);
                    setActiveQuizForQuestion(null);
                    setQuizWizardStep(1);
                  }}
                  className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10"
                >
                  Done
                </button>
              </div>
              </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-white dark:bg-[#0A0F1D] md:rounded-[56px] overflow-hidden shadow-2xl border-t md:border border-slate-200 dark:border-white/10"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full md:max-h-[90vh]">
                <header className={`p-8 md:p-12 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <div className={`flex items-center gap-2 text-indigo-500 font-black uppercase tracking-[0.3em] text-[10px] mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Settings className="w-3 h-3" />
                      Lesson Definition
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      {modalMode === "create" ? "Append Lesson" : "Refine Lesson"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="p-4 rounded-3xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-500 transition-all active:scale-90"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </header>

                <div className="p-8 md:p-12 space-y-10 overflow-y-auto custom-scrollbar">
                  {isFetchingLesson && (
                    <div className="rounded-[20px] border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-5 py-4 text-sm font-bold inline-flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading lesson details...
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                        Lesson Title
                      </label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus-within:border-indigo-500/30 transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                        <FileText className="w-6 h-6 text-indigo-500" />
                        <input
                          required
                          value={form.title}
                          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                          placeholder="e.g. System Core Concepts"
                          className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-xl placeholder:text-slate-400 dark:placeholder:text-white/10 ${isRTL ? "text-right" : ""}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                        Lesson Type
                      </label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus-within:border-indigo-500/30 transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                        <BookOpen className="w-6 h-6 text-indigo-500" />
                        <select
                          value={form.lesson_type}
                          onChange={(event) => setForm((prev) => ({ ...prev, lesson_type: event.target.value }))}
                          className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black appearance-none cursor-pointer ${isRTL ? "text-right" : ""}`}
                        >
                          <option value="video" className="dark:bg-[#0A0F1D]">Video</option>
                          <option value="lecture" className="dark:bg-[#0A0F1D]">Lecture</option>
                          <option value="quiz" className="dark:bg-[#0A0F1D]">Quiz</option>
                          <option value="document" className="dark:bg-[#0A0F1D]">Document</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                      Description
                    </label>
                    <textarea
                      rows={6}
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Detail the purpose of this lesson..."
                      className={`w-full p-8 rounded-[40px] bg-slate-100 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/30 outline-none text-slate-900 dark:text-white font-bold leading-relaxed transition-all resize-none ${isRTL ? "text-right" : ""}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Duration (Minutes)</label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all shadow-inner ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                          <Clock className="w-6 h-6" />
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={form.actual_duration_minutes}
                          onChange={(event) => setForm((prev) => ({ ...prev, actual_duration_minutes: event.target.value }))}
                          className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-2xl ${isRTL ? "text-right" : ""}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Lesson Order (Optional)</label>
                      <div className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent transition-all shadow-inner ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                          <Settings className="w-6 h-6" />
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={form.lesson_order}
                          onChange={(event) => setForm((prev) => ({ ...prev, lesson_order: event.target.value }))}
                          className={`flex-1 bg-transparent outline-none text-slate-900 dark:text-white font-black text-2xl ${isRTL ? "text-right" : ""}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Required Lesson</label>
                      <label className={`flex items-center justify-between p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className="block font-black text-slate-900 dark:text-white">Include In Learning Path</span>
                        <input
                          type="checkbox"
                          checked={form.is_required}
                          onChange={(event) => setForm((prev) => ({ ...prev, is_required: event.target.checked }))}
                          className="w-7 h-7 rounded-xl accent-indigo-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {modalMode === "create" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                      <div className="space-y-4">
                        <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Video (Optional)</label>
                        <label className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                          <Upload className="w-6 h-6 text-indigo-500" />
                          <span className="flex-1 truncate text-slate-700 dark:text-white/70 font-bold">{videoFile ? videoFile.name : "Select video file"}</span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                          />
                        </label>
                      </div>

                      <div className="space-y-4">
                        <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>Attachments (Optional)</label>
                        <label className={`flex items-center gap-4 p-6 rounded-[32px] bg-slate-100 dark:bg-white/5 border-2 border-transparent cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-all ${isRTL ? "flex-row-reverse" : ""}`}>
                          <Upload className="w-6 h-6 text-indigo-500" />
                          <span className="flex-1 truncate text-slate-700 dark:text-white/70 font-bold">
                            {attachments.length > 0 ? `${attachments.length} file(s) selected` : "Select attachment files"}
                          </span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              const files = event.target.files ? Array.from(event.target.files) : [];
                              setAttachments(files);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <footer className={`p-8 md:p-12 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-4 bg-slate-50/50 dark:bg-white/2 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-10 py-5 rounded-[24px] md:rounded-[32px] border-2 border-slate-200 dark:border-white/10 font-black uppercase tracking-widest text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  >
                    Abort Entry
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isFetchingLesson}
                    className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] md:rounded-[32px] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-500/40 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                    {modalMode === "create" ? "Append Lesson To Grid" : "Commit Lesson Refinement"}
                  </button>
                </footer>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
