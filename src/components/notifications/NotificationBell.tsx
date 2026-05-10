"use client";

import React from "react";
import axios from "axios";
import { Bell, CheckCheck, Loader2, RefreshCw } from "lucide-react";

type NotificationBellProps = {
  getRequestUrl: (path: string) => string;
  token: string | null;
  isRTL?: boolean;
};

type NotificationItem = {
  id: string;
  read_at: string | null;
  created_at?: string;
  data?: {
    title?: string;
    body?: string;
    type?: string;
    data?: Record<string, unknown>;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUnreadCount(payload: unknown) {
  if (!isRecord(payload)) return 0;
  const rootData = isRecord(payload.data) ? payload.data : null;
  const raw = rootData?.unread_count ?? payload.unread_count ?? 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function parseNotifications(payload: unknown): NotificationItem[] {
  if (!isRecord(payload)) return [];

  const data = payload.data;
  const list = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.data)
      ? data.data
      : [];

  return list
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const idRaw = entry.id;
      const id = typeof idRaw === "string" || typeof idRaw === "number" ? String(idRaw) : "";
      if (!id) return null;

      const dataBlock = isRecord(entry.data) ? entry.data : null;
      const title = dataBlock && typeof dataBlock.title === "string" ? dataBlock.title : undefined;
      const body = dataBlock && typeof dataBlock.body === "string" ? dataBlock.body : undefined;
      const type = dataBlock && typeof dataBlock.type === "string" ? dataBlock.type : undefined;
      const nested = dataBlock && isRecord(dataBlock.data) ? dataBlock.data : undefined;

      return {
        id,
        read_at: typeof entry.read_at === "string" ? entry.read_at : null,
        created_at: typeof entry.created_at === "string" ? entry.created_at : undefined,
        data: { title, body, type, data: nested },
      } satisfies NotificationItem;
    })
    .filter((row): row is NotificationItem => row !== null);
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function NotificationBell({ getRequestUrl, token, isRTL = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const headers = React.useMemo(() => {
    if (!token) return null;
    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  const getNotificationPaths = React.useCallback((suffix: string) => {
    const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`;
    return [`/v1/notifications${normalized}`, `/notifications${normalized}`];
  }, []);

  const tryGet = React.useCallback(
    async (suffix: string, params?: Record<string, string>) => {
      const paths = getNotificationPaths(suffix);
      let lastError: unknown = null;
      for (const path of paths) {
        try {
          return await axios.get(getRequestUrl(path), { headers, params });
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    },
    [getNotificationPaths, getRequestUrl, headers]
  );

  const tryPost = React.useCallback(
    async (suffix: string, data: Record<string, unknown> = {}) => {
      const paths = getNotificationPaths(suffix);
      let lastError: unknown = null;
      for (const path of paths) {
        try {
          return await axios.post(getRequestUrl(path), data, { headers });
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    },
    [getNotificationPaths, getRequestUrl, headers]
  );

  const fetchUnreadCount = React.useCallback(async () => {
    if (!headers) return;
    try {
      const response = await tryGet("/unread-count");
      setUnreadCount(parseUnreadCount(response.data));
    } catch {
      // Keep existing count on transient failures.
    }
  }, [headers, tryGet]);

  const fetchNotifications = React.useCallback(
    async (unreadOnly = false) => {
      if (!headers) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await tryGet("", { unread_only: unreadOnly ? "true" : "false" });
        setItems(parseNotifications(response.data));
      } catch (error) {
        const apiMessage =
          axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
            ? error.response.data.message
            : "Failed to load notifications.";
        setErrorMessage(apiMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [headers, tryGet]
  );

  const markOneAsRead = React.useCallback(
    async (id: string) => {
      if (!headers) return;
      setIsActionLoading(true);
      try {
        await tryPost(`/${id}/read`);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore and keep stale state.
      } finally {
        setIsActionLoading(false);
      }
    },
    [headers, tryPost]
  );

  const markAllAsRead = React.useCallback(async () => {
    if (!headers) return;
    setIsActionLoading(true);
    try {
      await tryPost("/read-all");
      setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } finally {
      setIsActionLoading(false);
    }
  }, [headers, tryPost]);

  React.useEffect(() => {
    if (!headers) return;
    void fetchUnreadCount();
    const intervalId = window.setInterval(() => {
      void fetchUnreadCount();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [fetchUnreadCount, headers]);

  React.useEffect(() => {
    if (!isOpen) return;
    void fetchUnreadCount();
    void fetchNotifications(false);
  }, [fetchNotifications, fetchUnreadCount, isOpen]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-notification-bell]")) return;
      setIsOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const unreadItemsCount = React.useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  return (
    <div className="relative" data-notification-bell>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-white/10"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-rose-500 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={`absolute bottom-full z-[90] mb-2 w-[20rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-900 ${
            isRTL ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-black">Notifications</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => void fetchNotifications(false)}
                disabled={isLoading || isActionLoading}
                className="rounded-md p-1.5 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10"
                title="Refresh"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => void markAllAsRead()}
                disabled={isActionLoading || unreadItemsCount === 0}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-bold transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
              >
                {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Read all
              </button>
            </div>
          </div>

          {errorMessage ? <p className="mb-2 text-xs text-rose-600 dark:text-rose-300">{errorMessage}</p> : null}

          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {!isLoading && items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs opacity-60 dark:border-white/20">
                No notifications.
              </p>
            ) : null}

            {items.map((item) => {
              const unread = !item.read_at;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (unread) void markOneAsRead(item.id);
                  }}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                    unread
                      ? "border-cyan-300 bg-cyan-50/60 hover:bg-cyan-50 dark:border-cyan-400/40 dark:bg-cyan-500/10"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-xs font-bold">{item.data?.title ?? "Notification"}</p>
                    {unread ? <span className="mt-0.5 h-2 w-2 rounded-full bg-cyan-500" /> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs opacity-70">{item.data?.body ?? "New update available."}</p>
                  <p className="mt-1 text-[10px] opacity-50">{formatDate(item.created_at)}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
