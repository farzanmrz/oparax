// lib/agent/excluded-query.ts
//
// Pure query + shaping for the Excluded tab's list. source_posts carries deny-all RLS (zero
// SELECT policies) — the caller MUST pass the SERVICE-ROLE client here, exactly like
// feed-query.ts's own top-of-file warning: an owner-scoped cookie client would silently get
// zero source_posts rows back even though excluded_posts' own RLS would allow the read,
// because the JOINED table blocks it regardless. This query re-scopes to agentId explicitly
// anyway.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canonicalExcludedCursor,
  EXCLUDED_PAGE_SIZE,
  type ExcludedCursor,
  isExcludedCursor,
} from "@/lib/agent/excluded-shared";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type ExcludedPost = {
  id: string; // excluded_posts.id
  sourcePost: {
    id: string;
    authorHandle: string | null;
    text: string;
    postedAt: string | null;
    xPostId: string | null;
    // Branches the card x-vs-website: the label is @handle or hostname, never a display
    // name dug out of raw — matching the feed cards.
    source: string;
    url: string | null;
  };
  onBeatReason: string;
  excludedAt: string;
};

export type ExcludedPage = { items: ExcludedPost[]; nextCursor: ExcludedCursor | null };

function cursorClause(cursor: ExcludedCursor) {
  return `excluded_at.lt."${cursor.excludedAt}",and(excluded_at.eq."${cursor.excludedAt}",id.lt.${cursor.id})`;
}

export async function fetchExcludedPosts(
  client: Client,
  agentId: string,
  opts: { cursor?: ExcludedCursor | null; limit?: number } = {},
): Promise<ExcludedPage> {
  const cursor = isExcludedCursor(opts.cursor) ? opts.cursor : null;
  const limit = Math.max(1, Math.min(opts.limit ?? EXCLUDED_PAGE_SIZE, EXCLUDED_PAGE_SIZE));
  let query = client
    .from("excluded_posts")
    .select(
      "id, on_beat_reason, excluded_at, source_posts(id, author_handle, text, posted_at, x_post_id, source, url)",
    )
    .eq("agent_id", agentId)
    .order("excluded_at", { ascending: false })
    .order("id", { ascending: false });
  if (cursor) query = query.or(cursorClause(cursor));
  const { data, error } = await query.limit(limit);
  if (error) throw error;

  const items = (data ?? []).map((row) => {
    const sourcePost = row.source_posts;
    return {
      id: row.id,
      sourcePost: {
        id: sourcePost.id,
        authorHandle: sourcePost.author_handle,
        text: sourcePost.text,
        postedAt: sourcePost.posted_at,
        xPostId: sourcePost.x_post_id,
        source: sourcePost.source,
        url: sourcePost.url,
      },
      onBeatReason: row.on_beat_reason,
      excludedAt: row.excluded_at,
    };
  });
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      last && items.length === limit
        ? canonicalExcludedCursor({ excludedAt: last.excludedAt, id: last.id })
        : null,
  };
}
