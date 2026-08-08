import { TriangleAlertIcon, UserRoundIcon } from "lucide-react";
import { BandCard } from "@/components/band-card";
import { PageHeading } from "@/components/page-heading";
import { createClient } from "@/lib/supabase/server";
import { getAvatarKey, getUsername } from "@/lib/user";
import { getXLinkState } from "@/lib/x/link-state";
import { AvatarPicker, DeleteAccountButton, UsernameForm, XAccountField } from "./settings-forms";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const xLink = await getXLinkState();

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-[var(--page-rhythm-mobile)] py-[var(--page-rhythm-mobile)] desk:gap-[var(--page-rhythm-web)] desk:py-[var(--page-rhythm-web)]">
      <PageHeading>Settings</PageHeading>
      <BandCard icon={<UserRoundIcon />} title="Profile">
        <div className="flex flex-col gap-6 desk:flex-row desk:items-start">
          <AvatarPicker initialAvatar={getAvatarKey(user)} />
          <div className="grid min-w-0 flex-1 gap-5 desk:grid-cols-2">
            <UsernameForm initialUsername={getUsername(user)} />
            <XAccountField handle={xLink.handle} linked={xLink.linked} />
          </div>
        </div>
      </BandCard>
      <BandCard icon={<TriangleAlertIcon />} title="Danger Zone" variant="danger">
        <div className="flex flex-col items-start justify-between gap-4 desk:flex-row desk:items-center">
          <p className="max-w-2xl text-sm text-text-body">
            Permanently delete your account, every agent, and all of their drafts and source
            history. This cannot be undone.
          </p>
          <DeleteAccountButton />
        </div>
      </BandCard>
    </div>
  );
}
