"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { AlertCircle, Award, BookOpen, Layout, Loader2, RefreshCw, Target } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type DashboardData = {
  summary: {
    total_courses: number;
    active_courses: number;
    completed_courses: number;
    average_progress: number;
  };
  recent_courses: Array<Record<string, unknown>>;
  progress_by_course: Array<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown, fallback = "Untitled") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function parseDashboard(payload: unknown): DashboardData {
  const root = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const data = isRecord(root) ? root : {};
  const summary = isRecord(data.summary) ? data.summary : {};

  const recentCourses = Array.isArray(data.recent_courses) ? data.recent_courses : [];
  const progressByCourse = Array.isArray(data.progress_by_course) ? data.progress_by_course : [];

  return {
    summary: {
      total_courses: toNumber(summary.total_courses),
      active_courses: toNumber(summary.active_courses),
      completed_courses: toNumber(summary.completed_courses),
      average_progress: toNumber(summary.average_progress),
    },
    recent_courses: recentCourses.map((item) => (isRecord(item) ? item : {})),
    progress_by_course: progressByCourse.map((item) => (isRecord(item) ? item : {})),
  };
}

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "missing_token") {
    return "Student token is missing. Please log in again.";
  }

  if (!axios.isAxiosError(error)) {
    return "Unable to load student dashboard right now.";
  }

  if (!error.response) {
    return "Cannot reach backend server.";
  }

  const message =
    typeof error.response.data?.message === "string" && error.response.data.message.trim()
      ? error.response.data.message
      : null;

  return message ?? "Dashboard endpoint returned an error.";
}

export default function StudentDashboard() {
  const { t, isRTL } = useLanguage();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = getStudentToken();
      if (!token) throw new Error("missing_token");

      const response = await axios.get(getStudentApiRequestUrl("/student/dashboard"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setDashboard(parseDashboard(response.data));
    } catch (error) {
      setErrorMessage(getDashboardErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(
    () => [
      { id: 1, label: "Total Courses", value: dashboard?.summary.total_courses ?? 0, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
      { id: 2, label: "Average Progress", value: `${(dashboard?.summary.average_progress ?? 0).toFixed(1)}%`, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
      { id: 3, label: "Active Courses", value: dashboard?.summary.active_courses ?? 0, icon: Layout, color: "text-purple-500", bg: "bg-purple-500/10" },
      { id: 4, label: "Completed Courses", value: dashboard?.summary.completed_courses ?? 0, icon: Award, color: "text-amber-500", bg: "bg-amber-500/10" },
    ],
    [dashboard]
  );

  const progressRows = useMemo(() => {
    if (!dashboard) return [];
    if (dashboard.progress_by_course.length) return dashboard.progress_by_course;
    return dashboard.recent_courses;
  }, [dashboard]);

  return (
    <div className="flex-1 p-8 md:p-12 bg-(--background) min-h-screen text-(--foreground) overflow-hidden relative transition-colors duration-300">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 mb-10">
        <div className={`flex items-start justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-3">{t("std.dashboard")}</h1>
          <button
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-[0.18em] dark:bg-white dark:text-slate-900"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
        <p className="opacity-40 text-lg max-w-xl leading-relaxed">Your learning dashboard, live from API.</p>
      </div>

      {errorMessage ? (
        <div className={`relative z-10 mb-6 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="p-8 rounded-[34px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 shadow-sm"
          >
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-5`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="opacity-45 font-bold text-xs uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-4xl font-black">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        <section className="p-8 rounded-[34px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 shadow-sm">
          <h2 className="text-2xl font-black tracking-tighter mb-5">Recent Courses</h2>
          <div className="space-y-3">
            {dashboard?.recent_courses.length ? (
              dashboard.recent_courses.map((course, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] px-4 py-3">
                  <p className="font-bold">{toString(course.title, toString(course.name, `Course #${i + 1}`))}</p>
                  <p className="text-xs opacity-50">ID: {toString(course.id, toString(course.course_id, "--"))}</p>
                </div>
              ))
            ) : (
              <p className="opacity-50">No recent courses.</p>
            )}
          </div>
        </section>

        <section className="p-8 rounded-[34px] bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 shadow-sm">
          <h2 className="text-2xl font-black tracking-tighter mb-5">Progress By Course</h2>
          <div className="space-y-3">
            {progressRows.length ? (
              progressRows.map((course, i) => {
                const progressValue = toNumber(course.average_progress ?? course.progress, 0);
                const progress = Math.max(0, Math.min(100, progressValue));

                return (
                  <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="font-bold">{toString(course.course_title, toString(course.title, `Course #${i + 1}`))}</p>
                      <p className="text-sm font-black">{progress.toFixed(1)}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="opacity-50">No progress records yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
