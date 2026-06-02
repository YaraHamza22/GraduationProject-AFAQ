"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Link2, ShieldCheck, Video, X, Zap } from "lucide-react";
import LiveMeeting from "@/features/virtual-meet/components/LiveMeeting";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStoredStudentId, getStoredStudentUser, getStudentToken } from "@/features/student/studentSession";

type ExternalPrompt = {
  href: string;
  provider: "Zoom" | "Google Meet";
};

function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function tryParseUrl(input: string) {
  try {
    return new URL(normalizeUrl(input));
  } catch {
    return null;
  }
}

function getProviderFromUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host.includes("zoom.us")) return "Zoom" as const;
  if (host.includes("meet.google.com")) return "Google Meet" as const;
  return null;
}

function isAfaqUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  return (host === "afaaq.com" || host === "www.afaaq.com" || host === "localhost") && path.startsWith("/live");
}

function extractAfaqRoomId(url: URL) {
  const queryRoom =
    url.searchParams.get("room") ||
    url.searchParams.get("roomId") ||
    url.searchParams.get("session") ||
    url.searchParams.get("sessionId");

  if (queryRoom?.trim()) return queryRoom.trim();

  const segments = url.pathname.split("/").filter(Boolean);
  const liveIndex = segments.findIndex((segment) => segment.toLowerCase() === "live");
  const nextSegment = liveIndex >= 0 ? segments[liveIndex + 1] : "";
  if (nextSegment?.trim()) return nextSegment.trim();

  return "afaaq-live";
}

function getAfaqShareLink(roomId: string) {
  const safeRoomId = roomId.trim() || "afaaq-live";
  return `https://afaaq.com/live?room=${encodeURIComponent(safeRoomId)}`;
}

function getSessionIdFromRoomId(roomId: string) {
  const match = roomId.match(/(\d+)\s*$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function StudentLivePage() {
  const searchParams = useSearchParams();
  const queryRoom =
    searchParams.get("room") ||
    searchParams.get("roomId") ||
    searchParams.get("session") ||
    searchParams.get("sessionId") ||
    "";
  const queryExternalUrl = searchParams.get("url") || "";
  const [joinUrl, setJoinUrl] = useState(queryExternalUrl.trim() || (queryRoom.trim() ? getAfaqShareLink(queryRoom.trim()) : ""));
  const [roomIdInput, setRoomIdInput] = useState(queryRoom.trim() || "afaaq-live");
  const [externalPrompt, setExternalPrompt] = useState<ExternalPrompt | null>(null);
  const [liveRoomId, setLiveRoomId] = useState(queryRoom.trim());
  const [message, setMessage] = useState<string | null>(queryRoom.trim() ? `Joined Afaq live room: ${queryRoom.trim()}` : null);
  const [error, setError] = useState<string | null>(null);

  const studentName = useMemo(() => {
    const storedUser = getStoredStudentUser();
    return typeof storedUser?.name === "string" && storedUser.name.trim() ? storedUser.name.trim() : "Student";
  }, []);
  const studentId = useMemo(() => getStoredStudentId(), []);
  const studentToken = useMemo(() => getStudentToken(), []);

  const afaqShareLink = useMemo(() => getAfaqShareLink(roomIdInput), [roomIdInput]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
      setError(null);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const joinTypedUrl = () => {
    const parsed = tryParseUrl(joinUrl);
    if (!parsed) {
      setError("Please enter a valid join URL.");
      setMessage(null);
      return;
    }

    const provider = getProviderFromUrl(parsed);
    if (provider) {
      setExternalPrompt({ href: parsed.toString(), provider });
      setError(null);
      setMessage(null);
      return;
    }

    if (isAfaqUrl(parsed)) {
      const roomId = extractAfaqRoomId(parsed);
      setRoomIdInput(roomId);
      setLiveRoomId(roomId);
      setError(null);
      setMessage(`Joined Afaq live room: ${roomId}`);
      return;
    }

    setError("Only Zoom, Google Meet, or Afaq live links are supported here.");
    setMessage(null);
  };

  const joinAfaqRoom = () => {
    const roomId = roomIdInput.trim() || "afaaq-live";
    setRoomIdInput(roomId);
    setJoinUrl(getAfaqShareLink(roomId));
    setLiveRoomId(roomId);
    setError(null);
    setMessage(`Joined Afaq live room: ${roomId}`);
  };

  const confirmExternalJoin = () => {
    if (!externalPrompt) return;
    window.open(externalPrompt.href, "_blank", "noopener,noreferrer");
    setMessage(`${externalPrompt.provider} opened in a new tab.`);
    setError(null);
    setExternalPrompt(null);
  };

  if (liveRoomId) {
    const sessionId = getSessionIdFromRoomId(liveRoomId);
    const attendanceConfig =
      studentToken && studentId != null && sessionId !== null
        ? {
            endpointUrl: getStudentApiRequestUrl(`/virtual-sessions/${sessionId}/attendance`),
            token: studentToken,
            userId: studentId,
          }
        : null;

    return (
      <LiveMeeting
        roomId={liveRoomId}
        userName={studentName}
        attendance={attendanceConfig}
        onExit={() => {
          setLiveRoomId("");
          setMessage("You left the Afaq live room.");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#cffafe_0%,_#eff6ff_42%,_#f8fafc_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_#082f49_0%,_#0f172a_40%,_#020617_100%)] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6 text-slate-900 dark:text-white">
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-900/80 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                <Video className="h-3.5 w-3.5" />
                Student Live Access
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Join Live Sessions</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Paste a Zoom, Google Meet, or Afaq live URL. External meetings ask for confirmation first, while Afaq rooms open directly in the platform.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-lg dark:border dark:border-cyan-300/20 dark:bg-slate-950/70">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Afaq Company Link</p>
              <p className="mt-1 text-sm font-bold">https://afaaq.com/live</p>
            </div>
          </div>

          {message ? <p className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{message}</p> : null}
          {error ? <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-200">{error}</p> : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-600/10 p-3 text-indigo-600 dark:text-indigo-300">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black">Join From URL</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Use this for shared Zoom, Google Meet, or Afaq room links.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={joinUrl}
                onChange={(event) => setJoinUrl(event.target.value)}
                placeholder="Paste Zoom, Google Meet, or https://afaaq.com/live link"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:border-indigo-500 dark:border-white/15 dark:bg-slate-950/40"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={joinTypedUrl}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Join URL
                </button>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(joinUrl || afaqShareLink, "Join URL")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-700 dark:border-white/20 dark:text-slate-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-700 dark:text-cyan-200">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black">Afaq Live Room</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Join directly inside the app with peer-to-peer video.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={roomIdInput}
                onChange={(event) => setRoomIdInput(event.target.value)}
                placeholder="Room ID"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:border-cyan-500 dark:border-white/15 dark:bg-slate-950/40"
              />
              <div className="rounded-2xl bg-slate-100/80 p-4 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Generated Afaq Link</p>
                <p className="mt-2 break-all font-semibold">{afaqShareLink}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={joinAfaqRoom}
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white"
                >
                  <Video className="h-3.5 w-3.5" />
                  Join Afaq Live
                </button>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(afaqShareLink, "Afaq live link")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-700 dark:border-white/20 dark:text-slate-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-900/80">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">How It Works</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Zoom and Google Meet links stay external and require confirmation before leaving Afaq. Any `afaaq.com/live` room opens directly in the built-in HD live meeting screen.
              </p>
            </div>
          </div>
        </section>
      </div>

      {externalPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-2xl dark:border-cyan-300/20 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  External Link Confirmation
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight">Open {externalPrompt.provider}?</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  You are about to leave Afaq and continue to {externalPrompt.provider}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExternalPrompt(null)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-100/80 p-4 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
              <p className="font-bold uppercase tracking-[0.16em] text-[10px] text-slate-500 dark:text-slate-400">Destination URL</p>
              <p className="mt-2 break-all">{externalPrompt.href}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmExternalJoin}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase text-white"
              >
                Continue To {externalPrompt.provider}
              </button>
              <button
                type="button"
                onClick={() => void copyToClipboard(externalPrompt.href, `${externalPrompt.provider} link`)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase dark:border-white/20"
              >
                <Copy className="h-3 w-3" /> Copy Link
              </button>
              <button
                type="button"
                onClick={() => setExternalPrompt(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase text-slate-700 dark:border-white/20 dark:text-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
