"use client";

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { normalizeApiBaseUrl } from "@/lib/apiBaseUrl";

type CachedResponseEntry = {
  expiresAt: number;
  response: AxiosResponse<unknown>;
};

type CachedGetOptions = {
  ttlMs?: number;
  force?: boolean;
};

const DEFAULT_CACHE_TTL_MS = 20_000;
const responseCache = new Map<string, CachedResponseEntry>();
const inflightRequests = new Map<string, Promise<AxiosResponse<unknown>>>();

export function getStudentApiBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!rawUrl) {
    return "";
  }

  return normalizeApiBaseUrl(rawUrl);
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

function stableSerialize(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${key}:${stableSerialize((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}

function buildCacheKey(path: string, config: AxiosRequestConfig) {
  const headers = config.headers ?? {};
  const scopedHeaders =
    typeof headers === "object" && headers !== null
      ? {
          authorization: "Authorization" in headers ? (headers as Record<string, unknown>).Authorization : (headers as Record<string, unknown>).authorization,
          locale: "X-Locale" in headers ? (headers as Record<string, unknown>)["X-Locale"] : (headers as Record<string, unknown>)["x-locale"],
          language: "Accept-Language" in headers ? (headers as Record<string, unknown>)["Accept-Language"] : (headers as Record<string, unknown>)["accept-language"],
        }
      : headers;

  return [
    getStudentApiRequestUrl(path),
    stableSerialize(config.params),
    stableSerialize(scopedHeaders),
  ].join("|");
}

export async function getStudentApiCached<T = unknown>(
  path: string,
  config: AxiosRequestConfig = {},
  options: CachedGetOptions = {}
) {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const cacheKey = buildCacheKey(path, config);
  const now = Date.now();

  if (!options.force) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.response as AxiosResponse<T>;
    }

    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      return (await inflight) as AxiosResponse<T>;
    }
  }

  const request = axios
    .get<T>(getStudentApiRequestUrl(path), config)
    .then((response) => {
      responseCache.set(cacheKey, { expiresAt: Date.now() + ttlMs, response });
      return response as AxiosResponse<unknown>;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, request);
  return (await request) as AxiosResponse<T>;
}

export function invalidateStudentApiCache(matcher?: string | RegExp) {
  if (!matcher) {
    responseCache.clear();
    inflightRequests.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    const isMatch = typeof matcher === "string" ? key.includes(matcher) : matcher.test(key);
    if (isMatch) {
      responseCache.delete(key);
    }
  }
}
