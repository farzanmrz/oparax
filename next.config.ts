import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake barrel-file icon/Radix packages so only the imported symbols ship.
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons", "radix-ui"],
  },
  // The sysprompt markdown is read via readFileSync(process.cwd()/lib/sysprompts/...) at
  // module load — trace it into every serverless function that transitively imports
  // lib/sysprompts (the delivery interface + the inbound-email webhook, both via
  // draft-pipeline.ts -> draft-council-run.ts; the new-desk create action, whose after()
  // voice-extraction call reaches lib/sysprompts via lib/voice/extract-guide.ts; and, as of
  // Slice 5, /agents/[id]/voice's capReprobe action, which reaches the same
  // lib/voice/extract-guide.ts path via attemptVoiceExtraction on a manual retry). The
  // per-minute cron dispatcher this list once traced (/api/cron/tick) was deleted with the
  // retired scan/draft pipeline (D15), and the /api/chat entry it once traced was deleted with
  // the create-desk chat assistant (create-agent v2 continuation, decisions.md D10) — do not
  // re-add either without a route to match. See .claude/rules/agent.md's "Bundling the prompts
  // for deploy".
  outputFileTracingIncludes: {
    "/api/ingest": ["./lib/sysprompts/*.md"],
    "/api/email/inbound": ["./lib/sysprompts/*.md"],
    "/agents/new": ["./lib/sysprompts/*.md"],
    "/agents/[id]/voice": ["./lib/sysprompts/*.md"],
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

export default nextConfig;
