import type { SupabaseClient } from "@supabase/supabase-js";
import { getDraftIssue } from "@/lib/draft/validate";
import type { Database } from "@/lib/types/database";
import { postTweet } from "@/lib/x/client";
import { getFreshAccessToken } from "@/lib/x/tokens";

export type PostRunItemResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string; status: number; code?: "no_x_connection" };

interface OwnedItem {
  id: string;
  drafted_text: string;
  final_text: string | null;
  status: Database["public"]["Enums"]["item_status"];
  agents: { user_id: string } | null;
}

/**
 * Post one run_item to X as its OWNER. Loads the item joined to its agent's user_id and
 * ASSERTS agent.user_id === ownerUserId before posting with that owner's fresh token — the
 * regression guard that keeps a service-role caller (cron, Stage C) from cross-account posting.
 * The caller passes the client (RLS for the route, service-role for cron) and the ownerUserId.
 * @param postedVia 'manual' (route) or 'auto' (cron auto-post) — written to run_items.posted_via.
 */
export async function postRunItem(args: {
  supabase: SupabaseClient<Database>;
  ownerUserId: string;
  itemId: string;
  requestedText?: string;
  postedVia: "manual" | "auto";
}): Promise<PostRunItemResult> {
  const { supabase, ownerUserId, itemId, requestedText, postedVia } = args;

  const { data: item, error: itemError } = await supabase
    .from("run_items")
    .select("id, drafted_text, final_text, status, agents(user_id)")
    .eq("id", itemId)
    .maybeSingle<OwnedItem>();

  if (itemError) return { ok: false, error: "Failed to load draft.", status: 500 };
  if (!item) return { ok: false, error: "Draft not found.", status: 404 };

  // OWNERSHIP ASSERTION — the cross-account-posting guard. Never trust RLS alone here
  // (cron uses a service-role client that bypasses it).
  if (!item.agents || item.agents.user_id !== ownerUserId) {
    return { ok: false, error: "Draft not found.", status: 404 };
  }
  if (item.status === "posted") {
    return { ok: false, error: "Draft is already posted.", status: 409 };
  }

  const text = requestedText?.trim() || item.final_text || item.drafted_text;
  const issue = getDraftIssue(text);
  if (issue) return { ok: false, error: issue, status: 400 };

  let accessToken: string;
  try {
    accessToken = await getFreshAccessToken(supabase, ownerUserId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No X connection for this user.";
    return { ok: false, error: message, status: 400, code: "no_x_connection" };
  }

  // ATOMIC CLAIM — flip drafted|failed → posting so only ONE caller posts this item. Closes the
  // double-post window between concurrent manual posts (two tabs) and, in Stage C, a manual post
  // racing cron auto-post. The loser of the race claims zero rows and gets a 409.
  const { data: claimed, error: claimError } = await supabase
    .from("run_items")
    .update({ status: "posting" })
    .eq("id", item.id)
    .in("status", ["drafted", "failed"])
    .select("id");
  if (claimError) return { ok: false, error: "Failed to claim draft for posting.", status: 500 };
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "Draft is already being posted.", status: 409 };
  }

  let result: Awaited<ReturnType<typeof postTweet>>;
  try {
    result = await postTweet(accessToken, text);
  } catch (error) {
    // Unexpected throw — release the claim back to 'failed' so the draft stays recoverable.
    await supabase
      .from("run_items")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Failed to post to X.",
      })
      .eq("id", item.id);
    return { ok: false, error: "Failed to post to X.", status: 502 };
  }
  if (!result.ok) {
    await supabase
      .from("run_items")
      .update({ status: "failed", final_text: text, error_message: result.error })
      .eq("id", item.id);
    return { ok: false, error: result.error, status: result.status };
  }

  const { error: updateError } = await supabase
    .from("run_items")
    .update({
      status: "posted",
      final_text: text,
      x_tweet_id: result.id,
      x_tweet_url: result.url,
      posted_at: new Date().toISOString(),
      posted_via: postedVia,
      error_message: null,
    })
    .eq("id", item.id);

  if (updateError) {
    return { ok: false, error: "Tweet posted, but the item could not be updated.", status: 500 };
  }
  return { ok: true, id: result.id, url: result.url };
}
