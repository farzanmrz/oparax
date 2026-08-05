import { fetchExcludedPosts } from "@/lib/agent/excluded-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExcludedEmptyState, ExcludedItemCard } from "../excluded-item";

/**
 * The Excluded tab — posts the drafting pipeline judged off this desk's beat, newest first.
 * `app/agents/[id]/layout.tsx` already resolved and owner-checked this `id`, so this page
 * trusts it. `fetchExcludedPosts` runs on the SERVICE-ROLE client — `source_posts` carries
 * deny-all RLS, so the cookie client would silently return zero rows on the join regardless
 * of `excluded_posts`' own reporter-readable policy (see excluded-query.ts's own comment).
 */
export default async function ExcludedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const items = await fetchExcludedPosts(admin, id);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
      {items.length === 0 ? (
        <ExcludedEmptyState />
      ) : (
        // Matches Feed's grid breakpoint (md) and gap shape (gap-x-7/gap-y-4); this page's
        // cards are single-purpose (no story+draft pairing), so grid-cols-2 stays as-is.
        <div className="grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2">
          {items.map((item) => (
            <ExcludedItemCard item={item} key={item.id} />
          ))}
        </div>
      )}
    </div>
  );
}
