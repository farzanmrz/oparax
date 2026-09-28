import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake barrel-file icon/Radix packages so only the imported symbols ship.
  experimental: {
    optimizePackageImports: ["radix-ui"],
  },
  // X serves post photos and video freeze frames from this host; the onboarding page shows them.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "pbs.twimg.com" }],
  },
  async redirects() {
    return [
      { source: "/agents", destination: "/", permanent: true },
      { source: "/agents/:path*", destination: "/", permanent: true },
    ];
  },
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/*.ttf"],
  },
};

export default withBotId(nextConfig);
