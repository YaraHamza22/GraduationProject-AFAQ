"use client";

import React from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, Download, FileCheck2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type Course = { id: number; title: string };
type CertState = {
  status: "idle" | "checking" | "available" | "unavailable" | "error";
  message?: string;
  fileName?: string;
  blobUrl?: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

function parseCourses(payload: unknown): Course[] {
  const root = isObj(payload) ? payload : {};
  const data = root.data;
  const source = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.data) ? data.data : [];
  const rows: Course[] = [];

  for (const item of source) {
    if (!isObj(item)) continue;
    const id = num(item.id);
    if (!id) continue;
    rows.push({ id, title: str(item.title, `Course #${id}`) });
  }
  return rows;
}

function getErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "Unable to load certificates right now.";
  if (typeof error.response?.data?.message === "string") return error.response.data.message;
  if (!error.response) return "Cannot reach backend server.";
  return "Request failed. Please try again.";
}

function isHtml404(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const ct = String(error.response?.headers?.["content-type"] ?? "");
  return (
    error.response?.status === 404 &&
    ((typeof error.response?.data === "string" && error.response.data.includes("<!DOCTYPE html")) || ct.includes("text/html"))
  );
}

async function request(config: Parameters<typeof axios.request>[0]) {
  const path = String(config.url ?? "");
  try {
    return await axios.request({ ...config, url: getStudentApiRequestUrl(path) });
  } catch (e) {
    if (!isHtml404(e)) throw e;
    return axios.request({ ...config, url: getStudentApiEndpoint(path) });
  }
}

async function parseBlobJson(blob: Blob) {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as unknown;
    return isObj(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function StudentCertificatesPage() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [certByCourse, setCertByCourse] = React.useState<Record<number, CertState>>({});
  const [loadingCourses, setLoadingCourses] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const headers = React.useMemo(() => {
    const token = getStudentToken();
    return token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : null;
  }, []);

  const myId = React.useMemo(() => num(getStoredStudentUser()?.id, 0), []);

  const cleanupBlobUrls = React.useCallback(() => {
    Object.values(certByCourse).forEach((s) => {
      if (s.blobUrl) URL.revokeObjectURL(s.blobUrl);
    });
  }, [certByCourse]);

  React.useEffect(() => () => cleanupBlobUrls(), [cleanupBlobUrls]);

  const setCourseState = React.useCallback((courseId: number, next: CertState) => {
    setCertByCourse((prev) => {
      const prevUrl = prev[courseId]?.blobUrl;
      if (prevUrl && prevUrl !== next.blobUrl) URL.revokeObjectURL(prevUrl);
      return { ...prev, [courseId]: next };
    });
  }, []);

  const probeCertificate = React.useCallback(async (courseId: number) => {
    if (!headers) return;
    setCourseState(courseId, { status: "checking" });

    try {
      const res = await request({
        method: "GET",
        url: `/courses/${courseId}/certificate`,
        headers,
        params: myId ? { student_id: myId } : undefined,
        responseType: "blob",
        validateStatus: () => true,
      });

      const contentType = String(res.headers?.["content-type"] ?? "").toLowerCase();
      const blob = res.data as Blob;
      const isJson = contentType.includes("application/json") || contentType.includes("text/json");
      const isFile = contentType.includes("application/pdf") || contentType.includes("application/octet-stream");

      if (isFile && res.status >= 200 && res.status < 300) {
        const blobUrl = URL.createObjectURL(blob);
        setCourseState(courseId, {
          status: "available",
          message: "Certificate is ready to download.",
          blobUrl,
          fileName: `course-${courseId}-certificate.pdf`,
        });
        return;
      }

      const parsed = isJson ? await parseBlobJson(blob) : null;
      const message = parsed ? str(parsed.message) : "";
      const payloadStatus = parsed ? str(parsed.status).toLowerCase() : "";

      if (payloadStatus === "success" && res.status >= 200 && res.status < 300) {
        const blobUrl = URL.createObjectURL(blob);
        setCourseState(courseId, {
          status: "available",
          message: message || "Certificate is ready to download.",
          blobUrl,
          fileName: `course-${courseId}-certificate.pdf`,
        });
        return;
      }

      if (message) {
        setCourseState(courseId, {
          status: "unavailable",
          message,
        });
        return;
      }

      if (res.status >= 400) {
        setCourseState(courseId, {
          status: "unavailable",
          message: "Certificate is not available yet. Complete the required quizzes and pass at least 60%.",
        });
        return;
      }

      setCourseState(courseId, { status: "error", message: "Unexpected certificate response format." });
    } catch (e) {
      setCourseState(courseId, { status: "error", message: getErrorMessage(e) });
    }
  }, [headers, myId, setCourseState]);

  const downloadCertificate = React.useCallback(async (courseId: number) => {
    const state = certByCourse[courseId];
    if (state?.blobUrl) {
      const a = document.createElement("a");
      a.href = state.blobUrl;
      a.download = state.fileName || `course-${courseId}-certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setOk("Certificate download started.");
      return;
    }
    await probeCertificate(courseId);
  }, [certByCourse, probeCertificate]);

  const loadCourses = React.useCallback(async () => {
    if (!headers) {
      setError("Student token is missing. Please log in again.");
      setLoadingCourses(false);
      return;
    }

    setLoadingCourses(true);
    setError(null);
    setOk(null);

    try {
      const [enrollmentsRes, learningRes] = await Promise.allSettled([
        request({ method: "GET", url: "/enrollments", headers, params: { per_page: 100 } }),
        request({ method: "GET", url: "/my-learning", headers }),
      ]);

      const map = new Map<number, Course>();

      if (enrollmentsRes.status === "fulfilled") {
        const payload = enrollmentsRes.value.data;
        const root = isObj(payload) ? payload : {};
        const rows = Array.isArray(root.data) ? root.data : isObj(root.data) && Array.isArray(root.data.data) ? root.data.data : [];
        for (const x of rows) {
          if (!isObj(x)) continue;
          const course = isObj(x.course) ? x.course : x;
          const id = num(course.id ?? x.course_id);
          if (!id) continue;
          map.set(id, { id, title: str(course.title, `Course #${id}`) });
        }
      }

      if (learningRes.status === "fulfilled") {
        parseCourses(learningRes.value.data).forEach((c) => map.set(c.id, c));
      }

      const list = Array.from(map.values());
      setCourses(list);

      if (list.length === 0) return;
      await Promise.allSettled(list.map((c) => probeCertificate(c.id)));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingCourses(false);
    }
  }, [headers, probeCertificate]);

  React.useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  return (
    <div className="min-h-screen bg-(--background) p-4 text-(--foreground) md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-300 bg-linear-to-br from-cyan-50 via-emerald-50 to-amber-50 p-6 shadow-sm dark:border-white/10 dark:from-cyan-950/25 dark:via-slate-900 dark:to-emerald-950/20 md:p-10">
          <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-2xl" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Achievements</p>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">My Certificates</h1>
              <p className="mt-2 max-w-2xl text-sm opacity-70 md:text-base">
                Download certificates for completed courses. If unavailable, we show exactly what is missing.
              </p>
            </div>
            <button
              onClick={() => void loadCourses()}
              disabled={loadingCourses}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {loadingCourses ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {(error || ok) ? (
          <div className={`mt-5 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error ?? ok}</span>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loadingCourses ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-3 h-4 w-full rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-2 h-4 w-4/5 rounded bg-slate-200 dark:bg-white/10" />
                <div className="mt-6 h-10 w-40 rounded-2xl bg-slate-200 dark:bg-white/10" />
              </div>
            ))
          ) : courses.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-white/20">
              <FileCheck2 className="mx-auto h-10 w-10 opacity-30" />
              <p className="mt-3 text-lg font-bold opacity-70">No enrolled courses found.</p>
              <p className="mt-1 text-sm opacity-50">Enroll in a course first to become eligible for certification.</p>
            </div>
          ) : (
            courses.map((course) => {
              const state = certByCourse[course.id] ?? { status: "idle" as const };
              const isBusy = state.status === "checking";

              return (
                <div key={course.id} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-lg font-black tracking-tight">{course.title}</h2>
                    {state.status === "available" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />Ready
                      </span>
                    ) : state.status === "unavailable" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        <ShieldAlert className="h-3 w-3" />Pending
                      </span>
                    ) : null}
                  </div>

                  <div className={`mb-4 rounded-2xl border p-3 text-sm ${state.status === "available" ? "border-emerald-300/70 bg-emerald-50/70 text-emerald-800" : state.status === "unavailable" ? "border-amber-300/70 bg-amber-50/70 text-amber-800" : state.status === "error" ? "border-rose-300/70 bg-rose-50/70 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}`}>
                    {state.status === "checking" ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Checking certificate...</span>
                    ) : state.message ? (
                      state.message
                    ) : (
                      "Check certificate eligibility for this course."
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => void probeCertificate(course.id)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Check
                    </button>

                    <button
                      onClick={() => void downloadCertificate(course.id)}
                      disabled={isBusy || state.status !== "available"}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
