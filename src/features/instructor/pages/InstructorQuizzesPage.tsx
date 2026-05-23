"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileQuestion,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type LocalizedText = { en?: string; ar?: string };

type CourseItem = {
  id: number | string;
  title?: string | LocalizedText;
  title_translations?: Record<string, string>;
  creator?: { id?: number | string };
  instructors?: Array<{ id?: number | string }>;
};

type Quiz = {
  id: number | string;
  quiz_id?: number | string;
  course_id?: number | string;
  quizable_id?: number | string;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  status?: string;
  type?: string;
  duration_minutes?: number | string;
  max_score?: number | string;
  passing_score?: number | string;
  auto_grade_enabled?: boolean;
  questions?: Question[];
};

type QuestionOption = {
  id?: number | string;
  option_text?: string | LocalizedText;
  text?: string | LocalizedText;
  is_correct?: boolean;
};

type Question = {
  id: number | string;
  question_text?: string | LocalizedText;
  text?: string | LocalizedText;
  type?: string;
  point?: number | string;
  order_index?: number | string;
  is_required?: boolean;
  options?: QuestionOption[];
};

type QuizFormState = {
  courseId: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  durationMinutes: string;
  maxScore: string;
  passingScore: string;
  status: string;
  autoGradeEnabled: boolean;
};

type OptionDraft = {
  localId: string;
  id?: number;
  textEn: string;
  textAr: string;
  isCorrect: boolean;
};

type QuestionFormState = {
  questionTextEn: string;
  questionTextAr: string;
  point: string;
  orderIndex: string;
  isRequired: boolean;
  type: "multiple_choice" | "true_false";
  trueFalseAnswer: boolean;
  options: OptionDraft[];
};

const QUIZZES_API_PATH = "/quizzes";
const QUESTIONS_API_PATH = "/questions";
const QUESTION_OPTIONS_API_PATH = "/question-options";
const COURSES_API_PATH = "/my-courses";

const initialQuizForm: QuizFormState = {
  courseId: "",
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  durationMinutes: "30",
  maxScore: "100",
  passingScore: "60",
  status: "draft",
  autoGradeEnabled: true,
};

function createOptionDraft(overrides?: Partial<OptionDraft>): OptionDraft {
  return {
    localId: crypto.randomUUID(),
    textEn: "",
    textAr: "",
    isCorrect: false,
    ...overrides,
  };
}

function createInitialOptions() {
  return [createOptionDraft({ isCorrect: true }), createOptionDraft()];
}

const initialQuestionForm: QuestionFormState = {
  questionTextEn: "",
  questionTextAr: "",
  point: "5",
  orderIndex: "1",
  isRequired: true,
  type: "multiple_choice",
  trueFalseAnswer: true,
  options: createInitialOptions(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

function getLocalizedCourseTitle(course: CourseItem, locale: "en" | "ar") {
  return (
    getStringValue(course.title_translations?.[locale]) ||
    getStringValue(course.title_translations?.en) ||
    getLocalizedValue(course.title, locale) ||
    `Course #${course.id}`
  );
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

function extractItem(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data) && isRecord(payload.data.data)) return payload.data.data;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;

  const errors = error.response?.data?.errors;
  if (isRecord(errors)) {
    const firstError = Object.values(errors).find((value) => Array.isArray(value) && typeof value[0] === "string");
    if (Array.isArray(firstError) && typeof firstError[0] === "string") {
      return firstError[0];
    }
  }

  const message = error.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (!error.response) return "Cannot reach server. Please check your connection.";
  return fallback;
}

function getQuizId(quiz: Quiz | Record<string, unknown>) {
  return toNumber((quiz as Quiz).quiz_id) ?? toNumber((quiz as Quiz).id) ?? 0;
}

function getQuestionId(question: Question | Record<string, unknown>) {
  return toNumber((question as Question).id) ?? 0;
}

function getCourseIdFromQuiz(quiz: Quiz | Record<string, unknown>) {
  return toNumber((quiz as Quiz).course_id) ?? toNumber((quiz as Quiz).quizable_id);
}

function getOptionText(option: QuestionOption, locale: "en" | "ar") {
  return (
    getLocalizedValue(option.option_text, locale) ||
    getLocalizedValue(option.text, locale) ||
    ""
  );
}

function isOwnedByInstructor(course: CourseItem, instructorId: number | null) {
  if (instructorId === null) return true;
  const creatorId = toNumber(course.creator?.id);
  if (creatorId === instructorId) return true;
  if (Array.isArray(course.instructors)) {
    return course.instructors.some((instructor) => toNumber(instructor.id) === instructorId);
  }
  return false;
}

function normalizeCourses(payload: unknown): CourseItem[] {
  return extractList(payload)
    .map((item) => item as unknown as CourseItem)
    .filter((item) => getQuizId({ id: item.id }) > 0 || toNumber(item.id));
}

function normalizeQuestionOptions(question: Record<string, unknown>): QuestionOption[] {
  const direct = Array.isArray(question.options) ? question.options.filter(isRecord) : [];
  if (direct.length > 0) return direct as QuestionOption[];

  const nested = Array.isArray(question.question_options) ? question.question_options.filter(isRecord) : [];
  return nested as QuestionOption[];
}

function normalizeQuiz(item: Record<string, unknown>): Quiz {
  const questionRows = Array.isArray(item.questions) ? item.questions.filter(isRecord) : [];
  return {
    id: toNumber(item.id) ?? getStringValue(item.id),
    quiz_id: toNumber(item.quiz_id) ?? undefined,
    course_id: toNumber(item.course_id) ?? undefined,
    quizable_id: toNumber(item.quizable_id) ?? undefined,
    title: item.title as Quiz["title"],
    description: item.description as Quiz["description"],
    status: getStringValue(item.status) || "draft",
    type: getStringValue(item.type) || "quiz",
    duration_minutes: toNumber(item.duration_minutes) ?? undefined,
    max_score: toNumber(item.max_score) ?? undefined,
    passing_score: toNumber(item.passing_score) ?? undefined,
    auto_grade_enabled: typeof item.auto_grade_enabled === "boolean" ? item.auto_grade_enabled : true,
    questions: questionRows.map((question) => ({
      id: toNumber(question.id) ?? getStringValue(question.id),
      question_text: question.question_text as Question["question_text"],
      text: question.text as Question["text"],
      type: getStringValue(question.type) || "multiple_choice",
      point: toNumber(question.point) ?? undefined,
      order_index: toNumber(question.order_index) ?? undefined,
      is_required: typeof question.is_required === "boolean" ? question.is_required : true,
      options: normalizeQuestionOptions(question),
    })),
  };
}

function isSuccessfulStatus(status: number) {
  return status >= 200 && status < 300;
}

function getQuizStatusClasses(status: string | undefined) {
  const normalized = (status || "draft").toLowerCase();
  if (normalized === "published") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  }
  if (normalized === "archived") {
    return "border-slate-400/20 bg-slate-500/10 text-slate-300";
  }
  return "border-amber-400/20 bg-amber-500/10 text-amber-300";
}

function getQuestionTypeLabel(type: string | undefined) {
  if (!type) return "Question";
  return type.replaceAll("_", " ");
}

export default function InstructorQuizzesPage() {
  const { language, isRTL } = useLanguage();
  const currentLocale = language as "en" | "ar";
  const currentInstructorId = toNumber(getStoredStudentUser()?.id);

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [quizForm, setQuizForm] = useState<QuizFormState>(initialQuizForm);

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(initialQuestionForm);

  const buildAuthHeaders = useCallback(() => {
    const token = getStudentToken();
    if (!token) throw new Error("missing_token");

    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Accept-Language": currentLocale,
      "X-Locale": currentLocale,
    };
  }, [currentLocale]);

  const loadCourses = useCallback(async () => {
    const response = await axios.get(getStudentApiRequestUrl(COURSES_API_PATH), {
      headers: buildAuthHeaders(),
    });

    return normalizeCourses(response.data).filter((course) => isOwnedByInstructor(course, currentInstructorId));
  }, [buildAuthHeaders, currentInstructorId]);

  const listQuizzes = useCallback(async () => {
    const response = await axios.get(getStudentApiRequestUrl(QUIZZES_API_PATH), {
      headers: buildAuthHeaders(),
      params: { quizable_type: "course", type: "quiz", per_page: 200 },
    });

    return extractList(response.data).map(normalizeQuiz);
  }, [buildAuthHeaders]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [courseRows, quizRows] = await Promise.all([loadCourses(), listQuizzes()]);
      const ownedCourseIds = new Set(courseRows.map((course) => toNumber(course.id)).filter((value): value is number => value !== null));
      const ownQuizzes = quizRows.filter((quiz) => {
        const courseId = getCourseIdFromQuiz(quiz);
        return courseId ? ownedCourseIds.has(courseId) : true;
      });

      setCourses(courseRows);
      setQuizzes(ownQuizzes);
    } catch (error) {
      if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Session token is missing. Please log in again.");
      } else {
        setErrorMessage(getErrorMessage(error, "Failed to load instructor quizzes."));
      }
    } finally {
      setIsLoading(false);
    }
  }, [listQuizzes, loadCourses]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const courseNameById = useMemo(() => {
    const next = new Map<number, string>();
    for (const course of courses) {
      const courseId = toNumber(course.id);
      if (!courseId) continue;
      next.set(courseId, getLocalizedCourseTitle(course, currentLocale));
    }
    return next;
  }, [courses, currentLocale]);

  const filteredQuizzes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const courseId = getCourseIdFromQuiz(quiz);
      if (courseFilter !== "all" && String(courseId ?? "") !== courseFilter) return false;

      if (!query) return true;
      const title = getLocalizedValue(quiz.title, currentLocale).toLowerCase();
      const description = getLocalizedValue(quiz.description, currentLocale).toLowerCase();
      const courseName = (courseId ? courseNameById.get(courseId) : "")?.toLowerCase() ?? "";
      return title.includes(query) || description.includes(query) || courseName.includes(query);
    });
  }, [courseFilter, courseNameById, currentLocale, quizzes, searchQuery]);

  const totalQuestions = useMemo(
    () => quizzes.reduce((sum, quiz) => sum + (Array.isArray(quiz.questions) ? quiz.questions.length : 0), 0),
    [quizzes]
  );

  const publishedQuizCount = useMemo(
    () => quizzes.filter((quiz) => (quiz.status || "").toLowerCase() === "published").length,
    [quizzes]
  );

  const totalDurationMinutes = useMemo(
    () => quizzes.reduce((sum, quiz) => sum + (toNumber(quiz.duration_minutes) ?? 0), 0),
    [quizzes]
  );

  const resetQuizForm = useCallback(() => {
    setEditingQuizId(null);
    setQuizForm(initialQuizForm);
  }, []);

  const resetQuestionForm = useCallback(() => {
    setEditingQuestionId(null);
    setQuestionForm({ ...initialQuestionForm, options: createInitialOptions() });
  }, []);

  const openCreateQuizModal = () => {
    resetQuizForm();
    setIsQuizModalOpen(true);
  };

  const openEditQuizModal = (quiz: Quiz) => {
    setEditingQuizId(getQuizId(quiz));
    setQuizForm({
      courseId: String(getCourseIdFromQuiz(quiz) ?? ""),
      titleEn: getLocalizedValue(quiz.title, "en"),
      titleAr: getLocalizedValue(quiz.title, "ar"),
      descriptionEn: getLocalizedValue(quiz.description, "en"),
      descriptionAr: getLocalizedValue(quiz.description, "ar"),
      durationMinutes: String(toNumber(quiz.duration_minutes) ?? 30),
      maxScore: String(toNumber(quiz.max_score) ?? 100),
      passingScore: String(toNumber(quiz.passing_score) ?? 60),
      status: quiz.status || "draft",
      autoGradeEnabled: quiz.auto_grade_enabled !== false,
    });
    setIsQuizModalOpen(true);
  };

  const closeQuizModal = () => {
    setIsQuizModalOpen(false);
    resetQuizForm();
  };

  const openCreateQuestionModal = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setExpandedQuizId(getQuizId(quiz));
    resetQuestionForm();
    setIsQuestionModalOpen(true);

    if (!quiz.questions || quiz.questions.length === 0) {
      await loadQuizDetails(getQuizId(quiz), true);
    }
  };

  const openEditQuestionModal = (quiz: Quiz, question: Question) => {
    const options = Array.isArray(question.options) ? question.options : [];
    setSelectedQuiz(quiz);
    setExpandedQuizId(getQuizId(quiz));
    setEditingQuestionId(getQuestionId(question));
    setQuestionForm({
      questionTextEn: getLocalizedValue(question.question_text ?? question.text, "en"),
      questionTextAr: getLocalizedValue(question.question_text ?? question.text, "ar"),
      point: String(toNumber(question.point) ?? 5),
      orderIndex: String(toNumber(question.order_index) ?? 1),
      isRequired: question.is_required !== false,
      type: question.type === "true_false" ? "true_false" : "multiple_choice",
      trueFalseAnswer:
        question.type === "true_false"
          ? Boolean(options.find((option) => getOptionText(option, "en").toLowerCase() === "true")?.is_correct)
          : true,
      options:
        question.type === "true_false"
          ? createInitialOptions()
          : options.map((option) =>
              createOptionDraft({
                id: toNumber(option.id) ?? undefined,
                textEn: getOptionText(option, "en"),
                textAr: getOptionText(option, "ar"),
                isCorrect: option.is_correct === true,
              })
            ),
    });
    setIsQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setIsQuestionModalOpen(false);
    resetQuestionForm();
  };

  const loadQuizDetails = useCallback(
    async (quizId: number, keepSelection = false) => {
      setIsDetailLoading(true);
      setErrorMessage(null);

      try {
        const response = await axios.get(getStudentApiRequestUrl(`${QUIZZES_API_PATH}/${quizId}`), {
          headers: buildAuthHeaders(),
        });

        const item = extractItem(response.data);
        if (!item) throw new Error("Quiz details response was empty.");

        const normalized = normalizeQuiz(item);

        setQuizzes((current) =>
          current.map((quiz) => (getQuizId(quiz) === quizId ? { ...quiz, ...normalized } : quiz))
        );
        setSelectedQuiz(normalized);
        setExpandedQuizId(quizId);

        if (!keepSelection) {
          setSuccessMessage(null);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to load quiz details."));
      } finally {
        setIsDetailLoading(false);
      }
    },
    [buildAuthHeaders]
  );

  const handleSaveQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const resolvedCourseId = Number(quizForm.courseId);
      if (!Number.isFinite(resolvedCourseId) || resolvedCourseId <= 0) {
        throw new Error("Please select a valid course.");
      }

      const titleEn = quizForm.titleEn.trim();
      const titleAr = quizForm.titleAr.trim();
      const descriptionEn = quizForm.descriptionEn.trim();
      const descriptionAr = quizForm.descriptionAr.trim();

      const payload = {
        title: {
          en: titleEn || titleAr || "Quiz",
          ar: titleAr || titleEn || "اختبار",
        },
        description: {
          en: descriptionEn || descriptionAr || "",
          ar: descriptionAr || descriptionEn || "",
        },
        max_score: Number(quizForm.maxScore || 100),
        passing_score: Number(quizForm.passingScore || 60),
        type: "quiz",
        status: quizForm.status,
        course_id: resolvedCourseId,
        quizable_type: "course",
        quizable_id: resolvedCourseId,
        auto_grade_enabled: quizForm.autoGradeEnabled,
        duration_minutes: Number(quizForm.durationMinutes || 30),
      };

      const url = editingQuizId ? `${QUIZZES_API_PATH}/${editingQuizId}` : QUIZZES_API_PATH;
      const method = editingQuizId ? "patch" : "post";
      const response = await axios.request({
        url: getStudentApiRequestUrl(url),
        method,
        headers: buildAuthHeaders(),
        data: payload,
      });

      if (!isSuccessfulStatus(response.status)) {
        throw new Error(`Quiz save failed with status ${response.status}.`);
      }

      const item = extractItem(response.data);
      if (!item) throw new Error("Quiz response was empty.");

      const savedQuiz = normalizeQuiz(item);
      const savedQuizId = getQuizId(savedQuiz);

      setQuizzes((current) => {
        if (editingQuizId) {
          return current.map((quiz) => (getQuizId(quiz) === editingQuizId ? { ...quiz, ...savedQuiz } : quiz));
        }
        return [savedQuiz, ...current];
      });

      setSuccessMessage(editingQuizId ? "Quiz updated successfully." : "Quiz created successfully.");
      setSelectedQuiz(savedQuiz);
      setExpandedQuizId(savedQuizId);
      closeQuizModal();
    } catch (error) {
      if (error instanceof Error && error.message === "Please select a valid course.") {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(getErrorMessage(error, "Failed to save quiz."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
    const quizId = getQuizId(quiz);
    if (!quizId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await axios.delete(getStudentApiRequestUrl(`${QUIZZES_API_PATH}/${quizId}`), {
        headers: buildAuthHeaders(),
      });

      setQuizzes((current) => current.filter((item) => getQuizId(item) !== quizId));
      if (selectedQuiz && getQuizId(selectedQuiz) === quizId) {
        setSelectedQuiz(null);
      }
      if (expandedQuizId === quizId) {
        setExpandedQuizId(null);
      }
      setSuccessMessage("Quiz deleted successfully.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete quiz."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOptionDraft = () => {
    setQuestionForm((current) => ({
      ...current,
      options: [...current.options, createOptionDraft()],
    }));
  };

  const removeOptionDraft = (localId: string) => {
    setQuestionForm((current) => {
      const next = current.options.filter((option) => option.localId !== localId);
      if (next.length > 0 && !next.some((option) => option.isCorrect)) {
        next[0] = { ...next[0], isCorrect: true };
      }
      return { ...current, options: next };
    });
  };

  const updateOptionDraft = (localId: string, patch: Partial<OptionDraft>) => {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option) => (option.localId === localId ? { ...option, ...patch } : option)),
    }));
  };

  const setCorrectOption = (localId: string) => {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option) => ({ ...option, isCorrect: option.localId === localId })),
    }));
  };

  const handleSaveQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedQuiz) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const quizId = getQuizId(selectedQuiz);
      if (!quizId) throw new Error("Choose a quiz before saving a question.");

      const questionPayload = {
        quiz_id: quizId,
        question_text: {
          en: questionForm.questionTextEn.trim() || questionForm.questionTextAr.trim() || "Question",
          ar: questionForm.questionTextAr.trim() || questionForm.questionTextEn.trim() || "سؤال",
        },
        type: questionForm.type,
        point: Number(questionForm.point || 5),
        order_index: Number(questionForm.orderIndex || 1),
        is_required: questionForm.isRequired,
      };

      const questionUrl = editingQuestionId ? `${QUESTIONS_API_PATH}/${editingQuestionId}` : QUESTIONS_API_PATH;
      const questionMethod = editingQuestionId ? "patch" : "post";
      const questionResponse = await axios.request({
        url: getStudentApiRequestUrl(questionUrl),
        method: questionMethod,
        headers: buildAuthHeaders(),
        data: questionPayload,
      });

      if (!isSuccessfulStatus(questionResponse.status)) {
        throw new Error(`Question save failed with status ${questionResponse.status}.`);
      }

      const questionItem = extractItem(questionResponse.data);
      if (!questionItem) throw new Error("Question response was empty.");

      const savedQuestionId = getQuestionId(questionItem);
      if (!savedQuestionId) throw new Error("Question id is missing.");

      if (questionForm.type === "multiple_choice") {
        const validOptions = questionForm.options.filter((option) => option.textEn.trim() || option.textAr.trim());
        if (validOptions.length < 2) {
          throw new Error("Add at least two options for a multiple choice question.");
        }
        if (!validOptions.some((option) => option.isCorrect)) {
          throw new Error("Select one correct option.");
        }

        const persistedOptionIds = new Set<number>();
        for (const option of validOptions) {
          const payload = {
            question_id: savedQuestionId,
            option_text: {
              en: option.textEn.trim() || option.textAr.trim() || "Option",
              ar: option.textAr.trim() || option.textEn.trim() || "خيار",
            },
            is_correct: option.isCorrect,
          };

          const optionUrl = option.id ? `${QUESTION_OPTIONS_API_PATH}/${option.id}` : QUESTION_OPTIONS_API_PATH;
          const optionMethod = option.id ? "patch" : "post";
          const optionResponse = await axios.request({
            url: getStudentApiRequestUrl(optionUrl),
            method: optionMethod,
            headers: buildAuthHeaders(),
            data: payload,
          });

          const optionItem = extractItem(optionResponse.data);
          const optionId = optionItem ? toNumber(optionItem.id) : option.id ?? null;
          if (optionId) persistedOptionIds.add(optionId);
        }

        if (editingQuestionId && selectedQuiz.questions) {
          const existingQuestion = selectedQuiz.questions.find((question) => getQuestionId(question) === editingQuestionId);
          const staleOptionIds = (existingQuestion?.options ?? [])
            .map((option) => toNumber(option.id))
            .filter((value): value is number => value !== null && !persistedOptionIds.has(value));

          for (const optionId of staleOptionIds) {
            await axios.delete(getStudentApiRequestUrl(`${QUESTION_OPTIONS_API_PATH}/${optionId}`), {
              headers: buildAuthHeaders(),
            });
          }
        }
      } else {
        const existingQuestion = editingQuestionId && selectedQuiz.questions
          ? selectedQuiz.questions.find((question) => getQuestionId(question) === editingQuestionId)
          : null;
        const existingOptions = existingQuestion?.options ?? [];

        const trueOption = existingOptions.find((option) => getOptionText(option, "en").toLowerCase() === "true");
        const falseOption = existingOptions.find((option) => getOptionText(option, "en").toLowerCase() === "false");

        const truePayload = {
          question_id: savedQuestionId,
          option_text: { en: "True", ar: "صح" },
          is_correct: questionForm.trueFalseAnswer,
        };
        const falsePayload = {
          question_id: savedQuestionId,
          option_text: { en: "False", ar: "خطأ" },
          is_correct: !questionForm.trueFalseAnswer,
        };

        await axios.request({
          url: getStudentApiRequestUrl(
            trueOption?.id ? `${QUESTION_OPTIONS_API_PATH}/${trueOption.id}` : QUESTION_OPTIONS_API_PATH
          ),
          method: trueOption?.id ? "patch" : "post",
          headers: buildAuthHeaders(),
          data: truePayload,
        });

        await axios.request({
          url: getStudentApiRequestUrl(
            falseOption?.id ? `${QUESTION_OPTIONS_API_PATH}/${falseOption.id}` : QUESTION_OPTIONS_API_PATH
          ),
          method: falseOption?.id ? "patch" : "post",
          headers: buildAuthHeaders(),
          data: falsePayload,
        });

        const staleIds = existingOptions
          .map((option) => toNumber(option.id))
          .filter(
            (value): value is number =>
              value !== null &&
              value !== toNumber(trueOption?.id) &&
              value !== toNumber(falseOption?.id)
          );

        for (const optionId of staleIds) {
          await axios.delete(getStudentApiRequestUrl(`${QUESTION_OPTIONS_API_PATH}/${optionId}`), {
            headers: buildAuthHeaders(),
          });
        }
      }

      setSuccessMessage(editingQuestionId ? "Question updated successfully." : "Question created successfully.");
      closeQuestionModal();
      await loadQuizDetails(quizId, true);
    } catch (error) {
      if (error instanceof Error && error.message === "Choose a quiz before saving a question.") {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(getErrorMessage(error, "Failed to save question."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (quiz: Quiz, question: Question) => {
    const questionId = getQuestionId(question);
    const quizId = getQuizId(quiz);
    if (!questionId || !quizId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await axios.delete(getStudentApiRequestUrl(`${QUESTIONS_API_PATH}/${questionId}`), {
        headers: buildAuthHeaders(),
      });
      setSuccessMessage("Question deleted successfully.");
      await loadQuizDetails(quizId, true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete question."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-(--background) p-4 text-(--foreground) md:p-8 lg:p-12 ${isRTL ? "text-right" : ""}`}>
      <div className="mx-auto max-w-[1500px]">
        <header className="relative mb-10 overflow-hidden rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.16),transparent_26%),linear-gradient(145deg,#060b1f_0%,#0a1026_48%,#11172f_100%)] p-6 shadow-[0_25px_90px_rgba(15,23,42,0.42)] md:p-8 lg:p-10">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)] opacity-70" />
          <div className={`relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between ${isRTL ? "xl:flex-row-reverse" : ""}`}>
            <div className="max-w-3xl">
              <div className={`mb-4 flex items-center gap-3 uppercase tracking-[0.24em] text-[10px] font-black text-indigo-200/70 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Sparkles className="h-4 w-4 text-fuchsia-300" />
                <span>Instructor Assessment Studio</span>
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl xl:text-6xl">
                Build quizzes that are fast to manage and easy to trust.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Organize every course quiz in one polished workspace, add questions without friction, and keep the structure clear for your students and your future self.
              </p>

              <div className={`mt-6 flex flex-wrap gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Quizzes</p>
                  <p className="mt-1 text-2xl font-black text-white">{quizzes.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Published</p>
                  <p className="mt-1 text-2xl font-black text-emerald-300">{publishedQuizCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Questions</p>
                  <p className="mt-1 text-2xl font-black text-violet-200">{totalQuestions}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Minutes</p>
                  <p className="mt-1 text-2xl font-black text-amber-200">{totalDurationMinutes}</p>
                </div>
              </div>
            </div>

            <div className={`relative flex flex-wrap items-center gap-3 ${isRTL ? "justify-end flex-row-reverse" : ""}`}>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white/85 backdrop-blur-xl transition duration-300 hover:border-indigo-400/40 hover:bg-white/8 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreateQuizModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#9333ea_100%)] px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(99,102,241,0.35)] transition duration-300 hover:translate-y-[-1px] hover:shadow-[0_24px_55px_rgba(99,102,241,0.45)]"
              >
                <Plus className="h-4 w-4" />
                New Quiz
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {errorMessage ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-rose-400 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-bold">{errorMessage}</p>
              </div>
              <button type="button" onClick={() => setErrorMessage(null)} className="opacity-70 transition hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : null}

          {successMessage ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-400 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <BadgeCheck className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">{successMessage}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 ${isRTL ? "right-5" : "left-5"}`} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search quizzes, descriptions, or course names..."
              className={`h-16 w-full rounded-3xl border border-slate-200/80 bg-white/90 px-14 text-sm font-bold outline-none shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition focus:border-indigo-500/50 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/[0.08] ${isRTL ? "text-right" : ""}`}
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="h-16 rounded-3xl border border-slate-200/80 bg-white/90 px-5 text-sm font-bold outline-none shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition focus:border-indigo-500/50 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/[0.08]"
          >
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={String(course.id)} value={String(toNumber(course.id) ?? course.id)}>
                {getLocalizedCourseTitle(course, currentLocale)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-[2.5rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Loading instructor quizzes...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-white/5">
            <h2 className="text-3xl font-black tracking-tight opacity-60">No quizzes found</h2>
            <p className="mt-3 text-sm opacity-40">Create your first quiz or widen your search to see more results.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredQuizzes.map((quiz) => {
              const quizId = getQuizId(quiz);
              const courseId = getCourseIdFromQuiz(quiz);
              const isExpanded = expandedQuizId === quizId;
              const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

              return (
                <div
                  key={String(quizId)}
                  className={`overflow-hidden rounded-[2rem] border bg-white shadow-[0_22px_55px_rgba(15,23,42,0.08)] transition duration-300 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)] dark:bg-[#0d1327] ${
                    isExpanded ? "border-indigo-400/40 dark:border-indigo-400/30" : "border-slate-200/90 dark:border-white/10"
                  }`}
                >
                  <div className="bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
                  <div className={`flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between lg:p-8 ${isRTL ? "lg:flex-row-reverse" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className={`mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className={`rounded-full border px-3 py-1 ${getQuizStatusClasses(quiz.status)}`}>{quiz.status || "draft"}</span>
                        <span className="rounded-full border border-slate-200/70 bg-slate-100 px-3 py-1 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300/70">
                          {courseId ? courseNameById.get(courseId) || `Course #${courseId}` : "Unlinked course"}
                        </span>
                      </div>
                      <h2 className="max-w-4xl text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white lg:text-[2.45rem]">
                        {getLocalizedValue(quiz.title, currentLocale) || "Untitled quiz"}
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300/70">
                        {getLocalizedValue(quiz.description, currentLocale) || "No description"}
                      </p>
                      <div className={`mt-5 flex flex-wrap gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
                          <FileQuestion className="h-4 w-4 text-violet-400" />
                          <span>{questions.length} Questions</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
                          <Target className="h-4 w-4 text-emerald-400" />
                          <span>{toNumber(quiz.max_score) ?? 0} Max Score</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
                          <BadgeCheck className="h-4 w-4 text-cyan-400" />
                          <span>{toNumber(quiz.passing_score) ?? 0} Pass Score</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
                          <Clock3 className="h-4 w-4 text-amber-400" />
                          <span>{toNumber(quiz.duration_minutes) ?? 0} Minutes</span>
                        </div>
                      </div>
                    </div>

                    <div className={`flex flex-wrap gap-2 lg:max-w-[440px] ${isRTL ? "justify-end" : ""}`}>
                      <button
                        type="button"
                        onClick={() => void loadQuizDetails(quizId)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-indigo-500/50 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? "Hide details" : "Show details"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openCreateQuestionModal(quiz)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed_0%,#9333ea_100%)] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_14px_34px_rgba(124,58,237,0.28)] transition hover:translate-y-[-1px]"
                      >
                        <Plus className="h-4 w-4" />
                        Add Question
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditQuizModal(quiz)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f59e0b_0%,#ea580c_100%)] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_14px_34px_rgba(234,88,12,0.22)] transition hover:translate-y-[-1px]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Quiz
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteQuiz(quiz)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f43f5e_0%,#e11d48_100%)] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_14px_34px_rgba(225,29,72,0.22)] transition hover:translate-y-[-1px] disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-slate-200/80 bg-slate-50/50 px-6 py-6 dark:border-white/10 dark:bg-[#0b1120]/70">
                      {isDetailLoading && selectedQuiz && getQuizId(selectedQuiz) === quizId ? (
                        <div className={`flex items-center gap-3 text-sm opacity-40 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading quiz details...
                        </div>
                      ) : questions.length === 0 ? (
                        <p className="text-sm opacity-50">No questions yet. Add one to start building this quiz.</p>
                      ) : (
                        <div className="space-y-4">
                          {questions.map((question, index) => (
                            <div key={String(question.id)} className="rounded-[1.75rem] border border-slate-200/90 bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.03]">
                              <div className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${isRTL ? "lg:flex-row-reverse" : ""}`}>
                                <div className="min-w-0 flex-1">
                                  <div className={`mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${isRTL ? "flex-row-reverse" : ""}`}>
                                    <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-500 dark:text-violet-300">Question {index + 1}</span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500 dark:bg-white/10 dark:text-white/60">{getQuestionTypeLabel(question.type)}</span>
                                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-500 dark:text-emerald-300">{toNumber(question.point) ?? 0} pts</span>
                                  </div>
                                  <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">
                                    {getLocalizedValue(question.question_text ?? question.text, currentLocale) || `Question #${question.id}`}
                                  </h3>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {(question.options ?? []).map((option) => (
                                      <span
                                        key={String(option.id)}
                                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                                          option.is_correct
                                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300"
                                            : "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-white/60"
                                        }`}
                                      >
                                        {getOptionText(option, currentLocale) || "Option"}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className={`flex flex-wrap gap-2 ${isRTL ? "justify-end" : ""}`}>
                                  <button
                                    type="button"
                                    onClick={() => openEditQuestionModal(quiz, question)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-sky-500"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteQuestion(quiz, question)}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-rose-500 disabled:opacity-60"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isQuizModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeQuizModal} className="absolute inset-0 bg-slate-950/70" />
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#0A0F1D]"
            >
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_28%),linear-gradient(145deg,#ffffff_0%,#f8fafc_100%)] px-8 py-7 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_28%),linear-gradient(145deg,#0b1120_0%,#0a0f1d_100%)]">
                <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Instructor Quiz Builder</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{editingQuizId ? "Refine your quiz" : "Launch a new quiz"}</h2>
                    <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300/70">
                      Set the course, scoring, and delivery details first. You can add or edit questions right after saving.
                    </p>
                  </div>
                  <button type="button" onClick={closeQuizModal} className="rounded-xl border border-slate-200 p-2 transition hover:border-indigo-500/50 dark:border-white/10">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveQuiz} className="space-y-6 px-8 py-7">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Course</label>
                      <select
                        required
                        value={quizForm.courseId}
                        onChange={(event) => setQuizForm((current) => ({ ...current, courseId: event.target.value }))}
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                      >
                        <option value="">Select course</option>
                        {courses.map((course) => (
                          <option key={String(course.id)} value={String(toNumber(course.id) ?? course.id)}>
                            {getLocalizedCourseTitle(course, currentLocale)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Title EN</label>
                        <input
                          required
                          value={quizForm.titleEn}
                          onChange={(event) => setQuizForm((current) => ({ ...current, titleEn: event.target.value }))}
                          placeholder="Quiz title in English"
                          className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Title AR</label>
                        <input
                          value={quizForm.titleAr}
                          onChange={(event) => setQuizForm((current) => ({ ...current, titleAr: event.target.value }))}
                          placeholder="Quiz title in Arabic"
                          className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Description EN</label>
                        <textarea
                          rows={5}
                          value={quizForm.descriptionEn}
                          onChange={(event) => setQuizForm((current) => ({ ...current, descriptionEn: event.target.value }))}
                          placeholder="Clear summary of what this quiz covers"
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Description AR</label>
                        <textarea
                          rows={5}
                          value={quizForm.descriptionAr}
                          onChange={(event) => setQuizForm((current) => ({ ...current, descriptionAr: event.target.value }))}
                          placeholder="Arabic quiz description"
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-5">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Quiz Settings</p>
                      <h3 className="mt-2 text-xl font-black tracking-[-0.03em]">Scoring and delivery</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Duration</label>
                        <input
                          type="number"
                          min={1}
                          value={quizForm.durationMinutes}
                          onChange={(event) => setQuizForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                          placeholder="30"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Max Score</label>
                        <input
                          type="number"
                          min={1}
                          value={quizForm.maxScore}
                          onChange={(event) => setQuizForm((current) => ({ ...current, maxScore: event.target.value }))}
                          placeholder="100"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Passing Score</label>
                        <input
                          type="number"
                          min={1}
                          value={quizForm.passingScore}
                          onChange={(event) => setQuizForm((current) => ({ ...current, passingScore: event.target.value }))}
                          placeholder="60"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Status</label>
                        <select
                          value={quizForm.status}
                          onChange={(event) => setQuizForm((current) => ({ ...current, status: event.target.value }))}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-500/50 dark:border-white/10 dark:bg-white/5"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      <label className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold dark:border-white/10 dark:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span>Enable auto grading</span>
                        <input
                          type="checkbox"
                          checked={quizForm.autoGradeEnabled}
                          onChange={(event) => setQuizForm((current) => ({ ...current, autoGradeEnabled: event.target.checked }))}
                          className="h-4 w-4 accent-indigo-600"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className={`flex flex-wrap justify-end gap-3 pt-2 ${isRTL ? "justify-start" : ""}`}>
                  <button type="button" onClick={closeQuizModal} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold dark:border-white/10">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#9333ea_100%)] px-6 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(99,102,241,0.35)] disabled:opacity-60">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingQuizId ? "Save Changes" : "Create Quiz"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isQuestionModalOpen && selectedQuiz ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeQuestionModal} className="absolute inset-0 bg-slate-950/70" />
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#0A0F1D]"
            >
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.15),transparent_28%),linear-gradient(145deg,#ffffff_0%,#f8fafc_100%)] px-8 py-7 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_28%),linear-gradient(145deg,#0b1120_0%,#0a0f1d_100%)]">
                <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-400">Instructor Question Builder</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{editingQuestionId ? "Refine this question" : "Add a high-quality question"}</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/70">
                      Quiz: {getLocalizedValue(selectedQuiz.title, currentLocale) || "Untitled quiz"}
                    </p>
                  </div>
                  <button type="button" onClick={closeQuestionModal} className="rounded-xl border border-slate-200 p-2 transition hover:border-violet-500/50 dark:border-white/10">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-6 px-8 py-7">
                <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Question EN</label>
                        <textarea
                          required
                          rows={4}
                          value={questionForm.questionTextEn}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, questionTextEn: event.target.value }))}
                          placeholder="Write the English question clearly"
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-violet-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Question AR</label>
                        <textarea
                          rows={4}
                          value={questionForm.questionTextAr}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, questionTextAr: event.target.value }))}
                          placeholder="Write the Arabic version"
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-violet-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                    </div>

                    {questionForm.type === "multiple_choice" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Answer Options</p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">Mark one option as the correct answer.</p>
                          </div>
                          <button
                            type="button"
                            onClick={addOptionDraft}
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300"
                          >
                            <Plus className="h-4 w-4" />
                            Add Option
                          </button>
                        </div>

                        {questionForm.options.map((option, index) => (
                          <div key={option.localId} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-[1fr_1fr_auto_auto]">
                            <input
                              value={option.textEn}
                              onChange={(event) => updateOptionDraft(option.localId, { textEn: event.target.value })}
                              placeholder={`Option ${index + 1} (EN)`}
                              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-violet-500/50 dark:border-white/10 dark:bg-white/5"
                            />
                            <input
                              value={option.textAr}
                              onChange={(event) => updateOptionDraft(option.localId, { textAr: event.target.value })}
                              placeholder={`Option ${index + 1} (AR)`}
                              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-violet-500/50 dark:border-white/10 dark:bg-white/5"
                            />
                            <button
                              type="button"
                              onClick={() => setCorrectOption(option.localId)}
                              className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                                option.isCorrect ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/70"
                              }`}
                            >
                              Correct
                            </button>
                            <button
                              type="button"
                              onClick={() => removeOptionDraft(option.localId)}
                              className="rounded-2xl bg-rose-100 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <label className={`flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm font-bold dark:border-white/10 dark:bg-white/[0.03] ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div>
                          <p className="font-black">True / False Answer</p>
                          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-white/50">Turn this on when the correct answer is True.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={questionForm.trueFalseAnswer}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, trueFalseAnswer: event.target.checked }))}
                          className="h-4 w-4 accent-violet-600"
                        />
                      </label>
                    )}
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-5">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Question Settings</p>
                      <h3 className="mt-2 text-xl font-black tracking-[-0.03em]">Behavior and scoring</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Type</label>
                        <select
                          value={questionForm.type}
                          onChange={(event) =>
                            setQuestionForm((current) => ({
                              ...current,
                              type: event.target.value as QuestionFormState["type"],
                              options:
                                event.target.value === "multiple_choice"
                                  ? current.options.length > 0 ? current.options : createInitialOptions()
                                  : current.options,
                            }))
                          }
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-500/50 dark:border-white/10 dark:bg-white/5"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True / False</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Point Value</label>
                        <input
                          type="number"
                          min={1}
                          value={questionForm.point}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, point: event.target.value }))}
                          placeholder="5"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/50">Order</label>
                        <input
                          type="number"
                          min={1}
                          value={questionForm.orderIndex}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, orderIndex: event.target.value }))}
                          placeholder="1"
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-500/50 dark:border-white/10 dark:bg-white/5"
                        />
                      </div>
                      <label className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold dark:border-white/10 dark:bg-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span>Required question</span>
                        <input
                          type="checkbox"
                          checked={questionForm.isRequired}
                          onChange={(event) => setQuestionForm((current) => ({ ...current, isRequired: event.target.checked }))}
                          className="h-4 w-4 accent-violet-600"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className={`flex flex-wrap justify-end gap-3 pt-2 ${isRTL ? "justify-start" : ""}`}>
                  <button type="button" onClick={closeQuestionModal} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold dark:border-white/10">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed_0%,#9333ea_100%)] px-6 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_45px_rgba(124,58,237,0.28)] disabled:opacity-60">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingQuestionId ? "Save Question" : "Create Question"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
