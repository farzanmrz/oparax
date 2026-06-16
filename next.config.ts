import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Twitter CDN domains available for react-tweet embedded images.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "abs.twimg.com",
      },
    ],
  },
  // Tree-shake barrel-file icon/Radix packages so only the imported symbols ship.
  experimental: {
    optimizePackageImports: [
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
      "radix-ui",
    ],
  },
};

export default nextConfig;
