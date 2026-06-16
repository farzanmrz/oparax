"use client";

import { useRouter } from "next/navigation";
// Imports
import { useActionState, useEffect, useRef, useState } from "react";
import { type UpdateUsernameState, updateUsername } from "@/app/dashboard/settings/actions";
import {
  BlueskyTile,
  FacebookTile,
  InstagramTile,
  LinkedInTile,
  MastodonTile,
  RedditTile,
  ThreadsTile,
  TikTokTile,
  WhatsAppTile,
} from "@/components/dashboard/shell-icons";
import { useUnsavedChanges } from "@/components/dashboard/unsaved-changes";
import { XConnectionPill } from "@/components/settings/x-connection-pill";

// The greyed "Soon" pills — one per not-yet-supported platform. The logo
// carries identity (no platform name), matching the export. Non-interactive:
// `.pill[data-soon="true"]` dims them + sets cursor:default.
const SOON_PLATFORMS = [
  {
    key: "instagram",
    label: "Instagram",
    Tile: InstagramTile,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    Tile: LinkedInTile,
  },
  {
    key: "reddit",
    label: "Reddit",
    Tile: RedditTile,
  },
  {
    key: "bluesky",
    label: "Bluesky",
    Tile: BlueskyTile,
  },
  {
    key: "facebook",
    label: "Facebook",
    Tile: FacebookTile,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    Tile: WhatsAppTile,
  },
  {
    key: "threads",
    label: "Threads",
    Tile: ThreadsTile,
  },
  {
    key: "tiktok",
    label: "TikTok",
    Tile: TikTokTile,
  },
  {
    key: "mastodon",
    label: "Mastodon",
    Tile: MastodonTile,
  },
] as const;

/**
 * Profile settings section (id="profile"): identity + connected accounts in one
 * card. A large click-to-upload avatar (with a "Change photo" text button) sits
 * beside a stacked field block — Name, then Email / Phone, then the connection
 * pills (the live X pill + greyed "Soon" platforms), then an explicit Save
 * button that stays disabled until the form is dirty. Name is the only persisted
 * field — wired to the updateUsername Server Action; Email/Phone are display/edit
 * UI that persist nothing this sprint.
 *
 * Client island: it drives a Server Action via useActionState, tracks dirty
 * state for the explicit Save + the unsaved-changes guard, and refreshes the
 * router on success so the sidebar username updates.
 * @param props.initialUsername - current username (the real, persisted field)
 * @param props.email - the signed-in user's email (prefilled display-only)
 * @param props.xUsername - connected X handle, if any
 * @param props.xError - X connect/callback error to surface, if any
 * @param props.agentCount - saved agents affected by disconnecting X
 * @returns the profile section
 */
export function ProfileSection({
  initialUsername,
  email,
  xUsername,
  xError,
  agentCount,
}: {
  initialUsername: string;
  email: string;
  xUsername?: string;
  xError?: string;
  agentCount: number;
}) {
  // Router to refresh server components (sidebar username) after a save.
  const router = useRouter();

  // Unsaved-changes guard: arm it whenever the form is dirty.
  const { setDirty } = useUnsavedChanges();

  // Wire the username Server Action into a form action. isPending is the
  // third tuple member.
  const [state, dispatch, isPending] = useActionState<UpdateUsernameState, FormData>(
    updateUsername,
    {},
  );

  // Editable field state. Email stays display-only (uncontrolled). Phone joins
  // dirty-tracking (UI-only — it has no `name`, so it never reaches the action).
  const [name, setName] = useState(initialUsername);
  const [phone, setPhone] = useState("");

  // Saved baselines — the last values we believe are persisted. Dirty = the
  // current values differ from these. Both are state, so render stays ref-free.
  const [savedName, setSavedName] = useState(initialUsername);
  const [savedPhone, setSavedPhone] = useState("");

  // Stash of the previous baseline so a failed save can revert (re-enabling
  // Save for a retry). Only touched in handlers/effects — never read in render.
  const prevBaselineRef = useRef<{
    name: string;
    phone: string;
  } | null>(null);

  const dirty = name.trim() !== savedName.trim() || phone.trim() !== savedPhone.trim();

  // Click "Change photo" → open the decorative (no-op) file input.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // On submit, optimistically advance the baseline so Save clears immediately;
  // stash the old baseline so a failure can revert it.
  function onSaveClick() {
    prevBaselineRef.current = {
      name: savedName,
      phone: savedPhone,
    };
    setSavedName(name);
    setSavedPhone(phone);
  }

  // On success refresh (sidebar/header re-read the name); on error revert the
  // baseline so the form is dirty again and Save re-enables for a retry.
  useEffect(() => {
    if (state.success) {
      router.refresh();
    } else if (state.error && prevBaselineRef.current) {
      setSavedName(prevBaselineRef.current.name);
      setSavedPhone(prevBaselineRef.current.phone);
      prevBaselineRef.current = null;
    }
  }, [
    state.success,
    state.error,
    router,
  ]);

  // Arm/disarm the navigation guard as dirtiness changes; disarm on unmount.
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [
    dirty,
    setDirty,
  ]);

  return (
    <section id="profile" className="card-sec set-sec">
      <h2 className="sec-title">Profile</h2>

      <div className="set-profile">
        <div className="set-avatar-col">
          <label className="avatar-up" title="Change avatar">
            {/* UI-only avatar control: a file picker that goes nowhere (no
                upload or storage this sprint). The gradient fill is applied in
                workspace.css (.set-profile .avatar-up). */}
            <span className="ov" aria-hidden="true">
              <CameraIcon width={22} height={22} />
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="set-avatar-input"
              aria-label="Upload avatar"
              onChange={(e) => {
                // No-op: clear the selection so the control stays decorative.
                e.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="set-avatar-link"
            onClick={() => fileInputRef.current?.click()}
          >
            Change photo
          </button>
        </div>

        <form action={dispatch} className="set-fields">
          <div className="fld">
            <label htmlFor="username">Name</label>
            <input
              id="username"
              name="username"
              className="set-input"
              value={name}
              maxLength={60}
              autoComplete="name"
              placeholder="Your name"
              aria-invalid={state.error ? true : undefined}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="set-grid">
            <div className="fld">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                type="email"
                className="set-input"
                defaultValue={email}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="fld">
              <label htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                type="tel"
                className="set-input"
                value={phone}
                autoComplete="tel"
                placeholder="Add a phone number"
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Connected accounts: the pills carry their own meaning, so no
              header — the live X pill plus the greyed "Soon" platforms. */}
          <div className="set-pills">
            <XConnectionPill xUsername={xUsername} agentCount={agentCount} />

            {xError && (
              <p
                className="ferr show"
                style={{
                  flexBasis: "100%",
                  marginTop: 0,
                }}
              >
                {xError}
              </p>
            )}

            {SOON_PLATFORMS.map(({ key, label, Tile }) => (
              <span
                key={key}
                className="pill"
                data-soon="true"
                title={`${label} — coming soon`}
                aria-label={`${label} — coming soon`}
              >
                <span className="pill-logo">
                  <Tile />
                </span>
                <span
                  className="pill-body"
                  style={{
                    color: "var(--faint)",
                  }}
                >
                  Soon
                </span>
              </span>
            ))}
          </div>

          <div className="set-save-row">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!dirty || isPending}
              onClick={onSaveClick}
            >
              Save
            </button>
            {state.error ? (
              <p className="set-note set-note-err">{state.error}</p>
            ) : state.success && !dirty ? (
              <p className="set-note set-note-ok">Saved.</p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

// Small camera glyph for the avatar hover overlay.
function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
