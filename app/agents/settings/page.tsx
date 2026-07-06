import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";
import { DeleteAccountButton, UsernameForm } from "./settings-forms";

/**
 * Stub settings page: username update, a password-change placeholder (no real
 * flow exists yet), account deletion, and sign-out. Reads only the signed-in
 * user — the legacy X-connection and agent-count queries are gone. Renders
 * into the dashboard layout's stub chrome; v0 owns the real design.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-sm space-y-8">
      <h1>Settings</h1>

      <section className="space-y-2">
        <h2>Username</h2>
        <UsernameForm initialUsername={getUsername(user)} />
      </section>

      <section className="space-y-2">
        <h2>Password</h2>
        {/* No real password-change flow exists yet (same as the old page). */}
        <button type="button" className="border px-2 py-1" disabled>
          Coming soon
        </button>
      </section>

      <section className="space-y-2">
        <h2>Delete account</h2>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
