"use server";

import { fetchFeedPage } from "@/lib/agent/feed-query";
import {
  FEED_REFRESH_CHUNK,
  type FeedCursor,
  isFeedCursor,
  parseFeedFilters,
} from "@/lib/agent/feed-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function fetchOwnedFeedPage(
  deskId: string,
  rawFilters: Record<string, string | string[] | undefined>,
  cursor: FeedCursor | null,
  limit: number,
) {
  if (cursor && !isFeedCursor(cursor)) return { ok: false as const, error: "Invalid feed cursor." };
  if (!Number.isFinite(limit)) return { ok: false as const, error: "Invalid feed limit." };
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false as const, error: "Please sign in again." };
  const { data: desk, error: deskError } = await supabase
    .from("agents")
    .select("id")
    .eq("id", deskId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (deskError || !desk) return { ok: false as const, error: "Could not load this agent." };

  try {
    const page = await fetchFeedPage(createAdminClient(), desk.id, {
      filters: parseFeedFilters(rawFilters),
      cursor,
      limit: Math.max(1, Math.min(limit, FEED_REFRESH_CHUNK)),
    });
    return { ok: true as const, page };
  } catch {
    return { ok: false as const, error: "Could not load more stories." };
  }
}
