// Imports
import { NextResponse } from "next/server";
import { getDraftIssue } from "@/lib/draft/validate";
import { createClient } from "@/lib/supabase/server";
import type { RunItem } from "@/lib/types";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export const runtime = "nodejs";

type PostableItem = Pick<RunItem, "id" | "agent_id" | "drafted_text" | "final_text" | "status">;

/**
 * Post one persisted draft to X, then update the run item with the live tweet.
 * @param req - optional finalText override from the editor
 * @param context.params - dynamic run item id
 * @returns the posted tweet url
 */
export async function POST(
  req: Request,
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

  const rawBody = (await req.json().catch(() => null)) as unknown;
  const body = typeof rawBody === "object" && rawBody !== null ? rawBody : {};
  const requestedText =
    typeof (
      body as {
        finalText?: unknown;
      }
    ).finalText === "string"
      ? (
          body as {
            finalText: string;
          }
        ).finalText.trim()
      : "";

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, agent_id, drafted_text, final_text, status")
    .eq("id", id)
    .maybeSingle<PostableItem>();

  if (itemError) {
    return NextResponse.json(
      {
        error: "Failed to load draft.",
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
  if (item.status === "posted") {
    return NextResponse.json(
      {
        error: "Draft is already posted.",
      },
      {
        status: 409,
      },
    );
  }

  const text = requestedText || item.final_text || item.drafted_text;
  const issue = getDraftIssue(text);
  if (issue) {
    return NextResponse.json(
      {
        error: issue,
      },
      {
        status: 400,
      },
    );
  }

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No X connection for this user.";
    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }

  const result = await postTweet(accessToken, text);
  if (!result.ok) {
    await supabase
      .from("run_items")
      .update({
        status: "failed",
        final_text: text,
        error_message: result.error,
      })
      .eq("id", item.id);
    return NextResponse.json(
      {
        error: result.error,
      },
      {
        status: result.status,
      },
    );
  }

  const { error: updateError } = await supabase
    .from("run_items")
    .update({
      status: "posted",
      final_text: text,
      x_tweet_id: result.id,
      x_tweet_url: result.url,
      posted_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", item.id);

  if (updateError) {
    return NextResponse.json(
      {
        error: "Tweet posted, but the item could not be updated.",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    id: result.id,
    url: result.url,
  });
}
