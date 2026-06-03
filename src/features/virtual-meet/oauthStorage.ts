"use client";

import { getAdminApiRequestUrl } from "@/features/admin/adminApi";
import { getAdminToken } from "@/features/admin/adminSession";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { getStudentToken } from "@/features/student/studentSession";

export type OAuthRequestSource = "admin" | "student";

export type VirtualMeetOAuthContext = {
  provider: string;
  returnTo: string;
  requestSource: OAuthRequestSource;
  createdAt: string;
};

const STORAGE_KEY = "afaq_virtual_meet_oauth_context";

export function persistVirtualMeetOauthContext(context: Omit<VirtualMeetOAuthContext, "createdAt">) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...context,
      createdAt: new Date().toISOString(),
    } satisfies VirtualMeetOAuthContext)
  );
}

export function readVirtualMeetOauthContext(): VirtualMeetOAuthContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<VirtualMeetOAuthContext>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (typeof parsed.provider !== "string" || typeof parsed.returnTo !== "string") {
      return null;
    }
    if (parsed.requestSource !== "admin" && parsed.requestSource !== "student") {
      return null;
    }
    return {
      provider: parsed.provider,
      returnTo: parsed.returnTo,
      requestSource: parsed.requestSource,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearVirtualMeetOauthContext() {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}

export function decodeProviderFromState(state: string | null) {
  if (!state) {
    return null;
  }

  try {
    const normalized = state.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded) as { provider?: unknown };
    return typeof parsed.provider === "string" && parsed.provider.trim() ? parsed.provider : null;
  } catch {
    return null;
  }
}

export function resolveVirtualMeetOauthHelpers(source: OAuthRequestSource | null | undefined) {
  if (source === "admin") {
    return {
      getRequestUrl: getAdminApiRequestUrl,
      getToken: getAdminToken,
      fallbackReturnTo: "/admin/virtual-meet",
    };
  }

  return {
    getRequestUrl: getStudentApiRequestUrl,
    getToken: getStudentToken,
    fallbackReturnTo: "/instructor/virtual-meet",
  };
}
