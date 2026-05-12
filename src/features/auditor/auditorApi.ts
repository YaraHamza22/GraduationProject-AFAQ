"use client";

import axios from "axios";
import { getStudentApiRequestUrl } from "@/features/student/studentApi";
import { clearStudentSession, getStudentToken } from "@/features/student/studentSession";

export type ApiMeta = {
  pagination?: {
    total?: number;
    count?: number;
    per_page?: number;
    current_page?: number;
    total_pages?: number;
  };
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
  pagination?: ApiMeta["pagination"];
};

export function getAuditorApiRequestUrl(path: string) {
  return getStudentApiRequestUrl(path);
}

export function getAuditorToken() {
  return getStudentToken();
}

export function clearAuditorSession() {
  clearStudentSession();
}

export function auditorHeaders() {
  const token = getAuditorToken();

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function payloadData<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export function payloadMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function normalizeList<T>(payload: unknown): T[] {
  const data = payloadData<unknown>(payload);
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function auditorGet<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const response = await axios.get<ApiEnvelope<T>>(getAuditorApiRequestUrl(path), {
    headers: auditorHeaders(),
    params,
  });

  return response.data;
}

export async function auditorPost<T>(path: string, data?: unknown) {
  const response = await axios.post<ApiEnvelope<T>>(getAuditorApiRequestUrl(path), data ?? {}, {
    headers: {
      ...auditorHeaders(),
      "Content-Type": "application/json",
    },
  });

  return response.data;
}
