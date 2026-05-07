"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import clsx from "clsx";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiBaseUrl, getAdminApiEndpoint, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import {
  extractAdminMessage,
  extractAdminToken,
  extractAdminUser,
  persistAdminSession,
} from "@/features/admin/adminSession";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readFieldError(value: unknown) {
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first : null;
  }

  return getStringValue(value);
}

function parseAdminError(error: unknown) {
  const fieldErrors: FieldErrors = {};
  let message = "Unable to sign in right now. Please try again.";

  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message === "missing_token") {
      return {
        fieldErrors,
        message: "The login API responded without a token. Please verify the backend response shape.",
      };
    }

    return { fieldErrors, message };
  }

  if (!error.response) {
    return {
      fieldErrors,
      message:
        "Cannot reach the API server. Check that your backend is running and NEXT_PUBLIC_API_URL is correct.",
    };
  }

  const responseData = error.response.data;

  if (isRecord(responseData)) {
    const responseMessage = getStringValue(responseData.message);
    if (responseMessage) {
      message = responseMessage;
    }

    const errors = responseData.errors;
    if (isRecord(errors)) {
      const emailError = readFieldError(errors.email);
      const passwordError = readFieldError(errors.password);

      if (emailError) {
        fieldErrors.email = emailError;
      }

      if (passwordError) {
        fieldErrors.password = passwordError;
      }
    }
  }

  if (error.response.status >= 500) {
    message = "The server is available but could not complete the login. Please try again in a moment.";
  }

  return { fieldErrors, message };
}

export default function AdminLoginScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isRTL } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateField =
    (field: FieldName) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setCredentials((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setErrorMessage(null);
      setSuccessMessage(null);
    };

  const handlePasswordKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState("CapsLock"));
  };

  const handlePasswordBlur = () => {
    setCapsLockOn(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const apiBaseUrl = getAdminApiBaseUrl();

    if (!apiBaseUrl) {
      setIsLoading(false);
      setErrorMessage("NEXT_PUBLIC_API_URL is missing. Add it to your environment before logging in.");
      return;
    }

    try {
      const response = await axios.post(
        getAdminApiRequestUrl("/auth/login"),
        {
          email: credentials.email,
          password: credentials.password,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const token = extractAdminToken(response.data);
      if (!token) {
        throw new Error("missing_token");
      }

      persistAdminSession({
        token,
        remember: rememberMe,
        user: extractAdminUser(response.data) ?? {
          email: credentials.email,
          role: "super_admin",
        },
      });

      setSuccessMessage(extractAdminMessage(response.data) ?? "Access granted. Redirecting...");
      router.replace("/admin/dashboard");
    } catch (error) {
      const parsed = parseAdminError(error);
      setFieldErrors(parsed.fieldErrors);
      setErrorMessage(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f8f6f2] text-[#111827] dark:bg-[#05060a] dark:text-white"
      style={{ fontFamily: '"Sora", "Plus Jakarta Sans", "Manrope", sans-serif' }}
    >
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#f97316]/25 blur-3xl dark:bg-[#fb7185]/20" />
      <div className="pointer-events-none absolute -right-10 top-28 h-80 w-80 rounded-full bg-[#22d3ee]/25 blur-3xl dark:bg-[#38bdf8]/20" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#f59e0b]/20 blur-3xl dark:bg-[#a78bfa]/20" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(17,24,39,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(17,24,39,0.05)_1px,transparent_1px)] bg-[size:38px_38px] opacity-40 dark:opacity-20" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-10">
        <div className={clsx("mb-6 flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <Link
            href="/"
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-black/70 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10",
              isRTL && "flex-row-reverse"
            )}
          >
            <ArrowLeft className={clsx("h-4 w-4", isRTL && "rotate-180")} />
            HOME
          </Link>

          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-black/70 backdrop-blur-md transition hover:-translate-y-0.5 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid flex-1 overflow-hidden rounded-[2rem] border border-black/10 bg-white/50 shadow-[0_30px_100px_-40px_rgba(0,0,0,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.03] lg:grid-cols-[1.05fr_0.95fr]"
        >
          <section className="relative hidden border-r border-black/10 p-8 lg:block xl:p-12 dark:border-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.2),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_40%)]" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                  <ShieldCheck className="h-4 w-4" />
                  ADMIN CONTROL
                </div>

                <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-black/90 dark:text-white xl:text-6xl">
                  Login to your
                  <span className="block bg-gradient-to-r from-[#f97316] via-[#ef4444] to-[#06b6d4] bg-clip-text text-transparent">
                    command center
                  </span>
                </h1>

                <p className="mt-5 max-w-md text-base leading-7 text-black/60 dark:text-white/60">
                  Secure admin sign-in, clean workflow, and instant dashboard access.
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0.75, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                className="rounded-3xl border border-black/10 bg-black/[0.03] p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className={clsx("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <p className="text-xs font-semibold tracking-[0.14em] text-black/65 dark:text-white/65">
                    LIVE AUTH ENDPOINT
                  </p>
                </div>
                <p className="mt-3 break-all text-sm text-black/75 dark:text-white/75">{getAdminApiEndpoint("/auth/login")}</p>
              </motion.div>
            </div>
          </section>

          <section className="relative p-5 sm:p-8 lg:p-12">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />

            <div className="relative mx-auto flex h-full w-full max-w-xl flex-col justify-center">
              <div className="mb-7">
                <h2 className="text-4xl font-semibold tracking-[-0.03em] text-black/90 dark:text-white sm:text-5xl">
                  Admin Login
                </h2>
                <p className="mt-3 text-sm text-black/60 dark:text-white/60">Use your super admin credentials.</p>
              </div>

              {errorMessage ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm leading-6">{errorMessage}</p>
                </div>
              ) : null}

              {successMessage ? (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm leading-6">{successMessage}</p>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60 dark:text-white/55">
                    Email
                  </label>
                  <div
                    className={clsx(
                      "group flex items-center rounded-2xl border bg-white/80 px-4 py-1 shadow-sm transition focus-within:border-[#f97316] dark:bg-white/[0.04]",
                      fieldErrors.email ? "border-rose-300 dark:border-rose-500/40" : "border-black/10 dark:border-white/10"
                    )}
                  >
                    <Mail className="h-5 w-5 text-black/35 transition group-focus-within:text-[#f97316] dark:text-white/35" />
                    <input
                      type="email"
                      name="email"
                      value={credentials.email}
                      onChange={updateField("email")}
                      placeholder="admin@example.com"
                      required
                      autoComplete="email"
                      dir="ltr"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className="w-full bg-transparent px-3 py-4 text-base text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/30"
                    />
                  </div>
                  {fieldErrors.email ? <p className="px-1 text-sm text-rose-600 dark:text-rose-300">{fieldErrors.email}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60 dark:text-white/55">
                    Password
                  </label>
                  <div
                    className={clsx(
                      "group flex items-center rounded-2xl border bg-white/80 px-4 py-1 shadow-sm transition focus-within:border-[#f97316] dark:bg-white/[0.04]",
                      fieldErrors.password ? "border-rose-300 dark:border-rose-500/40" : "border-black/10 dark:border-white/10"
                    )}
                  >
                    <Lock className="h-5 w-5 text-black/35 transition group-focus-within:text-[#f97316] dark:text-white/35" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={credentials.password}
                      onChange={updateField("password")}
                      onKeyUp={handlePasswordKeys}
                      onKeyDown={handlePasswordKeys}
                      onBlur={handlePasswordBlur}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      dir="ltr"
                      aria-invalid={Boolean(fieldErrors.password)}
                      className="w-full bg-transparent px-3 py-4 text-base text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-black/45 transition hover:bg-black/5 hover:text-black dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="px-1 text-sm text-rose-600 dark:text-rose-300">{fieldErrors.password}</p>
                  ) : null}
                  {capsLockOn ? (
                    <p className="px-1 text-sm text-amber-600 dark:text-amber-300">Caps Lock is on.</p>
                  ) : null}
                </div>

                <div className={clsx("flex items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
                  <label className={clsx("inline-flex items-center gap-3 text-sm text-black/65 dark:text-white/65", isRTL && "flex-row-reverse")}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-black/20 text-[#f97316] focus:ring-[#f97316]"
                    />
                    Remember this device
                  </label>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-black/45 dark:text-white/40">
                    {rememberMe ? "persistent" : "session"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Authorizing
                    </>
                  ) : (
                    <>
                      Enter Dashboard
                      <ArrowRight
                        className={clsx("h-4 w-4 transition-transform", isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1")}
                      />
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
