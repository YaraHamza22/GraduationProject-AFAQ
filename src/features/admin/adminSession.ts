"use client";

const ADMIN_TOKEN_STORAGE_KEY = "admin_auth_token";
const ADMIN_USER_STORAGE_KEY = "admin_auth_user";

type UnknownRecord = Record<string, unknown>;

export interface AdminSessionUser {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface PersistAdminSessionOptions {
  token: string;
  user?: AdminSessionUser | null;
  remember?: boolean;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStorageValue(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function writeStorageValue(key: string, value: string, remember = true) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(key);
  sessionStorage.removeItem(key);

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(key, value);
}

function getNestedRecord(source: unknown, key: string) {
  if (!isRecord(source)) {
    return null;
  }

  const value = source[key];
  return isRecord(value) ? value : null;
}

function getNestedString(source: unknown, key: string) {
  if (!isRecord(source)) {
    return null;
  }

  const value = source[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function extractAdminToken(payload: unknown) {
  const directToken =
    getNestedString(payload, "token") ??
    getNestedString(payload, "access_token") ??
    getNestedString(payload, "accessToken");

  if (directToken) {
    return directToken;
  }

  const data = getNestedRecord(payload, "data");
  return (
    getNestedString(data, "token") ??
    getNestedString(data, "access_token") ??
    getNestedString(data, "accessToken")
  );
}

export function extractAdminUser(payload: unknown): AdminSessionUser | null {
  const directUser = getNestedRecord(payload, "user");
  if (directUser) {
    return directUser;
  }

  const data = getNestedRecord(payload, "data");
  const nestedUser = getNestedRecord(data, "user");
  if (nestedUser) {
    return nestedUser;
  }

  if (isRecord(data)) {
    const possibleUserFields = ["id", "name", "email", "role"];
    const hasUserShape = possibleUserFields.some((field) => field in data);
    if (hasUserShape) {
      return data;
    }
  }

  return null;
}

export function extractAdminMessage(payload: unknown) {
  return getNestedString(payload, "message") ?? getNestedString(getNestedRecord(payload, "data"), "message");
}

export function persistAdminSession({
  token,
  user,
  remember = true,
}: PersistAdminSessionOptions) {
  writeStorageValue(ADMIN_TOKEN_STORAGE_KEY, token, remember);

  if (user) {
    writeStorageValue(ADMIN_USER_STORAGE_KEY, JSON.stringify(user), remember);
    return;
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
  }
}

export function clearAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
}

export function getAdminToken() {
  return readStorageValue(ADMIN_TOKEN_STORAGE_KEY);
}

export function hasAdminSession() {
  return Boolean(getAdminToken());
}

export function getStoredAdminUser(): AdminSessionUser | null {
  const rawUser = readStorageValue(ADMIN_USER_STORAGE_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as unknown;
    return isRecord(parsed) ? (parsed as AdminSessionUser) : null;
  } catch {
    return null;
  }
}
