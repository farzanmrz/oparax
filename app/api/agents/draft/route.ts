// Imports
import { NextResponse } from "next/server";
import { weightedLength } from "@/lib/draft/count";
import { generateDraft } from "@/lib/draft/generate";
import { createClient } from "@/lib/supabase/server";

// Node runtime for the OpenAI SDK; generation is reasoning-heavy.
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Prompt-lab draft: generate one tweet for the selected story from the operator's
 * drafting instructions. The draft SYSTEM prompt is fixed in code. Ephemeral —
 * persists nothing (post does that).
 * @param req - the request carrying the selected story + drafting instructions
 * @returns the generated draft text + weighted length, or a JSON error
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

  // Parse the request body.
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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      {
        error: "Invalid body.",
      },
      {
        status: 400,
      },
    );
  }
  const record = body as Record<string, unknown>;

  const draftingInstructions =
    typeof record.draftingInstructions === "string" ? record.draftingInstructions : "";
  const storyTitle = typeof record.storyTitle === "string" ? record.storyTitle.trim() : "";
  const storySummary = typeof record.storySummary === "string" ? record.storySummary.trim() : "";
  if (!storyTitle && !storySummary) {
    return NextResponse.json(
      {
        error: "Select a story first.",
      },
      {
        status: 400,
      },
    );
  }

  // Generate + validate (+ one repair); system prompt comes from code.
  const result = await generateDraft({
    draftingInstructions,
    story: {
      title: storyTitle,
      summary: storySummary,
    },
    exampleTweets: [],
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

  return NextResponse.json({
    text: result.text,
    weightedLength: weightedLength(result.text),
  });
}
