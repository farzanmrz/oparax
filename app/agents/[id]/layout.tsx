import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The desk-scoped layout for `/agents/[id]/*`. Its only job now is the ownership guard: the
 * desk's chrome (name, live/paused dot, pause/delete controls, and the Feed/Voice/Setup tabs)
 * all render in the single site header one segment up (`components/site-header.tsx`), which is
 * pathname-aware. So this layout resolves the id, 404s on a foreign/absent one (RLS makes those
 * indistinguishable — both a 0-row miss), and renders the page.
 */
export default async function DeskLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("experiments")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) notFound();

  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
