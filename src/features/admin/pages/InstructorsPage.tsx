"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  Eye,
  EyeOff,
  Globe2,
  ImageUp,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Shield,
  Sparkles,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiBaseUrl, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { extractAdminMessage, getAdminToken } from "@/features/admin/adminSession";

type FieldName =
  | "name"
  | "email"
  | "password"
  | "password_confirmation"
  | "phone"
  | "date_of_birth"
  | "gender"
  | "years_of_experience"
  | "address"
  | "country"
  | "bio"
  | "specialization"
  | "avatar";

type FieldErrors = Partial<Record<FieldName, string>>;

type FormState = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  years_of_experience: string;
  address: string;
  country: string;
  bio: string;
  specialization: string;
};

type InstructorProfile = Record<string, unknown> & {
  years_of_experience?: string | number;
  address?: string;
  country?: string;
  specialization?: string;
  bio?: string;
};

type Instructor = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  years_of_experience?: string | number;
  address?: string;
  country?: string;
  specialization?: string;
  avatar?: string;
  avatar_url?: string;
  image?: string;
  profile_image?: string;
  instructorProfile?: InstructorProfile | null;
  instructor_profile?: InstructorProfile | null;
  roles?: unknown[];
  media?: unknown[];
};

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const passwordFields = ["password", "password_confirmation"] as const;

const initialForm: FormState = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  years_of_experience: "",
  address: "",
  country: "",
  bio: "",
  specialization: "",
};

const simpleFields: Array<{
  key: keyof FormState;
  label: string;
  icon: LucideIcon;
  type?: string;
  placeholder: string;
}> = [
  { key: "name", label: "Name", icon: UserCircle, placeholder: "Instructor name" },
  { key: "email", label: "Email", icon: Mail, type: "email", placeholder: "instructor@example.com" },
  { key: "password", label: "Password", icon: Lock, type: "password", placeholder: "P@ssw0rd" },
  { key: "password_confirmation", label: "Password Confirmation", icon: Lock, type: "password", placeholder: "P@ssw0rd" },
  { key: "phone", label: "Phone", icon: Phone, placeholder: "+963..." },
  { key: "date_of_birth", label: "Date of Birth", icon: CalendarDays, type: "date", placeholder: "" },
  { key: "years_of_experience", label: "Years of Experience", icon: Sparkles, type: "number", placeholder: "5" },
  { key: "specialization", label: "Specialization", icon: Shield, placeholder: "Front End" },
  { key: "country", label: "Country", icon: Globe2, placeholder: "Syria" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getDisplayValue(value: unknown, fallback = "Not provided") {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function readFieldError(value: unknown) {
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first : null;
  }

  return getStringValue(value);
}

function extractList(payload: unknown): Instructor[] {
  const candidates: unknown[] = [];

  if (Array.isArray(payload)) {
    candidates.push(payload);
  }

  if (isRecord(payload)) {
    candidates.push(payload.instructors, payload.items, payload.users, payload.data);
    if (isRecord(payload.data)) {
      candidates.push(payload.data.instructors, payload.data.items, payload.data.users, payload.data.data);
    }
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord).map((item) => item as Instructor).filter(isInstructorRecord);
    }
  }

  return [];
}

function extractTotalPages(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.pagination)) {
    return 1;
  }

  const totalPages = payload.pagination.total_pages;
  return typeof totalPages === "number" && totalPages > 1 ? totalPages : 1;
}

function extractCreated(payload: unknown): Instructor | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (isRecord(payload.user)) return payload.user;
  if (isRecord(payload.instructor)) return payload.instructor;
  if (!isRecord(payload.data)) return null;
  if (isRecord(payload.data.user)) return payload.data.user;
  if (isRecord(payload.data.instructor)) return payload.data.instructor;
  return payload.data;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message === "missing_api_url") {
      return "NEXT_PUBLIC_API_URL is missing, so the instructors API cannot be called.";
    }
    if (error.message === "missing_token") {
      return "The admin session token is missing. Please sign in again.";
    }
  }

  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return "Cannot reach the backend server. Check that the API is running and the admin proxy is working.";
  }

  const responseMessage =
    typeof error.response.data?.message === "string" && error.response.data.message.trim()
      ? error.response.data.message
      : null;

  return responseMessage ?? fallback;
}

function shouldFallbackToUsers(error: unknown) {
  if (!axios.isAxiosError(error) || !error.response) {
    return false;
  }

  const message =
    typeof error.response.data?.message === "string"
      ? error.response.data.message.toLowerCase()
      : "";

  return error.response.status >= 500 || message.includes("validated");
}

function dedupeInstructors(items: Instructor[]) {
  const seen = new Set<string>();

  return items.filter((item, index) => {
    const key = String(item.id ?? item.email ?? `instructor-${index}`);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getAvatarUrl(instructor: Instructor, apiBaseUrl: string) {
  const mediaUrl = Array.isArray(instructor.media)
    ? instructor.media
        .filter(isRecord)
        .map((item) => getStringValue(item.original_url) ?? getStringValue(item.preview_url) ?? getStringValue(item.url))
        .find(Boolean)
    : null;

  const value =
    mediaUrl ??
    getStringValue(instructor.avatar_url) ??
    getStringValue(instructor.avatar) ??
    getStringValue(instructor.image) ??
    getStringValue(instructor.profile_image);

  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const root = apiBaseUrl.replace(/\/api\/v\d+$/i, "");
  return root ? `${root}/${value.replace(/^\/+/, "")}` : value;
}

function getInitials(instructor: Instructor) {
  const source = getStringValue(instructor.name) ?? getStringValue(instructor.email) ?? "IN";

  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getInstructorProfile(instructor: Instructor) {
  if (isRecord(instructor.instructorProfile)) return instructor.instructorProfile as InstructorProfile;
  if (isRecord(instructor.instructor_profile)) return instructor.instructor_profile as InstructorProfile;
  return null;
}

function hasInstructorRole(instructor: Instructor) {
  if (!Array.isArray(instructor.roles)) return false;

  return instructor.roles
    .filter(isRecord)
    .some((role) => getStringValue(role.name)?.toLowerCase() === "instructor");
}

function isInstructorRecord(instructor: Instructor) {
  return Boolean(getInstructorProfile(instructor) || hasInstructorRole(instructor));
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Not provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
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
      <label className="block text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/40">
        {label}
      </label>
      {children}
      {error ? <p className="px-1 text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}

export default function InstructorsManagement() {
  const { t, isRTL } = useLanguage();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<(typeof passwordFields)[number], boolean>>({
    password: false,
    password_confirmation: false,
  });
  const apiBaseUrl = getAdminApiBaseUrl();

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

    const nextUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [avatarFile]);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setAvatarFile(null);
    setFieldErrors({});
    setCreateError(null);
    setVisiblePasswords({
      password: false,
      password_confirmation: false,
    });
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const loadInstructors = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);

    try {
      if (!apiBaseUrl) throw new Error("missing_api_url");
      const token = getAdminToken();
      if (!token) throw new Error("missing_token");

      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const loadAllPages = async (path: string) => {
        const collected: Instructor[] = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const response = await axios.get(getAdminApiRequestUrl(path), {
            headers,
            params: { page: currentPage },
          });

          collected.push(...extractList(response.data));
          totalPages = extractTotalPages(response.data);
          currentPage += 1;
        } while (currentPage <= totalPages);

        return dedupeInstructors(collected);
      };

      try {
        const nextInstructors = await loadAllPages("/super-admin/instructors");
        setInstructors(nextInstructors);
      } catch (primaryError) {
        if (!shouldFallbackToUsers(primaryError)) {
          throw primaryError;
        }

        const nextInstructors = await loadAllPages("/super-admin/users");
        setInstructors(nextInstructors);
      }
    } catch (error) {
      setListError(getErrorMessage(error, "Unable to load instructors right now."));
      setInstructors([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadInstructors();
  }, [loadInstructors]);

  const updateField =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setCreateError(null);
      setSuccessMessage(null);
    };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setCreateError(null);
    setSuccessMessage(null);

    if (nextFile && nextFile.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarFile(null);
      setFieldErrors((current) => ({
        ...current,
        avatar: "Avatar must be 2 MB or smaller.",
      }));
      event.target.value = "";
      return;
    }

    setAvatarFile(nextFile);
    setFieldErrors((current) => ({ ...current, avatar: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      if (!apiBaseUrl) throw new Error("missing_api_url");
      const token = getAdminToken();
      if (!token) throw new Error("missing_token");
      if (avatarFile && avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
        setFieldErrors({ avatar: "Avatar must be 2 MB or smaller." });
        setCreateError("Please choose an avatar file that is 2 MB or smaller.");
        return;
      }

      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (avatarFile) payload.append("avatar", avatarFile);

      const response = await axios.post(getAdminApiRequestUrl("/super-admin/instructors"), payload, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const created = extractCreated(response.data);
      const createdName = getStringValue(created?.name) ?? "Instructor";
      setSuccessMessage(extractAdminMessage(response.data) ?? `${createdName} was created successfully.`);
      closeModal();
      await loadInstructors();
    } catch (error) {
      setCreateError(getErrorMessage(error, "Unable to create the instructor right now."));
      if (axios.isAxiosError(error) && isRecord(error.response?.data?.errors)) {
        const nextErrors: FieldErrors = {};
        const errors = error.response?.data?.errors;
        for (const key of Object.keys(errors) as FieldName[]) {
          const fieldError = readFieldError(errors[key]);
          if (fieldError) nextErrors[key] = fieldError;
        }
        setFieldErrors(nextErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative min-h-screen bg-slate-50 p-4 sm:p-6 xl:p-10 dark:bg-transparent ${isRTL ? "text-right" : ""}`}>
      <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-indigo-500/5 blur-[110px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1800px]">
        <header className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/15 bg-indigo-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Shield className="h-3.5 w-3.5" />
              {isRTL ? "إدارة المدربين" : "Instructor Management"}
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white md:text-5xl">
              {t("adm.management")}{" "}
              <span className="bg-linear-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">
                {t("adm.instructors")}
              </span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-white/55 sm:text-base">
              {isRTL
                ? "اعرض جميع المدربين وأضف مدربًا جديدًا من نافذة منبثقة مرتبطة بالواجهة الحقيقية."
                : "View all instructors and add a new instructor from a popup connected to the live API."}
            </p>
          </div>

          <div className={`flex flex-col gap-3 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/45 dark:shadow-none">
              {isLoadingList ? "Loading..." : `${instructors.length} ${instructors.length === 1 ? "Instructor" : "Instructors"}`}
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setSuccessMessage(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300"
            >
              <Plus className="h-4 w-4" />
              {isRTL ? "إضافة مدرب" : "Add Instructor"}
            </button>
          </div>
        </header>

        {listError ? (
          <div className={`mb-6 flex items-start gap-3 rounded-[1.6rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse" : ""}`}>
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">{listError}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div className={`mb-6 flex items-start gap-3 rounded-[1.6rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 ${isRTL ? "flex-row-reverse" : ""}`}>
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6">{successMessage}</p>
          </div>
        ) : null}

        {isLoadingList ? (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                <div className="mt-5 h-5 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
                <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : instructors.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-indigo-500/10 text-indigo-500">
              <UserCircle className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">
              {isRTL ? "لا يوجد مدربون بعد" : "No instructors yet"}
            </h2>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {instructors.map((instructor, index) => {
              const avatarUrl = getAvatarUrl(instructor, apiBaseUrl);
              const profile = getInstructorProfile(instructor);
              const specialization = getDisplayValue(profile?.specialization ?? instructor.specialization);
              const experience = getDisplayValue(profile?.years_of_experience ?? instructor.years_of_experience, "0");
              const address = getDisplayValue(profile?.address ?? instructor.address);
              return (
                <motion.article
                  key={String(instructor.id ?? `${instructor.email ?? "instructor"}-${index}`)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none"
                >
                  <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={getDisplayValue(instructor.name, "Instructor avatar")} className="h-16 w-16 rounded-[1.4rem] object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-linear-to-br from-indigo-600 to-sky-500 text-xl font-black text-white">
                        {getInitials(instructor)}
                      </div>
                    )}

                    <div className={`min-w-0 ${isRTL ? "text-right" : ""}`}>
                      <p className="truncate text-xl font-black text-slate-900 dark:text-white">
                        {getDisplayValue(instructor.name, "Instructor")}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                        {specialization}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/35">Email</p>
                      <p className="mt-2 break-all text-sm font-bold text-slate-900 dark:text-white">{getDisplayValue(instructor.email)}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/35">Phone</p>
                      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{getDisplayValue(instructor.phone)}</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/35">Experience</p>
                      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{experience} years</p>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/35">Birth Date</p>
                      <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{formatDate(instructor.date_of_birth)}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-white/35">Address</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-900 dark:text-white">{address}</p>
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
              <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-[#020617]">
                <div className="flex max-h-[92vh] flex-col">
                  <div className={`flex items-start justify-between gap-4 border-b border-slate-200 bg-linear-to-r from-indigo-500/10 via-white to-sky-500/10 p-5 dark:border-white/10 dark:via-white/[0.03] ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
                        POST /super-admin/instructors
                      </p>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        {isRTL ? "إضافة مدرب" : "Add Instructor"}
                      </h2>
                    </div>
                    <button type="button" onClick={closeModal} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-5 sm:p-6 xl:p-8">
                    {createError ? (
                      <div className={`mb-6 flex items-start gap-3 rounded-[1.6rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-sm leading-6">{createError}</p>
                      </div>
                    ) : null}

                    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="grid gap-5 sm:grid-cols-2">
	                        {simpleFields.map((field) => {
	                          const Icon = field.icon;
                            const isPasswordField = passwordFields.includes(field.key as (typeof passwordFields)[number]);
                            const currentType =
                              isPasswordField && visiblePasswords[field.key as (typeof passwordFields)[number]]
                                ? "text"
                                : field.type ?? "text";
	                          return (
	                            <Field key={field.key} label={field.label} error={fieldErrors[field.key]}>
	                              <div className="flex items-center rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
	                                <Icon className="h-5 w-5 text-indigo-500" />
	                                <input
	                                  type={currentType}
	                                  min={field.type === "number" ? "0" : undefined}
	                                  value={form[field.key]}
	                                  onChange={updateField(field.key)}
	                                  placeholder={field.placeholder}
	                                  dir={field.key === "email" || field.key === "password" || field.key === "password_confirmation" || field.key === "phone" ? "ltr" : undefined}
	                                  className="w-full bg-transparent px-3 py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25"
	                                />
                                  {isPasswordField ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVisiblePasswords((current) => ({
                                          ...current,
                                          [field.key]: !current[field.key as (typeof passwordFields)[number]],
                                        }))
                                      }
                                      className="shrink-0 rounded-full p-2 text-slate-500 transition hover:text-slate-950 dark:text-white/45 dark:hover:text-white"
                                      aria-label={
                                        visiblePasswords[field.key as (typeof passwordFields)[number]]
                                          ? `Hide ${field.label.toLowerCase()}`
                                          : `Show ${field.label.toLowerCase()}`
                                      }
                                    >
                                      {visiblePasswords[field.key as (typeof passwordFields)[number]] ? (
                                        <EyeOff className="h-5 w-5" />
                                      ) : (
                                        <Eye className="h-5 w-5" />
                                      )}
                                    </button>
                                  ) : null}
	                              </div>
	                            </Field>
	                          );
	                        })}

                        <Field label="Gender" error={fieldErrors.gender}>
                          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                            <select value={form.gender} onChange={updateField("gender")} className="w-full bg-transparent py-4 text-base text-slate-950 outline-none dark:text-white">
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                        </Field>

                        <div className="sm:col-span-2">
                          <Field label="Address" error={fieldErrors.address}>
                            <div className="flex items-center rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                              <MapPin className="h-5 w-5 text-indigo-500" />
                              <input value={form.address} onChange={updateField("address")} placeholder="Sweida" className="w-full bg-transparent px-3 py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25" />
                            </div>
                          </Field>
                        </div>

                        <div className="sm:col-span-2">
                          <Field label="Bio" error={fieldErrors.bio}>
                            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-white/[0.03]">
                              <textarea value={form.bio} onChange={updateField("bio")} rows={4} placeholder="Short instructor bio" className="w-full resize-none bg-transparent py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25" />
                            </div>
                          </Field>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <Field label="Avatar" error={fieldErrors.avatar}>
                          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.6rem] border border-dashed border-indigo-300 bg-indigo-50/60 px-5 py-8 text-center transition hover:border-indigo-500 hover:bg-indigo-50 dark:border-indigo-400/30 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10">
                            <ImageUp className="h-8 w-8 text-indigo-500" />
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white">
                                {avatarFile ? avatarFile.name : "Choose instructor avatar"}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">PNG, JPG, JPEG, max 2 MB</p>
                            </div>
                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                          </label>
                        </Field>

                        <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
                          {avatarPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarPreview} alt="Instructor avatar preview" className="h-64 w-full object-cover" />
                          ) : (
                            <div className="flex h-64 items-center justify-center text-slate-400 dark:text-white/25">
                              <ImageUp className="h-10 w-10" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`lg:col-span-2 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-white/10 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                        <button type="button" onClick={closeModal} className="inline-flex w-full items-center justify-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white sm:w-auto">
                          <X className="h-5 w-5" />
                          Cancel
                        </button>

                        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-3 rounded-[1.6rem] bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.28em] text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300 sm:w-auto">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <BadgeCheck className="h-5 w-5" />
                              Create Instructor
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
    </div>
  );
}
