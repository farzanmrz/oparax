// PostHog initializes on every page load, including sign-in, sign-up, forgot-password,
// reset-password, and confirm pages. Session Replay starts with it. URLs on those pages lose their
// query and fragment before anything is sent (see lib/observability/posthog-client.ts).
//
// Session Replay records product text and ordinary inputs unmasked. This is an owner decision:
// masked recordings hide the drafts, voice guides, and beat descriptions needed to understand
// what happened. Password inputs remain masked. Network bodies, headers, and cookies are never
// captured. Identity persists in localStorage.

import { initPostHog } from "@/lib/observability/posthog-client";

initPostHog();
