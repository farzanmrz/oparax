import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { fetchExcludedPosts } from "@/lib/agent/excluded-query";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ExcludedEmptyState, ExcludedItemCard } from "../excluded-item";

/**
 * The Excluded tab — posts the drafting pipeline judged off this desk's beat, newest first.
 * `fetchExcludedPosts` runs on the SERVICE-ROLE client — `source_posts` carries deny-all RLS,
 * so the cookie client would silently return zero rows on the join regardless of
 * `excluded_posts`' own reporter-readable policy (see excluded-query.ts's own comment).
 */
export default async function ExcludedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // Ownership is intentionally awaited before any service-role work. Layout guards protect
  // rendering, but do not prove this server component has not already started an admin read.
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (agentError || !agent) notFound();
  const admin = createAdminClient();
  const items = await fetchExcludedPosts(admin, id);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col gap-4 py-4">
      <PageHeading>Excluded Posts</PageHeading>
      {items.length === 0 ? (
        <ExcludedEmptyState />
      ) : (
        items.map((item) => <ExcludedItemCard item={item} key={item.id} />)
      )}
    </div>
  );
}
