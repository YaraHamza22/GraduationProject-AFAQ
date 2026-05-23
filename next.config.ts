import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const defaultBackendOrigin = "https://afaaq-api.onrender.com";
const apiVersionPrefix = "/api/v1";

function normalizeApiBaseUrl(url: string) {
  const sanitizedUrl = url.trim().replace(/\/+$/, "");

  if (/\/api\/v\d+$/i.test(sanitizedUrl) || sanitizedUrl.endsWith("/api")) {
    return sanitizedUrl;
  }

  return `${sanitizedUrl}${apiVersionPrefix}`;
}

function getBackendApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return normalizeApiBaseUrl(defaultBackendOrigin);
  }

  return normalizeApiBaseUrl(apiUrl);
}

const nextConfig: NextConfig = {
  // Only use export output for GitHub Pages production build
  ...(isProd ? { output: "export" } : {}),
  basePath: isProd ? "/GraduationProject-AFAQ" : "",
  images: {
    unoptimized: true,
  },
  // Automatically proxy all /api requests to Laravel when developing locally to bypass CORS
  ...(isProd ? {} : {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: `${getBackendApiUrl()}/:path*`,
        },
      ];
    }
  })
};

export default nextConfig;
