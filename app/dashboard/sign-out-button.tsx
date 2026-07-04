"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Sign out via the browser Supabase client (the same mechanism the old shell
// used), then return to the landing page. Client island so the dashboard
// layout and settings page stay server components.
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    // Invalidate the client router cache (incl. bfcache): without this, the
    // browser Back button can restore a signed-in dashboard payload with no
    // server round-trip after sign-out.
    router.refresh();
  }

  return (
    <button
      type="button"
      className="border px-2 py-1"
      disabled={pending}
      onClick={() => void signOut()}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
