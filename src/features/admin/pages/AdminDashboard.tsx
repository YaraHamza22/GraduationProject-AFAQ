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

type AuditLogCauser = {
  id: number;
  name: string;
  email: string;
};

type AuditLogEntry = {
  id: number;
  log_name: string;
  description: string;
  event: string;
  subject_type: string;
  subject_id: number;
  causer_type: string;
  causer_id: number;
  created_at?: string;
  updated_at?: string;
  properties: UnknownRecord;
  causer: AuditLogCauser | null;
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

type AuditLogListPayload = {
  rows: AuditLogEntry[];
  pagination: {
    total: number;
    count: number;
    per_page: number;
    current_page: number;
    total_pages: number;
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

function formatDateTime(value?: string) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getSubjectLabel(subjectType: string) {
  const normalized = subjectType.split("\\").pop() || subjectType;
  return normalized.replace(/_/g, " ");
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

function parseAuditLogEntry(payload: unknown): AuditLogEntry | null {
  const row = isRecord(payload) ? payload : {};
  const causerRaw = isRecord(row.causer) ? row.causer : null;

  return {
    id: asNumber(row.id),
    log_name: asString(row.log_name, "default"),
    description: asString(row.description),
    event: asString(row.event),
    subject_type: asString(row.subject_type),
    subject_id: asNumber(row.subject_id),
    causer_type: asString(row.causer_type),
    causer_id: asNumber(row.causer_id),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
    properties: isRecord(row.properties) ? row.properties : {},
    causer: causerRaw
      ? {
          id: asNumber(causerRaw.id),
          name: asString(causerRaw.name),
          email: asString(causerRaw.email),
        }
      : null,
  };
}

function parseAuditLogList(payload: unknown): AuditLogListPayload {
  const root = isRecord(payload) && isRecord(payload.data) ? payload : {};
  const rows = asArray(isRecord(root.data) ? root.data : isRecord(payload) ? payload.data : [])
    .map((item) => parseAuditLogEntry(item))
    .filter((item): item is AuditLogEntry => Boolean(item && item.id));
  const paginationRaw = isRecord(root.pagination) ? root.pagination : isRecord(payload) && isRecord(payload.pagination) ? payload.pagination : {};

  return {
    rows,
    pagination: {
      total: asNumber(paginationRaw.total),
      count: asNumber(paginationRaw.count),
      per_page: asNumber(paginationRaw.per_page, 15),
      current_page: asNumber(paginationRaw.current_page, 1),
      total_pages: asNumber(paginationRaw.total_pages, 1),
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
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [highlightedAuditLog, setHighlightedAuditLog] = useState<AuditLogEntry | null>(null);
  const [auditLogTotal, setAuditLogTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!apiBaseUrl) throw new Error("missing_api_url");
      const token = getAdminToken();
      if (!token) throw new Error("missing_token");
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [dashboardResponse, auditLogListResponse] = await Promise.all([
        axios.get(getAdminApiRequestUrl("/super-admin/dashboard"), { headers }),
        axios.get(getAdminApiRequestUrl("/super-admin/security/audit-logs"), {
          headers,
          params: { page: 1, per_page: 8 },
        }),
      ]);

      const parsedDashboard = parseDashboardData(dashboardResponse.data);
      const parsedAuditLogs = parseAuditLogList(auditLogListResponse.data);

      setDashboard(parsedDashboard);
      setAuditLogs(parsedAuditLogs.rows);
      setAuditLogTotal(parsedAuditLogs.pagination.total);

      if (parsedAuditLogs.rows.length > 0) {
        try {
          const detailResponse = await axios.get(
            getAdminApiRequestUrl(`/super-admin/security/audit-logs/${parsedAuditLogs.rows[0].id}`),
            { headers }
          );
          setHighlightedAuditLog(parseAuditLogEntry(isRecord(detailResponse.data) ? detailResponse.data.data : null));
        } catch {
          setHighlightedAuditLog(parsedAuditLogs.rows[0]);
        }
      } else {
        setHighlightedAuditLog(null);
      }
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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#e0f2fe_0%,#f8fafc_40%,#ecfeff_100%)] p-4 sm:p-6 lg:p-8 dark:bg-[radial-gradient(circle_at_20%_10%,#0b1220_0%,#060a13_45%,#030711_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-10%] h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-[120px] dark:bg-cyan-400/20" />
        <div className="absolute bottom-[-12%] left-[-10%] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-indigo-500/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
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
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            <Section title="Security Audit Logs">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Audit coverage</p>
                  <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{formatNumber(auditLogTotal)} records</p>
                </div>
                {highlightedAuditLog ? (
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-200">
                    Highlight #{highlightedAuditLog.id}
                  </span>
                ) : null}
              </div>

              {highlightedAuditLog ? (
                <div className="mb-4 rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">Sensitive log spotlight</p>
                  <p className="mt-2 text-base font-black text-slate-900 dark:text-slate-100">{highlightedAuditLog.description}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {getSubjectLabel(highlightedAuditLog.subject_type)} #{highlightedAuditLog.subject_id} • {formatDateTime(highlightedAuditLog.created_at)}
                  </p>
                  {highlightedAuditLog.causer ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      By {highlightedAuditLog.causer.name} ({highlightedAuditLog.causer.email})
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No audit log records were returned by the backend yet.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => setHighlightedAuditLog(log)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        highlightedAuditLog?.id === log.id
                          ? "border-cyan-300 bg-cyan-50/70 dark:border-cyan-400/30 dark:bg-cyan-400/10"
                          : "border-slate-200/80 bg-white/70 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{log.description}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {log.event} • {getSubjectLabel(log.subject_type)} #{log.subject_id}
                          </p>
                        </div>
                        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500">#{log.id}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDateTime(log.created_at)}</span>
                        {log.causer ? <span>{log.causer.name}</span> : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
