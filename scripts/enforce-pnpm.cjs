#!/usr/bin/env node

// Fail fast when installs are attempted with npm/yarn to avoid mixed lockfiles.
const userAgent = process.env.npm_config_user_agent || "";
const isPnpm = userAgent.includes("pnpm/");

if (!isPnpm) {
  console.error(
    [
      "",
      "This repository uses pnpm only.",
      "",
      "Use one of:",
      "  pnpm install",
      "  pnpm --dir frontend install",
      "",
      "Do not run npm or yarn installs here.",
      "",
    ].join("\n")
  );
  process.exit(1);
}
