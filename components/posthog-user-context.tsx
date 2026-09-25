"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { initPostHog } from "@/lib/observability/posthog-client";

/**
 * Identifies the signed-in person on mount. The home page and the three auth pages mount it
 * with a null id so an identity left behind by a password reset or email confirmation is cleared.
 */
export function PostHogUserContext({
  email,
  id,
}: {
  readonly email: string | undefined;
  readonly id: string | null;
}) {
  useEffect(() => {
    initPostHog();
    if (!posthog.__loaded) return;

    if (id === null) {
      if (posthog.get_property("$user_id")) posthog.reset();
      return;
    }

    posthog.identify(id, { email });
  }, [email, id]);

  return null;
}
