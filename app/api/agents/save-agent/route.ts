// Imports
import { NextResponse } from "next/server";
import { agentConfigSchema, configToColumns } from "@/lib/chat/config";
import { buildRunItemInsert } from "@/lib/scan/run-items";
import type { PreviewStory, ScanMetrics } from "@/lib/scan/types";
import { createClient } from "@/lib/supabase/server";
import type { RunItemInsert } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStory(value: unknown): PreviewStory | null {
  if (!isRecord(value)) return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  const primaryTweetUrl =
    typeof value.primaryTweetUrl === "string" ? value.primaryTweetUrl.trim() : "";
  const dedupeKey = typeof value.dedupeKey === "string" ? value.dedupeKey.trim() : "";
  const draft = typeof value.draft === "string" ? value.draft.trim() : "";
  const sourceUrls = Array.isArray(value.sourceUrls)
    ? value.sourceUrls
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean)
    : [];

  // Keep failed-draft preview items (draft === "") — they persist as status:"failed"
  // below (recoverable via Redraft). Drop only items missing the core scan fields.
  if (!title || !summary || !dedupeKey) return null;

  return {
    title,
    summary,
    sourceUrls,
    primaryTweetUrl,
    dedupeKey,
    draft,
    sources: [], // sources is preview-only; not persisted to or read from DB
  };
}

function normalizeMetrics(value: unknown): ScanMetrics | null {
  if (!isRecord(value)) return null;
  const costUsd =
    typeof value.costUsd === "number" && Number.isFinite(value.costUsd) ? value.costUsd : null;
  const elapsedMs =
    typeof value.elapsedMs === "number" && Number.isFinite(value.elapsedMs) ? value.elapsedMs : 0;
  const xSearchCalls =
    typeof value.xSearchCalls === "number" && Number.isFinite(value.xSearchCalls)
      ? value.xSearchCalls
      : null;
  const inputTokens =
    typeof value.inputTokens === "number" && Number.isFinite(value.inputTokens)
      ? value.inputTokens
      : null;
  const outputTokens =
    typeof value.outputTokens === "number" && Number.isFinite(value.outputTokens)
      ? value.outputTokens
      : null;

  return {
    costUsd,
    elapsedMs,
    xSearchCalls,
    inputTokens,
    outputTokens,
  };
}

/**
 * Save an agent configuration produced by the chat/form UI.
 * Expects `{ config: AgentConfig, stories?: PreviewStory[], metrics?: ScanMetrics }`.
 * Validates `config` with the zod schema; keeps plain typeof checks for
 * `stories` and `metrics`. Preserves auth + ownership + no-duplicate-name
 * guard and the run → run_items insertion for any preview stories.
 * @returns `{ id }` on success, or a JSON error.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON.",
      },
      {
        status: 400,
      },
    );
  }
  if (!isRecord(body)) {
    return NextResponse.json(
      {
        error: "Invalid body.",
      },
      {
        status: 400,
      },
    );
  }

  // Validate the config object via zod.
  const parsed = agentConfigSchema.safeParse(body.config);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid config.",
      },
      {
        status: 400,
      },
    );
  }
  const config = parsed.data;

  const stories = Array.isArray(body.stories)
    ? body.stories.map(normalizeStory).filter((story): story is PreviewStory => story !== null)
    : [];
  const metrics = normalizeMetrics(body.metrics);

  // No-duplicate-name check.
  const { data: existingAgents, error: existingError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", config.name)
    .limit(1);

  if (existingError) {
    return NextResponse.json(
      {
        error: "Failed to check existing agents.",
      },
      {
        status: 500,
      },
    );
  }
  if ((existingAgents ?? []).length > 0) {
    return NextResponse.json(
      {
        error: "An agent with this name already exists.",
      },
      {
        status: 409,
      },
    );
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      ...configToColumns(config, user.id),
      status: "active",
    })
    .select("id")
    .single<{
      id: string;
    }>();

  if (error || !agent) {
    return NextResponse.json(
      {
        error: "Failed to save agent.",
      },
      {
        status: 500,
      },
    );
  }

  if (stories.length > 0) {
    const { data: run, error: runError } = await supabase
      .from("runs")
      .insert({
        agent_id: agent.id,
        source: "manual",
        status: "completed",
        completed_at: new Date().toISOString(),
        cost_usd: metrics?.costUsd ?? null,
        x_search_count: metrics?.xSearchCalls ?? null,
        item_count: stories.length,
        inputs: {
          handles: config.sources.x.handles,
          monitoringDescription: config.scanningInstructions,
          draftingInstructions: config.draftingInstructions,
        },
      })
      .select("id")
      .single<{
        id: string;
      }>();

    if (runError || !run) {
      return NextResponse.json(
        {
          error: "Agent saved, but the preview run could not be saved.",
        },
        {
          status: 500,
        },
      );
    }

    // Dedupe by dedupeKey before insert to avoid (run_id, dedupe_key) unique constraint collision.
    const seenKeys = new Set<string>();
    const dedupedStories = stories.filter((story) => {
      if (seenKeys.has(story.dedupeKey)) return false;
      seenKeys.add(story.dedupeKey);
      return true;
    });

    // A failed preview draft arrives as draft:"" — buildRunItemInsert persists it as a
    // recoverable status:"failed" item (matching the saved-run path), not a blank drafted one.
    const runItems: RunItemInsert[] = dedupedStories.map((story) =>
      buildRunItemInsert(
        {
          run_id: run.id,
          agent_id: agent.id,
          story_title: story.title,
          story_summary: story.summary,
          source_urls: story.sourceUrls,
          primary_tweet_url: story.primaryTweetUrl,
          dedupe_key: story.dedupeKey,
        },
        { text: story.draft || null, error: "Draft failed during creation." },
      ),
    );
    const { error: itemsError } = await supabase.from("run_items").insert(runItems);

    if (itemsError) {
      return NextResponse.json(
        {
          error: "Agent saved, but the preview items could not be saved.",
        },
        {
          status: 500,
        },
      );
    }
  }

  return NextResponse.json({
    id: agent.id,
  });
}
