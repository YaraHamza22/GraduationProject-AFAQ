"use client";

function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

export function getStudentApiBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!rawUrl) {
    return "";
  }

  return normalizeUrl(rawUrl);
}

export function getStudentApiEndpoint(path: string) {
  const baseUrl = getStudentApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function getStudentApiRequestUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    return `/api${normalizedPath}`;
  }

  const baseUrl = getStudentApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : "";
}
