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

type FormState = {
  title: string;
  description: string;
  lesson_type: string;
  is_required: boolean;
  actual_duration_minutes: string;
  lesson_order: string;
};

const LESSONS_API_PATH = "/super-admin/lessons";
const UNITS_API_PATH = "/super-admin/units";
const COURSES_API_PATH = "/super-admin/courses";
const QUIZZES_API_PATH = "/super-admin/quizzes";
const QUIZ_INSTRUCTOR_ID = 1;

const initialForm: FormState = {
  title: "",
  description: "",
  lesson_type: "video",
  is_required: true,
  actual_duration_minutes: "30",
  lesson_order: "",
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
  if (isRecord(payload)) return payload;
  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return "Cannot reach server. Please check your connection.";
  const msg = error.response.data?.message;
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

  const getHeaders = useCallback((locale?: string) => {
    const token = getAdminToken();
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(locale ? { "Accept-Language": locale, "X-Locale": locale } : {}),
    };
  }, []);

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

  const createQuiz = useCallback(async (options?: { lessonId?: string | number; title?: string; description?: string; durationMinutes?: number }) => {
    const resolvedTitle = options?.title ?? form.title.trim();
    const resolvedDescription = options?.description ?? form.description.trim();
    const resolvedDuration = options?.durationMinutes ?? Number(form.actual_duration_minutes || 30);
    const payload = {
      title: {
        en: resolvedTitle,
        ar: resolvedTitle,
      },
      description: {
        en: resolvedDescription,
        ar: resolvedDescription,
      },
      max_score: 100,
      passing_score: 60,
      type: "quiz",
      status: "draft",
      instructor_id: QUIZ_INSTRUCTOR_ID,
      quizable_type: "course",
      quizable_id: Number(courseId),
      auto_grade_enabled: true,
      duration_minutes: resolvedDuration,
    };

    const res = await axios.post(getAdminApiRequestUrl(QUIZZES_API_PATH), payload, {
      headers: getHeaders(currentLocale),
    });
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

  const deleteQuiz = useCallback(async (quizId: string | number) => {
    await axios.delete(getAdminApiRequestUrl(`${QUIZZES_API_PATH}/${quizId}`), {
      headers: getHeaders(currentLocale),
    });
  }, [currentLocale, getHeaders]);

  const publishQuiz = useCallback(async (quizId: string | number) => {
    await axios.post(getAdminApiRequestUrl(`${QUIZZES_API_PATH}/${quizId}/publish`), {}, {
      headers: getHeaders(currentLocale),
    });
  }, [currentLocale, getHeaders]);

  const unpublishQuiz = useCallback(async (quizId: string | number) => {
    await axios.post(getAdminApiRequestUrl(`${QUIZZES_API_PATH}/${quizId}/unpublish`), {}, {
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
        setLessonQuizMap(nextMap);
      } catch {
        // Quiz linking is optional for rendering lessons.
      }
    };

    if (courseId && unitId) {
      void loadQuizLinks();
    }
  }, [courseId, getAllQuizzes, listQuizzes, unitId]);

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
            const createdQuiz = await createQuiz({ lessonId: getLessonId(editingLesson) });
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

  const handlePublishQuiz = async (lesson: Lesson) => {
    try {
      const lessonKey = String(getLessonId(lesson));
      const lessonQuizzes = lessonQuizMap[lessonKey] || [];
      const linkedQuiz = lessonQuizzes[lessonQuizzes.length - 1] || lessonQuizMap.unlinked?.[0];
      if (!linkedQuiz) {
        setListError("No linked quiz found for this lesson.");
        return;
      }
      await publishQuiz(getQuizId(linkedQuiz));
      setSuccessMessage("Quiz published successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to publish quiz."));
    }
  };

  const handleUnpublishQuiz = async (lesson: Lesson) => {
    try {
      const lessonKey = String(getLessonId(lesson));
      const lessonQuizzes = lessonQuizMap[lessonKey] || [];
      const linkedQuiz = lessonQuizzes[lessonQuizzes.length - 1] || lessonQuizMap.unlinked?.[0];
      if (!linkedQuiz) {
        setListError("No linked quiz found for this lesson.");
        return;
      }
      await unpublishQuiz(getQuizId(linkedQuiz));
      setSuccessMessage("Quiz unpublished successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to unpublish quiz."));
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

  const handleCreateQuizForLesson = async (lesson: Lesson) => {
    try {
      const lessonId = getLessonId(lesson);
      const lessonTitle = getLocalizedValue(lesson.title, currentLocale) || `Lesson ${lessonId}`;
      const lessonDescription = getLocalizedValue(lesson.description, currentLocale) || lessonTitle;

      const createdQuiz = await createQuiz({
        lessonId,
        title: lessonTitle,
        description: lessonDescription,
        durationMinutes: Number(lesson.actual_duration_minutes ?? 30),
      });

      if (!createdQuiz) {
        setListError("Quiz was not created. Empty response from server.");
        return;
      }

      const lessonKey = String(lessonId);
      setLessonQuizMap((prev) => ({
        ...prev,
        [lessonKey]: [...(prev[lessonKey] || []), createdQuiz],
      }));
      setSuccessMessage("Quiz created for this lesson.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to create quiz for this lesson."));
    }
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
                      <button
                        type="button"
                        onClick={() => void handleCreateQuizForLesson(lesson)}
                        className="group relative inline-flex items-center gap-2.5 rounded-2xl border border-indigo-300/80 dark:border-indigo-400/40 bg-gradient-to-r from-indigo-600 to-blue-600 px-4.5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/35 active:translate-y-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white/95 group-hover:rotate-12 transition-transform" />
                        <span>Create Quiz</span>
                      </button>
                      {((lesson.lesson_type || "").toLowerCase() === "quiz" || (lessonQuizMap[String(getLessonId(lesson))] || []).length > 0) && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handlePublishQuiz(lesson)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                          >
                            Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleUnpublishQuiz(lesson)}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                          >
                            Unpublish
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
                </div>
              ))}
          </div>
        )}
      </div>

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
