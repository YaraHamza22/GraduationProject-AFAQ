"use client";

import React from "react";
import axios from "axios";
import {
  AlertCircle,
  Archive,
  CheckCheck,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type ViewerRole = "student" | "instructor";
type Pagination = { total: number; count: number; per_page: number; current_page: number; total_pages: number };
type Thread = { id: number; title: string; course_id: number | null; created_by: number | null; is_archived: number; updated_at?: string };
type Message = { id: number; chat_thread_id: number; author_id: number | null; body: string; created_at?: string; updated_at?: string };
type Participant = { user_id: number; role: string };
type Contact = { id: number; name: string; email?: string };

type ChatWorkspaceProps = {
  viewerRole: ViewerRole;
};

type EchoChannelLike = {
  listen: (event: string, callback: (payload: unknown) => void) => EchoChannelLike;
  stopListening?: (event: string) => void;
};

type EchoLike = {
  private: (channel: string) => EchoChannelLike;
  leaveChannel?: (channel: string) => void;
};

const defaultPag: Pagination = { total: 0, count: 0, per_page: 15, current_page: 1, total_pages: 1 };
const defaultMsgPag: Pagination = { total: 0, count: 0, per_page: 30, current_page: 1, total_pages: 1 };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const fmt = (v?: string) => (v ? new Date(v).toLocaleString() : "--");

function parsePagination(value: unknown, fallbackPerPage: number): Pagination {
  const x = isObj(value) ? value : {};
  return {
    total: num(x.total),
    count: num(x.count),
    per_page: num(x.per_page, fallbackPerPage),
    current_page: Math.max(1, num(x.current_page, 1)),
    total_pages: Math.max(1, num(x.total_pages, 1)),
  };
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isObj(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data;

  if (isObj(payload.data)) {
    const nested = payload.data;
    if (Array.isArray(nested.data)) return nested.data;
    if (Array.isArray(nested.items)) return nested.items;
    if (Array.isArray(nested.users)) return nested.users;
    if (Array.isArray(nested.results)) return nested.results;
  }

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function parseThreads(payload: unknown): { rows: Thread[]; pagination: Pagination } {
  const root = isObj(payload) ? payload : {};
  const rows: Thread[] = [];
  for (const entry of extractArray(payload)) {
    if (!isObj(entry)) continue;
    const id = num(entry.id);
    if (!id) continue;
    rows.push({
      id,
      title: str(entry.title, `Chat #${id}`),
      course_id: entry.course_id == null ? null : num(entry.course_id),
      created_by: entry.created_by == null ? null : num(entry.created_by),
      is_archived: num(entry.is_archived),
      updated_at: str(entry.updated_at) || undefined,
    });
  }

  const pagination = parsePagination(root.pagination ?? (isObj(root.data) ? root.data.pagination : undefined), 15);
  return { rows, pagination };
}

function parseMessages(payload: unknown): { rows: Message[]; pagination: Pagination } {
  const root = isObj(payload) ? payload : {};
  const rows: Message[] = [];
  for (const entry of extractArray(payload)) {
    if (!isObj(entry)) continue;
    const id = num(entry.id);
    if (!id) continue;
    rows.push({
      id,
      chat_thread_id: num(entry.chat_thread_id),
      author_id: entry.author_id == null ? null : num(entry.author_id),
      body: str(entry.body),
      created_at: str(entry.created_at) || undefined,
      updated_at: str(entry.updated_at) || undefined,
    });
  }
  rows.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  const pagination = parsePagination(root.pagination ?? (isObj(root.data) ? root.data.pagination : undefined), 30);
  return { rows, pagination };
}

function parseParticipants(payload: unknown): Participant[] {
  const rows: Participant[] = [];
  for (const entry of extractArray(payload)) {
    if (!isObj(entry)) continue;
    const user_id = num(entry.user_id);
    if (!user_id) continue;
    rows.push({ user_id, role: str(entry.role, "member") });
  }
  return rows;
}

function parseContacts(payload: unknown): Contact[] {
  const rows: Contact[] = [];
  for (const entry of extractArray(payload)) {
    if (!isObj(entry)) continue;
    const id = num(entry.id);
    if (!id) continue;
    const name = str(entry.name) || str(entry.full_name) || str(entry.username) || `User #${id}`;
    const email = str(entry.email);
    rows.push({ id, name, email: email || undefined });
  }
  return rows;
}

function isHtml404(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const contentType = String(error.response?.headers?.["content-type"] ?? "");
  return (
    error.response?.status === 404 &&
    ((typeof error.response?.data === "string" && error.response.data.includes("<!DOCTYPE html")) || contentType.includes("text/html"))
  );
}

async function request(config: Parameters<typeof axios.request>[0]) {
  const path = String(config.url ?? "");
  try {
    return await axios.request({ ...config, url: getStudentApiRequestUrl(path) });
  } catch (error) {
    if (!isHtml404(error)) throw error;
    return axios.request({ ...config, url: getStudentApiEndpoint(path) });
  }
}

export default function ChatWorkspace({ viewerRole }: ChatWorkspaceProps) {
  const token = React.useMemo(() => getStudentToken(), []);
  const me = React.useMemo(() => getStoredStudentUser(), []);
  const myId = React.useMemo(() => num(me?.id, 0), [me?.id]);
  const headers = React.useMemo(() => (token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : null), [token]);

  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [threadPagination, setThreadPagination] = React.useState<Pagination>(defaultPag);
  const [selectedThreadId, setSelectedThreadId] = React.useState<number | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [messagePagination, setMessagePagination] = React.useState<Pagination>(defaultMsgPag);
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = React.useState("");
  const [newChatTitle, setNewChatTitle] = React.useState("");
  const [newRecipientId, setNewRecipientId] = React.useState("");
  const [newMessage, setNewMessage] = React.useState("");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loadingThreads, setLoadingThreads] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [creatingThread, setCreatingThread] = React.useState(false);
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const [liveStatus, setLiveStatus] = React.useState<"connected" | "connecting" | "disconnected">("disconnected");

  const contactById = React.useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const selectedThread = React.useMemo(() => threads.find((x) => x.id === selectedThreadId) ?? null, [selectedThreadId, threads]);

  const contactCandidates = React.useMemo(() => {
    if (viewerRole === "student") {
      return [
        { path: "/instructors", params: { per_page: "200" } },
        { path: "/users", params: { role: "instructor", per_page: "200" } },
        { path: "/super-admin/instructors", params: { per_page: "200" } },
        { path: "/super-admin/users", params: { role: "instructor", per_page: "200" } },
      ];
    }
    return [
      { path: "/students", params: { per_page: "200" } },
      { path: "/users", params: { role: "student", per_page: "200" } },
      { path: "/super-admin/students", params: { per_page: "200" } },
      { path: "/super-admin/users", params: { role: "student", per_page: "200" } },
    ];
  }, [viewerRole]);

  const loadUnreadCount = React.useCallback(async () => {
    if (!headers) return;
    try {
      const res = await request({ method: "GET", url: "/chat-threads/unread-count", headers });
      const payload = isObj(res.data) ? res.data : {};
      const value = isObj(payload.data) ? payload.data.unread_count : payload.unread_count;
      setUnreadCount(Math.max(0, num(value)));
    } catch {
      setUnreadCount(0);
    }
  }, [headers]);

  const loadThreads = React.useCallback(async (page = 1) => {
    if (!headers) return;
    setLoadingThreads(true);
    setError(null);
    try {
      const res = await request({ method: "GET", url: "/chat-threads", headers, params: { page, per_page: threadPagination.per_page } });
      const parsed = parseThreads(res.data);
      setThreads(parsed.rows);
      setThreadPagination(parsed.pagination);
      if (parsed.rows.length > 0) {
        setSelectedThreadId((prev) => (prev && parsed.rows.some((x) => x.id === prev) ? prev : parsed.rows[0].id));
      } else {
        setSelectedThreadId(null);
        setMessages([]);
        setParticipants([]);
      }
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Failed to load chat threads.");
    } finally {
      setLoadingThreads(false);
    }
  }, [headers, threadPagination.per_page]);

  const loadParticipants = React.useCallback(async (threadId: number) => {
    if (!headers) return;
    try {
      const res = await request({ method: "GET", url: `/chat-threads/${threadId}/participants`, headers });
      setParticipants(parseParticipants(res.data));
    } catch {
      setParticipants([]);
    }
  }, [headers]);

  const loadMessages = React.useCallback(async (threadId: number, page = 1) => {
    if (!headers) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await request({ method: "GET", url: `/chat-threads/${threadId}/messages`, headers, params: { page, per_page: messagePagination.per_page } });
      const parsed = parseMessages(res.data);
      setMessages(parsed.rows);
      setMessagePagination(parsed.pagination);
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, [headers, messagePagination.per_page]);

  const loadContacts = React.useCallback(async () => {
    if (!headers) return;
    for (const candidate of contactCandidates) {
      try {
        const res = await request({ method: "GET", url: candidate.path, headers, params: candidate.params });
        const list = parseContacts(res.data);
        if (list.length > 0) {
          setContacts(list);
          setNewRecipientId((prev) => prev || String(list[0].id));
          return;
        }
      } catch {
        // try next source
      }
    }
    setContacts([]);
    setNewRecipientId("");
  }, [contactCandidates, headers]);

  React.useEffect(() => {
    void loadThreads(1);
    void loadContacts();
    void loadUnreadCount();
  }, [loadContacts, loadThreads, loadUnreadCount]);

  React.useEffect(() => {
    if (!selectedThreadId) return;
    void loadParticipants(selectedThreadId);
    void loadMessages(selectedThreadId, 1);
  }, [loadMessages, loadParticipants, selectedThreadId]);

  const refreshFromRealtime = React.useCallback(async () => {
    await loadUnreadCount();
    await loadThreads(threadPagination.current_page);
    if (selectedThreadId) {
      await Promise.all([
        loadParticipants(selectedThreadId),
        loadMessages(selectedThreadId, messagePagination.current_page),
      ]);
    }
  }, [
    loadMessages,
    loadParticipants,
    loadThreads,
    loadUnreadCount,
    messagePagination.current_page,
    selectedThreadId,
    threadPagination.current_page,
  ]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !headers || !myId) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    const listeners: Array<{ channel: EchoChannelLike; event: string }> = [];
    const w = window as Window & { Echo?: EchoLike };
    const echo = w.Echo;

    const realtimeEvents = ["chat.message", ".chat.message", "message.created", ".message.created", "chat.thread.updated", ".chat.thread.updated"];

    const handleRealtime = () => {
      if (cancelled) return;
      setLiveStatus("connected");
      void refreshFromRealtime();
    };

    if (echo?.private) {
      setLiveStatus("connecting");
      const channels = [
        echo.private(`chat.${myId}`),
        echo.private(`chat-threads.${myId}`),
      ];
      channels.forEach((channel) => {
        realtimeEvents.forEach((event) => {
          channel.listen(event, handleRealtime);
          listeners.push({ channel, event });
        });
      });
      setLiveStatus("connected");
      return () => {
        cancelled = true;
        listeners.forEach(({ channel, event }) => channel.stopListening?.(event));
        echo.leaveChannel?.(`private-chat.${myId}`);
        echo.leaveChannel?.(`private-chat-threads.${myId}`);
      };
    }

    const wsBase = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsBase) {
      setLiveStatus("disconnected");
      return;
    }

    try {
      setLiveStatus("connecting");
      const encodedToken = encodeURIComponent(token ?? "");
      const separator = wsBase.includes("?") ? "&" : "?";
      socket = new WebSocket(`${wsBase}${separator}token=${encodedToken}&user_id=${myId}`);

      socket.onopen = () => {
        if (cancelled) return;
        setLiveStatus("connected");
      };

      socket.onmessage = (evt) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse(String(evt.data)) as unknown;
          if (!isObj(payload)) return;
          const event = str(payload.event).toLowerCase();
          const type = str(payload.type).toLowerCase();
          const shouldRefresh = event.includes("chat") || event.includes("message") || type.includes("chat") || type.includes("message");
          if (shouldRefresh) handleRealtime();
        } catch {
          // Ignore malformed payloads.
        }
      };

      socket.onerror = () => {
        if (cancelled) return;
        setLiveStatus("disconnected");
      };

      socket.onclose = () => {
        if (cancelled) return;
        setLiveStatus("disconnected");
      };
    } catch {
      setLiveStatus("disconnected");
    }

    return () => {
      cancelled = true;
      if (socket && socket.readyState <= 1) socket.close();
    };
  }, [headers, myId, refreshFromRealtime, token]);

  React.useEffect(() => {
    if (!headers) return;
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
      void loadThreads(threadPagination.current_page);
    }, 45000);
    return () => window.clearInterval(intervalId);
  }, [headers, loadThreads, loadUnreadCount, threadPagination.current_page]);

  const createThread = async () => {
    if (!headers) return setError("Missing auth token. Please login again.");
    const title = newChatTitle.trim();
    const recipientId = num(newRecipientId);
    if (!title) return setError("Thread title is required.");
    if (!recipientId) return setError(`Select a ${viewerRole === "student" ? "teacher" : "student"} first.`);

    setCreatingThread(true);
    setError(null);
    setOk(null);
    try {
      const createRes = await request({ method: "POST", url: "/chat-threads", headers, data: { title, course_id: null } });
      const created = isObj(createRes.data) && isObj(createRes.data.data) ? createRes.data.data : {};
      const threadId = num(created.id);
      if (!threadId) throw new Error("Thread ID missing from response.");

      await request({ method: "POST", url: `/chat-threads/${threadId}/participants`, headers, data: { user_id: recipientId, role: "member" } });
      setOk("Chat thread created successfully.");
      setNewChatTitle("");
      await loadThreads(1);
      setSelectedThreadId(threadId);
      await loadParticipants(threadId);
      await loadMessages(threadId, 1);
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to create chat thread.");
    } finally {
      setCreatingThread(false);
    }
  };

  const sendMessage = async () => {
    if (!headers || !selectedThreadId) return;
    const body = newMessage.trim();
    if (!body) return;
    setSendingMessage(true);
    setError(null);
    try {
      await request({ method: "POST", url: `/chat-threads/${selectedThreadId}/messages`, headers, data: { body } });
      setNewMessage("");
      await loadMessages(selectedThreadId, messagePagination.current_page);
      await loadUnreadCount();
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const archiveThread = async (threadId: number) => {
    if (!headers) return;
    setBusyId(threadId);
    setError(null);
    try {
      await request({ method: "POST", url: `/chat-threads/${threadId}/archive`, headers, data: {} });
      setOk("Chat thread archived successfully.");
      await loadThreads(threadPagination.current_page);
      await loadUnreadCount();
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to archive chat thread.");
    } finally {
      setBusyId(null);
    }
  };

  const markRead = async (messageId: number) => {
    if (!headers) return;
    setBusyId(messageId);
    try {
      await request({ method: "POST", url: `/chat-messages/${messageId}/read`, headers, data: {} });
      setOk("Message marked as read.");
      await loadUnreadCount();
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to mark message as read.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!headers) return;
    if (!window.confirm("Delete this message?")) return;
    setBusyId(messageId);
    try {
      await request({ method: "DELETE", url: `/chat-messages/${messageId}`, headers });
      setOk("Message deleted successfully.");
      if (selectedThreadId) await loadMessages(selectedThreadId, messagePagination.current_page);
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to delete message.");
    } finally {
      setBusyId(null);
    }
  };

  const removeParticipant = async (threadId: number, userId: number) => {
    if (!headers) return;
    if (!window.confirm("Remove this participant?")) return;
    setBusyId(userId);
    try {
      await request({ method: "DELETE", url: `/chat-threads/${threadId}/participants/${userId}`, headers });
      setOk("Participant removed successfully.");
      await loadParticipants(threadId);
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to remove participant.");
    } finally {
      setBusyId(null);
    }
  };

  const visibleContacts = React.useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q));
  }, [contactSearch, contacts]);

  return (
    <div className="min-h-screen bg-(--background) p-4 text-(--foreground) md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-black tracking-tight">{viewerRole === "student" ? "Student Chatting" : "Instructor Chatting"}</h1>
            <p className="mt-1 text-sm opacity-60">Modern real-time style workspace for threads and messages.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 dark:border-white/15 dark:bg-white/5">
            <CheckCheck className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wide">Unread: {unreadCount}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              liveStatus === "connected"
                ? "bg-emerald-500/15 text-emerald-700"
                : liveStatus === "connecting"
                  ? "bg-amber-500/15 text-amber-700"
                  : "bg-slate-500/15 text-slate-600 dark:text-slate-300"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                liveStatus === "connected"
                  ? "bg-emerald-500"
                  : liveStatus === "connecting"
                    ? "bg-amber-500"
                    : "bg-slate-400"
              }`} />
              {liveStatus}
            </span>
            <button onClick={() => void loadUnreadCount()} className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-white/10" title="Refresh unread">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {(error || ok) && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>
            <AlertCircle className="h-4 w-4" />
            <span>{error ?? ok}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
          <section className="space-y-4 rounded-3xl border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="rounded-2xl border border-indigo-200/70 bg-linear-to-br from-indigo-50 via-cyan-50 to-white p-3 dark:border-indigo-500/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
              <h2 className="mb-2 text-lg font-black">Create Chat</h2>
              <div className="space-y-2">
                <input value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} placeholder="Chat title" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5" />
                <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder={`Search ${viewerRole === "student" ? "instructors" : "students"}...`} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5" />
                <select value={newRecipientId} onChange={(e) => setNewRecipientId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-slate-900 dark:text-slate-100">
                  <option value="">{viewerRole === "student" ? "Choose instructor" : "Choose student"}</option>
                  {visibleContacts.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <button onClick={() => void createThread()} disabled={creatingThread} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
                  {creatingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider opacity-70">Threads</h3>
              <button onClick={() => void loadThreads(threadPagination.current_page)} className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10" title="Refresh threads"><RefreshCw className="h-4 w-4" /></button>
            </div>

            <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {loadingThreads ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : threads.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm opacity-60 dark:border-white/20">No chat threads yet.</div> : (
                threads.map((thread) => (
                  <button key={thread.id} onClick={() => setSelectedThreadId(thread.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedThreadId === thread.id ? "border-indigo-400 bg-indigo-50 dark:border-indigo-400/60 dark:bg-indigo-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-black">{thread.title}</p>
                      {thread.is_archived ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">Archived</span> : null}
                    </div>
                    <p className="text-[11px] opacity-60">Thread #{thread.id}</p>
                    <p className="mt-1 text-[11px] opacity-50">Updated {fmt(thread.updated_at)}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            {!selectedThread ? <div className="flex min-h-[60vh] flex-col items-center justify-center text-center opacity-65"><MessageSquare className="mb-2 h-8 w-8" /><p className="text-lg font-bold">Select a thread to start chatting.</p></div> : (
              <div className="flex min-h-[70vh] flex-col">
                <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-black">{selectedThread.title}</h2>
                      <p className="text-xs opacity-60">Thread #{selectedThread.id} • Updated {fmt(selectedThread.updated_at)}</p>
                    </div>
                    <button onClick={() => void archiveThread(selectedThread.id)} disabled={busyId === selectedThread.id || selectedThread.is_archived === 1} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                      {busyId === selectedThread.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}Archive
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Users className="h-4 w-4 opacity-70" />
                    {participants.length === 0 ? <span className="text-xs opacity-60">No participants loaded.</span> : participants.map((p) => (
                      <span key={p.user_id} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] dark:border-white/15 dark:bg-white/5">
                        <span>{contactById.get(p.user_id)?.name ?? `User #${p.user_id}`}</span>
                        <span className="opacity-50">({p.role})</span>
                        {p.user_id !== myId ? (
                          <button onClick={() => void removeParticipant(selectedThread.id, p.user_id)} disabled={busyId === p.user_id} className="rounded p-0.5 text-rose-600 hover:bg-rose-50" title="Remove participant">
                            {busyId === p.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-950/40">
                  {loadingMessages ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : messages.length === 0 ? <div className="py-10 text-center text-sm opacity-60">No messages in this chat.</div> : (
                    messages.map((message) => {
                      const mine = myId > 0 && message.author_id === myId;
                      return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-indigo-600 text-white" : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"}`}>
                            <p className="whitespace-pre-wrap">{message.body}</p>
                            <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${mine ? "text-indigo-100" : "opacity-60"}`}>
                              <span>#{message.id} • {fmt(message.updated_at || message.created_at)}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => void markRead(message.id)} disabled={busyId === message.id} className={`rounded px-1 py-0.5 ${mine ? "hover:bg-indigo-500" : "hover:bg-slate-100 dark:hover:bg-white/10"}`} title="Mark read">
                                  {busyId === message.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                                </button>
                                <button onClick={() => void deleteMessage(message.id)} disabled={busyId === message.id} className={`rounded px-1 py-0.5 ${mine ? "hover:bg-indigo-500" : "hover:bg-slate-100 dark:hover:bg-white/10"}`} title="Delete message"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-3 flex items-end gap-2">
                  <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="min-h-[56px] w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-white/5" />
                  <button onClick={() => void sendMessage()} disabled={sendingMessage} className="inline-flex h-[56px] items-center justify-center rounded-2xl bg-indigo-600 px-4 text-white hover:bg-indigo-500 disabled:opacity-60" title="Send">
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] opacity-70">
                  <span>Total messages: {messagePagination.total}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => selectedThreadId && void loadMessages(selectedThreadId, Math.max(1, messagePagination.current_page - 1))} disabled={messagePagination.current_page <= 1 || loadingMessages} className="rounded-md border border-slate-300 px-2 py-0.5 disabled:opacity-50 dark:border-white/20">Prev</button>
                    <span>Page {messagePagination.current_page}/{messagePagination.total_pages}</span>
                    <button onClick={() => selectedThreadId && void loadMessages(selectedThreadId, Math.min(messagePagination.total_pages, messagePagination.current_page + 1))} disabled={messagePagination.current_page >= messagePagination.total_pages || loadingMessages} className="rounded-md border border-slate-300 px-2 py-0.5 disabled:opacity-50 dark:border-white/20">Next</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
