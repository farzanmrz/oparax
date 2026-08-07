"use server";

import { fetchExcludedPosts } from "@/lib/agent/excluded-query";
import {
  EXCLUDED_PAGE_SIZE,
  type ExcludedCursor,
  isExcludedCursor,
} from "@/lib/agent/excluded-shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function fetchOwnedExcludedPage(deskId: string, cursor: ExcludedCursor | null) {
  if (cursor && !isExcludedCursor(cursor))
    return { ok: false as const, error: "Invalid excluded cursor." };
  try {
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
    return {
      ok: true as const,
      page: await fetchExcludedPosts(createAdminClient(), desk.id, {
        cursor,
        limit: EXCLUDED_PAGE_SIZE,
      }),
    };
  } catch {
    return { ok: false as const, error: "Could not load more excluded posts." };
  }
}
