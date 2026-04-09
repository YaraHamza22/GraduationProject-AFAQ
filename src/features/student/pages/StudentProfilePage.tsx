"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import {
  type StudentSessionUser,
  extractStudentUser,
  getStoredStudentUser,
  getStudentToken,
  updateStoredStudentUser,
} from "@/features/student/studentSession";

function getDisplayValue(value: unknown, fallback = "Not provided") {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function formatDateOfBirth(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Not provided";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsedDate);
}

function getProfileInitials(profile: StudentSessionUser | null) {
  const source =
    typeof profile?.name === "string" && profile.name.trim()
      ? profile.name
      : typeof profile?.email === "string" && profile.email.trim()
        ? profile.email
        : "ST";

  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function hasDetailedStudentProfile(profile: StudentSessionUser | null) {
  if (!profile) {
    return false;
  }

  return ["phone", "date_of_birth", "gender", "address"].some((field) => {
    const value = profile[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function getStudentProfileErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "missing_token") {
    return "Student token is missing. Please log in again.";
  }

  if (!axios.isAxiosError(error)) {
    return "Unable to load the student profile right now.";
  }

  if (!error.response) {
    return "Cannot reach the backend server. Check that the API is running and the dev proxy is active.";
  }

  const message =
    typeof error.response.data?.message === "string" && error.response.data.message.trim()
      ? error.response.data.message
      : null;

  return message ?? "The student profile endpoint returned an error.";
}

export default function StudentProfilePage() {
  const { t, isRTL } = useLanguage();
  const [profile, setProfile] = useState<StudentSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async (options?: { silent?: boolean }) => {
    setIsLoading(true);
    if (!options?.silent) {
      setErrorMessage(null);
    }

    try {
      const token = getStudentToken();
      if (!token) {
        throw new Error("missing_token");
      }

      const response = await axios.get(getStudentApiRequestUrl("/auth/profile"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const nextProfile = extractStudentUser(response.data) ?? getStoredStudentUser();

      setProfile(nextProfile);
      setErrorMessage(null);

      if (nextProfile) {
        updateStoredStudentUser(nextProfile);
      }
    } catch (error) {
      if (!options?.silent) {
        setErrorMessage(getStudentProfileErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedProfile = getStoredStudentUser();

    if (storedProfile) {
      setProfile(storedProfile);
    }

    if (hasDetailedStudentProfile(storedProfile)) {
      setIsLoading(false);
      return;
    }

    void loadProfile({ silent: Boolean(storedProfile) });
  }, [loadProfile]);

  const profileName = getDisplayValue(
    profile?.name,
    typeof profile?.email === "string" && profile.email.trim() ? profile.email : "Student Account"
  );
  const profileEmail = getDisplayValue(profile?.email);
  const profilePhone = getDisplayValue(profile?.phone);
  const profileDateOfBirth = formatDateOfBirth(profile?.date_of_birth);
  const profileGender = getDisplayValue(profile?.gender);
  const profileAddress = getDisplayValue(profile?.address);

  return (
    <div className={`relative min-h-screen bg-(--background) px-3 py-4 text-(--foreground) transition-colors duration-300 sm:px-4 sm:py-5 md:px-6 md:py-8 xl:px-10 xl:py-10 2xl:px-14 2xl:py-14 ${isRTL ? "text-right" : ""}`}>
      <div className="absolute left-0 top-0 h-[240px] w-[240px] rounded-full bg-blue-600/5 blur-[80px] sm:h-[320px] sm:w-[320px] lg:h-[420px] lg:w-[420px] lg:blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[220px] w-[220px] rounded-full bg-indigo-600/5 blur-[70px] sm:h-[300px] sm:w-[300px] lg:h-[360px] lg:w-[360px] lg:blur-[100px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1800px]">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-5 xl:mb-10 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tighter sm:text-4xl lg:text-5xl 2xl:text-6xl">{t("nav.profile")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 opacity-60 sm:mt-3 sm:text-base sm:leading-7 2xl:text-lg">
              Your main student details from the profile API.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadProfile()}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300 sm:w-auto sm:self-start sm:px-5 xl:self-auto 2xl:px-6 2xl:py-4 2xl:text-xs"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </header>

        {errorMessage ? (
          <div className={`mb-4 flex items-start gap-3 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 sm:mb-6 sm:rounded-[1.6rem] sm:px-5 sm:py-4 ${isRTL ? "flex-row-reverse" : ""}`}>
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-6 sm:text-base">{errorMessage}</p>
          </div>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none sm:rounded-[2rem] 2xl:rounded-[2.5rem]"
        >
          <div className="border-b border-slate-200 bg-linear-to-r from-blue-500/10 via-white to-indigo-500/10 p-4 dark:border-white/10 dark:via-white/[0.03] sm:p-6 lg:p-8 2xl:p-10">
            <div className={`flex flex-col items-start gap-4 sm:gap-5 lg:flex-row lg:items-center lg:gap-6 ${isRTL ? "lg:flex-row-reverse" : ""}`}>
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-linear-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-xl shadow-blue-600/20 sm:h-24 sm:w-24 sm:rounded-[2rem] sm:text-3xl 2xl:h-28 2xl:w-28 2xl:text-4xl">
                {getProfileInitials(profile)}
              </div>
              <div className={`min-w-0 ${isRTL ? "text-right" : ""}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] opacity-50">Student Profile</p>
                <h2 className="mt-2 break-words text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl 2xl:text-4xl">{profileName}</h2>
                <p className="mt-2 break-all text-sm font-semibold text-blue-600 dark:text-blue-300 sm:text-base 2xl:text-lg">{profileEmail}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:gap-4 sm:p-6 xl:grid-cols-2 xl:p-8 2xl:gap-5 2xl:p-10">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:rounded-[1.6rem] sm:p-5 2xl:p-6">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <UserCircle className="h-5 w-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] opacity-50">Name</span>
              </div>
              <p className="mt-3 break-words text-base font-black sm:mt-4 sm:text-lg 2xl:text-xl">{profileName}</p>
            </div>

            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:rounded-[1.6rem] sm:p-5 2xl:p-6">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Mail className="h-5 w-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] opacity-50">Email</span>
              </div>
              <p className="mt-3 break-all text-base font-black sm:mt-4 sm:text-lg 2xl:text-xl">{profileEmail}</p>
            </div>

            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:rounded-[1.6rem] sm:p-5 2xl:p-6">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Phone className="h-5 w-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] opacity-50">Phone</span>
              </div>
              <p className="mt-3 break-words text-base font-black sm:mt-4 sm:text-lg 2xl:text-xl">{profilePhone}</p>
            </div>

            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:rounded-[1.6rem] sm:p-5 2xl:p-6">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <CalendarDays className="h-5 w-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] opacity-50">Date of Birth</span>
              </div>
              <p className="mt-3 break-words text-base font-black sm:mt-4 sm:text-lg 2xl:text-xl">{profileDateOfBirth}</p>
            </div>

            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:rounded-[1.6rem] sm:p-5 2xl:p-6 xl:col-span-2 2xl:col-span-1">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <UserCircle className="h-5 w-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] opacity-50">Gender</span>
              </div>
              <p className="mt-3 break-words text-base font-black capitalize sm:mt-4 sm:text-lg 2xl:text-xl">{profileGender}</p>
            </div>

            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:rounded-[1.6rem] sm:p-5 2xl:p-6 xl:col-span-2">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <MapPin className="h-5 w-5 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] opacity-50">Address</span>
              </div>
              <p className="mt-3 break-words text-base font-black leading-7 sm:mt-4 sm:text-lg sm:leading-8 2xl:text-xl 2xl:leading-9">{profileAddress}</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
