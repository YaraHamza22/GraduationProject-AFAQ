const API_VERSION_PREFIX = "/api/v1";

function stripTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function normalizeApiBaseUrl(rawUrl: string) {
  const sanitizedUrl = stripTrailingSlash(rawUrl);

  if (!sanitizedUrl) {
    return "";
  }

  if (/\/api\/v\d+$/i.test(sanitizedUrl) || sanitizedUrl.endsWith("/api")) {
    return sanitizedUrl;
  }

  return `${sanitizedUrl}${API_VERSION_PREFIX}`;
}
