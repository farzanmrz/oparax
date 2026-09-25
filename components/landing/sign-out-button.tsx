"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { landingContent } from "@/lib/landing/content";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const copy = landingContent.auth;

  async function signOut() {
    setStatus("pending");

    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        setStatus("error");
        return;
      }
    } catch {
      setStatus("error");
      return;
    }

    try {
      posthog.capture("signed_out");
    } catch {
      // A failed event must not prevent clearing the old identity.
    }

    try {
      if (posthog.__loaded) posthog.reset();
    } catch {
      // Analytics never prevents someone from leaving their account.
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <Button
      className="h-11 min-w-11 px-3 desk:h-8"
      disabled={status === "pending"}
      onClick={signOut}
      type="button"
      variant="ghost"
    >
      <span role={status === "error" ? "alert" : undefined}>
        {status === "error" ? copy.error : status === "pending" ? copy.pending : copy.logOut}
      </span>
    </Button>
  );
}
