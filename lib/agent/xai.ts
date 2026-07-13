// agent/lib/xai.ts
//
// Low-level client for xAI's /responses endpoint — a raw fetch (NOT @ai-sdk/xai,
// whose responses provider flattens the per-subtool trace away). Shared by BOTH
// grok tools: the scan executor (grok_twitter_search) and the handle verifier
// (grok_verify_handles). It lives in lib/ rather than inside one of the tools so
// neither grok tool depends on the other — the same pattern agent/lib/cadence.ts
// establishes for the cadence tools.

const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";

export type Effort = "none" | "low" | "medium" | "high";

export type CallOpts = {
  system: string;
  user: string;
  /** Scope x_search to these handles (max 20). Omit for a bare, unscoped x_search (e.g. handle verification). */
  handles?: string[];
  fromDate?: string;
  toDate?: string;
  effort?: Effort;
  /** Cap on agentic tool-call turns — raise it above the handle/subtool count so a large loop isn't truncated by xAI's server default. Omit for that default. */
  maxTurns?: number;
  /** Abort the request after this many ms so a stalled xAI call fails fast with a clear error instead of hanging the tool indefinitely. Default 150s. */
  timeoutMs?: number;
};

type XaiOutputItem = {
  type: string;
  name?: string;
  input?: string;
  arguments?: string;
  content?: Array<{ text?: string; annotations?: Array<{ url?: string; title?: string }> }>;
};
type XaiUsage = {
  cost_in_usd_ticks?: number;
  num_server_side_tools_used?: number;
  num_sources_used?: number;
  server_side_tool_usage_details?: Record<string, number>;
  output_tokens_details?: { reasoning_tokens?: number };
};
type XaiResponse = { output?: XaiOutputItem[]; usage?: XaiUsage; error?: unknown };

/**
 * Low-level call to xAI's /responses endpoint (raw fetch, not @ai-sdk/xai, so the
 * per-subtool trace survives). Arbitrary system+user prompt and optional x_search
 * scoping so it serves both the scan executor and the handle verifier.
 */
export async function callResponses(o: CallOpts) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not set");

  const xSearch: Record<string, unknown> = { type: "x_search" };
  if (o.handles?.length) xSearch.allowed_x_handles = o.handles;
  if (o.fromDate) xSearch.from_date = o.fromDate;
  if (o.toDate) xSearch.to_date = o.toDate;

  // Hard wall-clock bound: without it, a stalled xAI /responses (a slow or hung
  // agentic x_search over many handles) leaves the tool call spinning forever with
  // no error — the run just looks stuck. AbortSignal.timeout turns that into a
  // clean, surfaced failure the reporter can retry.
  const timeoutMs = o.timeoutMs ?? 150_000;
  let res: Response;
  try {
    res = await fetch(XAI_RESPONSES_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-4.3",
        // effort:"none" — grok is a verbatim executor, it needs no planning reasoning
        // (proven to still enforce the drafted operators).
        reasoning: { effort: o.effort ?? "none" },
        input: [
          { role: "system", content: o.system },
          { role: "user", content: o.user },
        ],
        tools: [xSearch],
        ...(o.maxTurns != null ? { max_turns: o.maxTurns } : {}),
        store: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(
        `xAI /responses timed out after ${timeoutMs / 1000}s — the grok search did not return. Try again or narrow the scan.`,
      );
    }
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xAI /responses ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as XaiResponse;
  const output = json.output ?? [];

  const items = output
    .filter((o) => o.type === "message")
    .flatMap((o) => (o.content ?? []).map((c) => c.text).filter(Boolean))
    .join("\n")
    .trim();

  const sources: Array<{ url: string; title: string }> = [];
  for (const o of output) {
    if (o.type !== "message") continue;
    for (const c of o.content ?? []) {
      for (const a of c.annotations ?? []) {
        if (a?.url) sources.push({ url: a.url, title: a.title ?? a.url });
      }
    }
  }

  // DEBUG (ft/44): the per-subtool trace (names + exact args) the Vercel provider
  // flattens away — the whole reason we call /responses directly. Match both the
  // generic `custom_tool_call` and any `*_search_call` (x_keyword_search_call,
  // x_semantic_search_call, …) so per-subtool items aren't silently missed.
  const subtoolCalls = output
    .filter((o) => o.type === "custom_tool_call" || o.type.endsWith("_search_call"))
    .map((o) => ({ name: o.name, input: o.input ?? o.arguments }));

  const usage = json.usage;
  const costUsd = usage?.cost_in_usd_ticks != null ? usage.cost_in_usd_ticks / 1e10 : null;

  return { items, sources, subtoolCalls, usage, costUsd };
}
