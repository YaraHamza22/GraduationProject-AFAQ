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

function normalizeRole(role: string) {
  return role.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function extractRoleFromRecord(source: UnknownRecord) {
  const directKeys = ["role", "user_role", "account_type", "type"];
  for (const key of directKeys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  const roles = source.roles;
  if (Array.isArray(roles)) {
    for (const roleEntry of roles) {
      if (typeof roleEntry === "string" && roleEntry.trim()) {
        return roleEntry;
      }

      if (isRecord(roleEntry)) {
        const roleValue = roleEntry.name ?? roleEntry.slug ?? roleEntry.role ?? roleEntry.type;
        if (typeof roleValue === "string" && roleValue.trim()) {
          return roleValue;
        }
      }
    }
  }

  return null;
}

function decodeJwtPayload(token: string): UnknownRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
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

export function extractStudentRole(payload: unknown): string | null {
  if (isRecord(payload)) {
    const directRole = extractRoleFromRecord(payload);
    if (directRole) {
      return directRole;
    }
  }

  const directUser = getNestedRecord(payload, "user");
  if (directUser) {
    const role = extractRoleFromRecord(directUser);
    if (role) {
      return role;
    }
  }

  const data = getNestedRecord(payload, "data");
  if (data) {
    const role = extractRoleFromRecord(data);
    if (role) {
      return role;
    }

    const nestedUser = getNestedRecord(data, "user");
    if (nestedUser) {
      const nestedRole = extractRoleFromRecord(nestedUser);
      if (nestedRole) {
        return nestedRole;
      }
    }
  }

  return null;
}

export function extractStudentRoleFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  return extractStudentRole(payload);
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

export function getStoredStudentRole() {
  const user = getStoredStudentUser();
  const roleFromUser = extractStudentRole(user);
  if (roleFromUser) {
    return normalizeRole(roleFromUser);
  }

  const token = getStudentToken();
  if (!token) {
    return null;
  }

  const roleFromToken = extractStudentRoleFromToken(token);
  return roleFromToken ? normalizeRole(roleFromToken) : null;
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
