"use client";

const STUDENT_TOKEN_STORAGE_KEY = "auth_token";
const STUDENT_USER_STORAGE_KEY = "student_auth_user";

type UnknownRecord = Record<string, unknown>;

export interface StudentSessionUser {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function readStorageValue(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export function extractStudentToken(payload: unknown) {
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

export function extractStudentUser(payload: unknown): StudentSessionUser | null {
  if (isRecord(payload)) {
    const possibleUserFields = ["id", "name", "email", "role"];
    if (possibleUserFields.some((field) => field in payload)) {
      return payload;
    }
  }

  const directUser = getNestedRecord(payload, "user");
  if (directUser) {
    return directUser;
  }

  const profileUser = getNestedRecord(payload, "profile");
  if (profileUser) {
    return profileUser;
  }

  const data = getNestedRecord(payload, "data");
  const nestedUser = getNestedRecord(data, "user");
  if (nestedUser) {
    return nestedUser;
  }

  if (isRecord(data)) {
    const possibleUserFields = ["id", "name", "email", "role"];
    if (possibleUserFields.some((field) => field in data)) {
      return data;
    }
  }

  return null;
}

export function getStudentToken() {
  return readStorageValue(STUDENT_TOKEN_STORAGE_KEY);
}

export function persistStudentSession(token: string, user?: StudentSessionUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STUDENT_TOKEN_STORAGE_KEY, token);

  if (user) {
    localStorage.setItem(STUDENT_USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function clearStudentSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STUDENT_TOKEN_STORAGE_KEY);
  localStorage.removeItem(STUDENT_USER_STORAGE_KEY);
  sessionStorage.removeItem(STUDENT_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(STUDENT_USER_STORAGE_KEY);
}

export function getStoredStudentUser(): StudentSessionUser | null {
  const rawUser = readStorageValue(STUDENT_USER_STORAGE_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as unknown;
    return isRecord(parsed) ? (parsed as StudentSessionUser) : null;
  } catch {
    return null;
  }
}

export function updateStoredStudentUser(user: StudentSessionUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STUDENT_USER_STORAGE_KEY);
  sessionStorage.removeItem(STUDENT_USER_STORAGE_KEY);

  if (user) {
    localStorage.setItem(STUDENT_USER_STORAGE_KEY, JSON.stringify(user));
  }
}
