"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Video } from "lucide-react";
import LiveMeeting from "@/features/virtual-meet/components/LiveMeeting";

type Props = {
  backHref: string;
  backLabel: string;
  userName: string;
  attendance?: {
    getRequestUrl: (path: string) => string;
    token: string | null;
    userId: number | string | null;
  } | null;
};

function getSessionIdFromRoomId(roomId: string) {
  const match = roomId.match(/(\d+)\s*$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AfaqLiveRoomPage({ backHref, backLabel, userName, attendance = null }: Props) {
  const searchParams = useSearchParams();
  const roomId =
    searchParams.get("room") ||
    searchParams.get("roomId") ||
    searchParams.get("session") ||
    searchParams.get("sessionId") ||
    "";
  const sessionId = getSessionIdFromRoomId(roomId.trim());
  const attendanceConfig =
    attendance?.token && attendance.userId != null && sessionId !== null
      ? {
          endpointUrl: attendance.getRequestUrl(`/virtual-sessions/${sessionId}/attendance`),
          token: attendance.token,
          userId: attendance.userId,
        }
      : null;

  if (!roomId.trim()) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#cffafe_0%,_#eff6ff_42%,_#f8fafc_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_#082f49_0%,_#0f172a_40%,_#020617_100%)] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-xl backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-900/80 dark:text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
            <Video className="h-3.5 w-3.5" />
            Afaq Live
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">No room selected</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Open this page with a room query like `?room=meet-1`, or go back and start from the session list.
          </p>
          <Link
            href={backHref}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return <LiveMeeting roomId={roomId.trim()} userName={userName} attendance={attendanceConfig} onExit={() => window.history.back()} />;
}
