"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Ban, ExternalLink, Loader2, RefreshCw, Trash2, Users, Video } from "lucide-react";

type UrlFn = (path: string) => string;
type TokenFn = () => string | null;
type Provider = "zoom" | "google_meet";

type Integration = {
  id: number;
  provider: string;
  external_account_id: string | null;
  is_active: boolean;
};

type SessionItem = {
  id: number;
  course_id: number | null;
  integration_id: number | null;
  provider: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string | null;
  join_url: string | null;
  metadata: unknown;
};

type CourseItem = { id: number | string; title?: string; title_translations?: Record<string, string> };

type Props = {
  roleLabel: string;
  getRequestUrl: UrlFn;
  getToken: TokenFn;
};

const providers: Provider[] = ["zoom", "google_meet"];

const integrationInitial = { provider: "google_meet" as Provider, external_account_id: "", access_token: "", refresh_token: "", expires_at: "" };
const sessionInitial = { course_id: "", provider: "google_meet" as Provider, integration_id: "", title: "", description: "", starts_at: "", ends_at: "", join_url: "", status: "draft", metadata_json: "{}" };
const attendanceInitial = { session_id: "", joined_at: "", left_at: "", duration_minutes: "" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function listFromPayload<T>(payload: unknown): T[] {
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data as T[];
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data as T[];
  return [];
}

function itemFromPayload<T>(payload: unknown): T | null {
  if (!isRecord(payload) || !isRecord(payload.data)) return null;
  return payload.data as T;
}

function toIsoOrNull(value: string) {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function toNumberOrNull(value: string) {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isFuture(iso: string) {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

function getStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function getErrorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
    if (!error.response) return "Cannot reach backend API.";
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Request failed.";
}

function courseTitle(course: CourseItem) {
  return course.title_translations?.en || course.title_translations?.ar || course.title || `Course #${course.id}`;
}

export default function VirtualMeetWorkspace({ roleLabel, getRequestUrl, getToken }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);

  const [integrationForm, setIntegrationForm] = useState(integrationInitial);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | null>(null);

  const [oauthProvider, setOauthProvider] = useState<Provider>("zoom");
  const [oauthCode, setOauthCode] = useState("");
  const [oauthUrl, setOauthUrl] = useState("");

  const [sessionMode, setSessionMode] = useState<"provider" | "manual">("provider");
  const [sessionForm, setSessionForm] = useState(sessionInitial);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);

  const [attendanceForm, setAttendanceForm] = useState(attendanceInitial);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const orderedSessions = useMemo(() => [...sessions].sort((a, b) => new Date(b.starts_at ?? 0).getTime() - new Date(a.starts_at ?? 0).getTime()), [sessions]);
  const providerIntegrations = useMemo(() => integrations.filter((i) => i.provider === sessionForm.provider), [integrations, sessionForm.provider]);

  const headers = () => {
    const token = getToken();
    if (!token) throw new Error("Session token is missing.");
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  };

  const withV1Fallback = async <T,>(fn: (prefix: string) => Promise<T>) => {
    try {
      return await fn("/v1");
    } catch (error) {
      if (getStatus(error) === 404) return fn("");
      throw error;
    }
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setErr(null); setMsg(null);
    try { await work(); } catch (error) { setErr(getErrorText(error)); } finally { setBusy(false); }
  };

  const loadCourses = async () => {
    const paths = roleLabel.toLowerCase().includes("admin") ? ["/super-admin/courses", "/courses", "/my-courses"] : ["/my-courses", "/courses"];
    for (const path of paths) {
      try {
        const res = await withV1Fallback((prefix) => axios.get(getRequestUrl(`${prefix}${path}`), { headers: headers() }));
        setCourses(listFromPayload<CourseItem>(res.data));
        return;
      } catch (error) {
        if (getStatus(error) !== 404) return;
      }
    }
  };

  const loadAll = async () => {
    setLoading(true); setErr(null); setMsg(null);
    try {
      const [integrationRes, sessionsRes] = await Promise.all([
        withV1Fallback((prefix) => axios.get(getRequestUrl(`${prefix}/external-integrations`), { headers: headers() })),
        withV1Fallback((prefix) => axios.get(getRequestUrl(`${prefix}/virtual-sessions`), { headers: headers() })),
      ]);
      setIntegrations(listFromPayload<Integration>(integrationRes.data));
      setSessions(listFromPayload<SessionItem>(sessionsRes.data));
      await loadCourses();
      setMsg("Data loaded.");
    } catch (error) {
      setErr(getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (sessionMode === "provider") setSessionForm((p) => ({ ...p, join_url: "" }));
    else setSessionForm((p) => ({ ...p, integration_id: "" }));
  }, [sessionMode]);

  const createIntegration = () => run(async () => {
    const payload: Record<string, unknown> = { provider: integrationForm.provider, is_active: true };
    if (integrationForm.external_account_id.trim()) payload.external_account_id = integrationForm.external_account_id.trim();
    if (integrationForm.access_token.trim()) payload.access_token = integrationForm.access_token.trim();
    if (integrationForm.refresh_token.trim()) payload.refresh_token = integrationForm.refresh_token.trim();
    const exp = toIsoOrNull(integrationForm.expires_at); if (exp) payload.expires_at = exp;
    await withV1Fallback((prefix) => axios.post(getRequestUrl(`${prefix}/external-integrations`), payload, { headers: headers() }));
    setIntegrationForm(integrationInitial); setSelectedIntegrationId(null); await loadAll(); setMsg("Integration created.");
  });

  const updateIntegration = () => run(async () => {
    if (selectedIntegrationId === null) throw new Error("Select an integration card first.");
    const payload: Record<string, unknown> = { provider: integrationForm.provider, is_active: true };
    if (integrationForm.external_account_id.trim()) payload.external_account_id = integrationForm.external_account_id.trim();
    if (integrationForm.access_token.trim()) payload.access_token = integrationForm.access_token.trim();
    if (integrationForm.refresh_token.trim()) payload.refresh_token = integrationForm.refresh_token.trim();
    const exp = toIsoOrNull(integrationForm.expires_at); if (exp) payload.expires_at = exp;
    await withV1Fallback((prefix) => axios.put(getRequestUrl(`${prefix}/external-integrations/${selectedIntegrationId}`), payload, { headers: headers() }));
    await loadAll(); setMsg("Integration updated.");
  });

  const revokeIntegration = (id: number) => run(async () => {
    await withV1Fallback((prefix) => axios.delete(getRequestUrl(`${prefix}/external-integrations/${id}`), { headers: headers() }));
    if (selectedIntegrationId === id) { setSelectedIntegrationId(null); setIntegrationForm(integrationInitial); }
    await loadAll(); setMsg("Integration revoked.");
  });

  const generateOauthUrl = () => run(async () => {
    const res = await withV1Fallback((prefix) => axios.get(getRequestUrl(`${prefix}/external-integrations/${oauthProvider}/oauth-url`), { headers: headers() }));
    const data = itemFromPayload<{ authorize_url?: string }>(res.data);
    setOauthUrl(data?.authorize_url ?? "");
  });

  const exchangeOauthCode = () => run(async () => {
    if (!oauthCode.trim()) throw new Error("Authorization code is required.");
    await withV1Fallback((prefix) => axios.post(getRequestUrl(`${prefix}/external-integrations/${oauthProvider}/exchange-code`), { code: oauthCode.trim() }, { headers: headers() }));
    setOauthCode(""); await loadAll(); setMsg("OAuth code exchanged.");
  });

  const createSession = () => run(async () => {
    const start = toIsoOrNull(sessionForm.starts_at);
    if (!sessionForm.title.trim()) throw new Error("title is required.");
    if (!start) throw new Error("starts_at is required.");
    if (!isFuture(start)) throw new Error("starts_at must be in the future.");
    const integrationId = toNumberOrNull(sessionForm.integration_id);
    if (sessionMode === "provider" && integrationId === null) throw new Error("Select provider integration.");
    if (sessionMode === "manual" && !sessionForm.join_url.trim()) throw new Error("join_url is required in manual mode.");

    const payload: Record<string, unknown> = { provider: sessionForm.provider, title: sessionForm.title.trim(), metadata: JSON.parse(sessionForm.metadata_json || "{}"), starts_at: start };
    const courseId = toNumberOrNull(sessionForm.course_id); const end = toIsoOrNull(sessionForm.ends_at);
    if (courseId !== null) payload.course_id = courseId;
    if (integrationId !== null) payload.integration_id = integrationId;
    if (end) payload.ends_at = end;
    if (sessionForm.description.trim()) payload.description = sessionForm.description.trim();
    if (sessionMode === "manual") payload.join_url = sessionForm.join_url.trim();
    if (sessionForm.status.trim()) payload.status = sessionForm.status.trim();

    await withV1Fallback((prefix) => axios.post(getRequestUrl(`${prefix}/virtual-sessions`), payload, { headers: headers() }));
    setEditingSessionId(null); setSessionForm(sessionInitial); await loadAll(); setMsg("Session created.");
  });

  const updateSession = () => run(async () => {
    if (editingSessionId === null) throw new Error("Select session card and click Edit.");
    const payload: Record<string, unknown> = { provider: sessionForm.provider, title: sessionForm.title.trim(), metadata: JSON.parse(sessionForm.metadata_json || "{}") };
    const courseId = toNumberOrNull(sessionForm.course_id); const integrationId = toNumberOrNull(sessionForm.integration_id); const start = toIsoOrNull(sessionForm.starts_at); const end = toIsoOrNull(sessionForm.ends_at);
    if (courseId !== null) payload.course_id = courseId;
    if (integrationId !== null) payload.integration_id = integrationId;
    if (start) payload.starts_at = start;
    if (end) payload.ends_at = end;
    if (sessionForm.description.trim()) payload.description = sessionForm.description.trim();
    if (sessionMode === "manual" && sessionForm.join_url.trim()) payload.join_url = sessionForm.join_url.trim();
    if (sessionForm.status.trim()) payload.status = sessionForm.status.trim();
    await withV1Fallback((prefix) => axios.put(getRequestUrl(`${prefix}/virtual-sessions/${editingSessionId}`), payload, { headers: headers() }));
    await loadAll(); setMsg("Session updated.");
  });

  const deleteSession = (id: number) => run(async () => {
    await withV1Fallback((prefix) => axios.delete(getRequestUrl(`${prefix}/virtual-sessions/${id}`), { headers: headers() }));
    if (editingSessionId === id) { setEditingSessionId(null); setSessionForm(sessionInitial); }
    await loadAll(); setMsg("Session deleted.");
  });

  const publishSession = (id: number) => run(async () => {
    await withV1Fallback((prefix) => axios.post(getRequestUrl(`${prefix}/virtual-sessions/${id}/publish`), {}, { headers: headers() }));
    await loadAll(); setMsg("Session published.");
  });

  const cancelSession = (id: number) => run(async () => {
    await withV1Fallback((prefix) => axios.post(getRequestUrl(`${prefix}/virtual-sessions/${id}/cancel`), {}, { headers: headers() }));
    await loadAll(); setMsg("Session cancelled.");
  });

  const saveAttendance = () => run(async () => {
    const sessionId = toNumberOrNull(attendanceForm.session_id);
    if (sessionId === null) throw new Error("Choose a session for attendance.");
    const payload: Record<string, unknown> = {};
    const joined = toIsoOrNull(attendanceForm.joined_at); const left = toIsoOrNull(attendanceForm.left_at); const duration = toNumberOrNull(attendanceForm.duration_minutes);
    if (joined) payload.joined_at = joined;
    if (left) payload.left_at = left;
    if (duration !== null) payload.duration_minutes = duration;
    await withV1Fallback((prefix) => axios.post(getRequestUrl(`${prefix}/virtual-sessions/${sessionId}/attendance`), payload, { headers: headers() }));
    setAttendanceForm(attendanceInitial); setMsg("Attendance stored.");
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#dbeafe_0%,#f8fafc_45%,#eef2ff_100%)] p-6 dark:bg-[radial-gradient(circle_at_20%_0%,#0f172a_0%,#020617_45%,#111827_100%)] md:p-10">
      <div className="mx-auto max-w-[1600px] space-y-6 text-slate-900 dark:text-white">
        <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200"><Video className="h-3.5 w-3.5" />{roleLabel}</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Virtual Meet Studio</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No manual ID typing. Pick from dropdowns/cards and run the full Zoom/Google Meet flow.</p>
            </div>
            <button onClick={() => void loadAll()} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-cyan-600 disabled:opacity-60 dark:border dark:border-cyan-300/30">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</button>
          </div>
          {msg ? <p className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{msg}</p> : null}
          {err ? <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-200">{err}</p> : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-5 dark:border-cyan-300/20 dark:bg-slate-900/85">
            <h2 className="mb-3 text-lg font-black">1) Integrations</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <select value={integrationForm.provider} onChange={(e) => setIntegrationForm((p) => ({ ...p, provider: e.target.value as Provider }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40">{providers.map((p) => <option key={p} value={p}>{p}</option>)}</select>
              <input value={integrationForm.external_account_id} onChange={(e) => setIntegrationForm((p) => ({ ...p, external_account_id: e.target.value }))} placeholder="external account (optional)" className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => void createIntegration()} disabled={busy} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Create</button>
              <button onClick={() => void updateIntegration()} disabled={busy || selectedIntegrationId === null} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Save Changes</button>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
              {integrations.map((i) => (
                <div key={i.id} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/20 dark:bg-slate-950/35">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black">{i.provider} #{i.id}</p>
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedIntegrationId(i.id); setIntegrationForm((p) => ({ ...p, provider: i.provider === "zoom" ? "zoom" : "google_meet", external_account_id: i.external_account_id ?? "" })); }} className="rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-black uppercase dark:border-white/20">Edit</button>
                      <button onClick={() => { setSessionMode("provider"); setSessionForm((p) => ({ ...p, provider: i.provider === "zoom" ? "zoom" : "google_meet", integration_id: String(i.id), join_url: "" })); }} className="rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-black uppercase text-white">Use in Session</button>
                      <button onClick={() => void revokeIntegration(i.id)} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-black uppercase text-white"><Trash2 className="h-3 w-3" />Revoke</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/85 p-5 dark:border-cyan-300/20 dark:bg-slate-900/85">
            <h2 className="mb-3 text-lg font-black">2) OAuth</h2>
            <select value={oauthProvider} onChange={(e) => setOauthProvider(e.target.value as Provider)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40">{providers.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            <input value={oauthCode} onChange={(e) => setOauthCode(e.target.value)} placeholder="authorization code" className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => void generateOauthUrl()} disabled={busy} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Get OAuth URL</button>
              <button onClick={() => void exchangeOauthCode()} disabled={busy} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Exchange Code</button>
            </div>
            {oauthUrl ? <a href={oauthUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-700 underline dark:text-indigo-200">Open authorize URL <ExternalLink className="h-3.5 w-3.5" /></a> : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 p-5 dark:border-cyan-300/20 dark:bg-slate-900/85">
          <h2 className="mb-3 text-lg font-black">3) Sessions</h2>
          <div className="mb-3 flex gap-2">
            <button onClick={() => setSessionMode("provider")} className={`rounded-xl px-3 py-2 text-xs font-black uppercase ${sessionMode === "provider" ? "bg-fuchsia-600 text-white" : "border border-slate-300 bg-white text-slate-700 dark:border-white/20 dark:bg-slate-900/40 dark:text-slate-200"}`}>Provider</button>
            <button onClick={() => setSessionMode("manual")} className={`rounded-xl px-3 py-2 text-xs font-black uppercase ${sessionMode === "manual" ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white text-slate-700 dark:border-white/20 dark:bg-slate-900/40 dark:text-slate-200"}`}>Manual Link</button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <select value={sessionForm.course_id} onChange={(e) => setSessionForm((p) => ({ ...p, course_id: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40"><option value="">No course</option>{courses.map((c) => <option key={String(c.id)} value={String(c.id)}>{courseTitle(c)}</option>)}</select>
            <select value={sessionForm.provider} onChange={(e) => setSessionForm((p) => ({ ...p, provider: e.target.value as Provider, integration_id: "" }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40">{providers.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            {sessionMode === "provider" ? (
              <select value={sessionForm.integration_id} onChange={(e) => setSessionForm((p) => ({ ...p, integration_id: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40"><option value="">Integration</option>{providerIntegrations.map((i) => <option key={i.id} value={String(i.id)}>#{i.id} {i.provider}</option>)}</select>
            ) : (
              <input value={sessionForm.join_url} onChange={(e) => setSessionForm((p) => ({ ...p, join_url: e.target.value }))} placeholder="join url" className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            )}
            <input value={sessionForm.title} onChange={(e) => setSessionForm((p) => ({ ...p, title: e.target.value }))} placeholder="title" className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            <input type="datetime-local" value={sessionForm.starts_at} onChange={(e) => setSessionForm((p) => ({ ...p, starts_at: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            <input type="datetime-local" value={sessionForm.ends_at} onChange={(e) => setSessionForm((p) => ({ ...p, ends_at: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input value={sessionForm.description} onChange={(e) => setSessionForm((p) => ({ ...p, description: e.target.value }))} placeholder="description" className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            <select value={sessionForm.status} onChange={(e) => setSessionForm((p) => ({ ...p, status: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40"><option value="draft">draft</option><option value="published">published</option><option value="cancelled">cancelled</option></select>
          </div>
          <textarea value={sessionForm.metadata_json} onChange={(e) => setSessionForm((p) => ({ ...p, metadata_json: e.target.value }))} className="mt-2 min-h-[84px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-950/40" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => void createSession()} disabled={busy} className="rounded-xl bg-fuchsia-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Create Session</button>
            <button onClick={() => void updateSession()} disabled={busy || editingSessionId === null} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Save Session</button>
            <button onClick={() => { setEditingSessionId(null); setSessionForm(sessionInitial); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700 dark:border-white/20 dark:bg-slate-900/40 dark:text-slate-100">Clear</button>
          </div>
          <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
            {orderedSessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/20 dark:bg-slate-950/35">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black">{s.title} #{s.id}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">{s.provider} | {s.status ?? "draft"} | {s.starts_at ?? "no date"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => { setEditingSessionId(s.id); setSessionMode(s.integration_id ? "provider" : "manual"); setSessionForm({ course_id: s.course_id ? String(s.course_id) : "", provider: s.provider === "zoom" ? "zoom" : "google_meet", integration_id: s.integration_id ? String(s.integration_id) : "", title: s.title, description: s.description ?? "", starts_at: toLocalInput(s.starts_at), ends_at: toLocalInput(s.ends_at), join_url: s.join_url ?? "", status: s.status ?? "draft", metadata_json: JSON.stringify(s.metadata ?? {}, null, 2) }); }} className="rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-black uppercase dark:border-white/20">Edit</button>
                    <button onClick={() => void publishSession(s.id)} className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase text-white">Publish</button>
                    <button onClick={() => void cancelSession(s.id)} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2 py-1 text-[10px] font-black uppercase text-white"><Ban className="h-3 w-3" />Cancel</button>
                    <button onClick={() => void deleteSession(s.id)} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-black uppercase text-white"><Trash2 className="h-3 w-3" />Delete</button>
                    {s.join_url ? <a href={s.join_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-[10px] font-black uppercase text-white">Join <ExternalLink className="h-3 w-3" /></a> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/85 p-5 dark:border-cyan-300/20 dark:bg-slate-900/85">
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-black"><Users className="h-4 w-4 text-emerald-500" />4) Attendance</h2>
          <div className="grid gap-2 md:grid-cols-5">
            <select value={attendanceForm.session_id} onChange={(e) => setAttendanceForm((p) => ({ ...p, session_id: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40 md:col-span-2"><option value="">Select session</option>{orderedSessions.map((s) => <option key={s.id} value={String(s.id)}>#{s.id} {s.title}</option>)}</select>
            <input type="datetime-local" value={attendanceForm.joined_at} onChange={(e) => setAttendanceForm((p) => ({ ...p, joined_at: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            <input type="datetime-local" value={attendanceForm.left_at} onChange={(e) => setAttendanceForm((p) => ({ ...p, left_at: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
            <input value={attendanceForm.duration_minutes} onChange={(e) => setAttendanceForm((p) => ({ ...p, duration_minutes: e.target.value }))} placeholder="duration min" className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-white/20 dark:bg-slate-950/40" />
          </div>
          <button onClick={() => void saveAttendance()} disabled={busy} className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Store Attendance</button>
        </section>
      </div>
    </div>
  );
}
