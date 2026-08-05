// lib/agent/excluded-query.ts
//
// Pure query + shaping for the Excluded tab's list. source_posts carries deny-all RLS (zero
// SELECT policies) — the caller MUST pass the SERVICE-ROLE client here, exactly like
// feed-query.ts's own top-of-file warning: an owner-scoped cookie client would silently get
// zero source_posts rows back even though excluded_posts' own RLS would allow the read,
// because the JOINED table blocks it regardless. This query re-scopes to agentId explicitly
// anyway.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { authorNameFromRaw } from "./feed-query";

type Client = SupabaseClient<Database>;

const EXCLUDED_PAGE_LIMIT = 50;

export type ExcludedPost = {
  id: string; // excluded_posts.id
  sourcePost: {
    id: string;
    authorHandle: string | null;
    authorName: string | null;
    text: string;
    postedAt: string | null;
    xPostId: string | null;
  };
  onBeatReason: string;
  excludedAt: string;
};

export async function fetchExcludedPosts(client: Client, agentId: string): Promise<ExcludedPost[]> {
  const { data, error } = await client
    .from("excluded_posts")
    .select(
      "id, on_beat_reason, excluded_at, source_posts(id, author_handle, raw, text, posted_at, x_post_id)",
    )
    .eq("agent_id", agentId)
    .order("excluded_at", { ascending: false })
    .limit(EXCLUDED_PAGE_LIMIT);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const sourcePost = row.source_posts;
    return {
      id: row.id,
      sourcePost: {
        id: sourcePost.id,
        authorHandle: sourcePost.author_handle,
        authorName: authorNameFromRaw(sourcePost.raw),
        text: sourcePost.text,
        postedAt: sourcePost.posted_at,
        xPostId: sourcePost.x_post_id,
      },
      onBeatReason: row.on_beat_reason,
      excludedAt: row.excluded_at,
    };
  });
}
