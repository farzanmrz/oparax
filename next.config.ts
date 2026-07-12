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

// Mount the rebuild's eve agent (eve/agent/, under the top-level eve/ folder)
// into this app: one dev server, same-origin /eve/v1/* routes, one Vercel deploy.
// eveBuildCommand strips eve's `functions/index.func -> __server.func` symlink
// from the service output: the Vercel adapter's rename-based service merge is
// symlink-unaware, and the name collides with Next's own index.func — moving
// __server.func first leaves the symlink dangling and the whole deploy ENOENTs
// (this was every dev deploy failure since ft/44). eve's service routes never
// target /index, so dropping it is safe. Remove once vercel/eve#693 lands a fix.
export default withEve(nextConfig, {
  eveRoot: "eve",
  eveBuildCommand: "eve build && rm -f .vercel/output/functions/index.func",
});
