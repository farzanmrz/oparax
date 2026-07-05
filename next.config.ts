import { withEve } from "eve/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake barrel-file icon/Radix packages so only the imported symbols ship.
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons", "radix-ui"],
  },
  // Security headers on every route (moved from vercel.json — Next config is
  // compiled into the same edge routing manifest on Vercel).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Canonical-host enforcement: *.vercel.app aliases 308 to oparax.ai.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "oparax-chirp-farzanmrzs-projects.vercel.app" }],
        destination: "https://oparax.ai/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "oparax-chirp.vercel.app" }],
        destination: "https://oparax.ai/:path*",
        permanent: true,
      },
    ];
  },
};

// Mount the rebuild's eve agent (agent/ at the repo root) into this app:
// one dev server, same-origin /eve/v1/* routes, one Vercel deploy.
export default withEve(nextConfig);
