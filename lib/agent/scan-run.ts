// lib/agent/scan-run.ts
//
// The headless scan runner. TWO deterministic passes, so grok ALWAYS runs (the earlier
// single `generateText` + `Output.object` let DeepSeek satisfy the output schema with empty
// items WITHOUT ever calling the tool — verified in a live run):
//   1. A forced tool loop — `prepareStep` pins `toolChoice: 'required'` on step 0, so the
//      model MUST call `oparax_x_search` (drafting the searches per SCAN_RUNNER_PROMPT)
//      before it can respond; it then clusters the raw posts into prose (`gen.text`).
//   2. `generateObject` (NO tools, so no output-vs-tool race) turns that prose into the
//      structured `scanResultSchema` items.
// Mirrors agent.ts's model + provider options. Called per-desk by the dispatcher and by the
// dashboard's scanNow action; persistence happens in the caller. SERVER-ONLY.
import { generateObject, generateText, stepCountIs } from "ai";
import { SCAN_RUNNER_PROMPT, SCAN_STRUCTURE_PROMPT } from "@/lib/sysprompts";
import { scanWindowFor } from "./next-run";
import type { ScanFrequency } from "./scan-frequency";
import type { NewsItem } from "./scan-result";
import { scanResultSchema } from "./scan-result";
import { oparaxXSearch } from "./tools";

// Under this `ai` version the `tool()` OUTPUT/INPUT generics collapse to `unknown` on
// `result.toolResults[].output` / `result.toolCalls[].input`, so narrow them locally to
// the two fields this runner reads. The shapes mirror `callResponses`'s return in
// lib/agent/xai.ts (costUsd + the raw per-subtool trace) and the grok tool's input.calls.
type XSearchToolOutput = {
  costUsd: number | null;
  subtoolCalls: Array<{ name: string | undefined; input: string | undefined }>;
};
type XSearchToolInput = { calls: unknown };

/** Same four fields agent.ts's clockBlock stamps, derived from the desk's own scan window
 *  instead of the onboarding default — a settled desk's since-bound tracks its actual
 *  scan frequency, not the onboarding interval. `firedAt` is the scheduled fire being serviced
 *  (the claimed `next_run_at`); the since-window looks back to the fire before it. */
function clockBlock(now: Date, scanFrequency: ScanFrequency, firedAt: Date): string {
  const nowUnix = Math.floor(now.getTime() / 1000);
  const { sinceUnix, fromDate, toDate } = scanWindowFor(scanFrequency, now, firedAt);
  return [
    "# Clock",
    "",
    `nowUnix: ${nowUnix}`,
    `sinceUnix: ${sinceUnix}`,
    `today: ${toDate}`,
    `yesterday: ${fromDate}`,
  ].join("\n");
}

/** Pass-2 structuring must emit one JSON object per clustered item; a 20-handle scan yields many,
 *  and a low output ceiling truncates the JSON mid-array → `NoObjectGeneratedError`. Give it real
 *  headroom (structuring is pure reformat, so the token cost is bounded by the scan size). */
const STRUCTURE_MAX_OUTPUT_TOKENS = 16_000;
/** generateObject occasionally returns unparseable JSON on a large structuring job; a re-sample
 *  usually lands. Cap the attempts so a persistently-bad response fails fast into the soft-fail. */
const STRUCTURE_ATTEMPTS = 3;

/** The runScan outcome. `error` is set ONLY when Pass 2 (structuring) ultimately failed after
 *  retries — a soft failure that still carries Pass 1's grok trace + cost so the spent money and
 *  the raw search trace are never lost to a structuring hiccup. Pass 1 / gateway failures still
 *  throw (nothing partial to preserve). */
export type ScanRunResult = {
  items: NewsItem[];
  costUsd: number | null;
  usage: unknown;
  trace: unknown;
  error?: string;
};

export async function runScan(
  desk: { beat: string; handles: string[]; scanFrequency: ScanFrequency },
  now: Date = new Date(),
  firedAt: Date = now,
): Promise<ScanRunResult> {
  const startedAt = Date.now();
  const model = "deepseek/deepseek-v4-flash";
  const providerOptions = { gateway: { sort: "cost" as const } };

  // Pass 1 — forced tool loop. `toolChoice: 'required'` on step 0 guarantees the grok call
  // (drafting the searches per the prompt); later steps cluster the raw posts into prose.
  const gen = await generateText({
    model,
    reasoning: "medium",
    providerOptions,
    instructions: `${SCAN_RUNNER_PROMPT}\n\n${clockBlock(now, desk.scanFrequency, firedAt)}`,
    prompt: `Beat: ${desk.beat}\nWatched handles: ${desk.handles.join(", ")}`,
    tools: { oparax_x_search: oparaxXSearch },
    stopWhen: stepCountIs(4),
    prepareStep: ({ stepNumber }) => (stepNumber === 0 ? { toolChoice: "required" } : {}),
  });

  // Capture Pass 1's cost + trace BEFORE Pass 2 runs. grok has already fired and billed by now,
  // so a Pass-2 failure must NOT discard this — that loss is exactly what left failed runs with a
  // null cost and "No trace recorded". Only oparax_x_search exists in the toolset, so every
  // toolResult is a grok invocation.
  const costs = gen.toolResults
    .map((r) => (r.output as XSearchToolOutput).costUsd)
    .filter((c): c is number => c != null);
  const costUsd = costs.length > 0 ? costs.reduce((sum, c) => sum + c, 0) : null;
  const buildTrace = (error?: string) => ({
    reasoning: gen.reasoningText ?? gen.reasoning,
    // The calls DeepSeek drafted for each oparax_x_search invocation.
    draftedCalls: gen.toolCalls.map((call) => (call.input as XSearchToolInput).calls),
    // The verbatim per-subtool executions grok ran — the raw callResponses trace this
    // whole pipeline exists to preserve (see xai.ts).
    subtoolCalls: gen.toolResults.map((r) => (r.output as XSearchToolOutput).subtoolCalls),
    ...(error ? { structureError: error } : {}),
    timings: { startedAt, finishedAt: Date.now(), durationMs: Date.now() - startedAt },
  });

  // Pass 2 — structure the clustered prose into items. No tools here, so there is no
  // output-vs-tool-loop race. NO reasoning: this is a mechanical reformat, and a reasoning model
  // on a structured-output call interleaves its reasoning with the JSON (or spends the output
  // budget reasoning), which surfaced as `NoObjectGeneratedError: could not parse the response`
  // only on large 20-handle results — dropping reasoning is what actually fixes the failure. The
  // high output ceiling (no mid-JSON truncation) and the retry are defense-in-depth on top.
  let lastError: unknown;
  for (let attempt = 1; attempt <= STRUCTURE_ATTEMPTS; attempt++) {
    try {
      const structured = await generateObject({
        model,
        providerOptions,
        maxOutputTokens: STRUCTURE_MAX_OUTPUT_TOKENS,
        schema: scanResultSchema,
        system: SCAN_STRUCTURE_PROMPT,
        prompt: gen.text,
      });
      return {
        items: structured.object.items,
        costUsd,
        usage: { cluster: gen.usage, structure: structured.usage },
        trace: buildTrace(),
      };
    } catch (e) {
      lastError = e;
    }
  }

  // Structuring failed every attempt. Soft-fail: keep Pass 1's cost + trace (the scan really ran
  // and billed) and hand the caller an `error` so it records a `failed` run WITH that trace,
  // instead of a blank one.
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  return {
    items: [],
    costUsd,
    usage: { cluster: gen.usage, structure: null },
    trace: buildTrace(message),
    error: `structuring failed after ${STRUCTURE_ATTEMPTS} attempts: ${message}`,
  };
}
