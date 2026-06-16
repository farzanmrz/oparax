"use server";

// Imports
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Result state for the username update action, consumed by useActionState.
 */
export type UpdateUsernameState = {
  error?: string;
  success?: boolean;
};

/**
 * Update the signed-in user's username in their auth user_metadata. The sidebar
 * derives its label from this (lib/user.ts getUsername), so on success we
 * revalidate the whole dashboard layout to refresh the shell.
 * @param prevState - prior action state (unused; required by useActionState)
 * @param formData - form payload carrying the `username` field
 * @returns an error message, or success
 */
export async function updateUsername(
  prevState: UpdateUsernameState,
  formData: FormData,
): Promise<UpdateUsernameState> {
  // Read and normalize the submitted username.
  const raw = formData.get("username");
  const value = typeof raw === "string" ? raw.trim() : "";

  // Reject empty or overly long usernames before hitting Supabase.
  if (!value) {
    return {
      error: "Username can't be empty.",
    };
  }
  if (value.length > 60) {
    return {
      error: "Username must be 60 characters or fewer.",
    };
  }

  // Persist to auth user_metadata.
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      username: value,
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  // Refresh the dashboard layout so the sidebar reflects the new username.
  revalidatePath("/dashboard", "layout");
  return {
    success: true,
  };
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
export async function deleteAccount(): Promise<{
  error: string;
} | void> {
  const supabase = await createClient();

  // Confirm there is a signed-in user to delete.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Delete the account (and everything cascading from it).
  const { error } = await supabase.rpc("delete_account");
  if (error) {
    return {
      error: "Could not delete your account. Please try again.",
    };
  }

  // Drop the now-orphaned session cookies and leave the app.
  await supabase.auth.signOut({
    scope: "local",
  });
  redirect("/");
}
