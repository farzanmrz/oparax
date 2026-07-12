import { defineTool } from "eve/tools";
import { z } from "zod";
import { callResponses } from "../lib/xai";

// Handle verification is its OWN tool, separate from scanning. It runs once at
// agent setup (not per scan): confirm each watched handle maps to a real account,
// so the scan tool can later trust them. Sysprompt-enforced — grok is told to use
// ONLY x_user_search (a bare x_search, no scoping params) at count 3.
//
// TODO(db): a site-wide database of already-verified X handles will front this.
// The setup pipeline should: take the handles → check the DB → only pass the
// UNVERIFIED ones to this tool → write successful verifications back. The DB isn't
// built yet, so today this verifies whatever handles it's given.
const VERIFY_SYSTEM_PROMPT = `# Role

You verify that X (Twitter) handles map to real accounts. For EACH handle you are given, call \`x_user_search\` with \`query\` = the handle and \`count\` = 3. Use ONLY \`x_user_search\` — no other subtool and no extra parameters.

# Judging

- If a returned account's username matches the handle ignoring case (e.g. \`fcbarcelona\` ↔ \`FCBarcelona\`), that handle is VERIFIED — a capitalization-only difference is still an exact match. Record the account's real, correctly-cased username.
- If there is no case-insensitive match but a similar username appears (different spelling, extra or missing characters, punctuation), report it as the SUGGESTION for that handle — the single most likely candidate, nothing more. A casing-only difference is never a suggestion — it is a match.
- Never guess or invent an account.

# Output

For each input handle, report: the handle, VERIFIED or NOT_FOUND, the resolved exact username (if verified), and the single best similar-username suggestion (if not found and one exists).`;

export default defineTool({
  description:
    "Verify that watched X (Twitter) handles resolve to real accounts (one x_user_search per handle). Run this at agent setup, before scanning. Returns each handle's VERIFIED/NOT_FOUND status plus similar-username suggestions for misses.",
  inputSchema: z.object({
    handles: z.array(z.string()).max(20).describe("Bare X usernames to verify (no @). Max 20."),
  }),
  async execute({ handles }) {
    // TODO(db): check the site-wide verified-handles DB first and only verify the
    // uncached handles here; write successes back. Not built yet — verify all.
    const user = `Verify these X handles — one \`x_user_search\` (count 3) per handle:\n${handles
      .map((h) => `- ${h}`)
      .join("\n")}`;
    // Bare x_search (no allowed_x_handles / dates) so x_user_search runs unscoped.
    // maxTurns gives grok enough agentic turns to run one x_user_search per handle
    // (up to 20) + headroom, so a large handle set isn't silently truncated by
    // xAI's server-default turn cap.
    return callResponses({
      system: VERIFY_SYSTEM_PROMPT,
      user,
      effort: "low",
      maxTurns: handles.length + 5,
    });
  },
});
