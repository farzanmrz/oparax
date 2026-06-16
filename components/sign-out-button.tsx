"use client";

import { useRouter } from "next/navigation";
// Imports
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign the user out and return to the landing page. Extracted as a client island
 * so the Settings page can be a server component (and read x_connections without
 * sending tokens to the browser).
 * @returns the sign-out button
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <button
      type="button"
      className={`btn btn-secondary${pending ? " loading" : ""}`}
      onClick={signOut}
      disabled={pending}
    >
      <span className="ld" />
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
