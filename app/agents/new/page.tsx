import { getXLinkState } from "@/lib/x/link-state";
import { CreateDeskForm } from "./create-desk-form";

// Website onboarding kicked off by this page's create action runs in `after()` and needs the
// function alive long enough to finish. 800 is Vercel Pro's Fluid Compute ceiling; the
// onboarding call carries its own abort (ONBOARDING_TIMEOUT_MS, lib/sources/onboard-source.ts)
// well under it so a stuck run is aborted and stamped rather than platform-killed.
export const maxDuration = 800;

/**
 * New-desk page — the create-desk form. Fetches link state server-side (getXLinkState()) so
 * the client form knows, on first paint, whether to show the "Connect X" control or the
 * connected @handle — a client component can't read the reporter's own X link without a round
 * trip, so this thin server wrapper resolves it once and hands it down as a prop.
 */
export default async function NewDeskPage() {
  const xLinkState = await getXLinkState();
  return <CreateDeskForm xLinkState={xLinkState} />;
}
