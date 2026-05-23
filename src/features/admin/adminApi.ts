"use client";

import { normalizeApiBaseUrl } from "@/lib/apiBaseUrl";

const adminProxyPrefix = "/api";
const superAdminAuthPrefix = "/super-admin/auth";

export function getAdminApiBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!rawUrl) {
    return "";
  }

  return normalizeApiBaseUrl(rawUrl);
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

function getSuperAdminAuthPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${superAdminAuthPrefix}${normalizedPath}`;
}

export function getSuperAdminAuthApiEndpoint(path: string) {
  return getAdminApiEndpoint(getSuperAdminAuthPath(path));
}

export function getSuperAdminAuthApiRequestUrl(path: string) {
  return getAdminApiRequestUrl(getSuperAdminAuthPath(path));
}
