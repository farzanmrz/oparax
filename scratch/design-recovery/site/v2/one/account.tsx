"use client";

import Link from "next/link";
import { CreditCard, KeyRound, Trash2 } from "lucide-react";
import { profile } from "@/next/data/onboarding";
import { XAvatar } from "@/v2/deck/marks";
import { HANDLE } from "@/v2/deck/data";
import { BASE } from "./card";
import { BandCard, bandButton } from "./card-band";
import { ACCOUNT_EMAIL as EMAIL, AppShell, PageLine } from "./shell";

// The Account page (owner, Oct 10): the person, the plan, the password and deleting the account, each a band card in
// two columns across the page's column. Plans and pricing are their own page; the Plan card only links there.

export function OneAccount() {
  return (
    <AppShell>
      <PageLine title="Account" />
      <div className="mt-6 grid items-start gap-4 md:grid-cols-2">
        <BandCard glyph={<XAvatar handle={HANDLE} size={24} />} heading={profile.name} action={<span className="text-[13px] text-t3">{profile.handle}</span>}>
          <p className="text-[13px] text-t2">{EMAIL}</p>
        </BandCard>
        <BandCard
          glyph={<CreditCard className="size-4 shrink-0 text-t2" strokeWidth={2} aria-hidden="true" />}
          heading="Plan"
          action={
            <Link href={`${BASE}/landing#pricing`} className="rounded-sm text-[13px] text-t2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring">
              Plans
            </Link>
          }
        >
          <p className="text-[13px] text-t2">Free week. Plans from $5 a month.</p>
        </BandCard>
        <BandCard
          glyph={<KeyRound className="size-4 shrink-0 text-t2" strokeWidth={2} aria-hidden="true" />}
          heading="Password"
          action={
            <button type="button" className={bandButton} style={{ boxShadow: "var(--top-light)" }}>
              Change
            </button>
          }
        >
          <p className="text-[13px] text-t2">Last changed on September 30.</p>
        </BandCard>
        <BandCard
          glyph={<Trash2 className="size-4 shrink-0 text-[var(--error)]" strokeWidth={2} aria-hidden="true" />}
          heading="Delete Account"
          action={
            <button type="button" className={`${bandButton} text-[var(--error)] hover:text-[var(--error)]`} style={{ boxShadow: "var(--top-light)" }}>
              Delete
            </button>
          }
        >
          <p className="text-[13px] text-t2">Removes your agent, its sources and your account. This cannot be undone.</p>
        </BandCard>
      </div>
    </AppShell>
  );
}
