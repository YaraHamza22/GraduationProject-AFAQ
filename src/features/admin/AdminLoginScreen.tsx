"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import clsx from "clsx";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  extractAdminMessage,
  extractAdminToken,
  extractAdminUser,
  persistAdminSession,
} from "@/features/admin/adminSession";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

const securityStats = [
  { value: "24/7", label: "access monitoring" },
  { value: "<120ms", label: "auth latency target" },
  { value: "v1", label: "secured api cluster" },
];

const trustHighlights = [
  "Super admin credentials are validated against the live API.",
  "Successful sessions are kept locally and used to unlock admin routes.",
  "Clean error handling keeps bad credentials and server issues easy to understand.",
];

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
      message: "Cannot reach the API server. Check that your backend is running and NEXT_PUBLIC_API_URL is correct.",
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

  if (error.response.status === 401 || error.response.status === 403) {
    message = message || "Invalid email or password.";
  }

  if (error.response.status >= 500) {
    message = "The server is available but could not complete the login. Please try again in a moment.";
  }

  return { fieldErrors, message };
}

export default function AdminLoginScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isRTL, t } = useLanguage();
  const redirectTimeoutRef = useRef<number | null>(null);

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

    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const updateField =
    (field: FieldName) => (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");

    if (!apiBaseUrl) {
      setIsLoading(false);
      setErrorMessage("NEXT_PUBLIC_API_URL is missing. Add it to your environment before logging in.");
      return;
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/login`,
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

      setSuccessMessage(
        extractAdminMessage(response.data) ?? "Access granted. Redirecting to the management dashboard."
      );

      redirectTimeoutRef.current = window.setTimeout(() => {
        router.replace("/admin/dashboard");
      }, 900);
    } catch (error) {
      const parsed = parseAdminError(error);
      setFieldErrors(parsed.fieldErrors);
      setErrorMessage(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7ff] text-slate-950 transition-colors duration-300 dark:bg-[#040816] dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.04),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.32),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30 dark:opacity-20" />
      <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-8 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-700 shadow-lg shadow-slate-900/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:shadow-black/20 dark:hover:border-indigo-400 dark:hover:text-white sm:right-6 sm:top-6"
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="grid w-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.75)] lg:grid-cols-[1.05fr_0.95fr]"
        >
          <section className="relative overflow-hidden border-b border-slate-200/70 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-slate-200/70 lg:p-12 dark:border-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.16),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.88),rgba(244,247,255,0.72))] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_38%),linear-gradient(145deg,rgba(15,23,42,0.85),rgba(2,6,23,0.72))]" />

            <div className="relative z-10 flex h-full flex-col">
              <div className={clsx("flex items-center justify-between gap-4", isRTL && "flex-row-reverse")}>
                <Link
                  href="/"
                  className={clsx(
                    "group inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-white/50 dark:hover:border-indigo-400 dark:hover:text-white",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  <ArrowLeft
                    className={clsx(
                      "h-4 w-4 transition-transform",
                      isRTL ? "rotate-180 group-hover:translate-x-1" : "group-hover:-translate-x-1"
                    )}
                  />
                  {t("adm.return")}
                </Link>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-300">
                  <BadgeCheck className="h-4 w-4" />
                  live auth ready
                </div>
              </div>

              <div className="mt-10 flex items-center gap-4 sm:mt-14">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.32em] text-slate-500 dark:text-white/45">
                    AFAQ ADMIN
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
                    Security governance for platform-wide operations
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-6 sm:mt-14">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">
                  <Sparkles className="h-4 w-4" />
                  Super admin gateway
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-xl text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                    Real admin login.
                    <span className="block bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 bg-clip-text text-transparent">
                      Clean, secure, production-ready.
                    </span>
                  </h1>
                  <p className="max-w-lg text-base leading-7 text-slate-600 dark:text-white/65 sm:text-lg">
                    This page now connects directly to the backend login API and keeps the premium control-room look,
                    while making the actual sign-in flow clear and reliable.
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {securityStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none"
                  >
                    <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{item.value}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/40">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-[1.75rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <div className={clsx("flex items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-indigo-300">
                      access checklist
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300 dark:text-white/70">{t("adm.status_desc")}</p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-indigo-300">
                    <Shield className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {trustHighlights.map((item) => (
                    <div key={item} className={clsx("flex items-start gap-3", isRTL && "flex-row-reverse text-right")}>
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                        <BadgeCheck className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm leading-6 text-slate-300 dark:text-white/75">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="relative p-6 sm:p-8 lg:p-12">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(244,247,255,0.32))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.45))]" />

            <div className="relative z-10 mx-auto flex h-full w-full max-w-xl flex-col justify-center">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45">
                  <Mail className="h-3.5 w-3.5" />
                  POST /login
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl dark:text-white">
                  {t("adm.management")}
                  <span className="text-indigo-500">.</span>
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/60">
                  Sign in with the super admin email and password configured in your backend. The session will unlock
                  the protected admin pages immediately after a valid response.
                </p>
              </div>

              {errorMessage ? (
                <div className="mb-5 flex items-start gap-3 rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm leading-6">{errorMessage}</p>
                </div>
              ) : null}

              {successMessage ? (
                <div className="mb-5 flex items-start gap-3 rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm leading-6">{successMessage}</p>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/45">
                    Email address
                  </label>
                  <div
                    className={clsx(
                      "group relative flex items-center rounded-[1.5rem] border bg-white/80 px-4 py-1 shadow-sm shadow-slate-900/5 transition focus-within:-translate-y-0.5 focus-within:border-indigo-400 focus-within:shadow-lg focus-within:shadow-indigo-500/10 dark:bg-white/[0.04] dark:shadow-none",
                      fieldErrors.email
                        ? "border-rose-300 dark:border-rose-500/40"
                        : "border-slate-200/80 dark:border-white/10"
                    )}
                  >
                    <Mail className="h-5 w-5 text-slate-400 transition group-focus-within:text-indigo-500 dark:text-white/35" />
                    <input
                      type="email"
                      name="email"
                      value={credentials.email}
                      onChange={updateField("email")}
                      placeholder="yara@example.com"
                      required
                      autoComplete="email"
                      dir="ltr"
                      aria-invalid={Boolean(fieldErrors.email)}
                      className="w-full bg-transparent px-3 py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25"
                    />
                  </div>
                  {fieldErrors.email ? (
                    <p className="px-1 text-sm text-rose-600 dark:text-rose-300">{fieldErrors.email}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className={clsx("flex items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
                    <label className="block text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/45">
                      Password
                    </label>
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">
                      secure credential
                    </span>
                  </div>

                  <div
                    className={clsx(
                      "group relative flex items-center rounded-[1.5rem] border bg-white/80 px-4 py-1 shadow-sm shadow-slate-900/5 transition focus-within:-translate-y-0.5 focus-within:border-indigo-400 focus-within:shadow-lg focus-within:shadow-indigo-500/10 dark:bg-white/[0.04] dark:shadow-none",
                      fieldErrors.password
                        ? "border-rose-300 dark:border-rose-500/40"
                        : "border-slate-200/80 dark:border-white/10"
                    )}
                  >
                    <Lock className="h-5 w-5 text-slate-400 transition group-focus-within:text-indigo-500 dark:text-white/35" />
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
                      className="w-full bg-transparent px-3 py-4 text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>

                  {fieldErrors.password ? (
                    <p className="px-1 text-sm text-rose-600 dark:text-rose-300">{fieldErrors.password}</p>
                  ) : null}

                  {capsLockOn ? (
                    <p className="px-1 text-sm text-amber-600 dark:text-amber-300">
                      Caps Lock looks enabled. Double-check your password before submitting.
                    </p>
                  ) : null}
                </div>

                <div className={clsx("flex items-center justify-between gap-4 pt-1", isRTL && "flex-row-reverse")}>
                  <label className={clsx("inline-flex items-center gap-3 text-sm text-slate-600 dark:text-white/60", isRTL && "flex-row-reverse")}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Keep this session on this device
                  </label>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30">
                    {rememberMe ? "persistent session" : "session only"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-3 rounded-[1.6rem] bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.28em] text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-400"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Authorizing...
                    </>
                  ) : (
                    <>
                      {t("adm.init_auth")}
                      <ArrowRight
                        className={clsx(
                          "h-4 w-4 transition-transform",
                          isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
                        )}
                      />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 grid gap-3 rounded-[1.75rem] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <div className={clsx("flex items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-white/40">
                    current endpoint
                  </p>
                  <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">
                    {process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")}/login
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-600 dark:text-white/60">
                  Request body is sent as JSON with <span className="font-semibold text-slate-900 dark:text-white">email</span> and{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">password</span>, matching the backend request you shared.
                </p>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
