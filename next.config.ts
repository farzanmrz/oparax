import { withSentryConfig } from "@sentry/nextjs";
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
  // the create-desk chat assistant (create-agent v2 continuation, the deleted create-desk assistant) — do not
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "oparax-ai-inc",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
