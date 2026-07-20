// lib/agent/scan-run.ts
//
// The headless scan runner. TWO deterministic passes, so grok ALWAYS runs (the earlier
// single `generateText` + `Output.object` let DeepSeek satisfy the output schema with empty
// items WITHOUT ever calling the tool — verified in a live run):
//   1. Cluster the raw posts into prose (`.text`) — one of TWO acquisition paths:
//      - **Frozen** (`desk.searchTemplate` set): the drafted `x_search` calls are already known
//        (captured at desk save) — restamp their date window and run them directly via
//        `executeSearchCalls`, no tool loop, then a single no-tools `generateText` against
//        `SCAN_CLUSTER_RUNNER_PROMPT` clusters the already-retrieved posts.
//      - **Drafted** (no template): a forced tool loop — `prepareStep` pins `toolChoice:
//        'required'` on step 0, so the model MUST call `oparax_x_search` (drafting the searches
//        per `SCAN_RUNNER_PROMPT`) before it can respond; it then clusters the raw posts into
//        prose in the same call.
//   2. `generateObject` (NO tools, so no output-vs-tool race) turns that prose into the
//      structured `scanResultSchema` items — byte-identical for both paths.
// Mirrors agent.ts's model + provider options. Called per-desk by the dispatcher and by the
// dashboard's scanNow action; persistence happens in the caller. SERVER-ONLY.
import { generateObject, generateText, stepCountIs } from "ai";
import {
  SCAN_CLUSTER_RUNNER_PROMPT,
  SCAN_RUNNER_PROMPT,
  SCAN_STRUCTURE_PROMPT,
} from "@/lib/sysprompts";
import { scanWindowFor } from "./next-run";
import type { ScanFrequency } from "./scan-frequency";
import type { NewsItem } from "./scan-result";
import { scanResultSchema } from "./scan-result";
import { restampTemplate, type SearchTemplate } from "./search-template";
import { executeSearchCalls, oparaxXSearch } from "./tools";
import { rawEstimatedCost, sumCosts } from "./usage-cost";

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
 *  usually lands. Two attempts (one retry) — enough to clear a transient parse blip, capped low so
 *  three slow attempts on the failure path can't push the run past the cron function's 300s cap. */
const STRUCTURE_ATTEMPTS = 2;

/** The runScan outcome. `error` is set ONLY when Pass 2 (structuring) ultimately failed after
 *  retries — a soft failure that still carries Pass 1's grok cost + trace so the spent money and
 *  the raw search trace are never lost to a structuring hiccup. Pass 1 / gateway failures still
 *  throw (nothing partial to preserve). `costGrok` is grok's own dollar spend (search + subtool
 *  calls); `costDeepseek` is DeepSeek's own dollar spend (cluster + structure), read off
 *  `usage.raw.estimated_cost` per call via `usage-cost.ts` — the two providers bill separately. */
export type ScanRunResult = {
  items: NewsItem[];
  costGrok: number | null;
  costDeepseek: number | null;
  usage: unknown;
  trace: unknown;
  error?: string;
};

export async function runScan(
  desk: {
    beat: string;
    handles: string[];
    scanFrequency: ScanFrequency;
    searchTemplate?: SearchTemplate | null;
  },
  now: Date = new Date(),
  firedAt: Date = now,
): Promise<ScanRunResult> {
  const startedAt = Date.now();
  const model = "deepseek/deepseek-v4-flash";
  const providerOptions = { gateway: { sort: "cost" as const } };

  let costGrok: number | null;
  let clusterText: string;
  let clusterUsage: unknown;
  let clusterPerStepCosts: Array<number | null>;
  let querySource: "frozen" | "drafted";
  let reasoning: unknown;
  let draftedCalls: unknown;
  let subtoolCalls: unknown;

  if (desk.searchTemplate) {
    // Frozen path — the calls are already known (captured at save time); just restamp the date
    // window and run them directly, no tool loop, no re-drafting.
    querySource = "frozen";
    const window = scanWindowFor(desk.scanFrequency, now, firedAt);
    const restamped = restampTemplate(desk.searchTemplate, { ...window, handles: desk.handles });
    const exec = await executeSearchCalls(
      restamped.calls,
      desk.handles,
      window.fromDate,
      window.toDate,
    );
    costGrok = exec.costUsd;
    draftedCalls = restamped.calls;
    subtoolCalls = exec.subtoolCalls;

    // No `reasoning` param: DeepSeek V4 thinks by default and self-scales effort (see agent.ts).
    // Clustering is genuine judgment, so let its native adaptive thinking run.
    const cluster = await generateText({
      model,
      providerOptions,
      instructions: `${SCAN_CLUSTER_RUNNER_PROMPT}\n\n${clockBlock(now, desk.scanFrequency, firedAt)}`,
      prompt: `Beat: ${desk.beat}\nWatched handles: ${desk.handles.join(", ")}\n\nRetrieved posts:\n${exec.items}`,
    });
    clusterText = cluster.text;
    clusterUsage = cluster.usage;
    clusterPerStepCosts = cluster.steps.map((s) => rawEstimatedCost(s.usage));
    reasoning = cluster.reasoningText ?? cluster.reasoning;
  } else {
    // Drafted path — forced tool loop. `toolChoice: 'required'` on step 0 guarantees the grok
    // call (drafting the searches per the prompt); later steps cluster the raw posts into prose.
    querySource = "drafted";
    const gen = await generateText({
      model,
      // No `reasoning`: DeepSeek V4 thinks by default and self-scales effort (see agent.ts).
      // Clustering is genuine judgment, so let its native adaptive thinking run.
      providerOptions,
      instructions: `${SCAN_RUNNER_PROMPT}\n\n${clockBlock(now, desk.scanFrequency, firedAt)}`,
      prompt: `Beat: ${desk.beat}\nWatched handles: ${desk.handles.join(", ")}`,
      tools: { oparax_x_search: oparaxXSearch },
      stopWhen: stepCountIs(4),
      prepareStep: ({ stepNumber }) => (stepNumber === 0 ? { toolChoice: "required" } : {}),
    });

    // Capture Pass 1's cost + trace BEFORE Pass 2 runs. grok has already fired and billed by now,
    // so a Pass-2 failure must NOT discard this — that loss is exactly what left failed runs with
    // a null cost and "No trace recorded". Only oparax_x_search exists in the toolset, so every
    // toolResult is a grok invocation.
    costGrok = sumCosts(gen.toolResults.map((r) => (r.output as XSearchToolOutput).costUsd));
    clusterText = gen.text;
    clusterUsage = gen.usage;
    clusterPerStepCosts = gen.steps.map((s) => rawEstimatedCost(s.usage));
    reasoning = gen.reasoningText ?? gen.reasoning;
    // The calls DeepSeek drafted for each oparax_x_search invocation.
    draftedCalls = gen.toolCalls.map((call) => (call.input as XSearchToolInput).calls);
    // The verbatim per-subtool executions grok ran — the raw callResponses trace this
    // whole pipeline exists to preserve (see xai.ts).
    subtoolCalls = gen.toolResults.map((r) => (r.output as XSearchToolOutput).subtoolCalls);
  }

  const buildTrace = (error?: string) => ({
    querySource,
    reasoning,
    draftedCalls,
    subtoolCalls,
    ...(error ? { structureError: error } : {}),
    timings: { startedAt, finishedAt: Date.now(), durationMs: Date.now() - startedAt },
  });

  // Pass 2 — structure the clustered prose into items. No tools here, so there is no
  // output-vs-tool-loop race. `reasoning: 'none'` (DeepSeek default is thinking ON) is load-
  // bearing, NOT a cleanup target: this is a mechanical reformat, and with thinking on the model
  // interleaves its reasoning with the JSON (or spends the output budget reasoning), which
  // surfaced as `NoObjectGeneratedError: could not parse the response` only on large 20-handle
  // results. Omitting the param would silently re-enable thinking here — pin it off explicitly.
  // The high output ceiling (no mid-JSON truncation) and the retry are defense-in-depth on top.
  let lastError: unknown;
  for (let attempt = 1; attempt <= STRUCTURE_ATTEMPTS; attempt++) {
    try {
      const structured = await generateObject({
        model,
        reasoning: "none",
        providerOptions,
        maxOutputTokens: STRUCTURE_MAX_OUTPUT_TOKENS,
        schema: scanResultSchema,
        system: SCAN_STRUCTURE_PROMPT,
        prompt: clusterText,
      });
      return {
        items: structured.object.items,
        costGrok,
        costDeepseek: sumCosts([...clusterPerStepCosts, rawEstimatedCost(structured.usage)]),
        usage: { cluster: clusterUsage, structure: structured.usage },
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
    costGrok,
    costDeepseek: sumCosts(clusterPerStepCosts),
    usage: { cluster: clusterUsage, structure: null },
    trace: buildTrace(message),
    error: `structuring failed after ${STRUCTURE_ATTEMPTS} attempts: ${message}`,
  };
}
