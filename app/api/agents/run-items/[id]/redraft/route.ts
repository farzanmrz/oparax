// Imports
import { NextResponse } from "next/server";
import { weightedLength } from "@/lib/draft/count";
import { generateDraft } from "@/lib/draft/generate";
import { createClient } from "@/lib/supabase/server";
import type { Agent, RunItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type RedraftItem = Pick<RunItem, "id" | "agent_id" | "story_title" | "story_summary">;
type RedraftAgent = Pick<Agent, "id" | "drafting_instructions" | "example_tweets">;

/**
 * Regenerate a draft for one persisted run item using the agent's current
 * drafting instructions.
 * @param _req - unused request body
 * @param context.params - dynamic run item id
 * @returns the regenerated draft text
 */
export async function POST(
  _req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await context.params;
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

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, agent_id, story_title, story_summary")
    .eq("id", id)
    .maybeSingle<RedraftItem>();

  if (itemError) {
    return NextResponse.json(
      {
        error: "Failed to load item.",
      },
      {
        status: 500,
      },
    );
  }
  if (!item) {
    return NextResponse.json(
      {
        error: "Draft not found.",
      },
      {
        status: 404,
      },
    );
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, drafting_instructions, example_tweets")
    .eq("id", item.agent_id)
    .eq("user_id", user.id)
    .maybeSingle<RedraftAgent>();

  if (agentError) {
    return NextResponse.json(
      {
        error: "Failed to load agent.",
      },
      {
        status: 500,
      },
    );
  }
  if (!agent) {
    return NextResponse.json(
      {
        error: "Agent not found.",
      },
      {
        status: 404,
      },
    );
  }

  const result = await generateDraft({
    draftingInstructions: agent.drafting_instructions,
    story: {
      title: item.story_title,
      summary: item.story_summary,
    },
    exampleTweets: agent.example_tweets,
  });
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
      },
      {
        status: 502,
      },
    );
  }

  const { error: updateError } = await supabase
    .from("run_items")
    .update({
      drafted_text: result.text,
      final_text: result.text,
      status: "drafted",
      error_message: null,
    })
    .eq("id", item.id);

  if (updateError) {
    return NextResponse.json(
      {
        error: "Failed to save draft.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    text: result.text,
    weightedLength: weightedLength(result.text),
  });
}
