"use client";

const adminProxyPrefix = "/api";

function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

export function getAdminApiBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!rawUrl) {
    return "";
  }

  return normalizeUrl(rawUrl);
}

export function getAdminApiEndpoint(path: string) {
  const baseUrl = getAdminApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function getAdminApiRequestUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    return `${adminProxyPrefix}${normalizedPath}`;
  }

  return getAdminApiEndpoint(normalizedPath);
}
