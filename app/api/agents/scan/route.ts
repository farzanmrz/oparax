// Imports
import { SCAN_MODEL } from "@/lib/ai/providers";
import { isValidHandle, MONITOR_MAX_HANDLES, normalizeHandle } from "@/lib/scan/handles";
import { runScanStream } from "@/lib/scan/run";
import { extractMetrics, scanToUIResponse, storiesFromOutput } from "@/lib/scan/ui-stream";
import { createClient } from "@/lib/supabase/server";
import { logUsage } from "@/lib/usage/log";

// Node runtime for streaming; headroom over the 180s client timeout.
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Prompt-lab run: stream a Grok x_search scan using the AI SDK, returning an
 * AI SDK UI message stream. Ephemeral — save persists the preview.
 * @param req - request carrying handles + scan/draft instructions
 * @returns AI SDK UI message stream response
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Authentication required.", {
      status: 401,
    });
  }

  // Parse + validate the editable lab fields.
  const rawBody = (await req.json().catch(() => null)) as unknown;
  if (typeof rawBody !== "object" || rawBody === null) {
    return new Response("Invalid JSON.", {
      status: 400,
    });
  }
  const body = rawBody as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return new Response("Agent name is required.", {
      status: 400,
    });
  }

  const { data: existingAgents, error: existingError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", name)
    .limit(1);

  if (existingError) {
    return new Response("Failed to check existing agents.", {
      status: 500,
    });
  }
  if ((existingAgents ?? []).length > 0) {
    return new Response("An agent with this name already exists.", {
      status: 409,
    });
  }

  const handles = Array.isArray(body.handles)
    ? [
        ...new Set(
          body.handles
            .filter((h): h is string => typeof h === "string")
            .map(normalizeHandle)
            .filter(Boolean),
        ),
      ]
    : [];
  // Empty handles is allowed for "describe-only" X search (runScanStream passes
  // allowedXHandles: undefined when handles is empty, searching by description only).
  if (handles.length > MONITOR_MAX_HANDLES) {
    return new Response(`Maximum ${MONITOR_MAX_HANDLES} handles allowed.`, {
      status: 400,
    });
  }
  const invalid = handles.find((handle) => !isValidHandle(handle));
  if (invalid) {
    return new Response(`"${invalid}" is not a valid X handle.`, {
      status: 400,
    });
  }

  const searchWeb = typeof body.searchWeb === "boolean" ? body.searchWeb : false;

  // Require at least one active source: X (handles present) OR web search enabled.
  if (handles.length === 0 && !searchWeb) {
    return new Response("Enable at least one source: add a handle or enable web search.", {
      status: 400,
    });
  }

  const scanningInstructions =
    typeof body.userPrompt === "string"
      ? body.userPrompt
      : typeof body.scanningInstructions === "string"
        ? body.scanningInstructions
        : "";
  if (!scanningInstructions.trim()) {
    return new Response("A scan user prompt is required.", {
      status: 400,
    });
  }

  const preferredDomains = Array.isArray(body.preferredDomains)
    ? body.preferredDomains.filter((d): d is string => typeof d === "string")
    : [];
  const startedAt = Date.now();
  const result = runScanStream({
    searchX: true,
    handles,
    fromDate: typeof body.fromDate === "string" ? body.fromDate : null,
    toDate: typeof body.toDate === "string" ? body.toDate : null,
    scanningInstructions,
    searchWeb,
    preferredDomains,
    abortSignal: AbortSignal.timeout(240_000),
  });

  return scanToUIResponse(result, {
    onFinish: async () => {
      const [output, metrics] = await Promise.all([
        result.output,
        extractMetrics(result, startedAt),
      ]);
      const stories = output ? storiesFromOutput(output) : [];
      await logUsage({
        kind: "scan",
        provider: "xai",
        resolved_provider: "xai",
        tool_name: "scan",
        model: SCAN_MODEL,
        user_id: user.id,
        input_tokens: metrics.inputTokens,
        output_tokens: metrics.outputTokens,
        xSearchCalls: metrics.xSearchCalls,
        metadata: {
          elapsedMs: metrics.elapsedMs,
          xSearchCalls: metrics.xSearchCalls,
          storyCount: stories.length,
        },
      });
    },
  });
}
