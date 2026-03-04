import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Next.js to treat frontend/ as the workspace root to avoid parent lockfile inference.
  turbopack: {
    root: __dirname,
  },
  // Keep tracing rooted to frontend/ for consistent local + Vercel builds.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
