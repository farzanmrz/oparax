// Route-level loading UI for the dashboard: a minimal text fallback while the
// page resolves auth.
export default function DashboardLoading() {
  return (
    <div>
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );
}
