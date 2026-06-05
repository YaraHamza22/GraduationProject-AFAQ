"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Layers3,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiCached, getStudentApiRequestUrl, invalidateStudentApiCache } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type CourseListItem = {
  id: number | string;
  slug?: string;
  title?: string | Record<string, string>;
  title_translations?: Record<string, string>;
  description?: string | Record<string, string> | null;
  description_translations?: Record<string, string> | null;
  status?: string;
  actual_duration_hours?: number | string | null;
  creator?: { id?: number | string };
  instructors?: Array<{ id?: number | string }>;
};

type UnitItem = {
  id: number | string;
  title?: string | Record<string, string>;
  title_translations?: Record<string, string>;
  description?: string | null;
  description_translations?: Record<string, string> | null;
  unit_order?: number | string;
  actual_duration_minutes?: number | string | null;
};

type LessonItem = {
  id: number | string;
  title?: string | Record<string, string>;
  title_translations?: Record<string, string>;
  description?: string | null;
  description_translations?: Record<string, string> | null;
  lesson_order?: number | string;
  lesson_type?: string;
  is_required?: boolean | null;
  actual_duration_minutes?: number | string | null;
};

type CourseFormState = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  durationHours: string;
  status: string;
};

type UnitFormState = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  unitOrder: string;
  durationMinutes: string;
};

type LessonFormState = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  lessonOrder: string;
  lessonType: string;
  isRequired: boolean;
  durationMinutes: string;
};

type EditorState =
  | { type: "course"; mode: "edit"; courseId: number }
  | { type: "unit"; mode: "create"; courseId: number }
  | { type: "unit"; mode: "edit"; courseId: number; unitId: number }
  | { type: "lesson"; mode: "create"; courseId: number; unitId: number }
  | { type: "lesson"; mode: "edit"; courseId: number; unitId: number; lessonId: number };

const initialCourseForm: CourseFormState = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  durationHours: "",
  status: "draft",
};

const initialUnitForm: UnitFormState = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  unitOrder: "",
  durationMinutes: "",
};

const initialLessonForm: LessonFormState = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  lessonOrder: "",
  lessonType: "lecture",
  isRequired: true,
  durationMinutes: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function toStringValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getLocalizedText(primary: unknown, translations: Record<string, string> | undefined | null, language: "en" | "ar") {
  if (translations?.[language]?.trim()) return translations[language];
  if (translations?.en?.trim()) return translations.en;
  if (typeof primary === "string" && primary.trim()) return primary;
  if (isRecord(primary)) {
    const localized = primary[language];
    if (typeof localized === "string" && localized.trim()) return localized;
    const fallback = primary.en;
    if (typeof fallback === "string" && fallback.trim()) return fallback;
  }
  return "";
}

function extractList<T>(payload: unknown): T[] {
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data as T[];
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data as T[];
  return [];
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

function isOwnedByInstructor(course: CourseListItem, instructorId: number | null) {
  if (instructorId === null) return true;
  const creatorId = toNumberId(course.creator?.id);
  if (creatorId === instructorId) return true;
  if (Array.isArray(course.instructors)) {
    return course.instructors.some((instructor) => toNumberId(instructor.id) === instructorId);
  }
  return false;
}

function TreeActionMenu({
  open,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  addLabel,
}: {
  open: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-xl border border-slate-200/80 bg-white/80 p-2 text-slate-600 transition hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute end-0 top-12 z-20 min-w-[160px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_38px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#11182c]">
          {onAdd && addLabel ? (
            <button type="button" onClick={onAdd} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 dark:hover:bg-white/[0.06]">
              <Plus className="h-4 w-4" />
              {addLabel}
            </button>
          ) : null}
          {onEdit ? (
            <button type="button" onClick={onEdit} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 dark:hover:bg-white/[0.06]">
              <Pencil className="h-4 w-4" />
              Update
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function InstructorCoursesPage() {
  const { language, isRTL } = useLanguage();
  const currentLocale = language as "en" | "ar";
  const currentInstructorId = toNumberId(getStoredStudentUser()?.id);

  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [unitsByCourse, setUnitsByCourse] = useState<Record<number, UnitItem[]>>({});
  const [lessonsByUnit, setLessonsByUnit] = useState<Record<number, LessonItem[]>>({});
  const [expandedCourseIds, setExpandedCourseIds] = useState<number[]>([]);
  const [expandedUnitKeys, setExpandedUnitKeys] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(initialCourseForm);
  const [unitForm, setUnitForm] = useState<UnitFormState>(initialUnitForm);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(initialLessonForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUnitsForCourse, setLoadingUnitsForCourse] = useState<number | null>(null);
  const [loadingLessonsForUnit, setLoadingLessonsForUnit] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const loadCourses = useCallback(async (force = false) => {
    setErrorMessage(null);
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await getStudentApiCached<{ data?: unknown }>("/my-courses", {
        headers: buildAuthHeaders(),
      }, { ttlMs: 30_000, force });

      const ownCourses = extractList<CourseListItem>(response.data).filter((course) => isOwnedByInstructor(course, currentInstructorId));
      setCourses(ownCourses);
    } catch (error) {
      if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Session token is missing. Please log in again.");
      } else {
        setErrorMessage(getErrorMessage(error, "Failed to load instructor courses."));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buildAuthHeaders, currentInstructorId]);

  const loadUnits = useCallback(async (courseId: number, force = false) => {
    if (!force && unitsByCourse[courseId]) return unitsByCourse[courseId];
    setLoadingUnitsForCourse(courseId);
    try {
      const response = await getStudentApiCached<{ data?: unknown }>(`/my-courses/${courseId}/units`, {
        headers: buildAuthHeaders(),
      }, { ttlMs: 20_000, force });
      const nextUnits = extractList<UnitItem>(response.data);
      setUnitsByCourse((current) => ({ ...current, [courseId]: nextUnits }));
      return nextUnits;
    } finally {
      setLoadingUnitsForCourse((current) => (current === courseId ? null : current));
    }
  }, [buildAuthHeaders, unitsByCourse]);

  const loadLessons = useCallback(async (courseId: number, unitId: number, force = false) => {
    const unitKey = `${courseId}:${unitId}`;
    if (!force && lessonsByUnit[unitId]) return lessonsByUnit[unitId];
    setLoadingLessonsForUnit(unitKey);
    try {
      const response = await getStudentApiCached<{ data?: unknown }>(`/my-courses/${courseId}/units/${unitId}/lessons`, {
        headers: buildAuthHeaders(),
      }, { ttlMs: 15_000, force });
      const nextLessons = extractList<LessonItem>(response.data);
      setLessonsByUnit((current) => ({ ...current, [unitId]: nextLessons }));
      return nextLessons;
    } finally {
      setLoadingLessonsForUnit((current) => (current === unitKey ? null : current));
    }
  }, [buildAuthHeaders, lessonsByUnit]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (!menuKey) return;
    const onClick = () => setMenuKey(null);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menuKey]);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((course) => {
      const title = getLocalizedText(course.title, course.title_translations, currentLocale).toLowerCase();
      const description = getLocalizedText(course.description, course.description_translations, currentLocale).toLowerCase();
      return title.includes(term) || description.includes(term);
    });
  }, [courses, currentLocale, search]);

  const stats = useMemo(() => {
    const units = Object.values(unitsByCourse).reduce((sum, group) => sum + group.length, 0);
    const lessons = Object.values(lessonsByUnit).reduce((sum, group) => sum + group.length, 0);
    return {
      courses: courses.length,
      units,
      lessons,
      published: courses.filter((course) => (course.status || "").toLowerCase() === "published").length,
    };
  }, [courses, lessonsByUnit, unitsByCourse]);

  const resetForms = useCallback(() => {
    setCourseForm(initialCourseForm);
    setUnitForm(initialUnitForm);
    setLessonForm(initialLessonForm);
  }, []);

  const openCourseEditor = useCallback((course: CourseListItem) => {
    const courseId = toNumberId(course.id);
    if (!courseId) return;
    resetForms();
    setCourseForm({
      titleEn: getLocalizedText(course.title, course.title_translations, "en"),
      titleAr: getLocalizedText(course.title, course.title_translations, "ar"),
      descriptionEn: getLocalizedText(course.description, course.description_translations, "en"),
      descriptionAr: getLocalizedText(course.description, course.description_translations, "ar"),
      durationHours: toStringValue(course.actual_duration_hours),
      status: course.status || "draft",
    });
    setEditor({ type: "course", mode: "edit", courseId });
    setMenuKey(null);
  }, [resetForms]);

  const openUnitEditor = useCallback((courseId: number, unit?: UnitItem) => {
    resetForms();
    if (unit) {
      const unitId = toNumberId(unit.id);
      if (!unitId) return;
      setUnitForm({
        titleEn: getLocalizedText(unit.title, unit.title_translations, "en"),
        titleAr: getLocalizedText(unit.title, unit.title_translations, "ar"),
        descriptionEn: getLocalizedText(unit.description, unit.description_translations, "en"),
        descriptionAr: getLocalizedText(unit.description, unit.description_translations, "ar"),
        unitOrder: toStringValue(unit.unit_order),
        durationMinutes: toStringValue(unit.actual_duration_minutes),
      });
      setEditor({ type: "unit", mode: "edit", courseId, unitId });
    } else {
      setEditor({ type: "unit", mode: "create", courseId });
    }
    setMenuKey(null);
  }, [resetForms]);

  const openLessonEditor = useCallback((courseId: number, unitId: number, lesson?: LessonItem) => {
    resetForms();
    if (lesson) {
      const lessonId = toNumberId(lesson.id);
      if (!lessonId) return;
      setLessonForm({
        titleEn: getLocalizedText(lesson.title, lesson.title_translations, "en"),
        titleAr: getLocalizedText(lesson.title, lesson.title_translations, "ar"),
        descriptionEn: getLocalizedText(lesson.description, lesson.description_translations, "en"),
        descriptionAr: getLocalizedText(lesson.description, lesson.description_translations, "ar"),
        lessonOrder: toStringValue(lesson.lesson_order),
        lessonType: lesson.lesson_type || "lecture",
        isRequired: lesson.is_required !== false,
        durationMinutes: toStringValue(lesson.actual_duration_minutes),
      });
      setEditor({ type: "lesson", mode: "edit", courseId, unitId, lessonId });
    } else {
      const nextOrder = (lessonsByUnit[unitId]?.length ?? 0) + 1;
      setLessonForm((current) => ({
        ...current,
        lessonOrder: String(nextOrder),
      }));
      setEditor({ type: "lesson", mode: "create", courseId, unitId });
    }
    setMenuKey(null);
  }, [lessonsByUnit, resetForms]);

  const toggleCourse = useCallback(async (courseId: number) => {
    const isExpanded = expandedCourseIds.includes(courseId);
    if (isExpanded) {
      setExpandedCourseIds((current) => current.filter((id) => id !== courseId));
      return;
    }
    setExpandedCourseIds((current) => [...current, courseId]);
    await loadUnits(courseId);
  }, [expandedCourseIds, loadUnits]);

  const toggleUnit = useCallback(async (courseId: number, unitId: number) => {
    const key = `${courseId}:${unitId}`;
    const isExpanded = expandedUnitKeys.includes(key);
    if (isExpanded) {
      setExpandedUnitKeys((current) => current.filter((item) => item !== key));
      return;
    }
    setExpandedUnitKeys((current) => [...current, key]);
    await loadLessons(courseId, unitId);
  }, [expandedUnitKeys, loadLessons]);

  const refreshSubtree = useCallback(async (courseId: number) => {
    await loadUnits(courseId, true);
    const units = unitsByCourse[courseId] ?? [];
    const expandedKeysForCourse = expandedUnitKeys.filter((key) => key.startsWith(`${courseId}:`));
    if (expandedKeysForCourse.length > 0) {
      await Promise.all(
        units
          .map((unit) => toNumberId(unit.id))
          .filter((unitId): unitId is number => unitId !== null && expandedKeysForCourse.includes(`${courseId}:${unitId}`))
          .map((unitId) => loadLessons(courseId, unitId, true))
      );
    }
  }, [expandedUnitKeys, loadLessons, loadUnits, unitsByCourse]);

  const handleDeleteCourse = useCallback(async (courseId: number) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(getStudentApiRequestUrl(`/my-courses/${courseId}`), {
        headers: buildAuthHeaders(),
      });
      invalidateStudentApiCache("/my-courses");
      invalidateStudentApiCache(`/my-courses/${courseId}`);
      setCourses((current) => current.filter((course) => toNumberId(course.id) !== courseId));
      setExpandedCourseIds((current) => current.filter((id) => id !== courseId));
      setSuccessMessage("Course deleted successfully.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete course."));
    } finally {
      setIsSubmitting(false);
      setMenuKey(null);
    }
  }, [buildAuthHeaders]);

  const handleDeleteUnit = useCallback(async (courseId: number, unitId: number) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(getStudentApiRequestUrl(`/my-courses/${courseId}/units/${unitId}`), {
        headers: buildAuthHeaders(),
      });
      invalidateStudentApiCache(`/my-courses/${courseId}/units`);
      setUnitsByCourse((current) => ({
        ...current,
        [courseId]: (current[courseId] ?? []).filter((unit) => toNumberId(unit.id) !== unitId),
      }));
      setLessonsByUnit((current) => {
        const next = { ...current };
        delete next[unitId];
        return next;
      });
      setExpandedUnitKeys((current) => current.filter((key) => key !== `${courseId}:${unitId}`));
      setSuccessMessage("Unit deleted successfully.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete unit."));
    } finally {
      setIsSubmitting(false);
      setMenuKey(null);
    }
  }, [buildAuthHeaders]);

  const handleDeleteLesson = useCallback(async (courseId: number, unitId: number, lessonId: number) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(getStudentApiRequestUrl(`/my-courses/${courseId}/units/${unitId}/lessons/${lessonId}`), {
        headers: buildAuthHeaders(),
      });
      invalidateStudentApiCache(`/my-courses/${courseId}/units/${unitId}/lessons`);
      setLessonsByUnit((current) => ({
        ...current,
        [unitId]: (current[unitId] ?? []).filter((lesson) => toNumberId(lesson.id) !== lessonId),
      }));
      setSuccessMessage("Lesson deleted successfully.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete lesson."));
    } finally {
      setIsSubmitting(false);
      setMenuKey(null);
    }
  }, [buildAuthHeaders]);

  const handleSaveEditor = useCallback(async () => {
    if (!editor) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (editor.type === "course") {
        const titleEn = courseForm.titleEn.trim();
        const titleAr = courseForm.titleAr.trim();
        const descriptionEn = courseForm.descriptionEn.trim();
        const descriptionAr = courseForm.descriptionAr.trim();
        const payload = {
          title: titleEn || titleAr || "Course",
          title_translations: {
            en: titleEn || titleAr || "Course",
            ar: titleAr || titleEn || "Course",
          },
          description: descriptionEn || descriptionAr || "",
          description_translations: {
            en: descriptionEn || descriptionAr || "",
            ar: descriptionAr || descriptionEn || "",
          },
          actual_duration_hours: Number(courseForm.durationHours || 0),
          status: courseForm.status || "draft",
        };

        await axios.put(getStudentApiRequestUrl(`/my-courses/${editor.courseId}`), payload, {
          headers: buildAuthHeaders(),
        });

        invalidateStudentApiCache("/my-courses");
        setSuccessMessage("Course updated successfully.");
        await loadCourses(true);
      }

      if (editor.type === "unit") {
        const titleEn = unitForm.titleEn.trim();
        const titleAr = unitForm.titleAr.trim();
        const descriptionEn = unitForm.descriptionEn.trim();
        const descriptionAr = unitForm.descriptionAr.trim();
        const payload = {
          title: titleEn || titleAr || "Unit",
          title_translations: {
            en: titleEn || titleAr || "Unit",
            ar: titleAr || titleEn || "Unit",
          },
          description: descriptionEn || descriptionAr || "",
          description_translations: {
            en: descriptionEn || descriptionAr || "",
            ar: descriptionAr || descriptionEn || "",
          },
          unit_order: Number(unitForm.unitOrder || (unitsByCourse[editor.courseId]?.length ?? 0) + 1),
          actual_duration_minutes: Number(unitForm.durationMinutes || 0),
        };

        const url =
          editor.mode === "edit"
            ? `/my-courses/${editor.courseId}/units/${editor.unitId}`
            : `/my-courses/${editor.courseId}/units`;
        const method = editor.mode === "edit" ? "put" : "post";

        await axios.request({
          url: getStudentApiRequestUrl(url),
          method,
          headers: buildAuthHeaders(),
          data: payload,
        });

        invalidateStudentApiCache(`/my-courses/${editor.courseId}/units`);
        setSuccessMessage(editor.mode === "edit" ? "Unit updated successfully." : "Unit created successfully.");
        await loadUnits(editor.courseId, true);
      }

      if (editor.type === "lesson") {
        const titleEn = lessonForm.titleEn.trim();
        const titleAr = lessonForm.titleAr.trim();
        const descriptionEn = lessonForm.descriptionEn.trim();
        const descriptionAr = lessonForm.descriptionAr.trim();
        const payload = {
          course_id: editor.courseId,
          unit_id: editor.unitId,
          title: titleEn || titleAr || "Lesson",
          title_translations: {
            en: titleEn || titleAr || "Lesson",
            ar: titleAr || titleEn || "Lesson",
          },
          description: descriptionEn || descriptionAr || "",
          description_translations: {
            en: descriptionEn || descriptionAr || "",
            ar: descriptionAr || descriptionEn || "",
          },
          lesson_order: Number(lessonForm.lessonOrder || (lessonsByUnit[editor.unitId]?.length ?? 0) + 1),
          lesson_type: lessonForm.lessonType || "lecture",
          is_required: lessonForm.isRequired,
          actual_duration_minutes: Number(lessonForm.durationMinutes || 0),
        };

        const url =
          editor.mode === "edit"
            ? `/my-courses/${editor.courseId}/units/${editor.unitId}/lessons/${editor.lessonId}`
            : `/my-courses/${editor.courseId}/units/${editor.unitId}/lessons`;
        const method = editor.mode === "edit" ? "put" : "post";

        await axios.request({
          url: getStudentApiRequestUrl(url),
          method,
          headers: buildAuthHeaders(),
          data: payload,
        });

        invalidateStudentApiCache(`/my-courses/${editor.courseId}/units/${editor.unitId}/lessons`);
        setSuccessMessage(editor.mode === "edit" ? "Lesson updated successfully." : "Lesson created successfully.");
        await loadLessons(editor.courseId, editor.unitId, true);
      }

      setEditor(null);
      resetForms();
    } catch (error) {
      if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Session token is missing. Please log in again.");
      } else {
        setErrorMessage(getErrorMessage(error, "Failed to save changes."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [buildAuthHeaders, courseForm, editor, lessonForm, lessonsByUnit, loadCourses, loadLessons, loadUnits, resetForms, unitForm, unitsByCourse]);

  return (
    <div className={`min-h-screen bg-(--background) p-4 text-(--foreground) md:p-8 ${isRTL ? "text-right" : ""}`}>
      <div className="mx-auto max-w-[1500px]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[linear-gradient(145deg,#091224_0%,#101937_42%,#1f2a54_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.34)] md:p-8 lg:p-10">
          <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl" />
          <div className={`relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between ${isRTL ? "xl:flex-row-reverse" : ""}`}>
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/80">
                <BookOpen className="h-3.5 w-3.5" />
                Instructor Course Tree
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] md:text-6xl">
                Manage courses, units, and lessons in one professional tree.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Fast first load, lazy subtree expansion, and focused editing flows. Courses load first, units open on demand, and lessons only load when a unit is expanded.
              </p>
            </div>

            <div className={`flex flex-wrap gap-3 ${isRTL ? "justify-end" : ""}`}>
              <button
                type="button"
                onClick={() => void loadCourses(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white/90 transition hover:bg-white/10 disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Courses", value: stats.courses, accent: "text-cyan-600 dark:text-cyan-300", icon: BookOpen },
            { label: "Units", value: stats.units, accent: "text-violet-600 dark:text-violet-300", icon: Layers3 },
            { label: "Lessons", value: stats.lessons, accent: "text-fuchsia-600 dark:text-fuchsia-300", icon: FileText },
            { label: "Published", value: stats.published, accent: "text-emerald-600 dark:text-emerald-300", icon: Clock3 },
          ].map((card) => (
            <div key={card.label} className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/[0.06]">
                  <card.icon className={`h-5 w-5 ${card.accent}`} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Live</span>
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/50">{card.label}</p>
              <p className={`mt-1 text-4xl font-black tracking-tight ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {errorMessage ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300"
            >
              {errorMessage}
            </motion.div>
          ) : null}
          {successMessage ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
            >
              {successMessage}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
          <div className="relative max-w-xl">
            <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRTL ? "right-4" : "left-4"}`} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses by title or description"
              className={`h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 text-sm font-semibold outline-none transition focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03] ${isRTL ? "text-right" : ""}`}
            />
          </div>
        </div>

        <section className="mt-8 rounded-[2.25rem] border border-slate-200 bg-white/90 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04] md:p-6">
          <div className={`mb-5 flex items-center justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">Tree Workspace</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Courses with lazy subtrees</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
              GET /my-courses first, subtree on demand
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Loading course tree</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              No courses match the current search.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCourses.map((course) => {
                const courseId = toNumberId(course.id);
                if (!courseId) return null;
                const courseExpanded = expandedCourseIds.includes(courseId);
                const courseUnits = unitsByCourse[courseId] ?? [];
                const title = getLocalizedText(course.title, course.title_translations, currentLocale) || `Course #${courseId}`;
                const description = getLocalizedText(course.description, course.description_translations, currentLocale) || "No description available.";

                return (
                  <div key={courseId} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.96))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                    <div className={`flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between ${isRTL ? "md:flex-row-reverse" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className={`mb-3 flex flex-wrap items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                            {course.status || "draft"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
                            {Number(course.actual_duration_hours ?? 0)} hours
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleCourse(courseId)}
                          className={`flex items-center gap-3 text-left ${isRTL ? "flex-row-reverse" : ""}`}
                        >
                          {courseExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                          <div>
                            <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">{title}</h3>
                            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300/75">{description}</p>
                          </div>
                        </button>
                      </div>

                      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <button
                          type="button"
                          onClick={() => void refreshSubtree(courseId)}
                          className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70"
                        >
                          Refresh
                        </button>
                        <div onClick={(event) => event.stopPropagation()}>
                          <TreeActionMenu
                            open={menuKey === `course:${courseId}`}
                            onToggle={() => setMenuKey((current) => (current === `course:${courseId}` ? null : `course:${courseId}`))}
                            onAdd={() => openUnitEditor(courseId)}
                            addLabel="Add Unit"
                            onEdit={() => openCourseEditor(course)}
                            onDelete={() => void handleDeleteCourse(courseId)}
                          />
                        </div>
                      </div>
                    </div>

                    {courseExpanded ? (
                      <div className="border-t border-slate-200/80 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.02] md:px-6">
                        {loadingUnitsForCourse === courseId ? (
                          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading units...
                          </div>
                        ) : courseUnits.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                            No units yet for this course.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {courseUnits.map((unit) => {
                              const unitId = toNumberId(unit.id);
                              if (!unitId) return null;
                              const unitExpanded = expandedUnitKeys.includes(`${courseId}:${unitId}`);
                              const unitLessons = lessonsByUnit[unitId] ?? [];

                              return (
                                <div key={unitId} className="rounded-[1.7rem] border border-slate-200 bg-white/95 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/[0.03]">
                                  <div className={`flex flex-col gap-3 md:flex-row md:items-start md:justify-between ${isRTL ? "md:flex-row-reverse" : ""}`}>
                                    <button
                                      type="button"
                                      onClick={() => void toggleUnit(courseId, unitId)}
                                      className={`flex items-start gap-3 text-left ${isRTL ? "flex-row-reverse" : ""}`}
                                    >
                                      {unitExpanded ? <ChevronDown className="mt-1 h-4 w-4 text-slate-400" /> : <ChevronRight className="mt-1 h-4 w-4 text-slate-400" />}
                                      <div>
                                        <div className={`mb-2 flex flex-wrap items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                                          <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
                                            Unit {Number(unit.unit_order ?? 0) || unitId}
                                          </span>
                                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
                                            {Number(unit.actual_duration_minutes ?? 0)} min
                                          </span>
                                        </div>
                                        <h4 className="text-lg font-black tracking-[-0.03em] text-slate-900 dark:text-white">
                                          {getLocalizedText(unit.title, unit.title_translations, currentLocale) || `Unit #${unitId}`}
                                        </h4>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                                          {getLocalizedText(unit.description, unit.description_translations, currentLocale) || "No unit description."}
                                        </p>
                                      </div>
                                    </button>

                                    <div onClick={(event) => event.stopPropagation()}>
                                      <TreeActionMenu
                                        open={menuKey === `unit:${courseId}:${unitId}`}
                                        onToggle={() => setMenuKey((current) => (current === `unit:${courseId}:${unitId}` ? null : `unit:${courseId}:${unitId}`))}
                                        onAdd={() => openLessonEditor(courseId, unitId)}
                                        addLabel="Add Lesson"
                                        onEdit={() => openUnitEditor(courseId, unit)}
                                        onDelete={() => void handleDeleteUnit(courseId, unitId)}
                                      />
                                    </div>
                                  </div>

                                  {unitExpanded ? (
                                    <div className="mt-4 border-s border-slate-200 ps-4 dark:border-white/10">
                                      {loadingLessonsForUnit === `${courseId}:${unitId}` ? (
                                        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Loading lessons...
                                        </div>
                                      ) : unitLessons.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                                          No lessons yet for this unit.
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          {unitLessons.map((lesson) => {
                                            const lessonId = toNumberId(lesson.id);
                                            if (!lessonId) return null;
                                            return (
                                              <div key={lessonId} className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.025]">
                                                <div className={`flex flex-col gap-3 md:flex-row md:items-start md:justify-between ${isRTL ? "md:flex-row-reverse" : ""}`}>
                                                  <div className="min-w-0">
                                                    <div className={`mb-2 flex flex-wrap items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                                                      <span className="rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-500 dark:text-fuchsia-300">
                                                        Lesson {Number(lesson.lesson_order ?? 0) || lessonId}
                                                      </span>
                                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
                                                        {lesson.lesson_type || "lecture"}
                                                      </span>
                                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
                                                        {Number(lesson.actual_duration_minutes ?? 0)} min
                                                      </span>
                                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${lesson.is_required !== false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600 dark:text-amber-300"}`}>
                                                        {lesson.is_required !== false ? "Required" : "Optional"}
                                                      </span>
                                                    </div>
                                                    <h5 className="text-base font-black tracking-[-0.02em] text-slate-900 dark:text-white">
                                                      {getLocalizedText(lesson.title, lesson.title_translations, currentLocale) || `Lesson #${lessonId}`}
                                                    </h5>
                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                                                      {getLocalizedText(lesson.description, lesson.description_translations, currentLocale) || "No lesson description."}
                                                    </p>
                                                  </div>

                                                  <div onClick={(event) => event.stopPropagation()}>
                                                    <TreeActionMenu
                                                      open={menuKey === `lesson:${courseId}:${unitId}:${lessonId}`}
                                                      onToggle={() => setMenuKey((current) => (current === `lesson:${courseId}:${unitId}:${lessonId}` ? null : `lesson:${courseId}:${unitId}:${lessonId}`))}
                                                      onEdit={() => openLessonEditor(courseId, unitId, lesson)}
                                                      onDelete={() => void handleDeleteLesson(courseId, unitId, lessonId)}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
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
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {editor ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/70" onClick={() => !isSubmitting && setEditor(null)} />
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#0d1327]"
            >
              <div className="border-b border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5 dark:border-white/10 dark:bg-[linear-gradient(145deg,#11182c_0%,#0d1327_100%)]">
                <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-500">
                      {editor.type === "course" ? "Course Editor" : editor.type === "unit" ? "Unit Editor" : "Lesson Editor"}
                    </p>
                    <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                      {editor.mode === "edit" ? "Update item" : "Create item"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setEditor(null)}
                    className="rounded-xl border border-slate-200 p-2 transition hover:border-slate-300 dark:border-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                {editor.type === "course" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input value={courseForm.titleEn} onChange={(event) => setCourseForm((current) => ({ ...current, titleEn: event.target.value }))} placeholder="Course title (EN)" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <input value={courseForm.titleAr} onChange={(event) => setCourseForm((current) => ({ ...current, titleAr: event.target.value }))} placeholder="Course title (AR)" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <textarea rows={4} value={courseForm.descriptionEn} onChange={(event) => setCourseForm((current) => ({ ...current, descriptionEn: event.target.value }))} placeholder="Description (EN)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <textarea rows={4} value={courseForm.descriptionAr} onChange={(event) => setCourseForm((current) => ({ ...current, descriptionAr: event.target.value }))} placeholder="Description (AR)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input type="number" value={courseForm.durationHours} onChange={(event) => setCourseForm((current) => ({ ...current, durationHours: event.target.value }))} placeholder="Duration hours" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <select value={courseForm.status} onChange={(event) => setCourseForm((current) => ({ ...current, status: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </>
                ) : null}

                {editor.type === "unit" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input value={unitForm.titleEn} onChange={(event) => setUnitForm((current) => ({ ...current, titleEn: event.target.value }))} placeholder="Unit title (EN)" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <input value={unitForm.titleAr} onChange={(event) => setUnitForm((current) => ({ ...current, titleAr: event.target.value }))} placeholder="Unit title (AR)" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <textarea rows={4} value={unitForm.descriptionEn} onChange={(event) => setUnitForm((current) => ({ ...current, descriptionEn: event.target.value }))} placeholder="Description (EN)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <textarea rows={4} value={unitForm.descriptionAr} onChange={(event) => setUnitForm((current) => ({ ...current, descriptionAr: event.target.value }))} placeholder="Description (AR)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input type="number" value={unitForm.unitOrder} onChange={(event) => setUnitForm((current) => ({ ...current, unitOrder: event.target.value }))} placeholder="Unit order" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <input type="number" value={unitForm.durationMinutes} onChange={(event) => setUnitForm((current) => ({ ...current, durationMinutes: event.target.value }))} placeholder="Duration minutes" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                  </>
                ) : null}

                {editor.type === "lesson" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input value={lessonForm.titleEn} onChange={(event) => setLessonForm((current) => ({ ...current, titleEn: event.target.value }))} placeholder="Lesson title (EN)" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <input value={lessonForm.titleAr} onChange={(event) => setLessonForm((current) => ({ ...current, titleAr: event.target.value }))} placeholder="Lesson title (AR)" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <textarea rows={4} value={lessonForm.descriptionEn} onChange={(event) => setLessonForm((current) => ({ ...current, descriptionEn: event.target.value }))} placeholder="Description (EN)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                      <textarea rows={4} value={lessonForm.descriptionAr} onChange={(event) => setLessonForm((current) => ({ ...current, descriptionAr: event.target.value }))} placeholder="Description (AR)" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input type="number" value={lessonForm.lessonOrder} readOnly placeholder="Lesson order" className="h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500 outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-white/55" />
                      <input type="number" value={lessonForm.durationMinutes} onChange={(event) => setLessonForm((current) => ({ ...current, durationMinutes: event.target.value }))} placeholder="Duration minutes" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <select value={lessonForm.lessonType} onChange={(event) => setLessonForm((current) => ({ ...current, lessonType: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-indigo-500/40 dark:border-white/10 dark:bg-white/[0.03]">
                        <option value="lecture">Lecture</option>
                        <option value="practice">Practice</option>
                        <option value="video">Video</option>
                        <option value="quiz">Quiz</option>
                      </select>
                      <label className="inline-flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.03]">
                        <input type="checkbox" checked={lessonForm.isRequired} onChange={(event) => setLessonForm((current) => ({ ...current, isRequired: event.target.checked }))} className="h-4 w-4 accent-indigo-600" />
                        Required lesson
                      </label>
                    </div>
                  </>
                ) : null}
              </div>

              <div className={`flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10 ${isRTL ? "justify-start" : ""}`}>
                <button type="button" onClick={() => setEditor(null)} disabled={isSubmitting} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold dark:border-white/10">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleSaveEditor()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#9333ea_100%)] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_40px_rgba(79,70,229,0.28)] disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
