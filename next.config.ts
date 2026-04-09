import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const defaultBackendOrigin = "http://127.0.0.1:8000";

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "");
}

function getBackendApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return `${defaultBackendOrigin}/api`;
  }

  return normalizeUrl(apiUrl);
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
