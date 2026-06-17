import { redirect } from "next/navigation";
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header";
import { UsageDashboard } from "@/components/usage/usage-dashboard";
import { isAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { aggregate } from "@/lib/usage/aggregate";
import { fetchCredits } from "@/lib/usage/credits";
import type { UsageRow } from "@/lib/usage/types";
import { fetchUserEmails } from "@/lib/usage/users";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // fixed 30-day window; refresh re-pulls live data

/**
 * Admin-gated cost explorer. Loads the last 30 days of usage events, live
 * platform credits, and user emails, aggregates them server-side, and hands the
 * view model to the client dashboard. Non-admins are redirected to /dashboard.
 */
export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const sinceISO = new Date(Date.now() - WINDOW_MS).toISOString();
  const serviceRole = createServiceRoleClient();

  const [windowRes, emails, credits] = await Promise.all([
    serviceRole
      .from("api_usage_events")
      .select("*")
      .gte("created_at", sinceISO)
      .order("created_at", {
        ascending: false,
      }),
    fetchUserEmails(),
    fetchCredits(),
  ]);

  const rows = (windowRes.data ?? []) as UsageRow[];
  const view = aggregate(rows, [], [], emails);

  return (
    <>
      <WorkspacePageHeader title="Usage" />
      <UsageDashboard aggregate={view} credits={credits} />
    </>
  );
}
