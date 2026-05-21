import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Twitter CDN domains available for react-tweet embedded images.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
    ],
  },
};

export default nextConfig;
