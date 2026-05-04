"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertCircle, BookOpen, GraduationCap, Loader2, RefreshCw, Shield, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getAdminApiBaseUrl, getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { getAdminToken } from "@/features/admin/adminSession";

type UnknownRecord = Record<string, unknown>;

type Summary = {
  total_students: number;
  active_students: number;
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  completion_rate: number;
};

type PopularCourse = {
  course_id: number;
  title: string;
  enrollments_count: number;
};

type LowCompletionCourse = {
  course_id: number;
  title: string;
  completion_rate: number;
  total_enrollments: number;
};

type LowProgressCourse = {
  course_id: number;
  title: string;
  average_progress: number;
};

type CategoryPopularity = {
  course_category_id: number;
  course_category_name: string;
  total_courses: number;
  total_enrollments: number;
};

type PerformanceByCourse = {
  course_id: number;
  course_title: string;
  total_enrollments: number;
  average_progress: number;
  completion_rate: number;
};

type DashboardData = {
  summary: Summary;
  popular_courses: PopularCourse[];
  learning_gaps: {
    low_completion_courses: LowCompletionCourse[];
    low_progress_courses: LowProgressCourse[];
  };
  course_analytics: {
    popularity_report: {
      total_courses: number;
      total_enrollments: number;
      popular_courses: Array<PopularCourse & { average_rating: number }>;
      popularity_by_course_category: CategoryPopularity[];
    };
  };
  student_analytics: {
    performance_report: {
      total_enrollments: number;
      completed_enrollments: number;
      average_progress: number;
      average_completion_time_days: number;
      performance_by_course: PerformanceByCourse[];
    };
    completion_rates: {
      total_enrollments: number;
      completed_enrollments: number;
      completion_rate: number;
    };
    learning_time_analysis: {
      total_enrollments: number;
      completed_enrollments: number;
      average_completion_days: number;
      total_learning_days: number;
    };
  };
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "N/A") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function parseDashboardData(payload: unknown): DashboardData {
  const root = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const data = isRecord(root) ? root : {};

  const summaryRaw = isRecord(data.summary) ? data.summary : {};
  const learningGapsRaw = isRecord(data.learning_gaps) ? data.learning_gaps : {};
  const courseAnalyticsRaw = isRecord(data.course_analytics) ? data.course_analytics : {};
  const popularityReportRaw = isRecord(courseAnalyticsRaw.popularity_report) ? courseAnalyticsRaw.popularity_report : {};
  const studentAnalyticsRaw = isRecord(data.student_analytics) ? data.student_analytics : {};
  const performanceReportRaw = isRecord(studentAnalyticsRaw.performance_report) ? studentAnalyticsRaw.performance_report : {};
  const completionRatesRaw = isRecord(studentAnalyticsRaw.completion_rates) ? studentAnalyticsRaw.completion_rates : {};
  const learningTimeRaw = isRecord(studentAnalyticsRaw.learning_time_analysis) ? studentAnalyticsRaw.learning_time_analysis : {};

  return {
    summary: {
      total_students: asNumber(summaryRaw.total_students),
      active_students: asNumber(summaryRaw.active_students),
      total_courses: asNumber(summaryRaw.total_courses),
      published_courses: asNumber(summaryRaw.published_courses),
      total_enrollments: asNumber(summaryRaw.total_enrollments),
      completion_rate: asNumber(summaryRaw.completion_rate),
    },
    popular_courses: asArray(data.popular_courses).map((item) => {
      const row = isRecord(item) ? item : {};
      return {
        course_id: asNumber(row.course_id),
        title: asString(row.title),
        enrollments_count: asNumber(row.enrollments_count),
      };
    }),
    learning_gaps: {
      low_completion_courses: asArray(learningGapsRaw.low_completion_courses).map((item) => {
        const row = isRecord(item) ? item : {};
        return {
          course_id: asNumber(row.course_id),
          title: asString(row.title),
          completion_rate: asNumber(row.completion_rate),
          total_enrollments: asNumber(row.total_enrollments),
        };
      }),
      low_progress_courses: asArray(learningGapsRaw.low_progress_courses).map((item) => {
        const row = isRecord(item) ? item : {};
        return {
          course_id: asNumber(row.course_id),
          title: asString(row.title),
          average_progress: asNumber(row.average_progress),
        };
      }),
    },
    course_analytics: {
      popularity_report: {
        total_courses: asNumber(popularityReportRaw.total_courses),
        total_enrollments: asNumber(popularityReportRaw.total_enrollments),
        popular_courses: asArray(popularityReportRaw.popular_courses).map((item) => {
          const row = isRecord(item) ? item : {};
          return {
            course_id: asNumber(row.course_id),
            title: asString(row.title),
            enrollments_count: asNumber(row.enrollments_count),
            average_rating: asNumber(row.average_rating),
          };
        }),
        popularity_by_course_category: asArray(popularityReportRaw.popularity_by_course_category).map((item) => {
          const row = isRecord(item) ? item : {};
          return {
            course_category_id: asNumber(row.course_category_id),
            course_category_name: asString(row.course_category_name),
            total_courses: asNumber(row.total_courses),
            total_enrollments: asNumber(row.total_enrollments),
          };
        }),
      },
    },
    student_analytics: {
      performance_report: {
        total_enrollments: asNumber(performanceReportRaw.total_enrollments),
        completed_enrollments: asNumber(performanceReportRaw.completed_enrollments),
        average_progress: asNumber(performanceReportRaw.average_progress),
        average_completion_time_days: asNumber(performanceReportRaw.average_completion_time_days),
        performance_by_course: asArray(performanceReportRaw.performance_by_course).map((item) => {
          const row = isRecord(item) ? item : {};
          return {
            course_id: asNumber(row.course_id),
            course_title: asString(row.course_title),
            total_enrollments: asNumber(row.total_enrollments),
            average_progress: asNumber(row.average_progress),
            completion_rate: asNumber(row.completion_rate),
          };
        }),
      },
      completion_rates: {
        total_enrollments: asNumber(completionRatesRaw.total_enrollments),
        completed_enrollments: asNumber(completionRatesRaw.completed_enrollments),
        completion_rate: asNumber(completionRatesRaw.completion_rate),
      },
      learning_time_analysis: {
        total_enrollments: asNumber(learningTimeRaw.total_enrollments),
        completed_enrollments: asNumber(learningTimeRaw.completed_enrollments),
        average_completion_days: asNumber(learningTimeRaw.average_completion_days),
        total_learning_days: asNumber(learningTimeRaw.total_learning_days),
      },
    },
  };
}

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "missing_api_url") return "NEXT_PUBLIC_API_URL is missing.";
    if (error.message === "missing_token") return "Admin token is missing. Please sign in again.";
  }

  if (!axios.isAxiosError(error)) return "Unable to load dashboard data right now.";
  if (!error.response) return "Cannot reach the backend server. Check your API server and URL.";

  const message =
    typeof error.response.data?.message === "string" && error.response.data.message.trim()
      ? error.response.data.message
      : null;

  return message ?? "Dashboard API returned an error response.";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_12px_40px_-20px_rgba(2,6,23,0.35)] backdrop-blur-xl dark:border-cyan-400/20 dark:bg-slate-900/85 dark:shadow-[0_18px_48px_-24px_rgba(6,182,212,0.35)]">
      <h2 className="mb-4 text-base font-black tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminDashboard() {
  const { isRTL, t } = useLanguage();
  const apiBaseUrl = getAdminApiBaseUrl();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!apiBaseUrl) throw new Error("missing_api_url");
      const token = getAdminToken();
      if (!token) throw new Error("missing_token");

      const response = await axios.get(getAdminApiRequestUrl("/super-admin/dashboard"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setDashboard(parseDashboardData(response.data));
    } catch (error) {
      setErrorMessage(getDashboardErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Total Students", value: formatNumber(dashboard.summary.total_students), icon: GraduationCap, color: "text-sky-500" },
      { label: "Active Students", value: formatNumber(dashboard.summary.active_students), icon: Users, color: "text-emerald-500" },
      { label: "Total Courses", value: formatNumber(dashboard.summary.total_courses), icon: BookOpen, color: "text-amber-500" },
      { label: "Completion Rate", value: formatPercent(dashboard.summary.completion_rate), icon: Shield, color: "text-rose-500" },
    ];
  }, [dashboard]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#e0f2fe_0%,#f8fafc_40%,#ecfeff_100%)] p-6 md:p-10 dark:bg-[radial-gradient(circle_at_20%_10%,#0b1220_0%,#060a13_45%,#030711_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-10%] h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-[120px] dark:bg-cyan-400/20" />
        <div className="absolute bottom-[-12%] left-[-10%] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-indigo-500/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-6">
        <header className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${isRTL ? "md:flex-row-reverse" : ""}`}>
          <div className={isRTL ? "text-right" : ""}>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-200">
              <Sparkles className="h-3 w-3" />
              Executive Overview
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">{t("adm.dashboard")}</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-cyan-600 disabled:opacity-70 dark:border dark:border-cyan-300/30 dark:bg-slate-800 dark:text-cyan-100 dark:hover:bg-slate-700"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </header>

        {errorMessage ? (
          <div className={`flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, idx) => (
            <motion.article
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="group rounded-[26px] border border-white/70 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-[0_16px_40px_-22px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-22px_rgba(6,182,212,0.45)] dark:border-cyan-400/20 dark:from-slate-900/95 dark:to-slate-800/80 dark:shadow-[0_20px_46px_-24px_rgba(8,145,178,0.35)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-2xl bg-slate-100/80 p-2.5 dark:bg-cyan-400/10">
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-cyan-200/80">Live</span>
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{metric.label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{metric.value}</p>
            </motion.article>
          ))}
        </section>

        {dashboard ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <Section title="Popular Courses">
              <div className="space-y-3">
                {dashboard.popular_courses.map((course) => (
                  <div key={course.course_id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/85 dark:hover:bg-slate-800">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{course.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Course #{course.course_id}</p>
                    </div>
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-200">
                      {course.enrollments_count} enrollments
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Learning Gaps">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-rose-500">Low Completion Courses</p>
                  <div className="space-y-2">
                    {dashboard.learning_gaps.low_completion_courses.map((course) => (
                      <div key={course.course_id} className="rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:bg-rose-50/50 dark:border-slate-700 dark:hover:bg-rose-400/10">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{course.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Completion: {formatPercent(course.completion_rate)} | Enrollments: {course.total_enrollments}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-500">Low Progress Courses</p>
                  <div className="space-y-2">
                    {dashboard.learning_gaps.low_progress_courses.map((course) => (
                      <div key={course.course_id} className="rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:bg-amber-50/60 dark:border-slate-700 dark:hover:bg-amber-400/10">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{course.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Average progress: {formatPercent(course.average_progress)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Course Analytics">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Courses</p>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100">{dashboard.course_analytics.popularity_report.total_courses}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Enrollments</p>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100">{dashboard.course_analytics.popularity_report.total_enrollments}</p>
                </div>
              </div>
              <div className="space-y-2">
                {dashboard.course_analytics.popularity_report.popularity_by_course_category.map((cat) => (
                  <div key={cat.course_category_id} className="rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:bg-cyan-50/60 dark:border-slate-700 dark:hover:bg-cyan-400/10">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{cat.course_category_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Courses: {cat.total_courses} | Enrollments: {cat.total_enrollments}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Student Analytics">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completed Enrollments</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{dashboard.student_analytics.completion_rates.completed_enrollments}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completion Rate</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{formatPercent(dashboard.student_analytics.completion_rates.completion_rate)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avg Completion Days</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{dashboard.student_analytics.learning_time_analysis.average_completion_days}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {dashboard.student_analytics.performance_report.performance_by_course.map((course) => (
                  <div key={course.course_id} className="rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:bg-emerald-50/60 dark:border-slate-700 dark:hover:bg-emerald-400/10">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{course.course_title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enrollments: {course.total_enrollments} | Progress: {formatPercent(course.average_progress)} | Completion: {formatPercent(course.completion_rate)}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
