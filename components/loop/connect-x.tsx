"use client"

// Imports
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

/**
 * Connect-X control: unlinks any stale 'x' identity (so a re-link issues fresh
 * provider tokens we can capture), then starts the Supabase linkIdentity flow
 * requesting tweet.write and redirecting to our /auth/callback.
 * @param props.nextPath - in-app path to return to after X connects
 * @returns the Connect X button + any error
 */
export function ConnectX({
  nextPath = "/dashboard/settings",
}: {
  nextPath?: string
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect() {

    setPending(true)
    setError(null)
    const supabase = createClient()

    // Unlink any stale 'x' identity to avoid "already linked" error.
    // No second chance to read its tokens, so unlink first.
    const { data: identities, error: identitiesError } =
      await supabase.auth.getUserIdentities()
    if (identitiesError) {
      setError(identitiesError.message)
      setPending(false)
      return
    }
    const staleX = identities?.identities.find(
      (identity) => identity.provider === "x",
    )
    if (staleX) {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(staleX)
      if (unlinkError) {
        setError(`Could not reset the existing X link: ${unlinkError.message}`)
        setPending(false)
        return
      }
    }

    // Start the linkIdentity flow.
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "x",
      options: {
        scopes: "tweet.write",
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })
    if (linkError) {
      setError(linkError.message)
      setPending(false)
    }
    // On success the browser redirects to X for consent.
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={connect}
        pending={pending}
        disabled={pending}
        className="self-start"
      >
        Connect X
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
