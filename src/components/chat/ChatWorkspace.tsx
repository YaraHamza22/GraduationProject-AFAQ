"use client";

import React from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCheck,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  PanelsTopLeft,
} from "lucide-react";
import { getStudentApiEndpoint, getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type ViewerRole = "student" | "instructor";
type Pagination = { total: number; count: number; per_page: number; current_page: number; total_pages: number };
type Thread = { id: number; title: string; course_id: number | null; created_by: number | null; is_archived: number; updated_at?: string };
type Message = { id: number; chat_thread_id: number; author_id: number | null; body: string; created_at?: string; updated_at?: string };
type Participant = { user_id: number; role: string };
type ContactProfile = { specialization?: string; bio?: string; years_of_experience?: number };
type Contact = { id: number; name: string; email?: string; gender?: string; avatar_url?: string; profile?: ContactProfile };
type ContactCandidate = { path: string; params?: Record<string, string | number | boolean | null | undefined> };

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
const defaultMsgPag: Pagination = { total: 0, count: 0, per_page: 15, current_page: 1, total_pages: 1 };

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
    if (Array.isArray(nested.students)) return nested.students;
    if (Array.isArray(nested.users)) return nested.users;
    if (Array.isArray(nested.results)) return nested.results;
  }

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.students)) return payload.students;
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
      author_id: entry.author_id == null ? (entry.sender_id == null ? null : num(entry.sender_id)) : num(entry.author_id),
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
    const base =
      (isObj(entry.user) ? entry.user : null) ??
      (isObj(entry.student) ? entry.student : null) ??
      (isObj(entry.instructor) ? entry.instructor : null) ??
      entry;
    const id = num(
      base.id ||
      base.user_id ||
      base.student_id ||
      base.instructor_id ||
      entry.id ||
      entry.user_id ||
      entry.student_id ||
      entry.instructor_id
    );
    if (!id) continue;
    const name =
      str(base.name) ||
      str(base.full_name) ||
      str(base.username) ||
      str(entry.name) ||
      `User #${id}`;
    const email = str(base.email) || str(entry.email);
    const profileSource =
      (isObj(base.profile) ? base.profile : null) ??
      (isObj(entry.profile) ? entry.profile : null);
    const profile = profileSource
      ? {
          specialization: str(profileSource.specialization) || undefined,
          bio: str(profileSource.bio) || undefined,
          years_of_experience: profileSource.years_of_experience == null ? undefined : num(profileSource.years_of_experience),
        }
      : undefined;
    rows.push({
      id,
      name,
      email: email || undefined,
      gender: str(base.gender) || str(entry.gender) || undefined,
      avatar_url: str(base.avatar_url) || str(entry.avatar_url) || undefined,
      profile,
    });
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

function isLocalProxy404(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 404) return false;

  const requestedUrl = String(error.config?.url ?? "");
  return requestedUrl.startsWith("/api/") || requestedUrl.includes("localhost:3000/api/");
}

async function request(config: Parameters<typeof axios.request>[0]) {
  const path = String(config.url ?? "");
  try {
    return await axios.request({ ...config, url: getStudentApiRequestUrl(path) });
  } catch (error) {
    if (!isHtml404(error) && !isLocalProxy404(error)) throw error;
    return axios.request({ ...config, url: getStudentApiEndpoint(path) });
  }
}

export default function ChatWorkspace({ viewerRole }: ChatWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = React.useMemo(() => getStudentToken(), []);
  const me = React.useMemo(() => getStoredStudentUser(), []);
  const myId = React.useMemo(() => num(me?.id, 0), [me?.id]);
  const headers = React.useMemo(() => (token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : null), [token]);
  const requestedThreadId = React.useMemo(() => num(searchParams.get("thread_id")), [searchParams]);
  const requestedStudentId = React.useMemo(() => num(searchParams.get("student_id")), [searchParams]);
  const requestedPanel = React.useMemo(() => str(searchParams.get("panel")).toLowerCase(), [searchParams]);
  const autoOpenHandledRef = React.useRef<string | null>(null);

  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [threadPagination, setThreadPagination] = React.useState<Pagination>(defaultPag);
  const [selectedThreadId, setSelectedThreadId] = React.useState<number | null>(null);
  const [activeThread, setActiveThread] = React.useState<Thread | null>(null);
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
  const [requestedThreadForbidden, setRequestedThreadForbidden] = React.useState(false);

  const contactById = React.useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const selectedThread = React.useMemo(() => {
    const listedThread = threads.find((x) => x.id === selectedThreadId) ?? null;
    if (listedThread) return listedThread;
    if (activeThread && activeThread.id === selectedThreadId) return activeThread;
    return activeThread;
  }, [activeThread, selectedThreadId, threads]);
  const selectedContact = React.useMemo(() => {
    const id = num(newRecipientId);
    return id ? contactById.get(id) ?? null : null;
  }, [contactById, newRecipientId]);

  const clearChatSearch = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("thread_id");
    params.delete("student_id");
    const next = params.toString();
    router.replace(next ? `?${next}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  const contactCandidates = React.useMemo<ContactCandidate[]>(() => {
    if (viewerRole === "student") {
      return [
        { path: "/student/instructors" },
      ];
    }
    return [
      { path: "/instructor/students" },
    ];
  }, [viewerRole]);

  const loadUnreadCount = React.useCallback(async () => {
    if (viewerRole === "instructor") {
      setUnreadCount(0);
      return;
    }
    if (!headers) return;
    try {
      const res = await request({ method: "GET", url: "/chat-threads/unread-count", headers });
      const payload = isObj(res.data) ? res.data : {};
      const value = isObj(payload.data) ? payload.data.unread_count : payload.unread_count;
      setUnreadCount(Math.max(0, num(value)));
    } catch {
      setUnreadCount(0);
    }
  }, [headers, viewerRole]);

  const loadThreads = React.useCallback(async (page = 1) => {
    if (viewerRole === "instructor") {
      setLoadingThreads(false);
      setThreads([]);
      setThreadPagination(defaultPag);
      return;
    }
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
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setThreads([]);
        setThreadPagination(defaultPag);
        setSelectedThreadId(null);
        setMessages([]);
        setParticipants([]);
        return;
      }
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Failed to load chat threads.");
    } finally {
      setLoadingThreads(false);
    }
  }, [headers, threadPagination.per_page, viewerRole]);

  const loadParticipants = React.useCallback(async (threadId: number) => {
    if (!headers) return;
    try {
      const res = await request({ method: "GET", url: `/chat-threads/${threadId}/participants`, headers });
      setParticipants(parseParticipants(res.data));
      if (threadId === requestedThreadId) {
        setRequestedThreadForbidden(false);
      }
    } catch (error) {
      setParticipants([]);
      if (threadId === requestedThreadId && axios.isAxiosError(error) && error.response?.status === 403) {
        setRequestedThreadForbidden(true);
        autoOpenHandledRef.current = null;
      }
    }
  }, [headers, requestedThreadId]);

  const loadMessages = React.useCallback(async (threadId: number, page = 1) => {
    if (!headers) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await request({ method: "GET", url: `/chat-threads/${threadId}/messages`, headers, params: { page, per_page: messagePagination.per_page } });
      const parsed = parseMessages(res.data);
      setMessages(parsed.rows);
      setMessagePagination(parsed.pagination);
      setActiveThread((prev) => {
        if (prev?.id === threadId) {
          return {
            ...prev,
            updated_at: parsed.rows.at(-1)?.updated_at ?? parsed.rows.at(-1)?.created_at ?? prev.updated_at,
          };
        }
        return prev;
      });
      if (threadId === requestedThreadId) {
        setRequestedThreadForbidden(false);
      }
    } catch (e) {
      if (threadId === requestedThreadId && axios.isAxiosError(e) && e.response?.status === 403) {
        setRequestedThreadForbidden(true);
        autoOpenHandledRef.current = null;
        setMessages([]);
        setMessagePagination(defaultMsgPag);
        return;
      }
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, [headers, messagePagination.per_page, requestedThreadId]);

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

        if (candidate.path === "/student/instructors" || candidate.path === "/instructor/students") {
          setContacts([]);
          setNewRecipientId("");
          return;
        }
      } catch {
        // try next source
      }
    }
    setContacts([]);
    setNewRecipientId("");
  }, [contactCandidates, headers]);

  const loadStudentInstructorProfile = React.useCallback(async (contactId: number) => {
    if (!headers || viewerRole !== "student" || !contactId) return;
    if (contactById.get(contactId)?.profile?.specialization || contactById.get(contactId)?.profile?.bio || contactById.get(contactId)?.profile?.years_of_experience != null) {
      return;
    }

    try {
      const res = await request({ method: "GET", url: `/student/instructors/${contactId}`, headers });
      const details = parseContacts(res.data)[0];
      if (!details) return;
      setContacts((prev) => prev.map((contact) => (contact.id === contactId ? { ...contact, ...details } : contact)));
    } catch {
      // Keep the list result if the details endpoint is unavailable.
    }
  }, [contactById, headers, viewerRole]);

  const findThreadByParticipant = React.useCallback(
    async (targetUserId: number) => {
      if (!headers || !targetUserId) return null;

      const directMatch = threads.find((thread) =>
        participants.some((participant) => participant.user_id === targetUserId && thread.id === selectedThreadId)
      );
      if (directMatch) return directMatch.id;

      for (const thread of threads) {
        try {
          const res = await request({ method: "GET", url: `/chat-threads/${thread.id}/participants`, headers });
          const rows = parseParticipants(res.data);
          if (rows.some((participant) => participant.user_id === targetUserId)) {
            return thread.id;
          }
        } catch {
          // Keep scanning other threads.
        }
      }

      return null;
    },
    [headers, participants, selectedThreadId, threads]
  );

  const openOrCreateDirectThread = React.useCallback(
    async (targetUserId: number) => {
      if (!headers || !targetUserId) return null;

      const existingThreadId = viewerRole === "student" && threads.length > 0 ? await findThreadByParticipant(targetUserId) : null;
      if (existingThreadId) return existingThreadId;

      const contact = contactById.get(targetUserId);
      const fallbackLabel = viewerRole === "instructor" ? "Student" : "Instructor";
      const title = `Chat with ${contact?.name ?? `${fallbackLabel} #${targetUserId}`}`;

      const res = await request({
        method: "POST",
        url: "/chat-threads",
        headers,
        data: {
          title,
          course_id: null,
          participant_ids: [targetUserId],
        },
      });

      const createdEnvelope = isObj(res.data) && isObj(res.data.data) ? res.data.data : {};
      const created = isObj(createdEnvelope.data) ? createdEnvelope.data : createdEnvelope;
      const createdThreadId = num(created.id);
      return createdThreadId || null;
    },
    [contactById, findThreadByParticipant, headers, threads.length, viewerRole]
  );

  React.useEffect(() => {
    void loadContacts();
    if (viewerRole === "student") {
      void loadThreads(1);
      void loadUnreadCount();
      return;
    }
    setLoadingThreads(false);
  }, [loadContacts, loadThreads, loadUnreadCount, viewerRole]);

  React.useEffect(() => {
    if (!selectedThreadId) return;
    if (viewerRole === "student") {
      void loadParticipants(selectedThreadId);
    } else {
      setParticipants([]);
    }
    void loadMessages(selectedThreadId, 1);
  }, [loadMessages, loadParticipants, selectedThreadId, viewerRole]);

  React.useEffect(() => {
    if (viewerRole !== "student") return;
    const contactId = num(newRecipientId);
    if (!contactId) return;
    void loadStudentInstructorProfile(contactId);
  }, [loadStudentInstructorProfile, newRecipientId, viewerRole]);

  React.useEffect(() => {
    if (!headers) return;

    const key =
      requestedThreadId > 0
        ? `thread:${requestedThreadId}`
        : requestedStudentId > 0
          ? `student:${requestedStudentId}`
          : null;

    if (!key || autoOpenHandledRef.current === key) return;
    if (loadingThreads) return;
    if (requestedStudentId > 0 && contacts.length === 0) return;

    let cancelled = false;

    const openRequestedChat = async () => {
      try {
        autoOpenHandledRef.current = key;

        if (requestedThreadId > 0) {
          if (requestedThreadForbidden && requestedStudentId > 0) {
            if (viewerRole === "instructor") {
              if (!cancelled) {
                setNewRecipientId(String(requestedStudentId));
                setSelectedThreadId(requestedThreadId);
                setActiveThread({
                  id: requestedThreadId,
                  title: `Chat with ${contactById.get(requestedStudentId)?.name ?? `Student #${requestedStudentId}`}`,
                  course_id: null,
                  created_by: null,
                  is_archived: 0,
                });
                setRequestedThreadForbidden(false);
                clearChatSearch();
              }
              return;
            }
            const recoveredThreadId = await openOrCreateDirectThread(requestedStudentId);
            if (!recoveredThreadId || cancelled) {
              autoOpenHandledRef.current = null;
              return;
            }

            try {
              await loadThreads(1);
              if (cancelled) return;
            } catch {
              // Some instructor accounts cannot list all threads. Opening the direct thread is enough.
            }
            setSelectedThreadId(recoveredThreadId);
            setNewRecipientId(String(requestedStudentId));
            setRequestedThreadForbidden(false);
            clearChatSearch();
            return;
          }

          if (!cancelled) {
            setSelectedThreadId(requestedThreadId);
            setActiveThread((prev) => prev ?? {
              id: requestedThreadId,
              title: requestedStudentId > 0 ? `Chat with ${contactById.get(requestedStudentId)?.name ?? `Student #${requestedStudentId}`}` : `Chat #${requestedThreadId}`,
              course_id: null,
              created_by: null,
              is_archived: 0,
            });
            if (!requestedStudentId) {
              clearChatSearch();
            }
          }
          return;
        }

        if (requestedStudentId > 0) {
          if (viewerRole === "instructor") {
            if (!cancelled) {
              setNewRecipientId(String(requestedStudentId));
              if (requestedThreadId > 0) {
                setSelectedThreadId(requestedThreadId);
                setActiveThread({
                  id: requestedThreadId,
                  title: `Chat with ${contactById.get(requestedStudentId)?.name ?? `Student #${requestedStudentId}`}`,
                  course_id: null,
                  created_by: null,
                  is_archived: 0,
                });
                void loadMessages(requestedThreadId, 1);
              }
              clearChatSearch();
            }
            return;
          }
          const threadId = await openOrCreateDirectThread(requestedStudentId);
          if (!threadId || cancelled) {
            autoOpenHandledRef.current = null;
            return;
          }

          try {
            await loadThreads(1);
            if (cancelled) return;
          } catch {
            // Some instructor accounts cannot list all threads. Opening the direct thread is enough.
          }
          setSelectedThreadId(threadId);
          setActiveThread({
            id: threadId,
            title: `Chat with ${contactById.get(requestedStudentId)?.name ?? `Student #${requestedStudentId}`}`,
            course_id: null,
            created_by: null,
            is_archived: 0,
          });
          setNewRecipientId(String(requestedStudentId));
          clearChatSearch();
        }
      } catch (error) {
        autoOpenHandledRef.current = null;
        if (cancelled) return;
        setError(
          axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
            ? error.response.data.message
            : "Unable to open the requested chat."
        );
      }
    };

    void openRequestedChat();

    return () => {
      cancelled = true;
    };
  }, [
    clearChatSearch,
    contacts.length,
    headers,
    loadThreads,
    loadingThreads,
    openOrCreateDirectThread,
    contactById,
    loadMessages,
    requestedThreadForbidden,
    requestedStudentId,
    requestedThreadId,
    viewerRole,
  ]);

  const refreshFromRealtime = React.useCallback(async () => {
    if (viewerRole === "student") {
      await loadUnreadCount();
      await loadThreads(threadPagination.current_page);
    }
    if (selectedThreadId) {
      if (viewerRole === "student") {
        await Promise.all([
          loadParticipants(selectedThreadId),
          loadMessages(selectedThreadId, messagePagination.current_page),
        ]);
      } else {
        await loadMessages(selectedThreadId, messagePagination.current_page);
      }
    }
  }, [
    loadMessages,
    loadParticipants,
    loadThreads,
    loadUnreadCount,
    messagePagination.current_page,
    selectedThreadId,
    threadPagination.current_page,
    viewerRole,
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
    if (!headers || viewerRole === "instructor") return;
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
      void loadThreads(threadPagination.current_page);
    }, 45000);
    return () => window.clearInterval(intervalId);
  }, [headers, loadThreads, loadUnreadCount, threadPagination.current_page, viewerRole]);

  const openSelectedContactChat = async () => {
    if (!headers) return setError("Missing auth token. Please login again.");
    const recipientId = num(newRecipientId);
    if (!recipientId) return setError(`Select a ${viewerRole === "student" ? "teacher" : "student"} first.`);

    setCreatingThread(true);
    setError(null);
    setOk(null);
    try {
      const threadId = await openOrCreateDirectThread(recipientId);
      if (!threadId) throw new Error("Thread ID missing from response.");
      const contact = contactById.get(recipientId);
      setSelectedThreadId(threadId);
      setActiveThread({
        id: threadId,
        title: newChatTitle.trim() || `Chat with ${contact?.name ?? (viewerRole === "instructor" ? `Student #${recipientId}` : `Instructor #${recipientId}`)}`,
        course_id: null,
        created_by: myId || null,
        is_archived: 0,
      });
      setNewChatTitle("");
      if (viewerRole === "student") {
        await loadThreads(1);
        await loadParticipants(threadId);
      }
      await loadMessages(threadId, 1);
      setOk(`${viewerRole === "instructor" ? "Student" : "Instructor"} chat is ready.`);
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "Unable to open direct chat.");
    } finally {
      setCreatingThread(false);
    }
  };

  const openInstructorContactChat = async (contactId: number) => {
    if (viewerRole !== "instructor") return;
    setNewRecipientId(String(contactId));
    setError(null);
    setOk(null);

    const fallbackThreadId = requestedThreadId || selectedThreadId;
    const contact = contactById.get(contactId);

    if (!fallbackThreadId) {
      setSelectedThreadId(null);
      setActiveThread(null);
      setError("Open the instructor chat from a student message notification so the existing chat thread can be loaded.");
      return;
    }

    setSelectedThreadId(fallbackThreadId);
    setActiveThread({
      id: fallbackThreadId,
      title: `Chat with ${contact?.name ?? `Student #${contactId}`}`,
      course_id: null,
      created_by: myId || null,
      is_archived: 0,
    });
    void loadMessages(fallbackThreadId, 1);
  };

  const createThread = async () => {
    if (!headers) return setError("Missing auth token. Please login again.");
    if (viewerRole === "instructor") {
      await openSelectedContactChat();
      return;
    }
    const title = newChatTitle.trim();
    const recipientId = num(newRecipientId);
    if (!title) return setError("Thread title is required.");
    if (!recipientId) return setError(`Select a ${viewerRole === "student" ? "teacher" : "student"} first.`);

    setCreatingThread(true);
    setError(null);
    setOk(null);
    try {
      const createRes = await request({
        method: "POST",
        url: "/chat-threads",
        headers,
        data: {
          title,
          course_id: null,
          participant_ids: [recipientId],
        },
      });
      const createdEnvelope = isObj(createRes.data) && isObj(createRes.data.data) ? createRes.data.data : {};
      const created = isObj(createdEnvelope.data) ? createdEnvelope.data : createdEnvelope;
      const threadId = num(created.id);
      if (!threadId) throw new Error("Thread ID missing from response.");
      setOk("Chat thread created successfully.");
      setNewChatTitle("");
      await loadThreads(1);
      setSelectedThreadId(threadId);
      setActiveThread({
        id: threadId,
        title: str(created.title, title),
        course_id: created.course_id == null ? null : num(created.course_id),
        created_by: created.created_by == null ? myId || null : num(created.created_by),
        is_archived: num(created.is_archived),
        updated_at: str(created.updated_at) || undefined,
      });
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

  const panelInfo = React.useMemo(() => {
    if (viewerRole === "instructor") {
      if (requestedPanel === "read") {
        return {
          title: "Read",
          description: "Review instructor-student messages and mark items as read after checking them.",
        };
      }

      if (requestedPanel === "delete") {
        return {
          title: "Delete",
          description: "Remove messages when a thread needs quick cleanup or moderation.",
        };
      }

      if (requestedPanel === "send") {
        return {
          title: "Send",
          description: "Pick a student and send direct messages without depending on the blocked thread list.",
        };
      }

      return {
        title: "Messages",
        description: "Choose a student, open the direct chat, then list, send, read, and delete messages from one workspace.",
      };
    }

    if (requestedPanel === "messages") {
      return {
        title: "Messages",
        description: "Open a thread to read and reply to conversation messages.",
      };
    }

    if (requestedPanel === "create") {
      return {
        title: "New Chat",
        description: "Choose a student and start a direct instructor-student conversation.",
      };
    }

    return {
      title: "Threads",
      description: "Browse direct chat threads and jump into the student conversation you need.",
    };
  }, [requestedPanel, viewerRole]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,1))] p-4 text-(--foreground) md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 grid gap-4 xl:grid-cols-[1.5fr_auto]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.4)] backdrop-blur-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">
              <PanelsTopLeft className="h-3.5 w-3.5" />
              {panelInfo.title}
            </div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-white md:text-5xl">
              {viewerRole === "student" ? "Student Chatting" : "Instructor Chatting"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              A polished direct-messaging workspace for threads, replies, and quick student follow-up without losing context.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Workspace</p>
                <p className="mt-1 text-sm font-semibold text-white">{panelInfo.title}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contacts</p>
                <p className="mt-1 text-sm font-semibold text-white">{contacts.length} available</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Status</p>
                <p className="mt-1 text-sm font-semibold capitalize text-white">{liveStatus}</p>
              </div>
            </div>
          </div>
          <div className="inline-flex h-fit items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            <CheckCheck className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-200">
              {viewerRole === "instructor" ? "Direct Student Messaging" : `Unread: ${unreadCount}`}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              liveStatus === "connected"
                ? "bg-emerald-500/15 text-emerald-300"
                : liveStatus === "connecting"
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-slate-500/15 text-slate-300"
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
            <button onClick={() => void (viewerRole === "instructor" ? refreshFromRealtime() : loadUnreadCount())} className="rounded-md p-1 text-slate-300 hover:bg-white/10" title="Refresh workspace">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-3 shadow-[0_20px_50px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
            <PanelsTopLeft className="h-3.5 w-3.5" />
            Chat APIs
          </span>
          {viewerRole === "instructor" ? (
            <>
              <button
                type="button"
                onClick={() => router.push("/instructor/chat?panel=messages")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  requestedPanel === "messages" || !requestedPanel
                    ? "bg-white text-slate-900 shadow-sm"
                    : "border border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                List Messages
              </button>
              <button
                type="button"
                onClick={() => router.push("/instructor/chat?panel=send")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  requestedPanel === "send"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "border border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                Send Message
              </button>
              <button
                type="button"
                onClick={() => router.push("/instructor/chat?panel=read")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  requestedPanel === "read"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "border border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                Mark Read
              </button>
              <button
                type="button"
                onClick={() => router.push("/instructor/chat?panel=delete")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  requestedPanel === "delete"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "border border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                Delete Message
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/instructor/chat?panel=threads")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  requestedPanel === "threads" || !requestedPanel
                    ? "bg-white text-slate-900 shadow-sm"
                    : "border border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                Threads
              </button>
              <button
                type="button"
                onClick={() => router.push("/instructor/chat?panel=messages")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  requestedPanel === "messages"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "border border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                Messages
              </button>
              <button
                type="button"
                onClick={() => router.push("/instructor/chat?panel=create")}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  requestedPanel === "create"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "border border-white/10 bg-transparent text-slate-300 hover:bg-white/5"
                }`}
              >
                New Chat
              </button>
            </>
          )}
          <span className="ml-auto max-w-xl text-xs leading-5 text-slate-400">{panelInfo.description}</span>
        </div>

        {(error || ok) && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>
            <AlertCircle className="h-4 w-4" />
            <span>{error ?? ok}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
          <section className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              <div className="rounded-[1.6rem] border border-indigo-300/15 bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(34,211,238,0.08),rgba(255,255,255,0.03))] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Direct Chat</p>
                    <h2 className="mt-1 text-xl font-black text-white">{viewerRole === "instructor" ? "Chats" : "Create Conversation"}</h2>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Mode</p>
                    <p className="mt-1 text-sm font-semibold text-white">{panelInfo.title}</p>
                  </div>
                </div>
              <div className="space-y-2">
                {viewerRole === "student" ? (
                  <input value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} placeholder="Chat title" className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none" />
                ) : null}
                <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder={`Search ${viewerRole === "student" ? "instructors" : "students"}...`} className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none" />
                <select value={newRecipientId} onChange={(e) => {
                  const value = e.target.value;
                  setNewRecipientId(value);
                  if (viewerRole === "instructor" && num(value)) {
                    void openInstructorContactChat(num(value));
                  }
                }} className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white focus:border-cyan-400/50 focus:outline-none">
                  <option value="">{viewerRole === "student" ? "Choose instructor" : "Choose student"}</option>
                  {visibleContacts.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                {selectedContact ? (
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900 dark:text-slate-100">{selectedContact.name}</p>
                        <p className="text-xs opacity-60">
                          {selectedContact.profile?.specialization || (viewerRole === "student" ? "Instructor" : "Student")}
                          {selectedContact.profile?.years_of_experience != null ? ` • ${selectedContact.profile.years_of_experience} years experience` : ""}
                        </p>
                      </div>
                      {selectedContact.gender ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {selectedContact.gender}
                        </span>
                      ) : null}
                    </div>
                    {selectedContact.profile?.bio ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed opacity-70">{selectedContact.profile.bio}</p>
                    ) : null}
                    {selectedContact.email ? <p className="mt-2 text-xs font-medium opacity-70">{selectedContact.email}</p> : null}
                  </div>
                ) : null}
                <button onClick={() => void createThread()} disabled={creatingThread} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 px-4 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(79,70,229,0.35)] transition hover:scale-[1.01] disabled:opacity-60">
                  {creatingThread ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{viewerRole === "instructor" ? "Start chat" : "Create"}
                </button>
              </div>
            </div>

            {viewerRole === "student" ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider opacity-70">Threads</h3>
                  <button onClick={() => void loadThreads(threadPagination.current_page)} className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-100 dark:border-white/20 dark:hover:bg-white/10" title="Refresh threads"><RefreshCw className="h-4 w-4" /></button>
                </div>

                <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                  {loadingThreads ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : threads.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm opacity-60 dark:border-white/20">No chat threads yet.</div> : (
                    threads.map((thread) => (
                      <button key={thread.id} onClick={() => {
                        setError(null);
                        setSelectedThreadId(thread.id);
                        setActiveThread(thread);
                      }} className={`w-full rounded-2xl border p-3 text-left transition ${selectedThreadId === thread.id ? "border-indigo-400 bg-indigo-50 dark:border-indigo-400/60 dark:bg-indigo-500/10" : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"}`}>
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
              </>
            ) : (
              <div className="overflow-hidden rounded-[1.8rem] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(30,41,59,0.72))] shadow-[0_24px_60px_rgba(15,23,42,0.35)]">
                <div className="border-b border-white/10 px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200/85">Student Directory</h3>
                      <p className="mt-1 text-xs text-slate-400">Select a student to load the direct message workspace.</p>
                    </div>
                    <button onClick={() => void loadContacts()} className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10" title="Refresh students"><RefreshCw className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Available</p>
                      <p className="mt-1 text-lg font-black text-white">{contacts.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Selected</p>
                      <p className="mt-1 text-sm font-black text-white">{selectedContact?.name ?? "None"}</p>
                    </div>
                  </div>
                </div>
                <div className="max-h-[32rem] space-y-2 overflow-y-auto p-4">
                  {visibleContacts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">No students available yet.</div> : (
                    visibleContacts.slice(0, 10).map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => void openInstructorContactChat(contact.id)}
                        className={`w-full rounded-[1.4rem] border px-4 py-3 text-left transition ${
                          num(newRecipientId) === contact.id
                            ? "border-cyan-400/60 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(99,102,241,0.14))] shadow-[0_14px_28px_rgba(14,165,233,0.12)]"
                            : "border-white/10 bg-slate-950/35 hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-white">{contact.name}</p>
                            <p className="mt-1 text-xs text-slate-400">{contact.email ?? `Student #${contact.id}`}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                            num(newRecipientId) === contact.id ? "bg-cyan-300/15 text-cyan-200" : "bg-white/5 text-slate-400"
                          }`}>
                            {num(newRecipientId) === contact.id ? "Selected" : "Open"}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          <section className={`rounded-[2.2rem] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl ${
            viewerRole === "instructor"
              ? "border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
              : "border border-slate-300 bg-white dark:border-white/10 dark:bg-slate-900/40"
          }`}>
            {!selectedThread ? <div className={`flex min-h-[60vh] flex-col items-center justify-center text-center ${viewerRole === "instructor" ? "rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-8" : "opacity-65"}`}><MessageSquare className={`mb-3 ${viewerRole === "instructor" ? "h-12 w-12 text-cyan-200" : "h-8 w-8"}`} /><p className={`font-black ${viewerRole === "instructor" ? "text-3xl tracking-[-0.03em] text-white" : "text-lg"}`}>{viewerRole === "instructor" ? "Choose a student to open the direct chat." : "Select a thread to start chatting."}</p>{viewerRole === "instructor" ? <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Use the student directory on the left to open a polished instructor-student conversation powered only by your working message APIs.</p> : null}</div> : (
              <div className="flex min-h-[70vh] flex-col">
                <div className={`mb-3 p-4 ${viewerRole === "instructor" ? "rounded-[1.8rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]" : "rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className={`font-black ${viewerRole === "instructor" ? "text-2xl tracking-[-0.03em] text-white" : "text-lg"}`}>{viewerRole === "instructor" ? (selectedContact?.name ?? selectedThread.title) : selectedThread.title}</h2>
                      <p className="text-xs opacity-60">Thread #{selectedThread.id} • Updated {fmt(selectedThread.updated_at)}</p>
                    </div>
                    {viewerRole === "student" ? (
                      <button onClick={() => void archiveThread(selectedThread.id)} disabled={busyId === selectedThread.id || selectedThread.is_archived === 1} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                        {busyId === selectedThread.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 rotate-45" />}Archive
                      </button>
                    ) : null}
                  </div>

                  {viewerRole === "student" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  ) : (
                    selectedContact ? <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3"><p className="text-sm font-black text-white">{selectedContact.name}</p><p className="mt-1 text-xs text-slate-400">{selectedContact.email ?? `Student #${selectedContact.id}`}</p></div> : null
                  )}
                </div>

                <div className={`flex-1 overflow-y-auto p-3 ${viewerRole === "instructor" ? "space-y-3 rounded-[1.9rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.06),transparent_25%),linear-gradient(180deg,rgba(2,6,23,0.78),rgba(15,23,42,0.92))]" : "space-y-2 rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40"}`}>
                  {loadingMessages ? <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : messages.length === 0 ? <div className="py-10 text-center text-sm opacity-60">No messages in this chat.</div> : (
                    messages.map((message) => {
                      const mine = myId > 0 && message.author_id === myId;
                      return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[82%] px-4 py-3 text-sm shadow-sm ${viewerRole === "instructor" ? (mine ? "rounded-[1.6rem_1.6rem_0.4rem_1.6rem] bg-[linear-gradient(135deg,#22d3ee,#6366f1)] text-white" : "rounded-[1.6rem_1.6rem_1.6rem_0.4rem] border border-white/10 bg-white/[0.06] text-slate-100") : (mine ? "rounded-2xl bg-indigo-600 text-white" : "rounded-2xl bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100")}`}>
                            {viewerRole === "instructor" ? <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.18em] ${mine ? "text-cyan-50/75" : "text-slate-400"}`}>{mine ? "You" : (selectedContact?.name ?? "Student")}</p> : null}
                            <p className="whitespace-pre-wrap">{message.body}</p>
                            <div className={`mt-2 flex items-center justify-between gap-2 text-[10px] ${viewerRole === "instructor" ? (mine ? "text-cyan-50/75" : "text-slate-500") : (mine ? "text-indigo-100" : "opacity-60")}`}>
                              <span>#{message.id} • {fmt(message.updated_at || message.created_at)}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => void markRead(message.id)} disabled={busyId === message.id} className={`rounded-lg px-2 py-1 ${viewerRole === "instructor" ? (mine ? "bg-white/15 hover:bg-white/20" : "bg-white/[0.06] hover:bg-white/[0.12]") : (mine ? "hover:bg-indigo-500" : "hover:bg-slate-100 dark:hover:bg-white/10")}`} title="Mark read">
                                  {busyId === message.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                                </button>
                                <button onClick={() => void deleteMessage(message.id)} disabled={busyId === message.id} className={`rounded-lg px-2 py-1 ${viewerRole === "instructor" ? (mine ? "bg-rose-500/20 hover:bg-rose-500/30" : "bg-rose-500/10 hover:bg-rose-500/20") : (mine ? "hover:bg-indigo-500" : "hover:bg-slate-100 dark:hover:bg-white/10")}`} title="Delete message"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className={`mt-3 flex items-end gap-2 ${viewerRole === "instructor" ? "rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-3" : ""}`}>
                  <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={viewerRole === "instructor" ? `Message ${selectedContact?.name ?? "student"}...` : "Type a message..."} className={`w-full text-sm ${viewerRole === "instructor" ? "min-h-[76px] rounded-[1.3rem] border border-white/10 bg-slate-950/45 px-4 py-3 text-white placeholder:text-slate-500" : "min-h-[56px] rounded-2xl border border-slate-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"} focus:border-cyan-400/50 focus:outline-none`} />
                  <button onClick={() => void sendMessage()} disabled={sendingMessage} className={`inline-flex items-center justify-center text-white disabled:opacity-60 ${viewerRole === "instructor" ? "h-[76px] min-w-[76px] rounded-[1.3rem] bg-[linear-gradient(180deg,#22d3ee,#6366f1)] shadow-[0_18px_36px_rgba(34,211,238,0.2)]" : "h-[56px] rounded-2xl bg-indigo-600 px-4 hover:bg-indigo-500"}`} title="Send">
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>

                <div className={`mt-2 flex items-center justify-between text-[11px] ${viewerRole === "instructor" ? "text-slate-400" : "opacity-70"}`}>
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
