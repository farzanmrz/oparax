import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake barrel-file icon/Radix packages so only the imported symbols ship.
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons", "radix-ui"],
  },
  // First-party PostHog proxy: analytics ride our own domain so ad blockers don't erase the
  // pilot's numbers. ORDER MATTERS — rewrites match in array order, and the wildcard first
  // would send the static script request to the wrong host.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // The sysprompt markdown is read via readFileSync(process.cwd()/lib/sysprompts/...) at
  // module load — trace it into every serverless function that transitively imports
  // lib/sysprompts (the two delivery interfaces /api/ingest and /api/x/webhook plus the
  // reconcile sweep's reprocessing path, via draft-pipeline.ts; the strip-phrases refresh
  // route and the new-desk create action, via lib/sources/onboard-source.ts; and the landing
  // page's pilot onboarding action, which onboards website sources through the same module).
  // The voice-extraction entry died with lib/voice — do not re-add entries without a route to
  // match. See .claude/rules/agent.md's "Bundling the prompts for deploy".
  outputFileTracingIncludes: {
    "/api/ingest": ["./lib/sysprompts/*.md"],
    "/api/x/webhook": ["./lib/sysprompts/*.md"],
    "/api/x/reconcile": ["./lib/sysprompts/*.md"],
    "/api/sources/refresh-strip-phrases": ["./lib/sysprompts/*.md"],
    "/agents/new": ["./lib/sysprompts/*.md"],
    "/agents/[id]/sources": ["./lib/sysprompts/*.md"],
    "/": ["./lib/sysprompts/*.md"],
  },
};

export default nextConfig;
