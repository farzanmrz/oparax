"use client";

import { Check, CreditCard, UserRound } from "lucide-react";
import { useActionState, useRef } from "react";
import { BandCard, bandButton } from "@/components/one/band-card";
import { monitorContent } from "@/lib/monitor/content";
import type { MonitorState } from "@/lib/monitor-state";
import { openPortal } from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";
import { cn } from "@/lib/utils";

// The Account page (owner, Oct 10: "Username, email, and password are all in one block of account settings. Payment
// and subscription is one block where there will be multiple plans. We already have the three plans we've decided on.
// Delete account will be at the bottom as a danger zone."; lab v2/one/account.tsx). Account: the username and the
// email in one band card (the product has no password or email change, so those rows carry no action). Plan: the free
// week or the current plan in the band, the three plans we decided with the existing checkout, the watched posts used
// and the subscription portal. The product has no delete-account action, so there is no danger zone yet.

const row = "flex min-h-11 items-center gap-4 px-2";
const label = "w-[120px] shrink-0 text-[12.5px] text-t3";
const value = "min-w-0 flex-1 truncate text-[13.5px] text-t1";
const note = "text-[12.5px] leading-[1.5]";

export type AccountPlan = {
  name: string;
  tier: string;
  daysLeft: number | null;
  paidThrough: string | null;
  used: number;
  limit: number;
  state: MonitorState["state"];
  /** The Stripe portal can open for this monitor. */
  billing: boolean;
};

export function AccountPage({
  handle,
  monitorId,
  name,
  displayHandle,
  email,
  plan,
}: {
  handle: string;
  monitorId: string;
  name: string | null;
  displayHandle: string;
  email: string | null;
  plan: AccountPlan;
}) {
  const subscribed = plan.state === "paid" || plan.state === "lapsed";
  const planLine =
    plan.daysLeft !== null
      ? copy.billing.freeWeek(plan.daysLeft)
      : plan.paidThrough
        ? `${plan.name}, ${copy.billing.through.toLowerCase()} ${new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(new Date(plan.paidThrough))}`
        : plan.name;
  return (
    <div className="mt-6 flex flex-col gap-4">
      <BandCard
        glyph={<UserRound className="size-4 shrink-0 text-t2" strokeWidth={2} aria-hidden="true" />}
        heading={monitorContent.menu.account}
        bodyClassName="px-2 py-1.5"
      >
        <ul className="divide-y divide-line">
          <li className={row}>
            <span className={label}>{copy.account.username}</span>
            <span className={value}>
              {name ?? `@${displayHandle}`}
              {name ? <span className="ml-2 text-t3">@{displayHandle}</span> : null}
            </span>
          </li>
          {email ? (
            <li className={row}>
              <span className={label}>{copy.account.email}</span>
              <span className={value}>{email}</span>
            </li>
          ) : null}
        </ul>
      </BandCard>

      <BandCard
        glyph={
          <CreditCard className="size-4 shrink-0 text-t2" strokeWidth={2} aria-hidden="true" />
        }
        heading={copy.billing.plan}
        action={<span className="text-[13px] text-t3">{planLine}</span>}
        bodyClassName="px-4 py-4"
      >
        <div className="grid gap-3 desk:grid-cols-3">
          {monitorContent.plans.map((p) => {
            const current = plan.state === "paid" && plan.tier === p.tier;
            return (
              <div
                key={p.tier}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-4",
                  current
                    ? "border-[var(--brand-line)] bg-[var(--brand-soft)]"
                    : "border-line bg-[var(--well)]",
                )}
              >
                <p className="flex items-baseline gap-2">
                  <span className="text-[15px] font-semibold text-t1">{p.name}</span>
                  <span className="text-[13px] text-t2">{copy.billing.aMonth(p.price)}</span>
                  {current ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand)]">
                      <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                      {copy.billing.current}
                    </span>
                  ) : null}
                </p>
                <p className="text-[12.5px] leading-[1.5] text-t2">{p.detail}</p>
                {current ? null : (
                  <form method="post" action="/api/stripe/checkout" className="mt-auto">
                    <input type="hidden" name="monitorId" value={monitorId} />
                    <input type="hidden" name="tier" value={p.tier} />
                    <button type="submit" className={bandButton}>
                      {copy.billing.choose}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        <p className={cn(note, "mt-3 text-t3 tabular-nums")}>
          {monitorContent.menu.pool(plan.used, plan.limit)}
        </p>
        {plan.state === "lapsed" ? (
          <p role="alert" className={cn(note, "mt-2 text-[var(--error)]")}>
            {copy.billing.lapsed}
          </p>
        ) : null}
        {subscribed ? (
          <Portal handle={handle} monitorId={monitorId} billing={plan.billing} />
        ) : null}
      </BandCard>
    </div>
  );
}

/** The existing subscription portal: the action asks Stripe for the portal address, then the hidden form goes there. */
function Portal({
  handle,
  monitorId,
  billing,
}: {
  handle: string;
  monitorId: string;
  billing: boolean;
}) {
  const portalForm = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(async () => {
    const result = await openPortal(handle);
    if (result.ok && portalForm.current) {
      portalForm.current.action = result.url;
      portalForm.current.submit();
    }
    return result;
  }, null);
  return (
    <>
      <form ref={portalForm} action="/api/stripe/portal" method="post" hidden>
        <input type="hidden" name="monitorId" value={monitorId} />
      </form>
      <form action={action} className="mt-3 grid gap-2" aria-busy={pending}>
        <button
          type="submit"
          disabled={!billing || pending}
          className={cn(bandButton, "justify-self-start")}
        >
          {pending ? copy.billing.opening : copy.billing.manage}
        </button>
        {billing ? null : <p className={cn(note, "text-t3")}>{copy.errors.billing}</p>}
        {state && !state.ok ? (
          <p role="alert" className={cn(note, "text-[var(--error)]")}>
            {state.error}
          </p>
        ) : null}
      </form>
    </>
  );
}
