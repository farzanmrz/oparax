/**
 * Agent details page — the per-desk dashboard (news feed, runs, settings). Stub
 * for now so agent cards can link here; v0 owns the design and a later slice
 * wires it to persisted agent data.
 */
export default async function AgentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-full min-h-0 flex-col py-4">
      <h1 className="text-lg font-semibold tracking-tight">Agent details</h1>
      <p className="text-sm text-muted-foreground">
        Details for agent <code>{id}</code> — coming soon.
      </p>
    </div>
  );
}
