"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Mirrors the authenticated browser identity into Sentry after the server-side
 * /agents guard has proved the session. Clearing on unmount prevents a signed
 * out browser session from retaining the previous reporter's identity.
 */
export function SentryUserContext({
  email,
  id,
}: {
  readonly email: string | undefined;
  readonly id: string;
}) {
  useEffect(() => {
    Sentry.setUser({ id, email });
    return () => Sentry.setUser(null);
  }, [email, id]);

  return null;
}
