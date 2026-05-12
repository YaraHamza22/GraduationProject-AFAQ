"use client";

export type TranslationMap = Record<string, string | null | undefined>;

export type AuditorUser = {
  id: number | string;
  name?: string;
  email?: string;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  roles?: { id?: number; name?: string }[];
};

export type CourseCategory = {
  id: number;
  name?: string;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
  courses_count?: number;
  name_translations?: TranslationMap;
};

export type CourseSummary = {
  id: number;
  title?: string;
  slug?: string;
  status?: string;
  description?: string | null;
  course_category?: CourseCategory;
  actual_duration_hours?: number;
  difficulty_level?: string;
  language?: string;
  cover_url?: string;
  instructors?: { id?: number; name?: string; email?: string; is_primary?: boolean }[];
};

export type CourseUnit = {
  id: number;
  course_id?: number;
  title?: string;
  slug?: string | null;
  description?: string | null;
  unit_order?: number;
  actual_duration_minutes?: number;
  lessons?: LessonSummary[];
  lessons_count?: number;
};

export type LessonSummary = {
  id: number;
  unit_id?: number;
  title?: string;
  slug?: string | null;
  description?: string | null;
  lesson_order?: number;
  lesson_type?: string;
  is_required?: boolean;
  actual_duration_minutes?: number;
};

export type QuizSummary = {
  id: number;
  title?: string | TranslationMap;
  description?: string | TranslationMap;
  status?: string;
  type?: string;
  duration_minutes?: number;
  max_score?: number;
  passing_score?: number;
  questions?: QuestionSummary[];
};

export type QuestionSummary = {
  id: number;
  quiz_id?: number;
  type?: string;
  question_text?: string | TranslationMap;
  point?: number;
  order_index?: number;
  is_required?: boolean;
  options?: { id?: number; option_text?: string | TranslationMap; is_correct?: boolean }[];
};

export type NotificationItem = {
  id: string | number;
  read_at?: string | null;
  created_at?: string;
  data?: {
    title?: string;
    body?: string;
    type?: string;
    [key: string]: unknown;
  };
};

export type ContentReview = {
  id: number;
  course_id?: number;
  lesson_id?: number;
  verdict?: string;
  notes?: string;
  created_at?: string;
  auditor?: {
    id?: number;
    name?: string;
    email?: string;
  };
};

export function textOf(value: string | TranslationMap | null | undefined, fallback = "Untitled") {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    return value.en || value.ar || Object.values(value).find((item) => typeof item === "string" && item.trim()) || fallback;
  }

  return fallback;
}

export function formatStatus(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
