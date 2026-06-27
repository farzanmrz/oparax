import Link from "next/link";
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
 * Build the inline error message for the connect-X gate from the callback's
 * query params. The `x_already_linked` code is the duplicate-identity case (the
 * authorized X account already belongs to a different Oparax account); we name
 * that account by its masked email when the callback could resolve it. Any other
 * non-empty `x_error` is surfaced verbatim.
 * @param xError - the `x_error` query value (a code or a raw message)
 * @param lockedEmail - the masked owning email, when known
 * @returns a user-facing message, or null when there's nothing to show
 */
function getConnectError(
  xError: string | undefined,
  lockedEmail: string | undefined,
): string | null {
  if (!xError) return null;
  if (xError === "x_already_linked") {
    const who = lockedEmail ? `another Oparax account (${lockedEmail})` : "another Oparax account";
    return `That X account is already linked to ${who}. Unlink it from that account first, then try connecting again.`;
  }
  return xError;
}

/**
 * Optional connect-X entry — the OAuth return target and a soft prompt to link X
 * (for posting + writing samples), no longer a hard gate. The dashboard layout
 * renders the shell (auth-guarded); this page supplies only the main content: an
 * Agents header with an ENABLED "New agent" link and the connect-X empty state.
 * Redirects to nextPath once X is connected (preserves the OAuth ?next= contract).
 * @param props.searchParams - optional next path, reason, and X connect error
 */
export default async function ConnectXPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    reason?: string;
    x_error?: string;
    lockedEmail?: string;
  }>;
}) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next);
  const connectError = getConnectError(params.x_error, params.lockedEmail);
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
          <Link href="/dashboard/agents/new" className="btn btn-primary">
            <PlusIcon width={16} height={16} />
            <span>New agent</span>
          </Link>
        }
      />

      <div className="ws-empty">
        <p>
          Connect X to post drafts and use your own posts as writing samples — optional. You can
          create and run agents without it.
        </p>
        {connectError && (
          <p
            className="ferr show"
            style={{
              maxWidth: "42ch",
              margin: "0 auto",
            }}
          >
            {connectError}
          </p>
        )}
        <ConnectXButton nextPath={nextPath} />
      </div>
    </>
  );
}
