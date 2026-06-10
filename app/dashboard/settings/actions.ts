"use server"

// Imports
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * Result state for the display-name update action, consumed by useActionState.
 */
export type UpdateDisplayNameState = {
  error?: string
  success?: boolean
}

/**
 * Update the signed-in user's display name in their auth user_metadata. The
 * sidebar + page header derive their name from this metadata, so a successful
 * update is followed by revalidating the settings route.
 * @param prevState - prior action state (unused; required by useActionState)
 * @param formData - form payload carrying the `display_name` field
 * @returns an error message, or success
 */
export async function updateDisplayName(
  prevState: UpdateDisplayNameState,
  formData: FormData,
): Promise<UpdateDisplayNameState> {

  // Read and normalize the submitted name.
  const raw = formData.get("display_name")
  const value = typeof raw === "string" ? raw.trim() : ""

  // Reject empty or overly long names before hitting Supabase.
  if (!value) {
    return { error: "Display name can't be empty." }
  }
  if (value.length > 60) {
    return { error: "Display name must be 60 characters or fewer." }
  }

  // Persist to auth user_metadata.
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { display_name: value },
  })

  if (error) {
    return { error: error.message }
  }

  // Refresh the settings route so server-rendered name reflects the change.
  revalidatePath("/dashboard/settings")
  return { success: true }
}

/**
 * Permanently delete the signed-in user's account. Calls the delete_account
 * Postgres function (SECURITY DEFINER — deletes auth.users where id =
 * auth.uid(); FK cascades remove agents/runs/run_items/x_connections), then
 * clears the local session cookies and sends the user back to the landing
 * page. The session is cleared with scope "local" because the server-side
 * revoke would fail against a user that no longer exists.
 * @returns an error message on failure; redirects to "/" on success
 */
export async function deleteAccount(): Promise<{ error: string } | void> {

  const supabase = await createClient()

  // Confirm there is a signed-in user to delete.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/")
  }

  // Delete the account (and everything cascading from it).
  const { error } = await supabase.rpc("delete_account")
  if (error) {
    return { error: "Could not delete your account. Please try again." }
  }

  // Drop the now-orphaned session cookies and leave the app.
  await supabase.auth.signOut({ scope: "local" })
  redirect("/")
}
