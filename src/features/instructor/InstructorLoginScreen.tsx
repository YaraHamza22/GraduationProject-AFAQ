"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import {
  clearStudentSession,
  extractStudentRole,
  extractStudentRoleFromToken,
  extractStudentToken,
  extractStudentUser,
  getStoredStudentRole,
  getStudentToken,
  persistStudentSession,
  updateStoredStudentUser,
} from "@/features/student/studentSession";

function normalizeRole(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function isInstructorRole(role: string | null) {
  if (!role) {
    return false;
  }
  const normalized = normalizeRole(role);
  return normalized.includes("instructor") || normalized.includes("teacher");
}

export default function InstructorLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getStudentToken();
    const role = getStoredStudentRole();

    if (token && isInstructorRole(role)) {
      router.replace("/instructor");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = { email: email.trim(), password };
      const loginCandidates = [
        getStudentApiRequestUrl("/auth/login"),
        getStudentApiRequestUrl("/login"),
      ].filter(Boolean);

      if (loginCandidates.length === 0) {
        throw new Error("Login endpoint is not configured.");
      }

      let response: Awaited<ReturnType<typeof axios.post>> | null = null;
      for (const loginUrl of loginCandidates) {
        try {
          response = await axios.post(loginUrl, payload, {
            headers: { Accept: "application/json" },
          });
          break;
        } catch (candidateError) {
          if (!axios.isAxiosError(candidateError)) {
            throw candidateError;
          }

          if (candidateError.response?.status === 404 || candidateError.response?.status === 405) {
            continue;
          }

          throw candidateError;
        }
      }

      if (!response) {
        throw new Error("No valid login endpoint found. Tried /auth/login and /login.");
      }

      if (response.status < 200 || response.status >= 300) {
        throw new Error("Instructor login failed.");
      }

      const token = extractStudentToken(response.data);
      if (!token) {
        throw new Error("Login response missing token.");
      }

      const user = extractStudentUser(response.data);
      const inferredRole =
        extractStudentRole(user) ??
        extractStudentRole(response.data) ??
        extractStudentRoleFromToken(token);

      if (inferredRole && !isInstructorRole(inferredRole)) {
        clearStudentSession();
        throw new Error("This account does not have instructor access.");
      }

      const normalizedUser = user
        ? { ...user, role: inferredRole ?? "instructor" }
        : { role: inferredRole ?? "instructor" };

      const authHeaders = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      await axios.get(getStudentApiRequestUrl("/instructor/dashboard"), { headers: authHeaders });

      persistStudentSession(token, normalizedUser);
      updateStoredStudentUser(normalizedUser);
      if (!rememberMe && typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("student_auth_user");
        sessionStorage.setItem("auth_token", token);
        sessionStorage.setItem("student_auth_user", JSON.stringify(normalizedUser));
      }
      setSuccessMessage("Login successful. Redirecting to instructor dashboard...");
      router.replace("/instructor");
    } catch (error) {
      if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        setErrorMessage(error.response.data.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to login as instructor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/3 left-[-100px] h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-8 p-6 lg:grid-cols-2 lg:p-10">
        <section className="hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl lg:block">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-400/40 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Instructor Portal
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight">
            Teach smarter, track progress, and manage your classroom in one place.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-300">
            Sign in with your instructor credentials to access your dashboard, course tools, and teaching analytics.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-200">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Course management and lesson updates</div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Quiz creation and grading workflow</div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Student performance visibility</div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-white/10 bg-[#0c1324]/90 p-6 shadow-2xl shadow-indigo-900/20 backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex items-center justify-between text-xs lg:hidden">
            <Link href="/" className="inline-flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link href="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">
              Student login
            </Link>
          </div>

          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-300">Instructor Access</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-slate-300">Use your instructor account to continue.</p>

          {errorMessage ? (
            <div className="mt-5 inline-flex w-full items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 inline-flex w-full items-start gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Email</span>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 focus-within:border-indigo-400">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Password</span>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 focus-within:border-indigo-400">
                <Lock className="h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between gap-3 text-xs">
              <label className="inline-flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/40"
                />
                Remember me
              </label>
              <Link href="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">
                Student login
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black uppercase tracking-wider transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
