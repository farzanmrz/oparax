import { isOverrideOwner } from "@/lib/owner-allowlist";
import { createClient } from "@/lib/supabase/server";
import { getXLinkState } from "@/lib/x/link-state";
import { CreateDeskForm } from "./create-desk-form";

// Mirrors app/api/ingest/route.ts's maxDuration: the `after()` voice-extraction call this
// page's create action kicks off needs the function alive long enough to run.
export const maxDuration = 300;

/**
 * New-desk page — the create-desk form + live extraction view (create-desk-form.tsx). Fetches
 * link state server-side (getXLinkState()) so the client form knows, on first paint, whether
 * to show the "Connect X" control or the connected @handle — a client component can't read
 * the reporter's own X link without a round trip, so this thin server wrapper resolves it once
 * and hands it down as a prop rather than adding a second server action just to fetch it.
 */
export default async function NewDeskPage() {
  const supabase = await createClient();
  const [xLinkState, { data: auth }] = await Promise.all([
    getXLinkState(),
    supabase.auth.getUser(),
  ]);
  // Resolved here so the field's editability is decided once, server-side, on first paint —
  // same reasoning as xLinkState above. `createDesk` re-checks the allowlist itself; this prop
  // only decides what renders, never what is honored.
  return (
    <CreateDeskForm canOverrideHandle={isOverrideOwner(auth.user?.email)} xLinkState={xLinkState} />
  );
}
