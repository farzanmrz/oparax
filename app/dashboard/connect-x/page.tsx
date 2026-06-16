import { redirect } from "next/navigation";
import { ConnectXButton } from "@/components/dashboard/connect-x-button";
import { PlusIcon } from "@/components/dashboard/shell-icons";
import { WorkspacePageHeader } from "@/components/dashboard/workspace-page-header";
import { isSafeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Clamp ?next= to a safe in-app destination (never back to login/signup or to
// connect-x itself). Preserves the gate's redirect contract.
function getSafeNextPath(next: string | undefined): string {
  if (!isSafeNextPath(next)) return "/dashboard/agents";
  if (next === "/login" || next === "/signup") return "/dashboard/agents";
  if (next.startsWith("/dashboard/connect-x")) return "/dashboard/agents";
  return next;
}

/**
 * Required X connection gate — the post-login landing until X is linked. The
 * dashboard layout renders the shell (auth-guarded + connection-aware); this page
 * supplies only the main content: state 1 (X not connected) — an Agents header
 * with a disabled "New agent" and the connect-X empty state. Redirects away once
 * X is connected.
 * @param props.searchParams - optional next path and reason
 */
export default async function ConnectXPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    reason?: string;
  }>;
}) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const supabase = await createClient();

  const { data: connection } = await supabase.from("x_connections").select("id").maybeSingle<{
    id: string;
  }>();

  if (connection) {
    redirect(nextPath);
  }

  return (
    <>
      <WorkspacePageHeader
        title="Agents"
        action={
          <button type="button" className="btn btn-primary" disabled>
            <PlusIcon width={16} height={16} />
            <span>New agent</span>
          </button>
        }
      />

      <div className="ws-empty">
        <p>Please connect your X account to create agents.</p>
        <ConnectXButton nextPath={nextPath} />
      </div>
    </>
  );
}
