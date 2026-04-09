"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Hash,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  UserCircle,
} from "lucide-react";
import { getAdminApiBaseUrl, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  type AdminSessionUser,
  extractAdminUser,
  getAdminToken,
  getStoredAdminUser,
  updateStoredAdminUser,
} from "@/features/admin/adminSession";

function formatRole(role: unknown, isRTL: boolean) {
  if (typeof role !== "string" || !role.trim()) {
    return isRTL ? "مشرف رئيسي" : "Super Admin";
  }

  return role
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDisplayValue(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function getProfileInitials(profile: AdminSessionUser | null) {
  const source =
    typeof profile?.name === "string" && profile.name.trim()
      ? profile.name
      : typeof profile?.email === "string" && profile.email.trim()
        ? profile.email
        : "SA";

  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getProfileErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "missing_api_url") {
      return "NEXT_PUBLIC_API_URL is missing, so the admin profile endpoint cannot be called.";
    }

    if (error.message === "missing_token") {
      return "The admin session token is missing. Please sign in again.";
    }
  }

  if (!axios.isAxiosError(error)) {
    return "Unable to load the admin profile right now.";
  }

  if (!error.response) {
    return "Cannot reach the backend server. Check that the API is running and the base URL is correct.";
  }

  const responseMessage =
    typeof error.response.data?.message === "string" && error.response.data.message.trim()
      ? error.response.data.message
      : null;

  return responseMessage ?? "The profile endpoint responded with an error.";
}

export default function AdminProfilePage() {
  const { isRTL, t } = useLanguage();
  const [profile, setProfile] = useState<AdminSessionUser | null>(() => getStoredAdminUser());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const apiBaseUrl = getAdminApiBaseUrl();

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!apiBaseUrl) {
        throw new Error("missing_api_url");
      }

      const token = getAdminToken();
      if (!token) {
        throw new Error("missing_token");
      }

      const response = await axios.get(getAdminApiRequestUrl("/auth/profile"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const nextProfile = extractAdminUser(response.data) ?? getStoredAdminUser();
      setProfile(nextProfile);

      if (nextProfile) {
        updateStoredAdminUser(nextProfile);
      }
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const profileName = getDisplayValue(
    profile?.name,
    typeof profile?.email === "string" && profile.email.trim()
      ? profile.email
      : isRTL
        ? "الحساب الإداري"
        : "Admin Account"
  );
  const profileEmail = getDisplayValue(profile?.email, isRTL ? "غير متوفر" : "Not provided");
  const profileRole = formatRole(profile?.role, isRTL);
  const profileId = getDisplayValue(profile?.id, isRTL ? "غير متوفر" : "Unavailable");

  return (
    <div className={`relative min-h-screen bg-slate-50 p-8 md:p-12 dark:bg-transparent ${isRTL ? "text-right" : ""}`}>
      <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-indigo-500/5 blur-[110px]" />

      <header className="relative z-10 mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/15 bg-indigo-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Shield className="h-3.5 w-3.5" />
            GET /auth/profile
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white md:text-5xl">
            {t("nav.profile")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-white/55">
            {isRTL
              ? "هذه الصفحة تعرض بيانات المشرف الرئيسية القادمة من واجهة الملف الشخصي."
              : "This page shows the main admin details returned by the profile API."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadProfile()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-300"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isRTL ? "تحديث" : "Refresh"}
        </button>
      </header>

      {errorMessage ? (
        <div className={`relative z-10 mb-8 flex items-start gap-3 rounded-[1.6rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse" : ""}`}>
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm leading-6">{errorMessage}</p>
        </div>
      ) : null}

      <div className="relative z-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none"
        >
          <div className="border-b border-slate-200 bg-linear-to-r from-indigo-500/10 via-white to-sky-500/10 p-8 dark:border-white/10 dark:from-indigo-500/10 dark:via-white/[0.03] dark:to-sky-500/10">
            <div className={`flex items-center gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-linear-to-br from-indigo-600 to-sky-500 text-3xl font-black text-white shadow-xl shadow-indigo-600/20">
                {getProfileInitials(profile)}
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-white/35">
                  {isRTL ? "الحساب النشط" : "Authenticated Identity"}
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {profileName}
                </h2>
                <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  {profileRole}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-8 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <UserCircle className="h-5 w-5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/35">
                  {isRTL ? "الاسم" : "Name"}
                </span>
              </div>
              <p className="mt-4 text-lg font-black text-slate-900 dark:text-white">{profileName}</p>
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Mail className="h-5 w-5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/35">
                  Email
                </span>
              </div>
              <p className="mt-4 break-all text-lg font-black text-slate-900 dark:text-white">{profileEmail}</p>
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Shield className="h-5 w-5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/35">
                  {isRTL ? "الدور" : "Role"}
                </span>
              </div>
              <p className="mt-4 text-lg font-black text-slate-900 dark:text-white">{profileRole}</p>
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Hash className="h-5 w-5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/35">
                  ID
                </span>
              </div>
              <p className="mt-4 text-lg font-black text-slate-900 dark:text-white">{profileId}</p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
