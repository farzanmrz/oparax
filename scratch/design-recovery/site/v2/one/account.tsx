"use client";

import { Check, CreditCard, Trash2, UserRound } from "lucide-react";
import { profile } from "@/next/data/onboarding";
import { plans } from "@/next/copy";
import { cn } from "@/lib/utils";
import { HANDLE, status } from "@/v2/deck/data";
import { BandCard, bandButton } from "./card-band";
import { ACCOUNT_EMAIL as EMAIL, AppShell, PageLine } from "./shell";

// The Account page (owner, Oct 10): three blocks, one band card each, top to bottom. Account: the username, the
// email and the password in one block. Plan: payment and subscription in one block, the free week now and the three
// plans we decided (next/copy.ts plans: Hobby, Creator, Wire). Danger Zone at the bottom: Delete Account.

const row = "flex min-h-11 items-center gap-4 px-2";
const label = "w-[120px] shrink-0 text-[12.5px] text-t3";
const value = "min-w-0 flex-1 truncate text-[13.5px] text-t1";

export function OneAccount() {
  return (
    <AppShell>
      <PageLine title="Account" />
      <div className="mt-6 flex flex-col gap-4">
        <BandCard glyph={<UserRound className="size-4 shrink-0 text-t2" strokeWidth={2} aria-hidden="true" />} heading="Account" bodyClassName="px-2 py-1.5">
          <ul className="divide-y divide-line">
            <li className={row}>
              <span className={label}>Username</span>
              <span className={value}>
                {profile.name} <span className="ml-2 text-t3">@{HANDLE}</span>
              </span>
            </li>
            <li className={row}>
              <span className={label}>Email</span>
              <span className={value}>{EMAIL}</span>
              <button type="button" className={bandButton} style={{ boxShadow: "var(--top-light)" }}>
                Change
              </button>
            </li>
            <li className={row}>
              <span className={label}>Password</span>
              <span className={value}>Last changed on September 30.</span>
              <button type="button" className={bandButton} style={{ boxShadow: "var(--top-light)" }}>
                Change
              </button>
            </li>
          </ul>
        </BandCard>

        <BandCard
          glyph={<CreditCard className="size-4 shrink-0 text-t2" strokeWidth={2} aria-hidden="true" />}
          heading="Plan"
          action={<span className="text-[13px] text-t3">Free week, {status.daysLeft} days left</span>}
          bodyClassName="px-4 py-4"
        >
          <div className="grid gap-3 md:grid-cols-3">
            {plans.map((p, i) => {
              const current = i === 0;
              return (
                <div
                  key={p.tier}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-4",
                    current ? "border-[var(--brand-line)] bg-[var(--brand-soft)]" : "border-line bg-[var(--well)]",
                  )}
                >
                  <p className="flex items-baseline gap-2">
                    <span className="text-[15px] font-semibold text-t1">{p.name}</span>
                    <span className="text-[13px] text-t2">{p.price} a month</span>
                    {current ? (
                      <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand)]">
                        <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                        After your free week
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[12.5px] leading-[1.5] text-t2">{p.detail}</p>
                  <button type="button" className={cn(bandButton, "mt-auto self-start", current && "border-[var(--brand-line)] text-t1")} style={{ boxShadow: "var(--top-light)" }}>
                    {current ? "Keep" : "Choose"}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-t3">No card on file. Add one before the free week ends to keep your feed running.</p>
        </BandCard>

        <BandCard
          glyph={<Trash2 className="size-4 shrink-0 text-[var(--error)]" strokeWidth={2} aria-hidden="true" />}
          heading="Danger Zone"
          action={
            <button type="button" className={`${bandButton} text-[var(--error)] hover:text-[var(--error)]`} style={{ boxShadow: "var(--top-light)" }}>
              Delete Account
            </button>
          }
        >
          <p className="text-[13px] text-t2">Removes your agent, its sources and your account. This cannot be undone.</p>
        </BandCard>
      </div>
    </AppShell>
  );
}
