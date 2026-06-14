import { createClient } from "@/lib/supabase/client"

/**
 * Start the X (Twitter) OAuth link flow from the browser.
 *
 * Unlinks any stale `x` identity first — re-linking is the only way to capture
 * fresh provider tokens (Supabase won't re-expose an existing identity's
 * tokens), so we unlink before re-linking — then calls linkIdentity requesting
 * `tweet.write`, returning the user to `/auth/callback?next=<nextPath>` where
 * the callback captures and encrypts the tokens.
 *
 * On success the browser redirects to X for consent, so this never resolves in
 * the happy path. It throws on a recoverable error so the caller can surface the
 * message and re-enable its trigger. Single source of truth for the connect flow
 * (used by the connect-x landing and the Settings page).
 *
 * @param nextPath in-app path to return to after X connects
 */
export async function startXConnect(nextPath: string): Promise<void> {
  const supabase = createClient()

  // Unlink any stale 'x' identity to avoid an "already linked" error. There's
  // no second chance to read its tokens, so unlink first.
  const { data: identities, error: identitiesError } =
    await supabase.auth.getUserIdentities()
  if (identitiesError) {
    throw new Error(identitiesError.message)
  }
  const staleX = identities?.identities.find(
    (identity) => identity.provider === "x",
  )
  if (staleX) {
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(staleX)
    if (unlinkError) {
      throw new Error(
        `Could not reset the existing X link: ${unlinkError.message}`,
      )
    }
  }

  // Start the linkIdentity flow. On success the browser redirects to X.
  const { error: linkError } = await supabase.auth.linkIdentity({
    provider: "x",
    options: {
      scopes: "tweet.write",
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  })
  if (linkError) {
    throw new Error(linkError.message)
  }
}
