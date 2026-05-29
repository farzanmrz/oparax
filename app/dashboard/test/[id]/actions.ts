"use server"

// Imports
import { createClient } from "@/lib/supabase/server"

/**
 * Persist an edited draft's text and mark it edited. RLS scopes the update to
 * the owner's drafts (transitively via story → monitor).
 * @param draftId - the draft to update
 * @param text - the edited tweet text
 * @returns ok on success, or an error message
 */
export async function saveDraft(
  draftId: string,
  text: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Authentication required." }
  }
  if (typeof text !== "string") {
    return { error: "Invalid draft text." }
  }

  const { error } = await supabase
    .from("drafts")
    .update({ text, status: "edited" })
    .eq("id", draftId)
  if (error) {
    return { error: "Failed to save draft." }
  }

  return { ok: true }
}
