"use client";

import React, { Suspense, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";

type FieldErrors = Partial<Record<"email" | "password" | "password_confirmation" | "token", string>>;

function readFieldError(value: unknown) {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : null;
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim() && token.trim() && password && passwordConfirmation && !isSubmitting;
  }, [email, isSubmitting, password, passwordConfirmation, token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setFieldErrors({});

    if (!email.trim() || !token.trim()) {
      setError("The reset link is missing an email or token.");
      return;
    }

    if (password !== passwordConfirmation) {
      setFieldErrors({ password_confirmation: "Password confirmation must match." });
      return;
    }

    const resetUrl = getStudentApiRequestUrl("/auth/reset-password");
    if (!resetUrl) {
      setError("NEXT_PUBLIC_API_URL is missing. Set it to your backend API URL and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        resetUrl,
        {
          email: email.trim(),
          token: token.trim(),
          password,
          password_confirmation: passwordConfirmation,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      setMessage(typeof response.data?.message === "string" ? response.data.message : "Your password has been reset.");
      setPassword("");
      setPasswordConfirmation("");
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response) {
        const errors = requestError.response.data?.errors ?? {};
        setFieldErrors({
          email: readFieldError(errors.email) ?? undefined,
          token: readFieldError(errors.token) ?? undefined,
          password: readFieldError(errors.password) ?? undefined,
          password_confirmation: readFieldError(errors.password_confirmation) ?? undefined,
        });
        setError(requestError.response.data?.message || "We could not reset this password. Please check the link and try again.");
      } else {
        setError("Network error. Please check your connection and the API server.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white p-4 font-sans text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white md:p-8">
      <div className="pointer-events-none absolute left-[-10%] top-[-15%] h-[420px] w-[420px] rounded-full bg-indigo-600/10 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-pink-600/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid w-full overflow-hidden rounded-[40px] border border-slate-200 bg-white/85 shadow-[0_32px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 md:grid-cols-[0.95fr_1.05fr]"
        >
          <div className="relative hidden min-h-[640px] overflow-hidden bg-slate-950 md:block">
            <Image
              src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200"
              alt="Desk with study notes"
              fill
              priority
              sizes="(min-width: 768px) 480px, 100vw"
              className="object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-linear-to-br from-slate-950/85 via-indigo-950/55 to-fuchsia-900/60" />
            <div className="relative z-10 flex h-full flex-col justify-between p-10">
              <Link href="/login" className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur transition hover:bg-white/15 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Login
              </Link>

              <div>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-2xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="max-w-sm text-5xl font-black leading-none tracking-tight text-white">
                  Set a new secure password.
                </h1>
                <p className="mt-5 max-w-sm text-base leading-7 text-white/75">
                  Keep your learning account protected and return to your dashboard with a fresh password.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 lg:p-14">
            <Link href="/login" className="mb-8 flex w-fit items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-indigo-600 dark:text-white/45 dark:hover:text-indigo-300 md:hidden">
              <ArrowLeft className="h-4 w-4" />
              Login
            </Link>

            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-pink-600 text-white shadow-lg shadow-indigo-500/25">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">Reset password</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-white/50">
                Use the reset link from your email. If any field is empty, copy it from the email link and submit again.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {message}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">Email Address</label>
                <div className="group relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition group-focus-within:text-indigo-500 dark:text-white/20" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20 dark:focus:bg-white/10"
                  />
                </div>
                {fieldErrors.email ? <p className="ml-1 text-xs font-semibold text-red-500 dark:text-red-300">{fieldErrors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">Reset Token</label>
                <div className="group relative">
                  <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition group-focus-within:text-indigo-500 dark:text-white/20" />
                  <input
                    type="text"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="Reset token"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20 dark:focus:bg-white/10"
                  />
                </div>
                {fieldErrors.token ? <p className="ml-1 text-xs font-semibold text-red-500 dark:text-red-300">{fieldErrors.token}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">New Password</label>
                  <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition group-focus-within:text-indigo-500 dark:text-white/20" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="New password"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20 dark:focus:bg-white/10"
                    />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-indigo-500" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.password ? <p className="ml-1 text-xs font-semibold text-red-500 dark:text-red-300">{fieldErrors.password}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/60">Confirm Password</label>
                  <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300 transition group-focus-within:text-indigo-500 dark:text-white/20" />
                    <input
                      type={showPasswordConfirmation ? "text" : "password"}
                      value={passwordConfirmation}
                      onChange={(event) => setPasswordConfirmation(event.target.value)}
                      placeholder="Confirm password"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/20 dark:focus:bg-white/10"
                    />
                    <button type="button" onClick={() => setShowPasswordConfirmation((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-indigo-500" aria-label={showPasswordConfirmation ? "Hide password confirmation" : "Show password confirmation"}>
                      {showPasswordConfirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.password_confirmation ? <p className="ml-1 text-xs font-semibold text-red-500 dark:text-red-300">{fieldErrors.password_confirmation}</p> : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-pink-600 text-sm font-black text-white shadow-2xl shadow-indigo-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update password"}
                {!isSubmitting ? <ArrowRight className="h-5 w-5" /> : null}
              </button>
            </form>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
