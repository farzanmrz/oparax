// Imports
import { DeleteAccountButton } from "@/components/settings/delete-account-button";

/**
 * Account-settings section (id="account"): a neutral "Change password" row (a
 * ghost-button stub — no real password flow this sprint) and a Delete-account
 * row wired to the existing DeleteAccountButton (the confirm modal + deleteAccount
 * RPC). Only Delete is destructive; the password control is neutral. Sign-out is
 * intentionally absent here — it lives in the sidebar footer now. Server-safe.
 * @returns the account-settings section
 */
export function AccountSection() {
  return (
    <section id="account" className="card-sec set-sec">
      <h2 className="sec-title">Account settings</h2>

      <div className="set-rows">
        <div className="arow">
          <div className="grow">
            <div className="rt">Change password</div>
            <div className="rs">Update the password you use to sign in.</div>
          </div>
          {/* Stub: no real password flow yet. */}
          <button type="button" className="btn btn-sm ghost-btn" disabled>
            Coming soon
          </button>
        </div>

        <div className="arow">
          <div className="grow">
            <div className="rt">Delete account</div>
            <div className="rs">
              Permanently delete your account, agents, runs, and X connection.
            </div>
          </div>
          <DeleteAccountButton />
        </div>
      </div>
    </section>
  );
}
