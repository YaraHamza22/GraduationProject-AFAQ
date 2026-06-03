"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import {
  clearVirtualMeetOauthContext,
  decodeProviderFromState,
  readVirtualMeetOauthContext,
  resolveVirtualMeetOauthHelpers,
} from "@/features/virtual-meet/oauthStorage";

function getErrorText(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "OAuth connection failed.";
}

type StatusState =
  | { type: "loading"; title: string; body: string }
  | { type: "success"; title: string; body: string; returnTo: string }
  | { type: "error"; title: string; body: string; returnTo: string };

export default function VirtualMeetOAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusState>({
    type: "loading",
    title: "Finishing OAuth connection",
    body: "We are validating the provider response and connecting your integration.",
  });

  const context = useMemo(() => readVirtualMeetOauthContext(), []);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const code = searchParams.get("code");
      const providerError = searchParams.get("error");
      const providerErrorDescription = searchParams.get("error_description");
      const state = searchParams.get("state");
      const provider = searchParams.get("provider") ?? context?.provider ?? decodeProviderFromState(state);
      const helpers = resolveVirtualMeetOauthHelpers(context?.requestSource);
      const token = helpers.getToken();
      const returnTo = context?.returnTo || helpers.fallbackReturnTo;

      if (providerError) {
        if (!cancelled) {
          setStatus({
            type: "error",
            title: "Provider access was not completed",
            body: providerErrorDescription || providerError,
            returnTo,
          });
        }
        return;
      }

      if (!provider || !code) {
        if (!cancelled) {
          setStatus({
            type: "error",
            title: "OAuth response is incomplete",
            body: "The callback did not include the provider and authorization code we need.",
            returnTo,
          });
        }
        return;
      }

      if (!token) {
        if (!cancelled) {
          setStatus({
            type: "error",
            title: "Session token is missing",
            body: "Please sign in again, then restart the OAuth connection from the virtual meet workspace.",
            returnTo,
          });
        }
        return;
      }

      try {
        await axios.post(
          helpers.getRequestUrl(`/external-integrations/${provider}/exchange-code`),
          { code },
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        clearVirtualMeetOauthContext();

        if (!cancelled) {
          setStatus({
            type: "success",
            title: "Integration connected successfully",
            body: `${provider.replaceAll("_", " ")} is now connected. We will send you back to the workspace.`,
            returnTo,
          });
        }

        window.setTimeout(() => {
          router.replace(returnTo);
        }, 1600);
      } catch (error) {
        if (!cancelled) {
          setStatus({
            type: "error",
            title: "Could not exchange the OAuth code",
            body: getErrorText(error),
            returnTo,
          });
        }
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [context, router, searchParams]);

  const isLoading = status.type === "loading";
  const isSuccess = status.type === "success";
  const returnTo = status.type === "loading" ? context?.returnTo || "/instructor/virtual-meet" : status.returnTo;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_35%,#f8fafc_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_35%,#020617_100%)]">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/70 bg-white/85 p-8 text-slate-900 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-cyan-300/20 dark:bg-slate-900/85 dark:text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Virtual Meet OAuth Callback
        </div>

        <div className="mt-6 flex items-start gap-4">
          <div className={`rounded-2xl p-3 ${isSuccess ? "bg-emerald-500/15 text-emerald-500" : isLoading ? "bg-indigo-500/15 text-indigo-500" : "bg-rose-500/15 text-rose-500"}`}>
            {isSuccess ? <CheckCircle2 className="h-7 w-7" /> : isLoading ? <Loader2 className="h-7 w-7 animate-spin" /> : <XCircle className="h-7 w-7" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black tracking-tight">{status.title}</h1>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{status.body}</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-slate-950/50">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Next Step</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
            {isSuccess
              ? "You can wait for the automatic redirect or go back to the workspace immediately."
              : "Return to the workspace after fixing the issue, then try the OAuth flow again."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={returnTo} className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-cyan-600 dark:border dark:border-cyan-300/30">
              Return To Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
