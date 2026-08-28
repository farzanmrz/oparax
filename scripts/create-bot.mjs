#!/usr/bin/env node
// scripts/create-bot.mjs
//
// One-time, run BY HAND by the owner at ship: mints the Oparax bot account via POST /2/bots
// with the app-only bearer, then prints the one-time `xcbot_` token and the bot's numeric
// user id. Run: X_BEARER_TOKEN=... node scripts/create-bot.mjs
// (or: node --env-file=.env.local scripts/create-bot.mjs)
// No app imports on purpose (plain Node + global fetch), so it runs anywhere.

const HANDLES = ["oparax", "oparaxbot", "oparax_ai"];

const bearer = process.env.X_BEARER_TOKEN;
if (!bearer) {
  console.error("X_BEARER_TOKEN is not set. Export it or run with --env-file=.env.local.");
  process.exit(1);
}

async function requestBot(handle) {
  const res = await fetch("https://api.x.com/2/bots", {
    method: "POST",
    headers: {
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ handle }),
  });
  const bodyText = await res.text();
  return { status: res.status, ok: res.ok, bodyText };
}

// X's error wording for a taken handle isn't pinned down; match the plausible phrasings on
// any 4xx and move to the next candidate handle. Anything else is a hard stop.
function handleTaken(status, bodyText) {
  if (status < 400 || status >= 500) return false;
  const text = bodyText.toLowerCase();
  return ["taken", "already", "in use", "unavailable", "exists", "duplicate"].some((word) =>
    text.includes(word),
  );
}

// Defensive: the exact response shape isn't pinned down, so probe the plausible key names
// and fall back to showing the raw body rather than guessing wrong.
function extractCredentials(bodyText) {
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return null;
  }
  const data = body && typeof body === "object" ? (body.data ?? body) : {};
  const token = [data.token, data.bearer_token, data.access_token].find(
    (value) => typeof value === "string" && value.length > 0,
  );
  const rawId = [data.id, data.user_id, data.bot_user_id].find(
    (value) => typeof value === "string" || typeof value === "number",
  );
  if (!token || rawId === undefined) return null;
  return { token, userId: String(rawId) };
}

let lastFailure = null;
for (const handle of HANDLES) {
  console.log(`Requesting bot handle @${handle} ...`);
  let result;
  try {
    result = await requestBot(handle);
  } catch (error) {
    console.error("Request to api.x.com failed:", error);
    process.exit(1);
  }
  if (!result.ok) {
    lastFailure = result;
    if (handleTaken(result.status, result.bodyText)) {
      console.log(`@${handle} appears taken (HTTP ${result.status}); trying the next handle.`);
      continue;
    }
    console.error(`Bot creation failed (HTTP ${result.status}). Raw response:`);
    console.error(result.bodyText);
    process.exit(1);
  }

  const credentials = extractCredentials(result.bodyText);
  if (!credentials) {
    console.error("Bot may have been created, but the response shape was unexpected.");
    console.error("Raw response (look for the token and user id in here):");
    console.error(result.bodyText);
    process.exit(1);
  }

  console.log("");
  console.log("=== BOT CREATED ===");
  console.log(`Handle:        @${handle}`);
  console.log(`Bot user id:   ${credentials.userId}`);
  console.log(`Bearer token:  ${credentials.token}`);
  console.log("");
  console.log("Set these two env vars (Vercel + .env.local):");
  console.log(`X_BOT_TOKEN=${credentials.token}`);
  console.log(`X_BOT_USER_ID=${credentials.userId}`);
  console.log("");
  console.log("WARNING: X shows this token exactly ONCE. Store it now; it cannot be re-fetched.");
  process.exit(0);
}

console.error("All candidate handles were refused. Last response:");
if (lastFailure) {
  console.error(`HTTP ${lastFailure.status}`);
  console.error(lastFailure.bodyText);
}
process.exit(1);
