// lib/agent/search-template.ts
//
// The frozen search template: the drafted x_search calls captured at desk save and reused
// verbatim by scheduled/manual runs, restamped only for the current date window. CLIENT-SAFE —
// pure zod, no server-only imports (extractSearchTemplate runs in the save server action, but the
// schema/types must stay importable anywhere, like scan-result.ts). Also the single home for the
// transcript-mining walks the save action needs, so the opaque UI-message shape is cast in ONE place.
import { z } from "zod";

/** Hard cap on a frozen template's call count. The drafted path was bounded only by model discretion
 *  (the prompt drafts ~5: 1 keyword + 3–4 semantic); the frozen path replays a persisted, CLIENT-
 *  SUPPLIED list verbatim every scan via `Promise.all`, so a crafted transcript with thousands of
 *  calls would be a persistent financial-DoS amplifier — `x_search` bills per successful call
 *  APPLICATION-WIDE (see .claude/rules/agent.md's billing footgun). Cap it (headroom over the ~5
 *  legit calls); an over-cap template fails to parse and the run falls back to the drafted path. */
const MAX_TEMPLATE_CALLS = 8;

/** One drafted x_search subtool call — mirrors SubtoolCall in tools.ts (tool + args). */
export const searchTemplateSchema = z.object({
  calls: z
    .array(
      z.object({
        tool: z.string(),
        args: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(MAX_TEMPLATE_CALLS),
});
export type SearchTemplate = z.infer<typeof searchTemplateSchema>;

/** The current scan window to stamp into a frozen template. */
export type TemplateWindow = {
  sinceUnix: number;
  fromDate: string;
  toDate: string;
  handles: string[];
};

/**
 * Return a NEW template with only the date window re-stamped — the queries themselves are frozen.
 * For each call's args: rewrite any `since_time:<digits>` in a string `query` to the new sinceUnix,
 * and overwrite `from_date`/`to_date`/`usernames` keys IF ALREADY PRESENT (never add keys a call
 * didn't have — a keyword call has no from_date/usernames and must stay that way). Pure; no mutation
 * of the input.
 */
export function restampTemplate(template: SearchTemplate, window: TemplateWindow): SearchTemplate {
  return {
    calls: template.calls.map((call) => {
      const args: Record<string, unknown> = { ...call.args };
      if (typeof args.query === "string") {
        args.query = args.query.replace(/since_time:\d+/g, `since_time:${window.sinceUnix}`);
      }
      if ("from_date" in args) args.from_date = window.fromDate;
      if ("to_date" in args) args.to_date = window.toDate;
      if ("usernames" in args) args.usernames = window.handles;
      return { tool: call.tool, args };
    }),
  };
}

/** One executed oparax_x_search part mined from a saved transcript: the drafted `calls` it was given
 *  as input and its tool output (raw posts + the grok `costUsd` from callResponses). */
export type ExecutedSearchPart = { input: unknown; costUsd: number | null };

/**
 * The ONE structural walk over a saved UI-message transcript: every executed oparax_x_search part
 * (`state: "output-available"`), in order. Every transcript-mining helper below (and the save action)
 * shares this so the opaque-shape casts and the `type`/`state` predicate live in a single place — a
 * future tool rename changes one function, not four. Defensive: the transcript is opaque `unknown`.
 */
export function executedSearchParts(transcript: unknown): ExecutedSearchPart[] {
  if (!Array.isArray(transcript)) return [];
  const found: ExecutedSearchPart[] = [];
  for (const message of transcript) {
    const parts = (message as { parts?: unknown })?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const p = part as {
        type?: unknown;
        state?: unknown;
        input?: unknown;
        output?: { costUsd?: unknown };
      };
      if (p?.type !== "tool-oparax_x_search" || p?.state !== "output-available") continue;
      const costUsd = typeof p.output?.costUsd === "number" ? p.output.costUsd : null;
      found.push({ input: p.input, costUsd });
    }
  }
  return found;
}

/** Join every assistant TEXT part — the onboarding extraction model's input (the agent's presented
 *  scan + drafts live here as prose). Shares the transcript-mining home; distinct predicate (assistant
 *  role, text parts) from `executedSearchParts`, so it walks separately. */
export function collectAssistantText(transcript: unknown): string {
  if (!Array.isArray(transcript)) return "";
  const chunks: string[] = [];
  for (const message of transcript) {
    if ((message as { role?: unknown })?.role !== "assistant") continue;
    const parts = (message as { parts?: unknown })?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const p = part as { type?: unknown; text?: unknown };
      if (p?.type === "text" && typeof p.text === "string") chunks.push(p.text);
    }
  }
  return chunks.join("\n\n");
}

/**
 * Pull the frozen template out of a saved chat transcript: the LAST oparax_x_search tool part that
 * actually executed, taking the `calls` it was given as input. Returns null when the transcript has
 * no executed scan (a desk saved without a chat scan) OR the calls fail the schema (incl. the call
 * cap) — the caller then falls back to the live-drafting path.
 */
export function extractSearchTemplate(transcript: unknown): SearchTemplate | null {
  let found: SearchTemplate | null = null;
  for (const part of executedSearchParts(transcript)) {
    const calls = (part.input as { calls?: unknown })?.calls;
    const parsed = searchTemplateSchema.safeParse({ calls });
    if (parsed.success) found = parsed.data; // keep the LAST successful one
  }
  return found;
}
