import "server-only";

import { digestDescription, type GithubReader } from "@/lib/digests/github";
import { createAdminClient } from "@/lib/supabase/admin";

export async function checkThresholds(
  monitorId: string,
  reader: GithubReader,
  deadline: number,
): Promise<number> {
  const db = createAdminClient();
  let cursor = "";
  let crossed = 0;
  while (Date.now() < deadline) {
    const { data: followed, error } = await db
      .from("followed_repos")
      .select("repo,threshold,crossed_at")
      .eq("monitor_id", monitorId)
      .gt("repo", cursor)
      .order("repo")
      .limit(100);
    if (error) throw error;
    if (!followed.length) break;
    for (const follow of followed) {
      if (Date.now() >= deadline) return crossed;
      const repo = await reader.repo(follow.repo);
      const now = new Date().toISOString();
      const crossing = follow.crossed_at === null && repo.stars >= follow.threshold;
      if (crossing) {
        // Save the card first so a failed marker update can safely resume without losing it.
        const { error: cardError } = await db.from("digest_items").upsert(
          {
            monitor_id: monitorId,
            kind: "star_threshold",
            external_id: `${follow.repo.toLowerCase()}:${follow.threshold}`,
            name: repo.name,
            url: repo.url,
            description: digestDescription(repo.description),
            why_now: `Passed ${follow.threshold} stars (${repo.stars})`,
          },
          { onConflict: "monitor_id,kind,external_id", ignoreDuplicates: true },
        );
        if (cardError) throw cardError;
      }
      let update = db
        .from("followed_repos")
        .update({
          stars: repo.stars,
          checked_at: now,
          crossed_at: crossing ? now : follow.crossed_at,
        })
        .eq("monitor_id", monitorId)
        .eq("repo", follow.repo)
        .eq("threshold", follow.threshold);
      update =
        follow.crossed_at === null
          ? update.is("crossed_at", null)
          : update.eq("crossed_at", follow.crossed_at);
      const { data: updated, error: updateError } = await update.select("repo");
      if (updateError) throw updateError;
      if (crossing) crossed += updated.length;
      cursor = follow.repo;
    }
  }
  return crossed;
}
