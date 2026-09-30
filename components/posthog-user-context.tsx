"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Identifies the signed-in person on mount. Auth pages mount it with a null id
 * so an identity left behind by a password reset or email confirmation is cleared.
 */
export function PostHogUserContext({
  email,
  id,
}: {
  readonly email?: string;
  readonly id: string | null;
}) {
  useEffect(() => {
    try {
      if (!posthog.__loaded) return;

      if (id === null) {
        if (posthog.get_property("$user_id")) posthog.reset();
        return;
      }

      posthog.identify(id, email?.trim() ? { email } : undefined);
    } catch {
      // Analytics identity errors must not interrupt the page.
    }
  }, [email, id]);

  return null;
}
