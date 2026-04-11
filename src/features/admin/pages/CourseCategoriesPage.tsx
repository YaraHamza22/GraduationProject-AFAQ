"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  BookOpenCheck,
  Edit3,
  Eye,
  Languages,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Target,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiBaseUrl, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { extractAdminMessage, getAdminToken } from "@/features/admin/adminSession";

type LocalizedText = {
  en?: string;
  ar?: string;
  [key: string]: unknown;
};

type CourseCategory = Record<string, unknown> & {
  id?: string | number;
  name?: string | LocalizedText;
  description?: string | LocalizedText;
  target_audience?: string | null;
  is_active?: boolean | number | string;
  updated_at?: string;
};

type FormState = {
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  target_audience: string;
  is_active: boolean;
};

type FieldName = keyof FormState | "name" | "description";
type FieldErrors = Partial<Record<FieldName, string>>;
type ModalMode = "create" | "edit";

const API_PATH = "/super-admin/course-categories";

const initialForm: FormState = {
  name_en: "",
  name_ar: "",
  description_en: "",
  description_ar: "",
  target_audience: "",
  is_active: true,
};

const locales = ["en", "ar"] as const;
type Locale = (typeof locales)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return "";
}

function getLocalizedValue(value: unknown, locale: Locale, fallbackLocale: Locale = "en") {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";

  const localized = getStringValue(value[locale]);
  if (localized) return localized;

  const fallback = getStringValue(value[fallbackLocale]);
  if (fallback) return fallback;

  const firstValue = Object.values(value).find((item) => typeof item === "string" && item.trim());
  return getStringValue(firstValue);
}

function getCategoryTitle(category: CourseCategory, locale: Locale) {
  return getLocalizedValue(category.name, locale, locale === "en" ? "ar" : "en") || "Untitled category";
}

function isActiveValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["1", "true", "active", "yes"].includes(value.toLowerCase());
  return false;
}

function getCategoryId(category: CourseCategory) {
  const id = category.id ?? category.category_id ?? category.course_category_id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function toLocalizedRecord(value: unknown, locale: Locale): LocalizedText {
  if (isRecord(value)) return value as LocalizedText;

  const text = getStringValue(value);
  return text ? { [locale]: text } : {};
}

function mergeLocalizedField(baseValue: unknown, nextValue: unknown, locale: Locale): LocalizedText {
  return {
    ...toLocalizedRecord(baseValue, locale),
    ...toLocalizedRecord(nextValue, locale),
  };
}

function mergeCategoryTranslation(base: CourseCategory | undefined, next: CourseCategory, locale: Locale): CourseCategory {
  return {
    ...(base ?? {}),
    ...next,
    name: mergeLocalizedField(base?.name, next.name, locale),
    description: mergeLocalizedField(base?.description, next.description, locale),
  };
}

function mergeCategoryListsByTranslation(responses: Array<{ locale: Locale; categories: CourseCategory[] }>) {
  const merged = new Map<string, CourseCategory>();
  const order: string[] = [];

  responses.forEach(({ locale, categories }) => {
    categories.forEach((category, index) => {
      const key = String(getCategoryId(category) ?? `${locale}-${index}`);
      if (!merged.has(key)) order.push(key);

      merged.set(key, mergeCategoryTranslation(merged.get(key), category, locale));
    });
  });

  return order.map((key) => merged.get(key)).filter(Boolean) as CourseCategory[];
}

function getArrayFromRecord(record: Record<string, unknown>): unknown[] | null {
  const keys = ["course_categories", "courseCategories", "categories", "items", "data"];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const nested: unknown[] | null = getArrayFromRecord(value);
      if (nested) return nested;
    }
  }

  return null;
}

function extractList(payload: unknown): CourseCategory[] {
  const list = Array.isArray(payload) ? payload : isRecord(payload) ? getArrayFromRecord(payload) : null;
  return list?.filter(isRecord).map((item: Record<string, unknown>) => item as CourseCategory) ?? [];
}

function extractSingle(payload: unknown): CourseCategory | null {
  if (!isRecord(payload)) return null;

  const keys = ["course_category", "courseCategory", "category", "item", "data"];
  for (const key of keys) {
    const value = payload[key];
    if (isRecord(value)) {
      const nested = extractSingle(value);
      return nested ?? (value as CourseCategory);
    }
  }

  return payload as CourseCategory;
}

function getNumberFromRecord(source: unknown, keys: string[]) {
  if (!isRecord(source)) return null;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }

  return null;
}

function extractTotalPages(payload: unknown) {
  if (!isRecord(payload)) return 1;

  const direct = getNumberFromRecord(payload, ["last_page", "total_pages", "totalPages"]);
  if (direct && direct > 1) return direct;

  const pagination = isRecord(payload.pagination) ? payload.pagination : null;
  const meta = isRecord(payload.meta) ? payload.meta : null;
  const data = isRecord(payload.data) ? payload.data : null;

  return (
    getNumberFromRecord(pagination, ["last_page", "total_pages", "totalPages"]) ??
    getNumberFromRecord(meta, ["last_page", "total_pages", "totalPages"]) ??
    getNumberFromRecord(data, ["last_page", "total_pages", "totalPages"]) ??
    1
  );
}

function readFieldError(value: unknown) {
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === "string" && item.trim()) as string | undefined;
  }

  return typeof value === "string" && value.trim() ? value : undefined;
}

function mapApiErrorKey(key: string): FieldName | null {
  const map: Record<string, FieldName> = {
    name: "name",
    "name.en": "name_en",
    "name.ar": "name_ar",
    description: "description",
    "description.en": "description_en",
    "description.ar": "description_ar",
    target_audience: "target_audience",
    is_active: "is_active",
  };

  return map[key] ?? null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === "missing_api_url") {
      return "NEXT_PUBLIC_API_URL is missing, so the course category API cannot be called.";
    }
    if (error.message === "missing_token") {
      return "The admin session token is missing. Please sign in again.";
    }
  }

  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) {
    return "Cannot reach the backend server. Check that the API is running and the admin proxy is working.";
  }

  const responseMessage =
    typeof error.response.data?.message === "string" && error.response.data.message.trim()
      ? error.response.data.message
      : null;

  return responseMessage ?? fallback;
}

function buildPayload(form: FormState) {
  return {
    name: {
      en: form.name_en,
      ar: form.name_ar,
    },
    description: {
      en: form.description_en,
      ar: form.description_ar,
    },
    target_audience: form.target_audience,
    is_active: form.is_active,
  };
}

function buildFormFromCategory(category: CourseCategory): FormState {
  return {
    name_en: getLocalizedValue(category.name, "en", "ar"),
    name_ar: getLocalizedValue(category.name, "ar", "en"),
    description_en: getLocalizedValue(category.description, "en", "ar"),
    description_ar: getLocalizedValue(category.description, "ar", "en"),
    target_audience: getStringValue(category.target_audience),
    is_active: isActiveValue(category.is_active),
  };
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/40">
        {label}
      </label>
      {children}
      {error ? <p className="px-1 text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/35">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-900 dark:text-white">
        {value || "Not provided"}
      </p>
    </div>
  );
}

export default function CourseCategoriesPage() {
  const { isRTL } = useLanguage();
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const apiBaseUrl = getAdminApiBaseUrl();

  const headers = useCallback((locale?: Locale) => {
    if (!apiBaseUrl) throw new Error("missing_api_url");
    const token = getAdminToken();
    if (!token) throw new Error("missing_token");

    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(locale ? { "Accept-Language": locale, "X-Locale": locale } : {}),
    };
  }, [apiBaseUrl]);

  const loadCategories = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);

    try {
      const loadLocale = async (locale: Locale) => {
        const requestHeaders = headers(locale);
        const collected: CourseCategory[] = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const response = await axios.get(getAdminApiRequestUrl(API_PATH), {
            headers: requestHeaders,
            params: { page: currentPage },
          });

          collected.push(...extractList(response.data));
          totalPages = extractTotalPages(response.data);
          currentPage += 1;
        } while (currentPage <= totalPages);

        return collected;
      };

      const responses = await Promise.all(locales.map(async (locale) => ({ locale, categories: await loadLocale(locale) })));
      setCategories(mergeCategoryListsByTranslation(responses));
    } catch (error) {
      setListError(getErrorMessage(error, "Unable to load course categories right now."));
      setCategories([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [headers]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((category) => {
      const values = [
        getLocalizedValue(category.name, "en", "ar"),
        getLocalizedValue(category.name, "ar", "en"),
        getLocalizedValue(category.description, "en", "ar"),
        getLocalizedValue(category.description, "ar", "en"),
        getStringValue(category.target_audience),
      ];

      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [categories, searchQuery]);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setFieldErrors({});
    setSubmitError(null);
    setEditingCategory(null);
  }, []);

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: CourseCategory) => {
    setModalMode("edit");
    setEditingCategory(category);
    setForm(buildFormFromCategory(category));
    setFieldErrors({});
    setSubmitError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const updateField =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === "is_active" ? (event.currentTarget as HTMLInputElement).checked : event.currentTarget.value;
      setForm((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setSubmitError(null);
      setSuccessMessage(null);
    };

  const applyApiFieldErrors = (error: unknown) => {
    if (!axios.isAxiosError(error) || !isRecord(error.response?.data?.errors)) return;

    const nextErrors: FieldErrors = {};
    for (const [key, value] of Object.entries(error.response.data.errors)) {
      const mappedKey = mapApiErrorKey(key);
      const fieldError = readFieldError(value);
      if (mappedKey && fieldError) nextErrors[mappedKey] = fieldError;
    }

    setFieldErrors(nextErrors);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      const requestHeaders = headers();
      const payload = buildPayload(form);

      if (modalMode === "edit") {
        const id = editingCategory ? getCategoryId(editingCategory) : null;
        if (!id) throw new Error("missing_category_id");

        const response = await axios.put(getAdminApiRequestUrl(`${API_PATH}/${id}`), payload, {
          headers: { ...requestHeaders, "Content-Type": "application/json" },
        });

        setSuccessMessage(extractAdminMessage(response.data) ?? "Course category was updated successfully.");
      } else {
        const response = await axios.post(getAdminApiRequestUrl(API_PATH), payload, {
          headers: { ...requestHeaders, "Content-Type": "application/json" },
        });

        setSuccessMessage(extractAdminMessage(response.data) ?? "Course category was created successfully.");
      }

      closeModal();
      await loadCategories();
    } catch (error) {
      const fallback =
        error instanceof Error && error.message === "missing_category_id"
          ? "This course category does not have an ID, so it cannot be updated."
          : modalMode === "edit"
            ? "Unable to update the course category right now."
            : "Unable to create the course category right now.";

      setSubmitError(getErrorMessage(error, fallback));
      applyApiFieldErrors(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetails = async (category: CourseCategory) => {
    const id = getCategoryId(category);
    setSelectedCategory(category);
    setIsDetailOpen(true);
    setDetailError(null);

    if (!id) return;

    setIsLoadingDetail(true);
    try {
      const responses = await Promise.all(
        locales.map(async (locale) => {
          const response = await axios.get(getAdminApiRequestUrl(`${API_PATH}/${id}`), {
            headers: headers(locale),
          });

          return {
            locale,
            category: extractSingle(response.data),
          };
        }),
      );

      const nextCategory = responses.reduce<CourseCategory | undefined>((merged, response) => {
        return response.category ? mergeCategoryTranslation(merged, response.category, response.locale) : merged;
      }, category);

      setSelectedCategory(nextCategory ?? category);
    } catch (error) {
      setDetailError(getErrorMessage(error, "Unable to load this course category."));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const locale = isRTL ? "ar" : "en";

  return (
    <div className={`relative min-h-screen bg-slate-50 p-4 sm:p-6 xl:p-10 dark:bg-transparent ${isRTL ? "text-right" : ""}`}>
      <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-sky-500/5 blur-[110px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1800px]">
        <header className={`mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between ${isRTL ? "xl:flex-row-reverse" : ""}`}>
          <div className="min-w-0">
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/15 bg-indigo-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 ${isRTL ? "flex-row-reverse" : ""}`}>
              <BookOpenCheck className="h-3.5 w-3.5" />
              Learning Module
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white md:text-5xl">
              Course <span className="bg-linear-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">Category</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-white/55 sm:text-base">
              Manage bilingual course category names, descriptions, target audience, and active status.
            </p>
          </div>

          <div className={`flex flex-col gap-3 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() => void loadCategories()}
              disabled={isLoadingList}
              className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingList ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>
        </header>

        <div className={`mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between ${isRTL ? "xl:flex-row-reverse" : ""}`}>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/45 dark:shadow-none">
            {isLoadingList ? "Loading..." : `${categories.length} ${categories.length === 1 ? "Category" : "Categories"}`}
          </div>
          <div className="relative w-full max-w-xl">
            <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRTL ? "right-4" : "left-4"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search categories..."
              className={`w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 ${isRTL ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`}
            />
          </div>
        </div>

        {listError ? (
          <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse" : ""}`}>
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">{listError}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 ${isRTL ? "flex-row-reverse" : ""}`}>
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">{successMessage}</p>
          </div>
        ) : null}

        {isLoadingList ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                <div className="mt-5 h-5 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
                <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Tags className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">No course categories found</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-white/45">
              Add the first category to start organizing courses.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredCategories.map((category, index) => {
              const id = getCategoryId(category);
              const active = isActiveValue(category.is_active);
              const nameEn = getLocalizedValue(category.name, "en", "ar");
              const nameAr = getLocalizedValue(category.name, "ar", "en");
              const descriptionEn = getLocalizedValue(category.description, "en", "ar");
              const descriptionAr = getLocalizedValue(category.description, "ar", "en");

              return (
                <motion.article
                  key={String(id ?? `${getCategoryTitle(category, "en")}-${index}`)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none dark:hover:border-indigo-400/40"
                >
                  <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={`flex min-w-0 items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-600/20">
                        <Tags className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xl font-black text-slate-900 dark:text-white">
                          {getCategoryTitle(category, locale)}
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-indigo-600 dark:text-indigo-300" dir="rtl">
                          {nameAr || "Arabic name not provided"}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">
                          {id ? `ID ${id}` : "No ID"}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/35"
                    }`}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">
                        English
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-700 dark:text-white/70">
                        {nameEn || "English name not provided"}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-white/45">
                        {descriptionEn || "English description not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right dark:border-white/10 dark:bg-white/[0.03]" dir="rtl">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">
                        Arabic
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-700 dark:text-white/70">
                        {nameAr || "Arabic name not provided"}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-white/45">
                        {descriptionAr || "Arabic description not provided"}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] ${isRTL ? "flex-row-reverse" : ""}`}>
                    <Target className="h-4 w-4 text-indigo-500" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">
                        Target Audience
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                        {getStringValue(category.target_audience) || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-5 flex flex-col gap-2 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                    <button type="button" onClick={() => void openDetails(category)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-white">
                      <Eye className="h-4 w-4" />
                      Show
                    </button>
                    <button type="button" onClick={() => openEditModal(category)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300">
                      <Edit3 className="h-4 w-4" />
                      Update
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
            <div className="flex min-h-full items-center justify-center">
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#020617]">
                <div className="flex max-h-[92vh] flex-col">
                  <div className={`flex items-start justify-between gap-4 border-b border-slate-200 bg-linear-to-r from-indigo-500/10 via-white to-sky-500/10 p-5 dark:border-white/10 dark:via-white/[0.03] ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
                        {modalMode === "edit" ? `PUT ${API_PATH}/${getCategoryId(editingCategory ?? {}) ?? ""}` : `POST ${API_PATH}`}
                      </p>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        {modalMode === "edit" ? "Update Course Category" : "Add Course Category"}
                      </h2>
                    </div>
                    <button type="button" onClick={closeModal} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-5 sm:p-6 xl:p-8">
                    {submitError ? (
                      <div className={`mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-sm leading-6">{submitError}</p>
                      </div>
                    ) : null}

                    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
                      <Field label="English Name" error={fieldErrors.name_en ?? fieldErrors.name}>
                        <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <Languages className="h-5 w-5 text-indigo-500" />
                          <input type="text" value={form.name_en} onChange={updateField("name_en")} placeholder="Course Type Name" className="w-full bg-transparent px-3 py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25" />
                        </div>
                      </Field>

                      <Field label="Arabic Name" error={fieldErrors.name_ar ?? fieldErrors.name}>
                        <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <Languages className="h-5 w-5 text-indigo-500" />
                          <input type="text" value={form.name_ar} onChange={updateField("name_ar")} placeholder="Arabic course type name" dir="rtl" className="w-full bg-transparent px-3 py-4 text-right text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25" />
                        </div>
                      </Field>

                      <Field label="English Description" error={fieldErrors.description_en ?? fieldErrors.description}>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <textarea value={form.description_en} onChange={updateField("description_en")} rows={4} placeholder="English" className="w-full resize-none bg-transparent py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25" />
                        </div>
                      </Field>

                      <Field label="Arabic Description" error={fieldErrors.description_ar ?? fieldErrors.description}>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <textarea value={form.description_ar} onChange={updateField("description_ar")} rows={4} placeholder="Arabic" dir="rtl" className="w-full resize-none bg-transparent py-4 text-right text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25" />
                        </div>
                      </Field>

                      <Field label="Target Audience" error={fieldErrors.target_audience}>
                        <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                          <Target className="h-5 w-5 text-indigo-500" />
                          <input type="text" value={form.target_audience} onChange={updateField("target_audience")} placeholder="Target audience" className="w-full bg-transparent px-3 py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25" />
                        </div>
                      </Field>

                      <Field label="Status" error={fieldErrors.is_active}>
                        <label className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] ${isRTL ? "flex-row-reverse" : ""}`}>
                          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                            {form.is_active ? <ToggleRight className="h-6 w-6 text-emerald-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {form.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <input type="checkbox" checked={form.is_active} onChange={updateField("is_active")} className="h-5 w-5 accent-indigo-600" />
                        </label>
                      </Field>

                      <div className={`lg:col-span-2 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-white/10 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                        <button type="button" onClick={closeModal} className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white sm:w-auto">
                          <X className="h-5 w-5" />
                          Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.28em] text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300 sm:w-auto">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <BadgeCheck className="h-5 w-5" />
                              {modalMode === "edit" ? "Update Category" : "Create Category"}
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailOpen && selectedCategory ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm">
            <div className={`flex min-h-full ${isRTL ? "justify-start" : "justify-end"}`}>
              <motion.aside
                initial={{ x: isRTL ? -420 : 420 }}
                animate={{ x: 0 }}
                exit={{ x: isRTL ? -420 : 420 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className="flex h-screen w-full max-w-xl flex-col border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#020617]"
              >
                <div className={`flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-white/10 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
                      GET {API_PATH}/{getCategoryId(selectedCategory) ?? ""}
                    </p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                      {getCategoryTitle(selectedCategory, locale)}
                    </h2>
                  </div>
                  <button type="button" onClick={() => setIsDetailOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {isLoadingDetail ? (
                    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading category...
                    </div>
                  ) : null}

                  {detailError ? (
                    <div className={`mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <p className="text-sm leading-6">{detailError}</p>
                    </div>
                  ) : null}

                  <div className="grid gap-4">
                    <DetailLine label="Name EN" value={getLocalizedValue(selectedCategory.name, "en", "ar")} />
                    <DetailLine label="Name AR" value={getLocalizedValue(selectedCategory.name, "ar", "en")} />
                    <DetailLine label="Description EN" value={getLocalizedValue(selectedCategory.description, "en", "ar")} />
                    <DetailLine label="Description AR" value={getLocalizedValue(selectedCategory.description, "ar", "en")} />
                    <DetailLine label="Target Audience" value={getStringValue(selectedCategory.target_audience)} />
                    <DetailLine label="Active Translation" value={isActiveValue(selectedCategory.is_active) ? "Active" : "Inactive"} />
                    <DetailLine label="Updated At" value={getStringValue(selectedCategory.updated_at)} />
                  </div>
                </div>

                <div className="border-t border-slate-200 p-6 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openEditModal(selectedCategory);
                    }}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.24em] text-white transition hover:bg-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300"
                  >
                    <Edit3 className="h-5 w-5" />
                    Update Category
                  </button>
                </div>
              </motion.aside>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
