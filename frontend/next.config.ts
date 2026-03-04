import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Next.js to treat frontend/ as the workspace root to avoid parent lockfile inference.
  turbopack: {
    root: __dirname,
  },
  // Keep tracing rooted to frontend/ for consistent local + Vercel builds.
  outputFileTracingRoot: __dirname,
  // Twitter CDN domains for react-tweet embedded images.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
    ],
  },
};

export default nextConfig;
