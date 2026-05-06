"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BookOpen, Clock, FileText, Layers, Pencil, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type CourseListItem = {
  id: number | string;
  title?: string;
  title_translations?: Record<string, string>;
  description?: string;
  description_translations?: Record<string, string>;
  status?: string;
  actual_duration_hours?: number | string | null;
  units?: Array<{ id?: number | string; title?: string; title_translations?: Record<string, string> }>;
  creator?: { id?: number | string };
  instructors?: Array<{ id?: number | string }>;
};

type CourseDetails = CourseListItem & {
  objectives?: string;
  prerequisites?: string;
};

type UnitItem = {
  id: number | string;
  title?: string | Record<string, string>;
  title_translations?: Record<string, string>;
  description?: string;
  description_translations?: Record<string, string>;
  unit_order?: number;
  actual_duration_minutes?: number;
};

type UnitFormState = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  unitOrder: string;
  durationMinutes: string;
};

type LessonItem = {
  id: number | string;
  title?: string;
  title_translations?: Record<string, string>;
  description?: string | null;
  description_translations?: Record<string, string> | null;
  lesson_order?: number;
  lesson_type?: string;
  is_required?: boolean | null;
  actual_duration_minutes?: number;
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

function getLocalizedText(
  primary: unknown,
  translations: Record<string, string> | undefined,
  language: "en" | "ar"
) {
  if (translations?.[language]?.trim()) return translations[language];
  if (translations?.en?.trim()) return translations.en;
  if (typeof primary === "string" && primary.trim()) return primary;
  if (primary && typeof primary === "object" && !Array.isArray(primary)) {
    const localized = (primary as Record<string, unknown>)[language];
    if (typeof localized === "string" && localized.trim()) return localized;
    const fallback = (primary as Record<string, unknown>).en;
    if (typeof fallback === "string" && fallback.trim()) return fallback;
  }
  return "";
}

function getTranslationValue(value: unknown, locale: "en" | "ar") {
  if (typeof value === "string") {
    return locale === "en" ? value : "";
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = (value as Record<string, unknown>)[locale];
    return typeof candidate === "string" ? candidate : "";
  }
  return "";
}

function extractList(payload: unknown): CourseListItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown };
  if (Array.isArray(root.data)) return root.data as CourseListItem[];
  if (root.data && typeof root.data === "object") {
    const nested = root.data as { data?: unknown };
    if (Array.isArray(nested.data)) return nested.data as CourseListItem[];
  }
  return [];
}

function toNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
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

export default function InstructorCoursesPage() {
  const { t, language } = useLanguage();
  const currentInstructorId = toNumberId(getStoredStudentUser()?.id);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [selected, setSelected] = useState<CourseDetails | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | string | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [isUnitsLoading, setIsUnitsLoading] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<number | string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | string | null>(null);
  const [unitForm, setUnitForm] = useState<UnitFormState>({
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    unitOrder: "",
    durationMinutes: "",
  });
  const [isUnitSubmitting, setIsUnitSubmitting] = useState(false);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [lessonsCount, setLessonsCount] = useState(0);
  const [isLessonsLoading, setIsLessonsLoading] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | string | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState<LessonFormState>({
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    lessonOrder: "",
    lessonType: "lecture",
    isRequired: true,
    durationMinutes: "",
  });
  const [isLessonSubmitting, setIsLessonSubmitting] = useState(false);

  const loadCourses = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const response = await axios.get(getStudentApiRequestUrl("/my-courses"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const allCourses = extractList(response.data);
      const ownCourses = allCourses.filter((course) => isOwnedByInstructor(course, currentInstructorId));
      setCourses(ownCourses);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load courses.");
      } else if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Session token is missing. Please log in again.");
      } else {
        setErrorMessage("Failed to load courses.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetUnitForm = () => {
    setEditingUnitId(null);
    setUnitForm({
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      unitOrder: "",
      durationMinutes: "",
    });
  };

  const buildAuthHeaders = () => {
    const token = getStudentToken();
    if (!token) throw new Error("missing_token");
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Accept-Language": language,
      "X-Locale": language,
    };
  };

  const extractUnitsList = (payload: unknown): UnitItem[] => {
    if (!payload || typeof payload !== "object") return [];
    const root = payload as { data?: unknown };
    if (Array.isArray(root.data)) return root.data as UnitItem[];
    if (root.data && typeof root.data === "object") {
      const nested = root.data as { data?: unknown };
      if (Array.isArray(nested.data)) return nested.data as UnitItem[];
    }
    return [];
  };

  const extractLessonsList = (payload: unknown): LessonItem[] => {
    if (!payload || typeof payload !== "object") return [];
    const root = payload as { data?: unknown };
    if (Array.isArray(root.data)) return root.data as LessonItem[];
    if (root.data && typeof root.data === "object") {
      const nested = root.data as { data?: unknown };
      if (Array.isArray(nested.data)) return nested.data as LessonItem[];
    }
    return [];
  };

  const extractLessonsCount = (payload: unknown): number => {
    if (!payload || typeof payload !== "object") return 0;
    const root = payload as { data?: unknown };
    if (root.data && typeof root.data === "object") {
      const data = root.data as { lessons_count?: unknown };
      const count = Number(data.lessons_count ?? 0);
      return Number.isFinite(count) ? count : 0;
    }
    return 0;
  };

  const resetLessonForm = () => {
    setEditingLessonId(null);
    setLessonForm({
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
      lessonOrder: "",
      lessonType: "lecture",
      isRequired: true,
      durationMinutes: "",
    });
  };

  const openCreateLessonModal = () => {
    resetLessonForm();
    setIsLessonModalOpen(true);
  };

  const closeLessonModal = () => {
    setIsLessonModalOpen(false);
    resetLessonForm();
  };

  const loadUnits = async (courseId: number | string) => {
    setIsUnitsLoading(true);
    setErrorMessage(null);
    try {
      const response = await axios.get(getStudentApiRequestUrl(`/my-courses/${courseId}/units`), {
        headers: buildAuthHeaders(),
      });
      setUnits(extractUnitsList(response.data));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load units.");
      } else {
        setErrorMessage("Failed to load units.");
      }
    } finally {
      setIsUnitsLoading(false);
    }
  };

  const loadLessons = async (courseId: number | string, unitId: number | string) => {
    setIsLessonsLoading(true);
    setErrorMessage(null);
    try {
      const [listRes, countRes] = await Promise.all([
        axios.get(getStudentApiRequestUrl(`/my-courses/${courseId}/units/${unitId}/lessons`), {
          headers: buildAuthHeaders(),
        }),
        axios.get(getStudentApiRequestUrl(`/my-courses/${courseId}/units/${unitId}/lessons/count`), {
          headers: buildAuthHeaders(),
        }),
      ]);

      setLessons(extractLessonsList(listRes.data));
      setLessonsCount(extractLessonsCount(countRes.data));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load lessons.");
      } else {
        setErrorMessage("Failed to load lessons.");
      }
    } finally {
      setIsLessonsLoading(false);
    }
  };

  const selectUnitForLessons = async (unitId: number | string) => {
    if (!selectedCourseId) return;
    setSelectedUnitId(unitId);
    setSuccessMessage(null);
    setErrorMessage(null);
    resetLessonForm();
    await loadLessons(selectedCourseId, unitId);
  };

  const getLessonById = async (lessonId: number | string) => {
    if (!selectedCourseId || !selectedUnitId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await axios.get(
        getStudentApiRequestUrl(`/my-courses/${selectedCourseId}/units/${selectedUnitId}/lessons/${lessonId}`),
        { headers: buildAuthHeaders() }
      );

      const lesson = (response.data?.data ?? null) as LessonItem | null;
      if (!lesson) return;

      setEditingLessonId(lesson.id);
      setLessonForm({
        titleEn: lesson.title_translations?.en ?? lesson.title ?? "",
        titleAr: lesson.title_translations?.ar ?? "",
        descriptionEn: lesson.description_translations?.en ?? (typeof lesson.description === "string" ? lesson.description : ""),
        descriptionAr: lesson.description_translations?.ar ?? "",
        lessonOrder: typeof lesson.lesson_order === "number" ? String(lesson.lesson_order) : "",
        lessonType: lesson.lesson_type ?? "lecture",
        isRequired: lesson.is_required !== false,
        durationMinutes:
          typeof lesson.actual_duration_minutes === "number"
            ? String(lesson.actual_duration_minutes)
            : "",
      });
      setIsLessonModalOpen(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load lesson.");
      } else {
        setErrorMessage("Failed to load lesson.");
      }
    }
  };

  const createLesson = async () => {
    if (!selectedCourseId || !selectedUnitId) return;
    setIsLessonSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const titleEn = lessonForm.titleEn.trim();
      const titleAr = lessonForm.titleAr.trim();
      const descriptionEn = lessonForm.descriptionEn.trim();
      const descriptionAr = lessonForm.descriptionAr.trim();
      const payload = {
        course_id: Number(selectedCourseId),
        unit_id: Number(selectedUnitId),
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
        lesson_order: Number(lessonForm.lessonOrder || lessons.length + 1),
        lesson_type: lessonForm.lessonType || "lecture",
        is_required: lessonForm.isRequired,
        actual_duration_minutes: Number(lessonForm.durationMinutes || 0),
      };

      await axios.post(
        getStudentApiRequestUrl(`/my-courses/${selectedCourseId}/units/${selectedUnitId}/lessons`),
        payload,
        { headers: buildAuthHeaders() }
      );

      setSuccessMessage("Lesson created successfully.");
      setIsLessonModalOpen(false);
      resetLessonForm();
      await loadLessons(selectedCourseId, selectedUnitId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to create lesson.");
      } else {
        setErrorMessage("Failed to create lesson.");
      }
    } finally {
      setIsLessonSubmitting(false);
    }
  };

  const updateLesson = async () => {
    if (!selectedCourseId || !selectedUnitId || !editingLessonId) return;
    setIsLessonSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const titleEn = lessonForm.titleEn.trim();
      const titleAr = lessonForm.titleAr.trim();
      const descriptionEn = lessonForm.descriptionEn.trim();
      const descriptionAr = lessonForm.descriptionAr.trim();
      const payload = {
        course_id: Number(selectedCourseId),
        unit_id: Number(selectedUnitId),
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
        lesson_order: Number(lessonForm.lessonOrder || 1),
        lesson_type: lessonForm.lessonType || "lecture",
        is_required: lessonForm.isRequired,
        actual_duration_minutes: Number(lessonForm.durationMinutes || 0),
      };

      await axios.put(
        getStudentApiRequestUrl(
          `/my-courses/${selectedCourseId}/units/${selectedUnitId}/lessons/${editingLessonId}`
        ),
        payload,
        { headers: buildAuthHeaders() }
      );

      setSuccessMessage("Lesson updated successfully.");
      setIsLessonModalOpen(false);
      resetLessonForm();
      await loadLessons(selectedCourseId, selectedUnitId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to update lesson.");
      } else {
        setErrorMessage("Failed to update lesson.");
      }
    } finally {
      setIsLessonSubmitting(false);
    }
  };

  const deleteLesson = async (lessonId: number | string) => {
    if (!selectedCourseId || !selectedUnitId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(
        getStudentApiRequestUrl(`/my-courses/${selectedCourseId}/units/${selectedUnitId}/lessons/${lessonId}`),
        { headers: buildAuthHeaders() }
      );
      setSuccessMessage("Lesson deleted successfully.");
      if (editingLessonId === lessonId) {
        resetLessonForm();
      }
      await loadLessons(selectedCourseId, selectedUnitId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to delete lesson.");
      } else {
        setErrorMessage("Failed to delete lesson.");
      }
    }
  };

  const getUnitById = async (courseId: number | string, unitId: number | string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await axios.get(getStudentApiRequestUrl(`/my-courses/${courseId}/units/${unitId}`), {
        headers: buildAuthHeaders(),
      });
      const unit = (response.data?.data ?? null) as UnitItem | null;
      if (!unit) return;

      setEditingUnitId(unit.id);
      const resolvedTitleEn =
        unit.title_translations?.en ??
        getTranslationValue(unit.title, "en") ??
        "";
      const resolvedTitleAr =
        unit.title_translations?.ar ??
        getTranslationValue(unit.title, "ar") ??
        "";
      setUnitForm({
        titleEn: resolvedTitleEn,
        titleAr: resolvedTitleAr,
        descriptionEn: unit.description_translations?.en ?? unit.description ?? "",
        unitOrder: typeof unit.unit_order === "number" ? String(unit.unit_order) : "",
        durationMinutes: typeof unit.actual_duration_minutes === "number" ? String(unit.actual_duration_minutes) : "",
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load unit.");
      } else {
        setErrorMessage("Failed to load unit.");
      }
    }
  };

  const createUnit = async () => {
    if (!selectedCourseId) return;
    setIsUnitSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const titleEn = unitForm.titleEn.trim();
      const titleAr = unitForm.titleAr.trim();
      const payload = {
        title: titleEn || titleAr || "Unit",
        title_translations: {
          en: titleEn || titleAr || "Unit",
          ar: titleAr || titleEn || "Unit",
        },
        description: unitForm.descriptionEn || "",
        description_translations: {
          en: unitForm.descriptionEn || "",
        },
        unit_order: Number(unitForm.unitOrder || units.length + 1),
        actual_duration_minutes: Number(unitForm.durationMinutes || 0),
      };

      await axios.post(getStudentApiRequestUrl(`/my-courses/${selectedCourseId}/units`), payload, {
        headers: buildAuthHeaders(),
      });

      setSuccessMessage("Unit created successfully.");
      resetUnitForm();
      await loadUnits(selectedCourseId);
      await loadCourseDetails(selectedCourseId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to create unit.");
      } else {
        setErrorMessage("Failed to create unit.");
      }
    } finally {
      setIsUnitSubmitting(false);
    }
  };

  const updateUnit = async () => {
    if (!selectedCourseId || !editingUnitId) return;
    setIsUnitSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const titleEn = unitForm.titleEn.trim();
      const titleAr = unitForm.titleAr.trim();
      const payload = {
        title: titleEn || titleAr || "Unit",
        title_translations: {
          en: titleEn || titleAr || "Unit",
          ar: titleAr || titleEn || "Unit",
        },
        description: unitForm.descriptionEn || "",
        description_translations: {
          en: unitForm.descriptionEn || "",
        },
        unit_order: Number(unitForm.unitOrder || 1),
        actual_duration_minutes: Number(unitForm.durationMinutes || 0),
      };

      await axios.put(
        getStudentApiRequestUrl(`/my-courses/${selectedCourseId}/units/${editingUnitId}`),
        payload,
        { headers: buildAuthHeaders() }
      );

      setSuccessMessage("Unit updated successfully.");
      resetUnitForm();
      await loadUnits(selectedCourseId);
      await loadCourseDetails(selectedCourseId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to update unit.");
      } else {
        setErrorMessage("Failed to update unit.");
      }
    } finally {
      setIsUnitSubmitting(false);
    }
  };

  const deleteUnit = async (unitId: number | string) => {
    if (!selectedCourseId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await axios.delete(getStudentApiRequestUrl(`/my-courses/${selectedCourseId}/units/${unitId}`), {
        headers: buildAuthHeaders(),
      });
      setSuccessMessage("Unit deleted successfully.");
      if (editingUnitId === unitId) {
        resetUnitForm();
      }
      if (selectedUnitId === unitId) {
        setSelectedUnitId(null);
        setLessons([]);
        setLessonsCount(0);
        resetLessonForm();
      }
      await loadUnits(selectedCourseId);
      await loadCourseDetails(selectedCourseId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to delete unit.");
      } else {
        setErrorMessage("Failed to delete unit.");
      }
    }
  };

  const loadCourseDetails = async (courseId: number | string) => {
    setIsDetailsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await axios.get(getStudentApiRequestUrl(`/my-courses/${courseId}`), {
        headers: buildAuthHeaders(),
      });

      const details = (response.data?.data ?? null) as CourseDetails | null;
      setSelected(details);
      setSelectedCourseId(courseId);
      setSelectedUnitId(null);
      setLessons([]);
      setLessonsCount(0);
      resetLessonForm();
      await loadUnits(courseId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Failed to load course details.");
      } else if (error instanceof Error && error.message === "missing_token") {
        setErrorMessage("Session token is missing. Please log in again.");
      } else {
        setErrorMessage("Failed to load course details.");
      }
    } finally {
      setIsDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  useEffect(() => {
    if (!isLessonModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLessonSubmitting) {
        closeLessonModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLessonModalOpen, isLessonSubmitting]);

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const term = search.trim().toLowerCase();
    return courses.filter((course) => {
      const title = getLocalizedText(course.title, course.title_translations, language).toLowerCase();
      return title.includes(term);
    });
  }, [courses, language, search]);

  return (
    <div className="p-8 md:p-12 min-h-screen bg-(--background) text-(--foreground)">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">{t("nav.courses")}</h1>
          <p className="opacity-50 mt-2">Loaded from GET /my-courses and GET /my-courses/:course.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadCourses()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-sm font-bold hover:border-indigo-400/60"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              if (!selectedCourseId) {
                setErrorMessage("Select a course first, then add a unit.");
                return;
              }
              resetUnitForm();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Course Unit
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          {successMessage}
        </div>
      ) : null}

      <div className="mb-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search courses..."
          className="h-11 w-full max-w-md rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-sm opacity-60">
              Loading courses...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-sm opacity-60">
              No courses found.
            </div>
          ) : (
            filteredCourses.map((course) => {
              const unitsCount = Array.isArray(course.units) ? course.units.length : 0;
              const durationHours = Number(course.actual_duration_hours ?? 0);
              const title = getLocalizedText(course.title, course.title_translations, language) || `Course #${course.id}`;
              const description =
                getLocalizedText(course.description, course.description_translations, language) || "No description.";

              return (
                <div key={String(course.id)} className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{title}</h3>
                      <p className="mt-2 text-sm opacity-70 line-clamp-2">{description}</p>
                    </div>
                    <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs font-bold uppercase text-indigo-400">
                      {course.status ?? "unknown"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm opacity-70">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      {unitsCount} units
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {durationHours}h
                    </span>
                  </div>

                  <button
                    onClick={() => void loadCourseDetails(course.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500"
                  >
                    <BookOpen className="h-4 w-4" />
                    View details
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 p-5 h-fit">
          <h2 className="text-xl font-bold mb-4">Course details</h2>
          {isDetailsLoading ? (
            <p className="text-sm opacity-60">Loading details...</p>
          ) : selected ? (
            <div className="space-y-3 text-sm">
              <p className="font-bold text-base">
                {getLocalizedText(selected.title, selected.title_translations, language) || `Course #${selected.id}`}
              </p>
              <p className="opacity-70">
                {getLocalizedText(selected.description, selected.description_translations, language) || "No description."}
              </p>
              {selected.objectives ? <p><span className="font-semibold">Objectives:</span> {selected.objectives}</p> : null}
              {selected.prerequisites ? <p><span className="font-semibold">Prerequisites:</span> {selected.prerequisites}</p> : null}

              <div>
                <p className="font-semibold mb-2">Units</p>
                {Array.isArray(selected.units) && selected.units.length > 0 ? (
                  <ul className="space-y-1 opacity-80">
                    {selected.units.map((unit, idx) => (
                      <li key={`${unit.id ?? idx}`}>
                        {idx + 1}. {getLocalizedText(unit.title, unit.title_translations, language) || `Unit #${unit.id ?? idx + 1}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="opacity-60">No units in this course.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-60">Select a course to load GET /my-courses/:course details.</p>
          )}

          {selectedCourseId ? (
            <div className="mt-6 border-t border-slate-300 dark:border-white/10 pt-5">
              <h3 className="font-bold mb-3">Units Management</h3>
              <div className="space-y-2 mb-4">
                <input
                  value={unitForm.titleEn}
                  onChange={(event) => setUnitForm((prev) => ({ ...prev, titleEn: event.target.value }))}
                  placeholder="Unit title (EN)"
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={unitForm.titleAr}
                  onChange={(event) => setUnitForm((prev) => ({ ...prev, titleAr: event.target.value }))}
                  placeholder="Unit title (AR)"
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  value={unitForm.descriptionEn}
                  onChange={(event) => setUnitForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
                  placeholder="Description (EN)"
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-indigo-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={unitForm.unitOrder}
                    onChange={(event) => setUnitForm((prev) => ({ ...prev, unitOrder: event.target.value }))}
                    placeholder="Unit order"
                    type="number"
                    className="h-10 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-indigo-400"
                  />
                  <input
                    value={unitForm.durationMinutes}
                    onChange={(event) => setUnitForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                    placeholder="Duration min"
                    type="number"
                    className="h-10 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => void createUnit()}
                  disabled={isUnitSubmitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Unit
                </button>
                <button
                  onClick={() => void updateUnit()}
                  disabled={isUnitSubmitting || !editingUnitId}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-amber-500 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  Update Unit
                </button>
                <button
                  onClick={resetUnitForm}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wide hover:border-indigo-400/60"
                >
                  Reset
                </button>
              </div>

              {isUnitsLoading ? (
                <p className="text-sm opacity-60">Loading units...</p>
              ) : units.length === 0 ? (
                <p className="text-sm opacity-60">No units for this course yet.</p>
              ) : (
                <div className="space-y-2">
                  {units.map((unit) => (
                    <div
                      key={String(unit.id)}
                      className={`rounded-xl border p-3 transition-all ${
                        selectedUnitId === unit.id
                          ? "border-indigo-400/70 bg-indigo-500/10 shadow-[0_8px_24px_rgba(99,102,241,0.2)]"
                          : "border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/[0.02]"
                      }`}
                    >
                      <p className="font-semibold text-sm">
                        {getLocalizedText(unit.title, unit.title_translations, language) || `Unit #${unit.id}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => void selectUnitForLessons(unit.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-violet-500"
                        >
                          <FileText className="h-3 w-3" />
                          Manage Lessons
                        </button>
                        <button
                          onClick={() => void getUnitById(selectedCourseId, unit.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-sky-500"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => void deleteUnit(unit.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-rose-500"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {selectedCourseId && selectedUnitId ? (
            <div className="mt-6 border-t border-slate-300 dark:border-white/10 pt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-bold">Lessons Management</h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-400">
                    {lessonsCount} lessons
                  </span>
                  <button
                    onClick={openCreateLessonModal}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(99,102,241,0.35)] transition hover:-translate-y-0.5 hover:bg-violet-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Lesson
                  </button>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/80 px-4 py-3 dark:bg-white/[0.02]">
                <p className="text-xs opacity-75">
                  Use <span className="font-semibold text-violet-400">Add Lesson</span> to create a new lesson, or click{" "}
                  <span className="font-semibold text-sky-400">Edit</span> on an existing lesson.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={openCreateLessonModal}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wide hover:border-violet-400/60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Lesson
                </button>
              </div>

              {isLessonsLoading ? (
                <p className="text-sm opacity-60">Loading lessons...</p>
              ) : lessons.length === 0 ? (
                <p className="text-sm opacity-60">No lessons in this unit yet.</p>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <div key={String(lesson.id)} className="rounded-xl border border-slate-300 dark:border-white/10 p-3">
                      <p className="font-semibold text-sm">
                        {getLocalizedText(lesson.title, lesson.title_translations, language) || `Lesson #${lesson.id}`}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide opacity-70">
                        <span>order {lesson.lesson_order ?? 0}</span>
                        <span>{lesson.lesson_type ?? "lecture"}</span>
                        <span>{lesson.actual_duration_minutes ?? 0} min</span>
                        <span>{lesson.is_required ? "required" : "optional"}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => void getLessonById(lesson.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-sky-500"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => void deleteLesson(lesson.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-rose-500"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {selectedCourseId && selectedUnitId && isLessonModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-violet-300/30 bg-[linear-gradient(145deg,#050a1f_0%,#0a1231_45%,#070f2c_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between border-b border-white/10 px-5 py-4 md:px-6 md:py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-300/90">Lesson Builder</p>
                <h3 className="mt-1 text-xl font-black text-white md:text-2xl">
                  {editingLessonId ? "Edit Lesson" : "Create Lesson"}
                </h3>
                <p className="mt-1 text-xs text-white/60">Unit #{selectedUnitId}</p>
              </div>
              <button
                onClick={closeLessonModal}
                disabled={isLessonSubmitting}
                className="rounded-lg border border-white/15 p-2 text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                aria-label="Close lesson modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2 md:px-6 md:py-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Title (English)</label>
                <input
                  value={lessonForm.titleEn}
                  onChange={(event) => setLessonForm((prev) => ({ ...prev, titleEn: event.target.value }))}
                  placeholder="Lesson title in English"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Title (Arabic)</label>
                <input
                  value={lessonForm.titleAr}
                  onChange={(event) => setLessonForm((prev) => ({ ...prev, titleAr: event.target.value }))}
                  placeholder="عنوان الدرس"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Description (English)</label>
                <input
                  value={lessonForm.descriptionEn}
                  onChange={(event) => setLessonForm((prev) => ({ ...prev, descriptionEn: event.target.value }))}
                  placeholder="Brief lesson summary"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Description (Arabic)</label>
                <input
                  value={lessonForm.descriptionAr}
                  onChange={(event) => setLessonForm((prev) => ({ ...prev, descriptionAr: event.target.value }))}
                  placeholder="وصف مختصر للدرس"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Lesson Order</label>
                <input
                  value={lessonForm.lessonOrder}
                  onChange={(event) => setLessonForm((prev) => ({ ...prev, lessonOrder: event.target.value }))}
                  placeholder="1"
                  type="number"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Duration (Minutes)</label>
                <input
                  value={lessonForm.durationMinutes}
                  onChange={(event) => setLessonForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                  placeholder="15"
                  type="number"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-violet-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Lesson Type</label>
                <select
                  value={lessonForm.lessonType}
                  onChange={(event) => setLessonForm((prev) => ({ ...prev, lessonType: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-violet-400"
                >
                  <option value="lecture">Lecture</option>
                  <option value="practice">Practice</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Requirement</label>
                <label className="inline-flex h-11 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/90">
                  <input
                    type="checkbox"
                    checked={lessonForm.isRequired}
                    onChange={(event) => setLessonForm((prev) => ({ ...prev, isRequired: event.target.checked }))}
                    className="h-4 w-4 accent-violet-600"
                  />
                  Required lesson
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4 md:px-6">
              <button
                onClick={closeLessonModal}
                disabled={isLessonSubmitting}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              {editingLessonId ? (
                <button
                  onClick={() => void updateLesson()}
                  disabled={isLessonSubmitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  Update Lesson
                </button>
              ) : (
                <button
                  onClick={() => void createLesson()}
                  disabled={isLessonSubmitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-[0_8px_24px_rgba(99,102,241,0.35)] transition hover:bg-violet-500 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Lesson
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
