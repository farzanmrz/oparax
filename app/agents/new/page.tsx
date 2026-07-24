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
  const xLinkState = await getXLinkState();
  return <CreateDeskForm xLinkState={xLinkState} />;
}
