"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Archive,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileJson,
  FileText,
  Globe,
  GraduationCap,
  Languages,
  Layers,
  Layout,
  Link as LinkIcon,
  Loader2,
  MonitorPlay,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  Upload,
  UserPlus,
  Wand2,
  X,
} from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiBaseUrl, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { extractAdminMessage, getAdminToken } from "@/features/admin/adminSession";

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

type Course = {
  id: number | string;
  course_category_id?: number;
  title: LocalizedText | string;
  description: LocalizedText | string;
  objectives?: LocalizedText | string;
  prerequisites?: LocalizedText | string;
  actual_duration_hours?: number;
  language?: string;
  status: "published" | "archived" | "draft" | "review" | string;
  min_score_to_pass?: number | string;
  is_offline_available?: boolean;
  course_delivery_type?: "self_paced" | "instructor_led" | "interactive" | "hybrid" | string;
  difficulty_level?: "beginner" | "intermediate" | "advanced" | string;
  category?: {
    id: number;
    name: LocalizedText | string;
  };
  course_category?: {
    id: number;
    name: LocalizedText | string;
  };
  title_translations?: LocalizedText;
  description_translations?: LocalizedText;
  objectives_translations?: LocalizedText;
  prerequisites_translations?: LocalizedText;
  created_at?: string;
  updated_at?: string;
  cover_url?: string;
  instructors?: Array<{
    id: number | string;
    name: string;
    is_primary?: boolean;
    email?: string;
  }>;
};

type FormState = {
  course_category_id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  objectives_en: string;
  objectives_ar: string;
  prerequisites_en: string;
  prerequisites_ar: string;
  actual_duration_hours: string;
  language: string;
  status: string;
  min_score_to_pass: string;
  is_offline_available: boolean;
  course_delivery_type: string;
  difficulty_level: string;
};

type Category = {
  id: number;
  name: string | LocalizedText;
};

type Instructor = {
  id: number | string;
  instructor_id?: number | string;
  user_id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type OfflinePackageResponse = {
  id: number | string;
  course_id: number | string;
  version: string;
  manifest: OfflineManifest;
  file_url: string;
  manifest_checksum?: string;
  is_active?: boolean;
  updated_at?: string;
  created_at?: string;
};

type OfflineManifestFile = {
  path: string;
  label?: string;
  checksum?: string;
  size_bytes?: number;
};

type OfflineManifestLesson = {
  title: string;
  description?: string;
  files: string[];
};

type OfflineManifestUnit = {
  title: string;
  lessons: OfflineManifestLesson[];
};

type OfflineManifest = {
  title?: string;
  generated_at?: string;
  files: OfflineManifestFile[];
  units?: OfflineManifestUnit[];
  [key: string]: unknown;
};

type OfflineFileRow = {
  id: string;
  path: string;
  label: string;
  checksum: string;
  sizeBytes: string;
};

type OfflinePackageForm = {
  course_id: string;
  version: string;
  file_url: string;
  is_active: boolean;
  manifestText: string;
};

type FieldName =
  | keyof FormState
  | "title"
  | "description"
  | "objectives"
  | "prerequisites";

type FieldErrors = Partial<Record<FieldName, string>>;
type OfflineFieldErrors = Partial<Record<keyof OfflinePackageForm | "manifest" | "files" | "packageFile", string>>;
type ModalMode = "create" | "edit" | "view";

const API_PATH = "/super-admin/courses";
const CATEGORIES_API_PATH = "/super-admin/course-categories";
const INSTRUCTORS_API_PATH = "/super-admin/instructors";
const OFFLINE_PACKAGES_API_PATH = "/offline-packages";

const initialForm: FormState = {
  course_category_id: "",
  title_en: "",
  title_ar: "",
  description_en: "",
  description_ar: "",
  objectives_en: "",
  objectives_ar: "",
  prerequisites_en: "",
  prerequisites_ar: "",
  actual_duration_hours: "",
  language: "en",
  status: "published",
  min_score_to_pass: "60",
  is_offline_available: false,
  course_delivery_type: "self_paced",
  difficulty_level: "beginner",
};

const emptyOfflineFileRow = (): OfflineFileRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  path: "",
  label: "",
  checksum: "",
  sizeBytes: "",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getLocalizedValue(
  value: unknown,
  locale: "en" | "ar",
  fallbackLocale: "en" | "ar" = "en"
) {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  const localized = getStringValue(value[locale]);
  if (localized) return localized;

  const fallback = getStringValue(value[fallbackLocale]);
  return fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  try {
    const extracted = extractAdminMessage(error);
    if (extracted) return extracted;
  } catch {
    // Keep fallback behavior below.
  }

  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return "Cannot reach server. Please check your connection.";

  const message = error.response.data?.message;
  if (typeof message === "string" && message.trim()) return message.trim();

  const errors = error.response.data?.errors;
  if (errors && typeof errors === "object") {
    const firstValue = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
    if (typeof firstValue === "string") return firstValue;
  }

  return fallback;
}

function getLocalizedInputPair(
  value: unknown,
  translations: unknown,
  activeLocale: "en" | "ar"
) {
  const translatedEn = getLocalizedValue(translations, "en");
  const translatedAr = getLocalizedValue(translations, "ar");
  if (translatedEn || translatedAr) {
    return { en: translatedEn, ar: translatedAr };
  }

  const objectEn = getLocalizedValue(value, "en");
  const objectAr = getLocalizedValue(value, "ar");
  if (objectEn || objectAr) {
    return { en: objectEn, ar: objectAr };
  }

  const single = getStringValue(value).trim();
  if (!single) return { en: "", ar: "" };
  return activeLocale === "ar" ? { en: "", ar: single } : { en: single, ar: "" };
}

function getInstructorIdValue(inst: Instructor) {
  return inst.user_id ?? inst.id ?? inst.instructor_id;
}

function extractArrayPayload<T = unknown>(payload: unknown): T[] {
  const root = isRecord(payload) ? payload : {};
  const data = root.data;

  if (Array.isArray(data)) return data as T[];
  if (isRecord(data) && Array.isArray(data.data)) return data.data as T[];
  if (isRecord(data) && Array.isArray(data.items)) return data.items as T[];
  if (Array.isArray(root.items)) return root.items as T[];
  if (Array.isArray(payload)) return payload as T[];

  return [];
}

function extractInstructorsFromPayload(payload: unknown): Instructor[] {
  const direct = extractArrayPayload<Instructor>(payload);
  if (direct.length > 0) return direct;

  const root = isRecord(payload) ? payload.data ?? payload : {};
  if (isRecord(root)) {
    const single = root.instructor ?? root.user;
    if (isRecord(single)) return [single as Instructor];
  }

  return [];
}

function getCourseTitle(course: Course | null, locale: "en" | "ar") {
  if (!course) return "Course";
  return (
    getLocalizedValue(course.title_translations, locale) ||
    getLocalizedValue(course.title, locale) ||
    getLocalizedValue(course.title, locale === "en" ? "ar" : "en") ||
    "Course"
  );
}

function normalizeCourseId(value: string | number | undefined | null) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function slugifyPathSegment(value: string, fallback: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function buildDefaultManifest(course: Course | null, locale: "en" | "ar"): OfflineManifest {
  const title = getCourseTitle(course, locale);
  return {
    title: `Offline Package - ${title}`,
    generated_at: new Date().toISOString(),
    files: [
      {
        path: "unit-1/lesson-1/intro.md",
        label: "Intro Notes",
        checksum: "sha256:replace-me",
        size_bytes: 0,
      },
    ],
    units: [
      {
        title: "Unit 1",
        lessons: [
          {
            title: "Lesson 1",
            description: "Generated offline lesson bundle.",
            files: ["unit-1/lesson-1/intro.md"],
          },
        ],
      },
    ],
  };
}

function buildManifestFromRows(
  rows: OfflineFileRow[],
  course: Course | null,
  locale: "en" | "ar"
): OfflineManifest {
  const validRows = rows
    .map((row) => ({
      ...row,
      path: row.path.trim().replaceAll("\\", "/"),
      label: row.label.trim(),
      checksum: row.checksum.trim(),
      sizeBytes: row.sizeBytes.trim(),
    }))
    .filter((row) => row.path.length > 0);

  const files: OfflineManifestFile[] = validRows.map((row) => ({
    path: row.path,
    label: row.label || row.path.split("/").pop() || row.path,
    checksum: row.checksum || "sha256:replace-me",
    ...(row.sizeBytes && Number.isFinite(Number(row.sizeBytes))
      ? { size_bytes: Number(row.sizeBytes) }
      : {}),
  }));

  const grouped = new Map<string, Map<string, string[]>>();

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    const unitKey = segments[0] || "unit-1";
    const lessonKey = segments[1] || "lesson-1";

    if (!grouped.has(unitKey)) grouped.set(unitKey, new Map<string, string[]>());
    const lessons = grouped.get(unitKey)!;
    if (!lessons.has(lessonKey)) lessons.set(lessonKey, []);
    lessons.get(lessonKey)!.push(file.path);
  }

  const units: OfflineManifestUnit[] = Array.from(grouped.entries()).map(
    ([unitKey, lessonsMap]) => ({
      title: slugifyPathSegment(unitKey, "unit")
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      lessons: Array.from(lessonsMap.entries()).map(([lessonKey, paths]) => ({
        title: slugifyPathSegment(lessonKey, "lesson")
          .split("-")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        description: `${paths.length} offline file${paths.length === 1 ? "" : "s"}.`,
        files: paths,
      })),
    })
  );

  return {
    title: `Offline Package - ${getCourseTitle(course, locale)}`,
    generated_at: new Date().toISOString(),
    files,
    units,
  };
}

function stringifyManifest(manifest: OfflineManifest) {
  return JSON.stringify(manifest, null, 2);
}

function parseManifestText(value: string): OfflineManifest {
  const decoded = JSON.parse(value);
  if (!isRecord(decoded)) {
    throw new Error("Manifest must be a JSON object.");
  }

  const files = decoded.files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Manifest must include a non-empty files array.");
  }

  for (const file of files) {
    if (!isRecord(file) || typeof file.path !== "string" || !file.path.trim()) {
      throw new Error("Every manifest file must include a valid path.");
    }
  }

  return decoded as OfflineManifest;
}

function getManifestChecksum(manifest: OfflineManifest) {
  const json = JSON.stringify(manifest);
  let hash = 0;
  for (let index = 0; index < json.length; index++) {
    hash = (hash << 5) - hash + json.charCodeAt(index);
    hash |= 0;
  }
  return `local:${Math.abs(hash)}`;
}


function appendNestedFormData(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return;

  if (value instanceof File) {
    formData.append(key, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => appendNestedFormData(formData, `${key}[${index}]`, item));
    return;
  }

  if (isRecord(value)) {
    Object.entries(value).forEach(([childKey, childValue]) => {
      appendNestedFormData(formData, `${key}[${childKey}]`, childValue);
    });
    return;
  }

  formData.append(key, String(value));
}

function normalizeOfflinePackageResponse(payload: unknown): OfflinePackageResponse | null {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  if (!isRecord(data)) return null;

  return {
    ...(data as OfflinePackageResponse),
    file_url: normalizeOfflinePackageUrl(getStringValue(data.file_url)),
  };
}

function normalizeOfflinePackageUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return "";

  const apiBaseUrl = getAdminApiBaseUrl();
  const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : "";

  try {
    const parsed = apiOrigin ? new URL(trimmedUrl, apiOrigin) : new URL(trimmedUrl);

    if ((parsed.hostname === "10.0.2.2" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && apiOrigin) {
      const preferredOrigin = new URL(apiOrigin);
      parsed.protocol = preferredOrigin.protocol;
      parsed.hostname = preferredOrigin.hostname;
      parsed.port = preferredOrigin.port;
    }

    return parsed.toString();
  } catch {
    if (trimmedUrl.startsWith("/") && apiOrigin) {
      return `${apiOrigin}${trimmedUrl}`;
    }

    return trimmedUrl;
  }
}

function isAbsoluteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildOfflinePackageMap(packages: OfflinePackageResponse[]) {
  const next: Record<string, OfflinePackageResponse> = {};

  for (const pkg of packages) {
    const courseIdKey = String(pkg.course_id);
    const current = next[courseIdKey];

    if (!current) {
      next[courseIdKey] = pkg;
      continue;
    }

    const currentStamp = current.updated_at ?? current.created_at ?? "";
    const nextStamp = pkg.updated_at ?? pkg.created_at ?? "";
    const currentId = Number(current.id) || 0;
    const nextId = Number(pkg.id) || 0;

    if (nextStamp > currentStamp || (nextStamp === currentStamp && nextId > currentId)) {
      next[courseIdKey] = pkg;
    }
  }

  return next;
}

export default function CoursesPage() {
  const { isRTL, language } = useLanguage();
  const currentLocale = language === "ar" ? "ar" : "en";
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "logistics">("basic");

  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [introVideoFile, setIntroVideoFile] = useState<File | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [instructorSearchQuery, setInstructorSearchQuery] = useState("");
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);

  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineCourse, setOfflineCourse] = useState<Course | null>(null);
  const [offlineForm, setOfflineForm] = useState<OfflinePackageForm>({
    course_id: "",
    version: "v1.0.0",
    file_url: "",
    is_active: true,
    manifestText: stringifyManifest(buildDefaultManifest(null, currentLocale)),
  });
  const [offlineFileRows, setOfflineFileRows] = useState<OfflineFileRow[]>([
    {
      id: "default-row",
      path: "unit-1/lesson-1/intro.md",
      label: "Intro Notes",
      checksum: "sha256:replace-me",
      sizeBytes: "",
    },
  ]);
  const [offlineErrors, setOfflineErrors] = useState<OfflineFieldErrors>({});
  const [offlinePackageFile, setOfflinePackageFile] = useState<File | null>(null);
  const [isPublishingOffline, setIsPublishingOffline] = useState(false);
  const [publishedOfflinePackage, setPublishedOfflinePackage] =
    useState<OfflinePackageResponse | null>(null);
  const [offlinePackageByCourseId, setOfflinePackageByCourseId] = useState<
    Record<string, OfflinePackageResponse>
  >({});

  const getHeaders = useCallback((locale?: string) => {
    const token = getAdminToken();
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(locale ? { "Accept-Language": locale, "X-Locale": locale } : {}),
    };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const [coursesRes, categoriesRes, offlinePackagesRes] = await Promise.all([
        axios.get(getAdminApiRequestUrl(API_PATH), {
          headers: getHeaders(currentLocale),
          params: { per_page: 100 },
        }),
        axios.get(getAdminApiRequestUrl(CATEGORIES_API_PATH), {
          headers: getHeaders(currentLocale),
          params: { per_page: 100 },
        }),
        axios.get(getAdminApiRequestUrl(OFFLINE_PACKAGES_API_PATH), {
          headers: getHeaders(currentLocale),
          params: { per_page: 100 },
        }),
      ]);

      setCourses(extractArrayPayload<Course>(coursesRes.data));
      setCategories(extractArrayPayload<Category>(categoriesRes.data));
      setOfflinePackageByCourseId(
        buildOfflinePackageMap(
          extractArrayPayload<unknown>(offlinePackagesRes.data)
            .map((item) => normalizeOfflinePackageResponse(item))
            .filter((item): item is OfflinePackageResponse => item !== null)
        )
      );
    } catch (error) {
      setListError(getErrorMessage(error, "Failed to load courses."));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocale, getHeaders]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;

    return courses.filter((course) => {
      const titleEn = getLocalizedValue(course.title_translations ?? course.title, "en");
      const titleAr = getLocalizedValue(course.title_translations ?? course.title, "ar");
      const category =
        getLocalizedValue(course.course_category?.name ?? course.category?.name, currentLocale) ||
        getStringValue(course.course_category?.name ?? course.category?.name);

      return `${titleEn} ${titleAr} ${category}`.toLowerCase().includes(query);
    });
  }, [courses, currentLocale, searchQuery]);

  const openCreateModal = () => {
    setForm(initialForm);
    setModalMode("create");
    setFieldErrors({});
    setCoverFile(null);
    setIntroVideoFile(null);
    setEditingCourse(null);
    setActiveTab("basic");
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);

    const titlePair = getLocalizedInputPair(course.title, course.title_translations, currentLocale);
    const descPair = getLocalizedInputPair(
      course.description,
      course.description_translations,
      currentLocale
    );
    const objPair = getLocalizedInputPair(
      course.objectives,
      course.objectives_translations,
      currentLocale
    );
    const prePair = getLocalizedInputPair(
      course.prerequisites,
      course.prerequisites_translations,
      currentLocale
    );
    const categoryId =
      course.course_category_id || course.course_category?.id || course.category?.id || "";

    setForm({
      course_category_id: String(categoryId),
      title_en: titlePair.en,
      title_ar: titlePair.ar,
      description_en: descPair.en,
      description_ar: descPair.ar,
      objectives_en: objPair.en,
      objectives_ar: objPair.ar,
      prerequisites_en: prePair.en,
      prerequisites_ar: prePair.ar,
      actual_duration_hours: String(course.actual_duration_hours ?? ""),
      language: course.language || "en",
      status: course.status || "published",
      min_score_to_pass: String(course.min_score_to_pass ?? 60),
      is_offline_available: Boolean(course.is_offline_available),
      course_delivery_type: course.course_delivery_type || "self_paced",
      difficulty_level: course.difficulty_level || "beginner",
    });
    setModalMode("edit");
    setFieldErrors({});
    setCoverFile(null);
    setIntroVideoFile(null);
    setActiveTab("basic");
    setIsModalOpen(true);
  };

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const buildCoursePayload = () => {
    const resolvedCategoryId = Number(
      form.course_category_id ||
        editingCourse?.course_category_id ||
        editingCourse?.course_category?.id ||
        editingCourse?.category?.id ||
        0
    );

    return {
      course_category_id: resolvedCategoryId,
      title: { en: form.title_en.trim(), ar: form.title_ar.trim() },
      description: { en: form.description_en.trim(), ar: form.description_ar.trim() },
      objectives: { en: form.objectives_en.trim(), ar: form.objectives_ar.trim() },
      prerequisites: { en: form.prerequisites_en.trim(), ar: form.prerequisites_ar.trim() },
      actual_duration_hours: Number(form.actual_duration_hours || 0),
      language: form.language,
      status: form.status,
      min_score_to_pass: Number(form.min_score_to_pass || 0),
      is_offline_available: form.is_offline_available,
      course_delivery_type: form.course_delivery_type,
      difficulty_level: form.difficulty_level,
    };
  };

  const appendCoursePayloadToFormData = (
    formData: FormData,
    payload: ReturnType<typeof buildCoursePayload>
  ) => {
    formData.append("course_category_id", String(payload.course_category_id));
    formData.append("title[en]", payload.title.en);
    formData.append("title[ar]", payload.title.ar);
    formData.append("description[en]", payload.description.en);
    formData.append("description[ar]", payload.description.ar);
    formData.append("objectives[en]", payload.objectives.en);
    formData.append("objectives[ar]", payload.objectives.ar);
    formData.append("prerequisites[en]", payload.prerequisites.en);
    formData.append("prerequisites[ar]", payload.prerequisites.ar);
    formData.append("actual_duration_hours", String(payload.actual_duration_hours));
    formData.append("language", payload.language);
    formData.append("status", payload.status);
    formData.append("min_score_to_pass", String(payload.min_score_to_pass));
    formData.append("is_offline_available", payload.is_offline_available ? "1" : "0");
    formData.append("course_delivery_type", payload.course_delivery_type);
    formData.append("difficulty_level", payload.difficulty_level);
    if (coverFile) formData.append("cover", coverFile);
    if (introVideoFile) formData.append("intro_video", introVideoFile);
  };

  const handleSubmit = async (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setListError(null);

    try {
      const payload = buildCoursePayload();

      if (!payload.course_category_id) {
        setFieldErrors((prev) => ({
          ...prev,
          course_category_id: "Category is required.",
        }));
        setActiveTab("basic");
        return;
      }

      const hasMediaFiles = Boolean(coverFile || introVideoFile);

      if (modalMode === "create") {
        if (hasMediaFiles) {
          const formData = new FormData();
          appendCoursePayloadToFormData(formData, payload);
          await axios.post(getAdminApiRequestUrl(API_PATH), formData, {
            headers: {
              ...getHeaders(currentLocale),
              "Content-Type": "multipart/form-data",
            },
          });
        } else {
          await axios.post(getAdminApiRequestUrl(API_PATH), payload, {
            headers: getHeaders(currentLocale),
          });
        }

        setSuccessMessage("Course created successfully.");
      } else if (editingCourse) {
        if (hasMediaFiles) {
          const formData = new FormData();
          formData.append("_method", "PUT");
          appendCoursePayloadToFormData(formData, payload);
          await axios.post(getAdminApiRequestUrl(`${API_PATH}/${editingCourse.id}`), formData, {
            headers: {
              ...getHeaders(currentLocale),
              "Content-Type": "multipart/form-data",
            },
          });
        } else {
          await axios.put(getAdminApiRequestUrl(`${API_PATH}/${editingCourse.id}`), payload, {
            headers: getHeaders(currentLocale),
          });
        }

        setSuccessMessage("Course updated successfully.");
      }

      setIsModalOpen(false);
      setCoverFile(null);
      setIntroVideoFile(null);
      await loadData();
      window.setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.errors) {
        const errors = error.response.data.errors as Record<string, string[] | string>;
        const nextErrors: FieldErrors = {};

        for (const key of Object.keys(errors)) {
          const mappedKey = key.replace(".", "_") as FieldName;
          const value = errors[key];
          nextErrors[mappedKey] = Array.isArray(value) ? value[0] : value;
        }

        setFieldErrors(nextErrors);

        if (
          Object.keys(nextErrors).some(
            (key) => key.includes("title") || key.includes("category") || key.includes("language")
          )
        ) {
          setActiveTab("basic");
        } else if (
          Object.keys(nextErrors).some(
            (key) =>
              key.includes("description") ||
              key.includes("objectives") ||
              key.includes("prerequisites")
          )
        ) {
          setActiveTab("content");
        } else {
          setActiveTab("logistics");
        }
      } else {
        setListError(getErrorMessage(error, "Operation failed."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignModal = async (course: Course) => {
    setAssignCourse(course);
    setSelectedInstructorId("");
    setInstructorSearchQuery("");
    setIsAssignModalOpen(true);
    setIsLoadingInstructors(true);

    try {
      const response = await axios.get(getAdminApiRequestUrl(INSTRUCTORS_API_PATH), {
        headers: getHeaders(currentLocale),
        params: { per_page: 100 },
      });
      setInstructors(extractInstructorsFromPayload(response.data));
    } catch {
      setInstructors([]);
    } finally {
      setIsLoadingInstructors(false);
    }
  };

  const getInstructorDisplayName = (inst: Instructor) => {
    if (inst.name) return inst.name;
    if (inst.first_name || inst.last_name) {
      return `${inst.first_name || ""} ${inst.last_name || ""}`.trim();
    }
    return inst.email || `Instructor #${getInstructorIdValue(inst)}`;
  };

  const filteredInstructors = useMemo(() => {
    const query = instructorSearchQuery.trim().toLowerCase();
    if (!query) return instructors;

    return instructors.filter((inst) => {
      const name = getInstructorDisplayName(inst).toLowerCase();
      const email = (inst.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [instructors, instructorSearchQuery]);

  const selectedInstructor = useMemo(() => {
    return (
      instructors.find((inst) => {
        const rawId = getInstructorIdValue(inst);
        return rawId !== undefined && rawId !== null && String(rawId) === selectedInstructorId;
      }) ?? null
    );
  }, [instructors, selectedInstructorId]);

  const handleAssignInstructor = async () => {
    if (!assignCourse || !selectedInstructorId) return;
    setIsAssigning(true);
    setListError(null);

    try {
      await axios.post(
        getAdminApiRequestUrl(`${API_PATH}/${assignCourse.id}/instructors/assign`),
        { instructor_id: Number(selectedInstructorId) },
        { headers: getHeaders(currentLocale) }
      );
      setSuccessMessage("Instructor assigned successfully.");
      setIsAssignModalOpen(false);
      await loadData();
      window.setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      const fieldError = axios.isAxiosError(error)
        ? error.response?.data?.errors?.instructor_id?.[0]
        : null;
      setListError(
        typeof fieldError === "string"
          ? fieldError
          : getErrorMessage(error, "Failed to assign instructor.")
      );
      setIsAssignModalOpen(false);
    } finally {
      setIsAssigning(false);
    }
  };

  const openOfflineModal = (course: Course) => {
    const manifest = buildDefaultManifest(course, currentLocale);
    const courseIdKey = String(course.id);
    const existingPackage = offlinePackageByCourseId[courseIdKey] ?? null;

    setOfflineCourse(course);
    setPublishedOfflinePackage(existingPackage);
    setOfflinePackageFile(null);
    setOfflineErrors({});
    setOfflineFileRows([
      {
        id: "default-row",
        path: "unit-1/lesson-1/intro.md",
        label: "Intro Notes",
        checksum: "sha256:replace-me",
        sizeBytes: "",
      },
    ]);
    setOfflineForm({
      course_id: String(course.id),
      version: existingPackage?.version || "v1.0.0",
      file_url: existingPackage?.file_url || "",
      is_active: existingPackage?.is_active ?? true,
      manifestText: stringifyManifest(existingPackage?.manifest ?? manifest),
    });
    setIsOfflineModalOpen(true);
  };

  const updateOfflineForm = (field: keyof OfflinePackageForm, value: string | boolean) => {
    setOfflineForm((prev) => ({ ...prev, [field]: value }));
    if (offlineErrors[field]) {
      setOfflineErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleOfflinePackageFile = (file: File | null) => {
    setOfflinePackageFile(file);
    setOfflineErrors((prev) => ({
      ...prev,
      packageFile: undefined,
      file_url: undefined,
    }));

    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isAllowedPackage =
      fileName.endsWith(".zip") ||
      fileName.endsWith(".bin") ||
      fileName.endsWith(".tar") ||
      fileName.endsWith(".gz");

    if (!isAllowedPackage) {
      setOfflineErrors((prev) => ({
        ...prev,
        packageFile: "Please upload a ZIP/package file.",
      }));
      return;
    }

    setOfflineForm((prev) => ({
      ...prev,
      file_url: "",
    }));
  };

  const updateOfflineFileRow = (
    rowId: string,
    field: keyof Omit<OfflineFileRow, "id">,
    value: string
  ) => {
    setOfflineFileRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const generateManifestFromRows = () => {
    const manifest = buildManifestFromRows(offlineFileRows, offlineCourse, currentLocale);
    setOfflineForm((prev) => ({
      ...prev,
      manifestText: stringifyManifest(manifest),
    }));
    setOfflineErrors((prev) => ({ ...prev, manifest: undefined, files: undefined }));
  };

  const handlePublishOfflinePackage = async () => {
    if (isPublishingOffline) return;

    setOfflineErrors({});
    setListError(null);
    setSuccessMessage(null);
    setPublishedOfflinePackage(null);

    const courseId = normalizeCourseId(offlineForm.course_id);
    const trimmedFileUrl = offlineForm.file_url.trim();
    const shouldUseUploadedFile = Boolean(offlinePackageFile);
    const sanitizedFileUrl = shouldUseUploadedFile
      ? ""
      : isAbsoluteUrl(trimmedFileUrl)
        ? trimmedFileUrl
        : "";
    const nextErrors: OfflineFieldErrors = {};

    if (!courseId) nextErrors.course_id = "Course ID is required.";
    if (!offlineForm.version.trim()) nextErrors.version = "Version is required.";
    if (!sanitizedFileUrl && !shouldUseUploadedFile) {
      nextErrors.file_url = "Package file URL or uploaded package file is required.";
      nextErrors.packageFile = "Drop a ZIP file here or paste a downloadable URL.";
    }
    if (!shouldUseUploadedFile && trimmedFileUrl && !sanitizedFileUrl) {
      nextErrors.file_url = "Please enter a full http:// or https:// URL.";
    }

    let manifest: OfflineManifest | null = null;
    try {
      manifest = parseManifestText(offlineForm.manifestText);
    } catch (error) {
      nextErrors.manifest =
        error instanceof Error ? error.message : "Manifest JSON is not valid.";
    }

    if (Object.keys(nextErrors).length > 0 || !manifest) {
      setOfflineErrors(nextErrors);
      return;
    }

    setIsPublishingOffline(true);

    try {
      const checksum = getManifestChecksum(manifest);
      const response = offlinePackageFile
        ? await axios.post(
            getAdminApiRequestUrl(OFFLINE_PACKAGES_API_PATH),
            (() => {
              const formData = new FormData();
              formData.append("course_id", String(courseId));
              formData.append("version", offlineForm.version.trim());
              appendNestedFormData(formData, "manifest", manifest);
              formData.append("manifest_checksum", checksum);
              formData.append("is_active", offlineForm.is_active ? "1" : "0");
              formData.append("package_file", offlinePackageFile);
              if (sanitizedFileUrl) {
                formData.append("file_url", sanitizedFileUrl);
              }
              return formData;
            })(),
            {
              headers: getHeaders(currentLocale),
            }
          )
        : await axios.post(
            getAdminApiRequestUrl(OFFLINE_PACKAGES_API_PATH),
            {
              course_id: courseId,
              version: offlineForm.version.trim(),
              manifest,
              manifest_checksum: checksum,
              file_url: sanitizedFileUrl,
              is_active: offlineForm.is_active,
            },
            {
              headers: {
                ...getHeaders(currentLocale),
                "Content-Type": "application/json",
              },
            }
          );

      const packageData = normalizeOfflinePackageResponse(response.data);

      if (packageData) {
        setPublishedOfflinePackage(packageData);
        setOfflinePackageByCourseId((prev) => ({
          ...prev,
          [String(packageData.course_id ?? courseId)]: packageData,
        }));
      }

      setOfflinePackageFile(null);
      setSuccessMessage("Offline package published successfully.");
      await loadData();
      window.setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setOfflineErrors({
        manifest: getErrorMessage(error, "Failed to publish offline package."),
      });
    } finally {
      setIsPublishingOffline(false);
    }
  };

  const getCourseStatusClass = (status: string) => {
    switch (status) {
      case "published":
        return "bg-emerald-100/90 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "draft":
        return "bg-amber-100/90 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
      case "review":
        return "bg-purple-100/90 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400";
      case "archived":
        return "bg-slate-100/90 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";
      default:
        return "bg-indigo-100/90 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300";
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 p-4 transition-colors duration-500 dark:bg-transparent sm:p-6 lg:p-8 ${
        isRTL ? "text-right" : ""
      }`}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        <header
          className={`mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-center ${
            isRTL ? "text-right lg:flex-row-reverse" : ""
          }`}
        >
          <motion.div initial={{ opacity: 0, x: isRTL ? 20 : -20 }} animate={{ opacity: 1, x: 0 }}>
            <div
              className={`mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <Layout className="h-3 w-3" />
              Learning Management
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tighter text-slate-900 dark:text-white md:text-5xl 2xl:text-7xl">
              Course{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                Inventory
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-bold text-slate-500 dark:text-white/40 md:text-base">
              Manage courses, instructors, delivery settings, and offline packages that students can download inside the app.
            </p>
          </motion.div>

          <div
            className={`flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center ${
              isRTL ? "sm:flex-row-reverse" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-90 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 md:rounded-[24px] md:p-5"
            >
              <RefreshCw className={`h-5 w-5 md:h-6 md:w-6 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-indigo-600 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-1 hover:bg-indigo-700 active:scale-95 md:w-auto md:rounded-[24px] md:py-5 md:text-[11px]"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              Add New Course
            </button>
          </div>
        </header>

        <AnimatePresence>
          {successMessage ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <BadgeCheck className="h-5 w-5" />
              <span className="font-bold">{successMessage}</span>
            </motion.div>
          ) : null}

          {listError ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              <span className="font-bold">{listError}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="group relative mb-12">
          <Search
            className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500 md:h-6 md:w-6 ${
              isRTL ? "right-6 md:right-8" : "left-6 md:left-8"
            }`}
          />
          <input
            type="text"
            placeholder="Search courses by title..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`w-full rounded-3xl border border-slate-200 bg-white py-5 text-base font-bold text-slate-900 outline-none transition-all focus:border-indigo-500/50 focus:ring-8 focus:ring-indigo-500/5 dark:border-white/5 dark:bg-white/3 dark:text-white md:rounded-[40px] md:py-7 md:text-lg ${
              isRTL ? "pl-6 pr-16 text-right md:pr-20" : "pl-16 pr-6 md:pl-20"
            }`}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[400px] animate-pulse rounded-[48px] border border-slate-200 bg-white dark:border-white/5 dark:bg-white/3"
              />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-[48px] border border-dashed border-slate-200 bg-white py-28 text-center shadow-inner dark:border-white/10 dark:bg-white/3 md:rounded-[64px] md:py-32">
            <Layout className="mx-auto mb-6 h-20 w-20 text-slate-300 dark:text-white/10" />
            <h3 className="mb-3 text-3xl font-black text-slate-900 dark:text-white">
              No courses found
            </h3>
            <p className="mx-auto max-w-md text-slate-500 dark:text-white/40">
              Try different keywords or add a new course to expand the curriculum.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredCourses.map((course, index) => {
              const title = getCourseTitle(course, currentLocale);
              const description =
                getLocalizedValue(course.description_translations, currentLocale) ||
                getLocalizedValue(course.description, currentLocale) ||
                "No description provided for this course.";
              const category =
                getLocalizedValue(
                  course.course_category?.name ?? course.category?.name,
                  currentLocale
                ) || "Course";
              const primaryInstructor =
                course.instructors && course.instructors.length > 0
                  ? course.instructors.find((item) => item.is_primary)?.name ||
                    course.instructors[0].name
                  : "Awaiting Assignment";

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-lg dark:border-white/10 dark:bg-[#151722] dark:hover:border-indigo-500/40"
                >
                  <div className="relative h-40 w-full shrink-0 overflow-hidden bg-slate-50 dark:bg-white/[0.02]">
                    {course.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.cover_url}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-indigo-50/50 dark:bg-indigo-500/5">
                        <BookOpen className="h-12 w-12 text-indigo-200 dark:text-indigo-500/20" />
                      </div>
                    )}
                    <div
                      className={`absolute top-4 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
                        isRTL ? "left-4" : "right-4"
                      } ${getCourseStatusClass(course.status)}`}
                    >
                      {course.status}
                    </div>
                    {course.is_offline_available ? (
                      <div
                        className={`absolute bottom-4 rounded-md bg-indigo-600/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-sm ${
                          isRTL ? "left-4" : "right-4"
                        }`}
                      >
                        Offline enabled
                      </div>
                    ) : null}
                  </div>

                  <div className="flex grow flex-col p-6">
                    <h3
                      className={`mb-1.5 line-clamp-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 ${
                        isRTL ? "text-right" : ""
                      }`}
                    >
                      {title}
                    </h3>

                    <p
                      className={`mb-5 min-h-[2.75rem] line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 ${
                        isRTL ? "text-right" : ""
                      }`}
                    >
                      {description}
                    </p>

                    <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                      <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
                          <GraduationCap className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60">
                            Assigned Faculty
                          </p>
                          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                            {primaryInstructor}
                            {course.instructors && course.instructors.length > 1 ? (
                              <span className="ml-1.5 font-bold text-indigo-500">
                                +{course.instructors.length - 1}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`mb-6 mt-auto flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <InfoPill icon={Layers} label={course.difficulty_level || "level"} />
                      <InfoPill icon={Clock} label={`${course.actual_duration_hours ?? 0}h`} />
                      <InfoPill icon={ShieldCheck} label={course.is_offline_available ? "Offline" : category} />
                    </div>

                    <div
                      className={`grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4 dark:border-white/10 ${
                        isRTL ? "text-right" : ""
                      }`}
                    >
                      <ActionButton
                        kind="dark"
                        onClick={() => openEditModal(course)}
                        icon={Edit3}
                        label="Manage"
                      />
                      <ActionButton
                        kind="light"
                        onClick={() => openAssignModal(course)}
                        icon={UserPlus}
                        label="Assign"
                      />
                      <ActionButton
                        kind="primary"
                        onClick={() => router.push(`/admin/course-units?course_id=${course.id}`)}
                        icon={Layers}
                        label="Units"
                        className="col-span-1"
                      />
                      <ActionButton
                        kind="offline"
                        onClick={() => openOfflineModal(course)}
                        icon={Archive}
                        label="Offline"
                        className="col-span-1"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <CourseEditorModal
        isOpen={isModalOpen}
        mode={modalMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        form={form}
        updateField={updateField}
        categories={categories}
        fieldErrors={fieldErrors}
        isSubmitting={isSubmitting}
        editingCourse={editingCourse}
        coverFile={coverFile}
        setCoverFile={setCoverFile}
        introVideoFile={introVideoFile}
        setIntroVideoFile={setIntroVideoFile}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isRTL={isRTL}
        currentLocale={currentLocale}
      />

      <AssignInstructorModal
        isOpen={isAssignModalOpen}
        course={assignCourse}
        instructors={filteredInstructors}
        selectedInstructor={selectedInstructor}
        selectedInstructorId={selectedInstructorId}
        setSelectedInstructorId={setSelectedInstructorId}
        searchQuery={instructorSearchQuery}
        setSearchQuery={setInstructorSearchQuery}
        isLoading={isLoadingInstructors}
        isAssigning={isAssigning}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignInstructor}
        getInstructorDisplayName={getInstructorDisplayName}
        isRTL={isRTL}
        currentLocale={currentLocale}
      />

      <OfflinePackageModal
        isOpen={isOfflineModalOpen}
        course={offlineCourse}
        form={offlineForm}
        errors={offlineErrors}
        packageFile={offlinePackageFile}
        onPackageFileChange={handleOfflinePackageFile}
        fileRows={offlineFileRows}
        isPublishing={isPublishingOffline}
        publishedPackage={publishedOfflinePackage}
        updateForm={updateOfflineForm}
        setFileRows={setOfflineFileRows}
        updateFileRow={updateOfflineFileRow}
        addFileRow={() => setOfflineFileRows((prev) => [...prev, emptyOfflineFileRow()])}
        removeFileRow={(rowId) =>
          setOfflineFileRows((prev) => prev.filter((row) => row.id !== rowId))
        }
        generateManifest={generateManifestFromRows}
        onClose={() => setIsOfflineModalOpen(false)}
        onPublish={handlePublishOfflinePackage}
        isRTL={isRTL}
        currentLocale={currentLocale}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.16);
          border-radius: 20px;
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-slate-200/50 bg-slate-100 px-2.5 py-1 dark:border-white/5 dark:bg-white/[0.04]">
      <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {label}
      </span>
    </div>
  );
}

function ActionButton({
  kind,
  icon: Icon,
  label,
  onClick,
  className = "",
}: {
  kind: "dark" | "light" | "primary" | "offline";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  const classes = {
    dark: "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
    light:
      "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.1]",
    primary: "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/25",
    offline:
      "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20",
  }[kind];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#151722] ${classes} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

function CourseEditorModal({
  isOpen,
  mode,
  activeTab,
  setActiveTab,
  form,
  updateField,
  categories,
  fieldErrors,
  isSubmitting,
  editingCourse,
  coverFile,
  setCoverFile,
  introVideoFile,
  setIntroVideoFile,
  onClose,
  onSubmit,
  isRTL,
  currentLocale,
}: {
  isOpen: boolean;
  mode: ModalMode;
  activeTab: "basic" | "content" | "logistics";
  setActiveTab: (tab: "basic" | "content" | "logistics") => void;
  form: FormState;
  updateField: (field: keyof FormState, value: string | boolean) => void;
  categories: Category[];
  fieldErrors: FieldErrors;
  isSubmitting: boolean;
  editingCourse: Course | null;
  coverFile: File | null;
  setCoverFile: (file: File | null) => void;
  introVideoFile: File | null;
  setIntroVideoFile: (file: File | null) => void;
  onClose: () => void;
  onSubmit: (event?: React.SyntheticEvent) => void | Promise<void>;
  isRTL: boolean;
  currentLocale: "en" | "ar";
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            className="relative h-full w-full overflow-hidden border-t border-slate-200 bg-white shadow-[0_100px_150px_-30px_rgba(0,0,0,0.5)] dark:border-white/10 dark:bg-[#0A0F1D] sm:h-auto sm:max-h-[92vh] sm:rounded-[32px] sm:border md:max-w-6xl md:rounded-[64px] 2xl:max-w-7xl"
          >
            <div className="flex h-full flex-col md:max-h-[90vh]">
              <header
                className={`flex items-start justify-between border-b border-slate-100 bg-slate-50/50 p-5 dark:border-white/5 dark:bg-white/2 sm:items-center sm:p-8 md:p-12 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
              >
                <div>
                  <div
                    className={`mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 ${
                      isRTL ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Settings className="h-3 w-3" />
                    Course Configurator
                  </div>
                  <h2 className="text-3xl font-black leading-none tracking-tighter text-slate-900 dark:text-white md:text-5xl">
                    {mode === "create" ? "Launch Course" : "Update Core"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-3xl p-4 text-slate-400 transition-all hover:bg-slate-200 hover:text-indigo-500 active:scale-90 dark:hover:bg-white/10"
                >
                  <X className="h-7 w-7 md:h-8 md:w-8" />
                </button>
              </header>

              <nav
                className={`mx-8 mb-0 mt-8 flex rounded-[32px] bg-slate-100 p-2 shadow-inner dark:bg-white/5 md:mx-12 md:mt-10 md:rounded-[40px] md:p-3 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
              >
                {[
                  { id: "basic", label: "Identity", icon: Layout },
                  { id: "content", label: "Experience", icon: BookOpen },
                  { id: "logistics", label: "Dynamics", icon: Target },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as "basic" | "content" | "logistics")}
                    className={`relative flex flex-1 items-center justify-center gap-3 rounded-3xl py-4 text-[10px] font-black uppercase tracking-widest transition-all md:rounded-[36px] md:py-6 md:text-[11px] ${
                      activeTab === tab.id
                        ? "text-indigo-600 dark:text-white"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-white/60"
                    }`}
                  >
                    {activeTab === tab.id ? (
                      <motion.div
                        layoutId="modalTabLarge"
                        className="absolute inset-0 rounded-3xl bg-white shadow-2xl shadow-indigo-500/20 dark:bg-indigo-600 md:rounded-[36px]"
                      />
                    ) : null}
                    <span className="relative z-10 flex flex-col items-center gap-2 md:flex-row">
                      <tab.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </span>
                  </button>
                ))}
              </nav>

              <form onSubmit={onSubmit} className="custom-scrollbar flex-1 overflow-y-auto p-5 sm:p-8 md:p-12">
                {activeTab === "basic" ? (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                      <TextInputCard
                        label="Launch Title (English)"
                        icon={Layout}
                        value={form.title_en}
                        placeholder="e.g. Masterclass in UX"
                        error={fieldErrors.title_en}
                        onChange={(value) => updateField("title_en", value)}
                        isRTL={isRTL}
                      />
                      <TextInputCard
                        label="عنوان الدورة (العربية)"
                        icon={Languages}
                        value={form.title_ar}
                        placeholder="مثال: التصميم المتقدم"
                        error={fieldErrors.title_ar}
                        onChange={(value) => updateField("title_ar", value)}
                        dir="rtl"
                        isRTL
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 md:gap-10">
                      <SelectCard
                        label="Cluster Category"
                        icon={Layers}
                        value={form.course_category_id}
                        error={fieldErrors.course_category_id}
                        onChange={(value) => updateField("course_category_id", value)}
                        isRTL={isRTL}
                      >
                        <option value="" className="dark:bg-[#0A0F1D]">
                          Select Path
                        </option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="dark:bg-[#0A0F1D]">
                            {typeof cat.name === "string"
                              ? cat.name
                              : getLocalizedValue(cat.name, currentLocale)}
                          </option>
                        ))}
                      </SelectCard>

                      <SelectCard
                        label="Instruction Language"
                        icon={Globe}
                        value={form.language}
                        onChange={(value) => updateField("language", value)}
                        isRTL={isRTL}
                      >
                        <option value="en" className="dark:bg-[#0A0F1D]">
                          English Universal
                        </option>
                        <option value="ar" className="dark:bg-[#0A0F1D]">
                          Arabic Original
                        </option>
                      </SelectCard>

                      <SelectCard
                        label="Complexity Tier"
                        icon={GraduationCap}
                        value={form.difficulty_level}
                        onChange={(value) => updateField("difficulty_level", value)}
                        isRTL={isRTL}
                      >
                        <option value="beginner" className="dark:bg-[#0A0F1D]">
                          Foundational (Entry)
                        </option>
                        <option value="intermediate" className="dark:bg-[#0A0F1D]">
                          Specialized (Mid)
                        </option>
                        <option value="advanced" className="dark:bg-[#0A0F1D]">
                          Mastery (Expert)
                        </option>
                      </SelectCard>
                    </div>
                  </motion.div>
                ) : null}

                {activeTab === "content" ? (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                      <TextareaCard
                        label="Vision Narrative (English)"
                        value={form.description_en}
                        onChange={(value) => updateField("description_en", value)}
                        placeholder="Craft the story of this course..."
                        isRTL={isRTL}
                        rows={8}
                      />
                      <TextareaCard
                        label="وصف المسار (بالعربية)"
                        value={form.description_ar}
                        onChange={(value) => updateField("description_ar", value)}
                        placeholder="ارسم رحلة المتعلم بالكلمات..."
                        dir="rtl"
                        isRTL
                        rows={8}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                      <TextareaCard
                        label="Strategic Objectives (English)"
                        value={form.objectives_en}
                        onChange={(value) => updateField("objectives_en", value)}
                        isRTL={isRTL}
                        rows={5}
                      />
                      <TextareaCard
                        label="Gatekeeper Prerequisites (English)"
                        value={form.prerequisites_en}
                        onChange={(value) => updateField("prerequisites_en", value)}
                        isRTL={isRTL}
                        rows={5}
                      />
                    </div>
                  </motion.div>
                ) : null}

                {activeTab === "logistics" ? (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-12">
                    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                      <TextInputCard
                        label="Temporal Duration (Hours)"
                        icon={Clock}
                        type="number"
                        value={form.actual_duration_hours}
                        onChange={(value) => updateField("actual_duration_hours", value)}
                        isRTL={isRTL}
                      />

                      <SelectCard
                        label="Delivery Logic"
                        icon={MonitorPlay}
                        value={form.course_delivery_type}
                        onChange={(value) => updateField("course_delivery_type", value)}
                        isRTL={isRTL}
                      >
                        <option value="self_paced" className="dark:bg-[#0A0F1D]">
                          Autonomous (Self-Paced)
                        </option>
                        <option value="interactive" className="dark:bg-[#0A0F1D]">
                          Connected (Interactive)
                        </option>
                        <option value="hybrid" className="dark:bg-[#0A0F1D]">
                          Integrated (Hybrid)
                        </option>
                      </SelectCard>

                      <TextInputCard
                        label="Pass Benchmark (%)"
                        icon={Trophy}
                        type="number"
                        value={form.min_score_to_pass}
                        onChange={(value) => updateField("min_score_to_pass", value)}
                        isRTL={isRTL}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                      <SelectCard
                        label="Deployment Status"
                        icon={Settings}
                        value={form.status}
                        onChange={(value) => updateField("status", value)}
                        isRTL={isRTL}
                      >
                        <option value="published" className="dark:bg-[#0A0F1D]">
                          Live (Published)
                        </option>
                        <option value="review" className="dark:bg-[#0A0F1D]">
                          Review (QA)
                        </option>
                        <option value="archived" className="dark:bg-[#0A0F1D]">
                          Storage (Archived)
                        </option>
                        <option value="draft" className="dark:bg-[#0A0F1D]">
                          Concept (Draft)
                        </option>
                      </SelectCard>

                      <div className="space-y-4">
                        <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
                          Connectivity Governance
                        </label>
                        <label
                          className={`flex cursor-pointer items-center justify-between rounded-[32px] border-2 border-transparent bg-slate-100 p-6 transition-all hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 ${
                            isRTL ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div className={`flex items-center gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>
                            <div
                              className={`rounded-2xl p-4 transition-all duration-500 ${
                                form.is_offline_available
                                  ? "bg-indigo-500 text-white shadow-xl shadow-indigo-500/30"
                                  : "bg-slate-200 text-slate-400 dark:bg-white/10"
                              }`}
                            >
                              <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                              <span className="block font-black text-slate-900 dark:text-white">
                                Offline Vaulting
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Allow local access
                              </span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={form.is_offline_available}
                            onChange={(event) =>
                              updateField("is_offline_available", event.target.checked)
                            }
                            className="h-8 w-8 cursor-pointer rounded-xl accent-indigo-600"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                      <FileInputCard
                        label="Course Cover (Image)"
                        icon={Upload}
                        value={coverFile?.name || (editingCourse?.cover_url ? "Replace existing cover image" : "Select cover image")}
                        accept="image/png,image/jpeg,image/webp"
                        onChange={setCoverFile}
                        isRTL={isRTL}
                      />
                      <FileInputCard
                        label="Intro Video"
                        icon={Upload}
                        value={introVideoFile?.name || "Select intro video (mp4 or mov)"}
                        accept="video/mp4,video/quicktime,.mov"
                        onChange={setIntroVideoFile}
                        isRTL={isRTL}
                      />
                    </div>
                  </motion.div>
                ) : null}
              </form>

              <footer
                className={`flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 p-5 dark:border-white/5 dark:bg-white/2 sm:flex-row sm:p-8 md:p-12 ${
                  isRTL ? "sm:flex-row-reverse" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[24px] border-2 border-slate-200 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5 md:rounded-[32px] md:text-[11px]"
                >
                  Abort Changes
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-4 rounded-[24px] bg-indigo-600 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-indigo-500/40 transition-all hover:bg-indigo-700 disabled:opacity-50 md:rounded-[32px] md:text-[11px]"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  {mode === "create" ? "Initialize & Deploy" : "Commit System Update"}
                </button>
              </footer>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function TextInputCard({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  dir,
  isRTL,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  dir?: "rtl" | "ltr";
  isRTL: boolean;
}) {
  return (
    <div className="space-y-4">
      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
        {label}
      </label>
      <div
        className={`flex items-center gap-4 rounded-[32px] border-2 bg-slate-100 p-6 transition-all dark:bg-white/5 ${
          error ? "border-rose-500/50" : "border-transparent focus-within:border-indigo-500/30"
        } ${isRTL || dir === "rtl" ? "flex-row-reverse" : ""}`}
      >
        <Icon className="h-6 w-6 text-indigo-500" />
        <input
          type={type}
          dir={dir}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`flex-1 bg-transparent text-lg font-black text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/10 md:text-xl ${
            isRTL || dir === "rtl" ? "text-right" : ""
          }`}
        />
      </div>
      {error ? <p className="px-2 text-xs font-bold text-rose-500">{error}</p> : null}
    </div>
  );
}

function SelectCard({
  label,
  icon: Icon,
  value,
  onChange,
  error,
  isRTL,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isRTL: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
        {label}
      </label>
      <div
        className={`flex items-center gap-4 rounded-[32px] border-2 bg-slate-100 p-6 transition-all dark:bg-white/5 ${
          error ? "border-rose-500/50" : "border-transparent"
        } ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <Icon className="h-6 w-6 text-indigo-500" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`flex-1 cursor-pointer appearance-none bg-transparent font-black text-slate-900 outline-none dark:text-white ${
            isRTL ? "text-right" : ""
          }`}
        >
          {children}
        </select>
      </div>
      {error ? <p className="px-2 text-xs font-bold text-rose-500">{error}</p> : null}
    </div>
  );
}

function TextareaCard({
  label,
  value,
  onChange,
  placeholder,
  rows,
  dir,
  isRTL,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows: number;
  dir?: "rtl" | "ltr";
  isRTL: boolean;
}) {
  return (
    <div className="space-y-4">
      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
        {label}
      </label>
      <textarea
        rows={rows}
        dir={dir}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full resize-none rounded-[40px] border-2 border-transparent bg-slate-100 p-8 font-bold leading-relaxed text-slate-900 outline-none transition-all focus:border-indigo-500/30 dark:bg-white/5 dark:text-white ${
          isRTL || dir === "rtl" ? "text-right" : ""
        }`}
      />
    </div>
  );
}

function FileInputCard({
  label,
  icon: Icon,
  value,
  accept,
  onChange,
  isRTL,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  accept: string;
  onChange: (file: File | null) => void;
  isRTL: boolean;
}) {
  return (
    <div className="space-y-4">
      <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 ${isRTL ? "text-right" : ""}`}>
        {label}
      </label>
      <label
        className={`flex cursor-pointer items-center gap-4 rounded-[32px] border-2 border-transparent bg-slate-100 p-6 transition-all hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 ${
          isRTL ? "flex-row-reverse" : ""
        }`}
      >
        <Icon className="h-6 w-6 text-indigo-500" />
        <span className="flex-1 truncate font-bold text-slate-700 dark:text-white/70">{value}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}

function AssignInstructorModal({
  isOpen,
  course,
  instructors,
  selectedInstructor,
  selectedInstructorId,
  setSelectedInstructorId,
  searchQuery,
  setSearchQuery,
  isLoading,
  isAssigning,
  onClose,
  onAssign,
  getInstructorDisplayName,
  isRTL,
  currentLocale,
}: {
  isOpen: boolean;
  course: Course | null;
  instructors: Instructor[];
  selectedInstructor: Instructor | null;
  selectedInstructorId: string;
  setSelectedInstructorId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  isAssigning: boolean;
  onClose: () => void;
  onAssign: () => void | Promise<void>;
  getInstructorDisplayName: (inst: Instructor) => string;
  isRTL: boolean;
  currentLocale: "en" | "ar";
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 28 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_40px_120px_rgba(15,23,42,0.65)] dark:border-white/10 dark:bg-[#070d1a]/95"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-cyan-500/15 blur-3xl" />

            <header
              className={`relative flex items-start justify-between border-b border-slate-100 p-6 dark:border-white/10 md:p-8 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <div className="space-y-2">
                <div
                  className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500 ${
                    isRTL ? "flex-row-reverse" : ""
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign Instructor
                </div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
                  {getCourseTitle(course, currentLocale)}
                </h3>
                <div className={`flex items-center gap-2 text-xs ${isRTL ? "flex-row-reverse" : ""}`}>
                  <span className="rounded-full border border-slate-200 bg-slate-100/80 px-2.5 py-1 font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                    {instructors.length} instructors
                  </span>
                  <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 font-bold text-indigo-500 dark:text-indigo-300">
                    {selectedInstructor ? "1 selected" : "None selected"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="relative space-y-5 p-6 md:p-8">
              <div className="group relative">
                <Search
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500 ${
                    isRTL ? "right-4" : "left-4"
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search instructors..."
                  className={`w-full rounded-2xl border border-slate-200 bg-slate-100/90 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white ${
                    isRTL ? "pl-4 pr-11 text-right" : "pl-11 pr-4"
                  }`}
                />
              </div>

              <div className="custom-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                    Loading instructors...
                  </div>
                ) : instructors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                    No instructors found.
                  </div>
                ) : (
                  instructors.map((inst) => {
                    const rawId = getInstructorIdValue(inst);
                    const instId = rawId !== undefined && rawId !== null ? String(rawId) : "";
                    const isSelected = instId !== "" && selectedInstructorId === instId;

                    return (
                      <button
                        key={instId || `${getInstructorDisplayName(inst)}-${inst.email || "unknown"}`}
                        type="button"
                        disabled={!instId}
                        onClick={() => setSelectedInstructorId(instId)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 disabled:opacity-50 ${
                          isSelected
                            ? "border-indigo-500/70 bg-gradient-to-r from-indigo-500/15 to-cyan-500/10 text-indigo-700 shadow-[0_8px_24px_rgba(99,102,241,0.2)] dark:text-indigo-300"
                            : "border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-400/60 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:hover:bg-white/[0.05]"
                        } ${isRTL ? "text-right" : ""}`}
                      >
                        <div className={`flex items-center justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black leading-tight">
                              {getInstructorDisplayName(inst)}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-500 dark:text-white/50">
                              {inst.email || `Instructor ID: ${instId || "N/A"}`}
                            </div>
                          </div>
                          <div
                            className={`h-5 w-5 shrink-0 rounded-full border-2 transition-all ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]"
                                : "border-slate-300 dark:border-white/20"
                            }`}
                          >
                            {isSelected ? (
                              <BadgeCheck className="-translate-x-[1px] -translate-y-[1px] h-4 w-4 text-white" />
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <footer
              className={`flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row md:p-8 ${
                isRTL ? "sm:flex-row-reverse" : ""
              }`}
            >
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onAssign()}
                disabled={isAssigning || !selectedInstructorId}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(99,102,241,0.35)] transition-colors hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Assign Instructor
              </button>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function OfflinePackageModal({
  isOpen,
  course,
  form,
  errors,
  packageFile,
  onPackageFileChange,
  fileRows,
  isPublishing,
  publishedPackage,
  updateForm,
  setFileRows,
  updateFileRow,
  addFileRow,
  removeFileRow,
  generateManifest,
  onClose,
  onPublish,
  isRTL,
  currentLocale,
}: {
  isOpen: boolean;
  course: Course | null;
  form: OfflinePackageForm;
  errors: OfflineFieldErrors;
  packageFile: File | null;
  onPackageFileChange: (file: File | null) => void;
  fileRows: OfflineFileRow[];
  isPublishing: boolean;
  publishedPackage: OfflinePackageResponse | null;
  updateForm: (field: keyof OfflinePackageForm, value: string | boolean) => void;
  setFileRows: React.Dispatch<React.SetStateAction<OfflineFileRow[]>>;
  updateFileRow: (rowId: string, field: keyof Omit<OfflineFileRow, "id">, value: string) => void;
  addFileRow: () => void;
  removeFileRow: (rowId: string) => void;
  generateManifest: () => void;
  onClose: () => void;
  onPublish: () => void | Promise<void>;
  isRTL: boolean;
  currentLocale: "en" | "ar";
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 30 }}
            className="relative flex h-full w-full max-w-7xl flex-col overflow-hidden border-t border-slate-200 bg-white shadow-[0_100px_150px_-30px_rgba(0,0,0,0.6)] dark:border-white/10 dark:bg-[#07101f] sm:max-h-[94vh] sm:rounded-[42px] sm:border"
          >
            <header
              className={`flex items-start justify-between border-b border-slate-100 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/[0.02] md:p-8 ${
                isRTL ? "flex-row-reverse text-right" : ""
              }`}
            >
              <div>
                <div
                  className={`mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 ${
                    isRTL ? "flex-row-reverse" : ""
                  }`}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Offline Package Publisher
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                  {getCourseTitle(course, currentLocale)}
                </h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500 dark:text-white/45">
                  Publish the package record Flutter needs. Drag a package file from your computer or paste a downloadable ZIP URL. Every ZIP path must match the manifest paths.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-3xl p-4 text-slate-400 transition-all hover:bg-slate-200 hover:text-emerald-500 active:scale-90 dark:hover:bg-white/10"
              >
                <X className="h-7 w-7" />
              </button>
            </header>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-6 md:p-8">
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.85fr_1.15fr]">
                <section className="space-y-6">
                  <div className="rounded-[32px] border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-700 dark:text-emerald-300">
                    <div className="mb-2 flex items-center gap-2 font-black">
                      <CheckCircle2 className="h-5 w-5" />
                      How this becomes downloadable
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">
                      After publishing, the student delta endpoint should return this active package. Flutter will issue a token, validate it, download the ZIP from file_url, extract it, read the manifest, then show units, lessons, and files.
                    </p>
                  </div>

                  <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-5 flex items-center gap-3">
                      <Download className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        Package settings
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <OfflineInput
                        label="Course ID"
                        value={form.course_id}
                        onChange={(value) => updateForm("course_id", value)}
                        error={errors.course_id}
                        disabled
                      />
                      <OfflineInput
                        label="Version"
                        value={form.version}
                        placeholder="v1.0.0"
                        onChange={(value) => updateForm("version", value)}
                        error={errors.version}
                      />
                    </div>

                    <div className="mt-4">
                      <OfflineInput
                        label="Downloadable ZIP URL"
                        value={form.file_url}
                        placeholder="http://10.0.2.2:8000/storage/offline/course-1-v1.zip"
                        onChange={(value) => updateForm("file_url", value)}
                        error={errors.file_url}
                        icon={LinkIcon}
                      />
                    </div>

                    <PackageDropZone
                      file={packageFile}
                      error={errors.packageFile}
                      onFileChange={onPackageFileChange}
                    />

                    <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          Publish as active package
                        </p>
                        <p className="text-xs font-semibold text-slate-500 dark:text-white/45">
                          The delta endpoint usually returns the latest active package.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) => updateForm("is_active", event.target.checked)}
                        className="h-6 w-6 rounded accent-emerald-600"
                      />
                    </label>
                  </div>

                  <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          File paths inside ZIP
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={addFileRow}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                      >
                        Add file
                      </button>
                    </div>

                    <div className="space-y-3">
                      {fileRows.map((row, index) => (
                        <div
                          key={row.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.02]"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                              File {index + 1}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeFileRow(row.id)}
                              disabled={fileRows.length === 1}
                              className="text-xs font-bold text-rose-500 disabled:opacity-30"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <SmallInput
                              label="ZIP path"
                              value={row.path}
                              placeholder="unit-1/lesson-1/intro.md"
                              onChange={(value) => updateFileRow(row.id, "path", value)}
                            />
                            <SmallInput
                              label="Label"
                              value={row.label}
                              placeholder="Intro Notes"
                              onChange={(value) => updateFileRow(row.id, "label", value)}
                            />
                            <SmallInput
                              label="Checksum"
                              value={row.checksum}
                              placeholder="sha256:abc123"
                              onChange={(value) => updateFileRow(row.id, "checksum", value)}
                            />
                            <SmallInput
                              label="Size bytes"
                              value={row.sizeBytes}
                              placeholder="1048576"
                              onChange={(value) => updateFileRow(row.id, "sizeBytes", value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={generateManifest}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-indigo-600 transition hover:bg-indigo-600 hover:text-white dark:text-indigo-300"
                    >
                      <Wand2 className="h-4 w-4" />
                      Generate manifest from file paths
                    </button>
                    {errors.files ? <p className="mt-2 text-xs font-bold text-rose-500">{errors.files}</p> : null}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="mb-5 flex items-center gap-3">
                      <FileJson className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        Manifest JSON
                      </h3>
                    </div>
                    <textarea
                      value={form.manifestText}
                      onChange={(event) => updateForm("manifestText", event.target.value)}
                      spellCheck={false}
                      className="custom-scrollbar min-h-[520px] w-full rounded-3xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-relaxed text-emerald-100 outline-none transition focus:border-indigo-500 dark:border-white/10"
                    />
                    {errors.manifest ? (
                      <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-bold text-rose-600 dark:text-rose-300">
                        {errors.manifest}
                      </div>
                    ) : null}
                  </div>

                  {publishedPackage ? (
                    <div className="rounded-[32px] border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-700 dark:text-emerald-300">
                      <div className="mb-2 flex items-center gap-2 font-black">
                        <CheckCircle2 className="h-5 w-5" />
                        Package created
                      </div>
                      <div className="space-y-2 text-sm font-semibold">
                        <p>ID: {publishedPackage.id}</p>
                        <p>Course: {publishedPackage.course_id}</p>
                        <p>Version: {publishedPackage.version}</p>
                        <p className="break-all">URL: {publishedPackage.file_url}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[32px] border border-amber-500/20 bg-amber-500/10 p-5 text-amber-700 dark:text-amber-300">
                    <div className="mb-2 flex items-center gap-2 font-black">
                      <AlertCircle className="h-5 w-5" />
                      Emulator URL reminder
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">
                      Android Emulator cannot download from localhost. Use 10.0.2.2 for local Laravel storage, or use a real public storage URL.
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <footer
              className={`flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row md:p-8 ${
                isRTL ? "sm:flex-row-reverse" : ""
              }`}
            >
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void onPublish()}
                disabled={isPublishing}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPublishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}
                Publish Offline Package
              </button>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}


function PackageDropZone({
  file,
  error,
  onFileChange,
}: {
  file: File | null;
  error?: string;
  onFileChange: (file: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const nextFile = files?.item(0) ?? null;
    onFileChange(nextFile);
  };

  return (
    <div className="mt-5">
      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        Upload package from computer
      </label>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`relative rounded-3xl border-2 border-dashed p-5 transition ${
          error
            ? "border-rose-500/60 bg-rose-500/5"
            : isDragging
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-slate-200 bg-slate-50 hover:border-emerald-500/60 dark:border-white/10 dark:bg-white/[0.03]"
        }`}
      >
        <input
          type="file"
          accept=".zip,.bin,.tar,.gz,application/zip,application/x-zip-compressed,application/octet-stream"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <Upload className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {file ? file.name : "Drop ZIP here, or click to choose from your computer"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/45">
              {file
                ? `${formatFileSize(file.size)} selected. The package will be sent as package_file.`
                : "Use this when the file is still on your device. The URL field becomes optional."}
            </p>
          </div>
          {file ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onFileChange(null);
              }}
              className="relative z-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-rose-500">{error}</p> : null}
      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-white/40">
        The backend must accept multipart field name <span className="font-mono font-black">package_file</span>. If it only accepts JSON, paste a downloadable URL instead.
      </p>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function OfflineInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <div
        className={`flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 dark:bg-white/[0.03] ${
          error ? "border-rose-500/50" : "border-slate-200 dark:border-white/10"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {Icon ? <Icon className="h-4 w-4 text-indigo-500" /> : null}
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
        />
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-rose-500">{error}</p> : null}
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-indigo-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
      />
    </label>
  );
}
