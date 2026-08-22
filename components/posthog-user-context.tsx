"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { initPostHog } from "@/lib/observability/posthog-client";

/**
 * Identifies the reporter on mount. Reset lives only on the explicit sign-out click path in
 * components/account-menu.tsx, never in this effect. If a session expires, is forced signed out,
 * or closes without that click, the browser remains identified as the last reporter until the
 * next explicit sign-out or identify.
 */
export function PostHogUserContext({
  email,
  id,
}: {
  readonly email: string | undefined;
  readonly id: string;
}) {
  useEffect(() => {
    initPostHog();
    if (!posthog.__loaded) return;
    posthog.identify(id, { email });
  }, [email, id]);

  return null;
}
