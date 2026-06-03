"use client"

// Imports
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

/**
 * Sign the user out and return to the landing page. Extracted as a client island
 * so the Settings page can be a server component (and read x_connections without
 * sending tokens to the browser).
 * @returns the sign-out button
 */
export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <Button
      variant="outline"
      onClick={signOut}
      disabled={pending}
      pending={pending}
    >
      Sign out
    </Button>
  )
}
