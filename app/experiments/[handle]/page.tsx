// Disposable internal verification surface for slice 1 — proves voice_guides is RLS-readable
// by a signed-in owner through the experiments join. NOT the L8 Voice section (BLOCKED).
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ExperimentVoicePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // RLS does the ownership work: the select policy joins voice_guides.reporter_handle
  // to an experiment owned by this user. A guide the user has no experiment for returns null.
  // Matched case-insensitively — X handles are, so /experiments/reshadrahman must not 404.
  const { data: guide, error } = await supabase
    .from("voice_guides")
    .select("reporter_handle, guide_raw, guide_deploy, measured_facts, cost_usd")
    .ilike("reporter_handle", handle)
    .maybeSingle();
  // A query fault is not a missing row — rendering 404 for it would hide the outage.
  if (error) throw error;
  if (!guide) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Voice guide — @{guide.reporter_handle}</h1>
        <p className="text-sm text-muted-foreground">
          cost: {guide.cost_usd == null ? "unknown" : `$${guide.cost_usd}`}
        </p>
      </header>
      <section>
        <h2 className="mb-2 font-medium">Measured facts</h2>
        <pre className="whitespace-pre-wrap text-sm">{guide.measured_facts}</pre>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Deploy guide</h2>
        <pre className="whitespace-pre-wrap text-sm">{guide.guide_deploy}</pre>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Raw guide</h2>
        <pre className="whitespace-pre-wrap text-sm">{guide.guide_raw}</pre>
      </section>
    </main>
  );
}
