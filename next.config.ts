import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tree-shake barrel-file icon/Radix packages so only the imported symbols ship.
  experimental: {
    optimizePackageImports: ["@hugeicons/react", "@hugeicons/core-free-icons", "radix-ui"],
  },
  // The sysprompt markdown is read via readFileSync(process.cwd()/lib/sysprompts/...) at
  // module load — trace it into every serverless function that transitively imports
  // lib/sysprompts (the delivery interface, via draft-pipeline.ts -> draft-council-run.ts;
  // the legacy strip-phrases refresh route and the new-desk create action, both via
  // lib/sources/onboard-source.ts / lib/voice/extract-guide.ts; and /agents/[id]/voice's
  // retryExtraction action, which reaches the same lib/voice/extract-guide.ts path via
  // runExtractionSpendPhase on a manual retry). The per-minute cron dispatcher this list once
  // traced (/api/cron/tick) was deleted with the retired scan/draft pipeline (D15), the
  // /api/chat entry it once traced was deleted with the create-desk chat assistant
  // (create-agent v2 continuation, the deleted create-desk assistant), and the inbound-email
  // webhook entry was deleted with the whole dormant email-correction path — do not re-add any
  // without a route to match. See .claude/rules/agent.md's "Bundling the prompts for deploy".
  outputFileTracingIncludes: {
    "/api/ingest": ["./lib/sysprompts/*.md"],
    "/api/sources/refresh-strip-phrases": ["./lib/sysprompts/*.md"],
    "/agents/new": ["./lib/sysprompts/*.md"],
    "/agents/[id]/voice": ["./lib/sysprompts/*.md"],
    "/agents/[id]/sources": ["./lib/sysprompts/*.md"],
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

  // Both slugs were WRONG as the wizard left them ("oparax-ai-inc" / "javascript-nextjs"), and
  // nothing failed loudly: source-map upload is best-effort, so every build was green while
  // uploading to an org that does not resolve. Verified against the live account — the org slug
  // is `oparax` (https://oparax.sentry.io) and the one project is `oparax`, which its issue
  // short-IDs (OPARAX-1…) independently confirm, since Sentry derives that prefix from the
  // project slug. A DSN does not encode either slug — it carries numeric ids — so a correct DSN
  // next to a wrong org here looks completely healthy from the app's side.
  org: "oparax",

  project: "oparax",

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
