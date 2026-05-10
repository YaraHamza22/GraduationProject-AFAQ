"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertCircle, Flag, Heart, Loader2, Lock, MessageCircle, MoreVertical, Pencil, Pin, Plus, RefreshCw, Trash2 } from "lucide-react";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

type Pagination = { total: number; count: number; per_page: number; current_page: number; total_pages: number };
type Thread = { id: number; course_id: number; title: string; body: string; category: string; is_pinned: number; is_locked: number; updated_at?: string };
type Post = { id: number; forum_thread_id: number; body: string; created_at?: string; updated_at?: string };
type Course = { id: number; title: string };
type Form = { courseId: string; title: string; body: string; category: string };

const CATEGORIES = ["general", "question", "announcement", "resource"] as const;
const REPORT_REASONS = ["spam", "abuse", "harassment", "misinformation", "other"] as const;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const fmt = (v?: string) => (v ? new Date(v).toLocaleString() : "--");
const cap = (v: string) => (v ? v[0].toUpperCase() + v.slice(1) : "");

function parsePagination(v: unknown): Pagination {
  const o = isObj(v) ? v : {};
  return { total: num(o.total), count: num(o.count), per_page: num(o.per_page, 15), current_page: Math.max(1, num(o.current_page, 1)), total_pages: Math.max(1, num(o.total_pages, 1)) };
}

function parseThreads(payload: unknown): { rows: Thread[]; pag: Pagination } {
  const root = isObj(payload) ? payload : {};
  const data = root.data;
  const arr = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.data) ? data.data : [];
  const rows = arr.map((x) => {
    if (!isObj(x)) return null;
    const id = num(x.id);
    if (!id) return null;
    return { id, course_id: num(x.course_id), title: str(x.title, `Thread #${id}`), body: str(x.body), category: str(x.category, "general"), is_pinned: num(x.is_pinned), is_locked: num(x.is_locked), updated_at: str(x.updated_at) };
  }).filter((x): x is Thread => x !== null);
  return { rows, pag: parsePagination(root.pagination ?? (isObj(data) ? data.pagination : undefined)) };
}

function parsePosts(payload: unknown): { rows: Post[]; pag: Pagination } {
  const root = isObj(payload) ? payload : {};
  const data = root.data;
  const arr = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.data) ? data.data : [];
  const rows = arr.map((x) => {
    if (!isObj(x)) return null;
    const id = num(x.id);
    if (!id) return null;
    return { id, forum_thread_id: num(x.forum_thread_id), body: str(x.body), created_at: str(x.created_at), updated_at: str(x.updated_at) };
  }).filter((x): x is Post => x !== null);
  return { rows, pag: parsePagination(root.pagination ?? (isObj(data) ? data.pagination : undefined)) };
}

function parseCourses(payload: unknown): Course[] {
  const root = isObj(payload) ? payload : {};
  const data = root.data;
  const arr = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.data) ? data.data : [];
  return arr.map((x) => {
    if (!isObj(x)) return null;
    const id = num(x.id);
    if (!id) return null;
    return { id, title: str(x.title, `Course #${id}`) };
  }).filter((x): x is Course => x !== null);
}

function isHtml404(e: unknown) {
  if (!axios.isAxiosError(e)) return false;
  const ct = String(e.response?.headers?.["content-type"] ?? "");
  return e.response?.status === 404 && ((typeof e.response?.data === "string" && e.response.data.includes("<!DOCTYPE html")) || ct.includes("text/html"));
}

async function request(path: string, config: Parameters<typeof axios.request>[0]) {
  try { return await axios.request({ ...config, url: getStudentApiRequestUrl(path) }); }
  catch (e) { if (!isHtml404(e)) throw e; return axios.request({ ...config, url: getStudentApiEndpoint(path) }); }
}

export default function StudentForumPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pag, setPag] = useState<Pagination>({ total: 0, count: 0, per_page: 15, current_page: 1, total_pages: 1 });
  const [form, setForm] = useState<Form>({ courseId: "", title: "", body: "", category: "general" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [postsByThread, setPostsByThread] = useState<Record<number, Post[]>>({});
  const [postsPagByThread, setPostsPagByThread] = useState<Record<number, Pagination>>({});
  const [loadingPosts, setLoadingPosts] = useState<Record<number, boolean>>({});
  const [draftByThread, setDraftByThread] = useState<Record<number, string>>({});
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingPostBody, setEditingPostBody] = useState("");
  const [reportingPostId, setReportingPostId] = useState<number | null>(null);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const headers = useMemo(() => {
    const token = getStudentToken();
    return token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : null;
  }, []);
  const courseName = useMemo(() => new Map(courses.map((c) => [c.id, c.title])), [courses]);

  const loadThreads = useCallback(async (page = 1) => {
    if (!headers) return;
    setLoading(true); setError(null); setOk(null);
    try {
      const res = await request("/forum-threads", { method: "GET", headers, params: { page, per_page: pag.per_page } });
      const parsed = parseThreads(res.data);
      setThreads(parsed.rows); setPag(parsed.pag);
    } catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Failed to load threads."); }
    finally { setLoading(false); }
  }, [headers, pag.per_page]);

  const loadCourses = useCallback(async () => {
    if (!headers) return;
    const tryPaths = ["/courses", "/super-admin/courses"];
    for (const path of tryPaths) {
      try {
        const res = await request(path, { method: "GET", headers, params: { per_page: 100 } });
        const list = parseCourses(res.data);
        if (list.length) { setCourses(list); setForm((p) => ({ ...p, courseId: p.courseId || String(list[0].id) })); return; }
      } catch {}
    }
    setCourses([]);
  }, [headers]);

  const loadPosts = useCallback(async (threadId: number, page = 1) => {
    if (!headers) return;
    setLoadingPosts((p) => ({ ...p, [threadId]: true }));
    try {
      const res = await request(`/forum-threads/${threadId}/posts`, { method: "GET", headers, params: { page, per_page: 20 } });
      const parsed = parsePosts(res.data);
      setPostsByThread((p) => ({ ...p, [threadId]: parsed.rows }));
      setPostsPagByThread((p) => ({ ...p, [threadId]: parsed.pag }));
    } catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Failed to load posts."); }
    finally { setLoadingPosts((p) => ({ ...p, [threadId]: false })); }
  }, [headers]);

  useEffect(() => { void loadThreads(1); void loadCourses(); }, [loadCourses, loadThreads]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement | null)?.closest("[data-thread-menu]")) setOpenMenuId(null); };
    window.addEventListener("click", close); return () => window.removeEventListener("click", close);
  }, []);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    return threads.filter((t) => (cat === "all" || t.category.toLowerCase() === cat) && (!x || t.title.toLowerCase().includes(x) || t.body.toLowerCase().includes(x) || t.category.toLowerCase().includes(x) || (courseName.get(t.course_id) ?? "").toLowerCase().includes(x)));
  }, [cat, courseName, q, threads]);

  const saveThread = async () => {
    const payload = { course_id: num(form.courseId), title: form.title.trim(), body: form.body.trim(), category: form.category.trim().toLowerCase() };
    if (!headers) return setError("Student token is missing. Please log in again.");
    if (!payload.course_id || !payload.title || !payload.body || !payload.category) return setError("Course, title, body, and category are required.");
    setSaving(true);
    try {
      if (editingThreadId) await request(`/forum-threads/${editingThreadId}`, { method: "PUT", headers, data: payload });
      else await request("/forum-threads", { method: "POST", headers, data: payload });
      setOk(editingThreadId ? "Forum thread updated successfully." : "Forum thread created successfully.");
      setEditingThreadId(null); setForm((p) => ({ courseId: p.courseId, title: "", body: "", category: "general" }));
      await loadThreads(editingThreadId ? pag.current_page : 1);
    } catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to save thread."); }
    finally { setSaving(false); }
  };

  const threadAction = async (id: number, path: string, msg: string) => {
    if (!headers) return;
    setBusyId(id);
    try { await request(path, { method: "POST", headers, data: {} }); setOk(msg); await loadThreads(pag.current_page); }
    catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Action failed."); }
    finally { setBusyId(null); }
  };

  const createPost = async (threadId: number) => {
    if (!headers) return;
    const body = (draftByThread[threadId] ?? "").trim();
    if (!body) return;
    setBusyId(threadId);
    try { await request(`/forum-threads/${threadId}/posts`, { method: "POST", headers, data: { body, parent_id: null } }); setDraftByThread((p) => ({ ...p, [threadId]: "" })); setOk("Forum post created successfully."); await loadPosts(threadId, postsPagByThread[threadId]?.current_page ?? 1); }
    catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to create post."); }
    finally { setBusyId(null); }
  };

  const updatePost = async (threadId: number, postId: number) => {
    if (!headers) return;
    const body = editingPostBody.trim();
    if (!body) return;
    setBusyId(postId);
    try { await request(`/forum-posts/${postId}`, { method: "PUT", headers, data: { body } }); setEditingPostId(null); setEditingPostBody(""); setOk("Forum post updated successfully."); await loadPosts(threadId, postsPagByThread[threadId]?.current_page ?? 1); }
    catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to update post."); }
    finally { setBusyId(null); }
  };

  const deletePost = async (threadId: number, postId: number) => {
    if (!headers || !window.confirm("Delete this post?")) return;
    setBusyId(postId);
    try { await request(`/forum-posts/${postId}`, { method: "DELETE", headers }); setOk("Forum post deleted successfully."); await loadPosts(threadId, postsPagByThread[threadId]?.current_page ?? 1); }
    catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to delete post."); }
    finally { setBusyId(null); }
  };

  const reactPost = async (threadId: number, postId: number) => {
    if (!headers) return;
    setBusyId(postId);
    try { await request(`/forum-posts/${postId}/react`, { method: "POST", headers, data: { reaction: "like" } }); setLiked((p) => new Set(p).add(postId)); setOk("Forum reaction added successfully."); await loadPosts(threadId, postsPagByThread[threadId]?.current_page ?? 1); }
    catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to react."); }
    finally { setBusyId(null); }
  };

  const reportPost = async (threadId: number, postId: number) => {
    if (!headers) return;
    setBusyId(postId);
    try { await request(`/forum-posts/${postId}/report`, { method: "POST", headers, data: { reason, description: details.trim() || null } }); setReportingPostId(null); setReason("spam"); setDetails(""); setOk("Forum post reported successfully."); await loadPosts(threadId, postsPagByThread[threadId]?.current_page ?? 1); }
    catch (e) { setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to report post."); }
    finally { setBusyId(null); }
  };

  return (
    <div className="min-h-screen bg-(--background) p-4 text-(--foreground) md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-black">Student Forum</h1>
          <button onClick={() => void loadThreads(pag.current_page)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase text-white dark:bg-white dark:text-slate-900">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh</button>
        </div>

        {(error || ok) ? <div className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}><AlertCircle className="h-4 w-4" /><span>{error ?? ok}</span></div> : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-lg font-black">{editingThreadId ? "Edit Thread" : "Create Thread"}</h2>
            <div className="space-y-2">
              <select value={form.courseId} onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/20 dark:bg-slate-900 dark:text-slate-100">{courses.map((c) => <option key={c.id} value={String(c.id)}>{c.title}</option>)}</select>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/20 dark:bg-slate-900 dark:text-slate-100">{CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}</select>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/10" />
              <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Body" className="min-h-[110px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/10" />
              <div className="flex gap-2"><button onClick={() => void saveThread()} disabled={saving} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white">{saving ? "Saving..." : "Save"}</button>{editingThreadId ? <button onClick={() => { setEditingThreadId(null); setForm((p) => ({ ...p, title: "", body: "", category: "general" })); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold dark:border-white/20">Cancel</button> : null}</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 xl:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-white/20 dark:bg-white/10" />
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-white/20 dark:bg-slate-900 dark:text-slate-100"><option value="all">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}</select>
            </div>

            {loading ? <div className="py-14 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin" /></div> : filtered.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm opacity-60 dark:border-white/20">No threads found.</div> : (
              <div className="space-y-3">
                {filtered.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold dark:bg-white/10">{cap(t.category)}</span>
                          {t.is_pinned ? <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700">Pinned</span> : null}
                          {t.is_locked ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">Locked</span> : null}
                        </div>
                        <h3 className="text-lg font-black">{t.title}</h3>
                        <p className="text-xs opacity-55">{courseName.get(t.course_id) ?? `Course #${t.course_id}`} | Updated {fmt(t.updated_at)}</p>
                      </div>
                      <div className="relative" data-thread-menu>
                        <button onClick={() => setOpenMenuId((p) => (p === t.id ? null : t.id))} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-white/10">{busyId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}</button>
                        {openMenuId === t.id ? <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 text-slate-900 shadow-lg dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
                          <button onClick={() => void threadAction(t.id, `/forum-threads/${t.id}/pin`, `Thread ${t.is_pinned ? "unpinned" : "pinned"} successfully.`)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Pin className="h-4 w-4" />{t.is_pinned ? "Unpin" : "Pin"}</button>
                          <button onClick={() => void threadAction(t.id, `/forum-threads/${t.id}/lock`, `Thread ${t.is_locked ? "unlocked" : "locked"} successfully.`)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Lock className="h-4 w-4" />{t.is_locked ? "Unlock" : "Lock"}</button>
                          <button onClick={() => { setEditingThreadId(t.id); setForm({ courseId: String(t.course_id), title: t.title, body: t.body, category: t.category }); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Pencil className="h-4 w-4" />Update</button>
                          <button onClick={async () => { if (!headers || !window.confirm(`Delete "${t.title}"?`)) return; setBusyId(t.id); try { await request(`/forum-threads/${t.id}`, { method: "DELETE", headers }); setOk("Forum thread deleted successfully."); await loadThreads(pag.current_page); } catch { setError("Unable to delete thread."); } finally { setBusyId(null); } }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete</button>
                        </div> : null}
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{t.body}</p>
                    <div className="mt-2 flex justify-end"><button onClick={async () => { const on = expanded.has(t.id); setExpanded((p) => { const n = new Set(p); if (on) n.delete(t.id); else n.add(t.id); return n; }); if (!on && !postsByThread[t.id]) await loadPosts(t.id, 1); }} className="inline-flex items-center gap-1 rounded bg-slate-200 px-2.5 py-1 text-xs font-bold dark:bg-white/10"><MessageCircle className="h-3.5 w-3.5" />{expanded.has(t.id) ? "Hide Posts" : "View Posts"}</button></div>

                    {expanded.has(t.id) ? (
                      <div className="mt-3 rounded-lg border border-slate-200 p-2 dark:border-white/10">
                        <div className="mb-2 flex gap-2">
                          <textarea value={draftByThread[t.id] ?? ""} onChange={(e) => setDraftByThread((p) => ({ ...p, [t.id]: e.target.value }))} placeholder="Write post..." className="min-h-[64px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-white/10" />
                          <button onClick={() => void createPost(t.id)} disabled={busyId === t.id || t.is_locked === 1} className="self-end rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50">{busyId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</button>
                        </div>
                        {loadingPosts[t.id] ? <div className="py-4 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div> : (postsByThread[t.id] ?? []).length === 0 ? <div className="rounded border border-dashed border-slate-300 p-3 text-center text-xs opacity-60 dark:border-white/20">No posts.</div> : <div className="space-y-2">
                          {(postsByThread[t.id] ?? []).map((p) => (
                            <div key={p.id} className="rounded border border-slate-200 p-2 dark:border-white/10">
                              {editingPostId === p.id ? <>
                                <textarea value={editingPostBody} onChange={(e) => setEditingPostBody(e.target.value)} className="min-h-[64px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-white/10" />
                                <div className="mt-2 flex gap-2"><button onClick={() => void updatePost(t.id, p.id)} disabled={busyId === p.id} className="rounded bg-cyan-600 px-2.5 py-1 text-xs font-bold text-white">Save</button><button onClick={() => { setEditingPostId(null); setEditingPostBody(""); }} className="rounded border border-slate-300 px-2.5 py-1 text-xs font-bold dark:border-white/20">Cancel</button></div>
                              </> : <>
                                <p className="whitespace-pre-wrap text-sm">{p.body}</p>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs opacity-55">Post #{p.id} • {fmt(p.updated_at || p.created_at)}</p>
                                  <div className="flex gap-1">
                                    <button onClick={() => void reactPost(t.id, p.id)} disabled={busyId === p.id} className={`rounded px-2 py-1 text-xs font-bold ${liked.has(p.id) ? "bg-rose-500/15 text-rose-600" : "bg-slate-200 dark:bg-white/10"}`}><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />Like</span></button>
                                    <button onClick={() => { setEditingPostId(p.id); setEditingPostBody(p.body); }} className="rounded bg-slate-200 px-2 py-1 text-xs font-bold dark:bg-white/10"><span className="inline-flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</span></button>
                                    <button onClick={() => setReportingPostId(reportingPostId === p.id ? null : p.id)} className="rounded bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-700"><span className="inline-flex items-center gap-1"><Flag className="h-3 w-3" />Report</span></button>
                                    <button onClick={() => void deletePost(t.id, p.id)} disabled={busyId === p.id} className="rounded bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-600"><span className="inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</span></button>
                                  </div>
                                </div>
                              </>}
                              {reportingPostId === p.id ? <div className="mt-2 rounded border border-amber-400/40 bg-amber-500/10 p-2"><div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded border border-amber-400/50 bg-white px-2 py-1 text-xs text-slate-900 dark:bg-slate-900 dark:text-slate-100">{REPORT_REASONS.map((r) => <option key={r} value={r}>{cap(r)}</option>)}</select><input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (optional)" className="rounded border border-amber-400/50 bg-white px-2 py-1 text-xs text-slate-900 dark:bg-slate-900 dark:text-slate-100 sm:col-span-2" /></div><div className="mt-2 flex gap-2"><button onClick={() => void reportPost(t.id, p.id)} disabled={busyId === p.id} className="rounded bg-amber-600 px-2.5 py-1 text-xs font-bold text-white">Submit</button><button onClick={() => setReportingPostId(null)} className="rounded border border-amber-400/50 px-2.5 py-1 text-xs font-bold">Cancel</button></div></div> : null}
                            </div>
                          ))}
                        </div>}
                        <div className="mt-2 flex items-center justify-between"><p className="text-[11px] opacity-55">Total posts: {postsPagByThread[t.id]?.total ?? (postsByThread[t.id] ?? []).length} | Page {postsPagByThread[t.id]?.current_page ?? 1}/{postsPagByThread[t.id]?.total_pages ?? 1}</p><div className="flex gap-1"><button onClick={() => void loadPosts(t.id, Math.max(1, (postsPagByThread[t.id]?.current_page ?? 1) - 1))} disabled={(postsPagByThread[t.id]?.current_page ?? 1) <= 1 || loadingPosts[t.id]} className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-bold dark:border-white/20">Prev</button><button onClick={() => void loadPosts(t.id, Math.min(postsPagByThread[t.id]?.total_pages ?? 1, (postsPagByThread[t.id]?.current_page ?? 1) + 1))} disabled={(postsPagByThread[t.id]?.current_page ?? 1) >= (postsPagByThread[t.id]?.total_pages ?? 1) || loadingPosts[t.id]} className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-bold dark:border-white/20">Next</button></div></div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
