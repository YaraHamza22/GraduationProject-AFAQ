import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

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
          source: '/api/:path*',
          // Make sure Laravel backend is running via `php artisan serve` on this port
          destination: 'http://127.0.0.1:8000/api/:path*' 
        }
      ];
    }
  })
};

export default nextConfig;
