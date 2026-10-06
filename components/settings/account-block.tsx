"use client";

// The settings page's right block (design preview v2/one/settings.tsx), one lifted object: the person, the plan with
// its billing control, the alert time, the digests, X DMs and Sign out. Every control is an existing one: the Stripe
// portal, the alert hour, the digest switches and the activation form that opens the "Start alerts" message to the
// bot. Alerts turn on when that message arrives, so the DM row shows bot_state as it is.

import Link from "next/link";
import { startTransition, useActionState, useId, useRef } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { ProfileAvatar } from "@/components/monitor/agent-header";
import { type ShellPlan, SignOut } from "@/components/one/header";
import { liftHigh, primaryButton } from "@/components/one/stage";
import { field } from "@/components/settings/sources-panel";
import { Switch } from "@/components/ui/switch";
import { monitorContent } from "@/lib/monitor/content";
import type { Profile } from "@/lib/monitor/read";
import { openPortal, setAlertHour, setDigest } from "@/lib/settings/actions";
import { settingsContent as copy, type SettingsResult } from "@/lib/settings/content";
import { cn } from "@/lib/utils";

const dm = monitorContent.notifications;
const note = "text-[12.5px] leading-[1.5]";
const heading = "text-[13.5px] font-semibold text-t1";
const quietButton =
  "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 shadow-[var(--top-light)] transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";

function Result({ state, done }: { state: SettingsResult | null; done?: string }) {
  if (!state) return null;
  if (!state.ok)
    return (
      <p role="alert" className={cn(note, "text-[var(--error)]")}>
        {state.error}
      </p>
    );
  return done ? <p className={cn(note, "text-t2")}>{done}</p> : null;
}

export type AccountPlan = ShellPlan & {
  paidThrough: string | null;
  lapsed: boolean;
  /** Paid or lapsed: the plan has a subscription to manage. */
  subscribed: boolean;
  /** The Stripe portal can open for this monitor. */
  billing: boolean;
};

function Plan({
  handle,
  monitorId,
  plan,
  readOnly,
}: {
  handle: string;
  monitorId: string;
  plan: AccountPlan;
  readOnly: boolean;
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
    <div className="p-5">
      <div className="flex items-baseline gap-3">
        <p className={heading}>{plan.name}</p>
        <Link
          href="/#pricing"
          className="ml-auto shrink-0 rounded-sm text-[13px] text-t2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
        >
          {copy.billing.plans}
        </Link>
      </div>
      {plan.daysLeft !== null ? (
        <div className="mt-2.5 flex gap-1" aria-hidden="true">
          {Array.from({ length: plan.days }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: The segments are a fixed row of identical marks.
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < (plan.daysLeft ?? 0) ? "bg-[var(--brand)]" : "bg-line-strong",
              )}
            />
          ))}
        </div>
      ) : null}
      <p className="mt-2 flex justify-between gap-3 text-[12px] text-t3 tabular-nums">
        {plan.daysLeft !== null ? (
          <span>
            <span className="font-medium text-t1">{plan.daysLeft}</span>{" "}
            {monitorContent.menu.daysLeft(plan.daysLeft)}
          </span>
        ) : plan.paidThrough ? (
          <span>
            {copy.billing.through}{" "}
            <time dateTime={plan.paidThrough} className="text-t1">
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                new Date(plan.paidThrough),
              )}
            </time>
          </span>
        ) : null}
        <span className="ml-auto">{monitorContent.menu.pool(plan.used, plan.limit)}</span>
      </p>
      {readOnly ? <p className={cn(note, "mt-3 text-t2")}>{copy.errors.readOnly}</p> : null}
      {plan.lapsed ? (
        <p role="alert" className={cn(note, "mt-3 text-[var(--error)]")}>
          {copy.billing.lapsed}
        </p>
      ) : null}
      {plan.subscribed ? (
        <>
          <form ref={portalForm} action="/api/stripe/portal" method="post" hidden>
            <input type="hidden" name="monitorId" value={monitorId} />
          </form>
          <form action={action} className="mt-3 grid gap-2" aria-busy={pending}>
            <button
              type="submit"
              disabled={!plan.billing || pending}
              className={cn(quietButton, "justify-self-start")}
            >
              {pending ? copy.billing.opening : copy.billing.manage}
            </button>
            {plan.billing ? null : <p className={cn(note, "text-t3")}>{copy.errors.billing}</p>}
            <Result state={state} />
          </form>
        </>
      ) : null}
    </div>
  );
}

function Alerts({
  handle,
  hour,
  timezone,
  timezones,
  cadence,
  readOnly,
}: {
  handle: string;
  hour: number;
  timezone: string;
  timezones: string[];
  cadence: "daily" | "every_15m";
  readOnly: boolean;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<SettingsResult | null, FormData>(
    (_previous, data) =>
      setAlertHour(handle, Number(data.get("hour")), String(data.get("timezone") ?? "")),
    null,
  );
  return (
    <form action={action} className="grid gap-2.5" aria-busy={pending}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={heading}>{copy.alerts.title}</p>
        <p className="text-[12.5px] text-t2">
          {cadence === "daily" ? copy.alerts.daily : copy.alerts.frequent}
        </p>
      </div>
      <div className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-end gap-2">
        <label htmlFor={`${id}-hour`} className="grid gap-1 text-[12px] text-t3">
          {copy.alerts.hour}
          <select
            id={`${id}-hour`}
            name="hour"
            defaultValue={String(hour)}
            disabled={readOnly || pending}
            className={cn(field, "tabular-nums")}
          >
            {copy.alerts.hours.map((value) => (
              <option key={value} value={String(value)}>
                {copy.alerts.hourLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-timezone`} className="grid gap-1 text-[12px] text-t3">
          {copy.alerts.timezone}
          <select
            id={`${id}-timezone`}
            name="timezone"
            defaultValue={timezone}
            disabled={readOnly || pending}
            className={field}
          >
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={readOnly || pending} className={quietButton}>
          {pending ? copy.saving : copy.save}
        </button>
      </div>
      {cadence === "every_15m" ? (
        <p className={cn(note, "text-t3")}>{copy.alerts.frequentNote}</p>
      ) : null}
      <div aria-live="polite">
        <Result state={state} done={copy.saved} />
      </div>
    </form>
  );
}

function DigestSwitch({
  handle,
  kind,
  on,
  readOnly,
}: {
  handle: string;
  kind: "github" | "product_hunt";
  on: boolean;
  readOnly: boolean;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<SettingsResult | null, boolean>(
    (_previous, checked) => setDigest(handle, kind, checked),
    null,
  );
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2.5">
        <Switch
          id={id}
          checked={on}
          disabled={readOnly || pending}
          onCheckedChange={(checked) => startTransition(() => action(checked))}
        />
        <label htmlFor={id} className="cursor-pointer text-[13px] text-t2">
          {kind === "github" ? copy.digests.github : copy.digests.productHunt}
        </label>
      </div>
      <Result state={state} />
    </div>
  );
}

/** X DMs: the activation form while alerts are not on, then the bot's state and commands. */
function XDms({
  monitorId,
  displayHandle,
  botState,
  open,
  failedDeliveries,
}: {
  monitorId: string;
  displayHandle: string;
  botState: string;
  /** The free week or a paid plan is running, so the connection can open. */
  open: boolean;
  failedDeliveries: number;
}) {
  const on = botState === "active";
  const paused = botState === "paused";
  const line = on
    ? monitorContent.botActive
    : paused
      ? monitorContent.botPaused
      : !open
        ? monitorContent.activationUnavailable
        : botState === "stopped"
          ? monitorContent.botStopped
          : monitorContent.botHelp(displayHandle);
  return (
    <div className="p-5">
      <p className="flex items-center gap-2.5 text-[13.5px] font-semibold text-t1">
        <span className="grid size-6 place-items-center rounded-md border border-line-strong bg-raised shadow-[var(--top-light)]">
          <BrandIcon name="x" className="size-3 text-t1" />
        </span>
        {dm.xdm}
      </p>
      <p className={cn(note, "mt-2 text-t3")}>{dm.xdmLine(displayHandle)}</p>
      {open && !on && !paused ? (
        <form method="post" action="/api/activation" className="mt-3">
          <input type="hidden" name="monitorId" value={monitorId} />
          <button type="submit" className={cn(primaryButton, "h-8 rounded-md px-3 text-[13px]")}>
            <BrandIcon name="x" className="size-3" />
            {dm.message}
          </button>
        </form>
      ) : null}
      <p className={cn(note, "mt-3", on ? "text-t1" : "text-t2")}>{line}</p>
      {failedDeliveries > 0 ? (
        <p role="alert" className={cn(note, "mt-2 text-[var(--error)]")}>
          {copy.alerts.deliveries(failedDeliveries)}
        </p>
      ) : null}
      {on || paused ? <p className={cn(note, "mt-2 text-t3")}>{dm.commands}</p> : null}
    </div>
  );
}

export function AccountBlock({
  handle,
  monitorId,
  displayHandle,
  email,
  profile,
  plan,
  alerts,
  digests,
  botState,
  open,
  failedDeliveries,
  readOnly,
}: {
  handle: string;
  monitorId: string;
  displayHandle: string;
  email: string | null;
  profile: Profile | null;
  plan: AccountPlan | null;
  alerts: { hour: number; timezone: string; timezones: string[]; cadence: "daily" | "every_15m" };
  digests: { github: boolean; productHunt: boolean };
  botState: string;
  open: boolean;
  /** Null when the delivery read failed. */
  failedDeliveries: number | null;
  readOnly: boolean;
}) {
  return (
    <aside aria-label={monitorContent.menu.account} className="lg:sticky lg:top-[84px]">
      <div className={cn(liftHigh, "divide-y divide-line")}>
        <div className="p-5">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={profile} />
            <div className="min-w-0">
              <p className="truncate text-[15px] leading-tight font-semibold text-t1">
                {profile?.name || `@${displayHandle}`}
              </p>
              <p className="mt-0.5 truncate text-[13px] leading-tight text-t3">@{displayHandle}</p>
            </div>
          </div>
          {email ? <p className="mt-3 truncate text-[12.5px] text-t2">{email}</p> : null}
        </div>
        {plan ? (
          <Plan handle={handle} monitorId={monitorId} plan={plan} readOnly={readOnly} />
        ) : null}
        <div className="grid gap-4 p-5">
          <Alerts handle={handle} readOnly={readOnly} {...alerts} />
          <div className="grid gap-2">
            <p className={heading}>{copy.digests.title}</p>
            <DigestSwitch handle={handle} kind="github" on={digests.github} readOnly={readOnly} />
            <DigestSwitch
              handle={handle}
              kind="product_hunt"
              on={digests.productHunt}
              readOnly={readOnly}
            />
          </div>
        </div>
        <XDms
          monitorId={monitorId}
          displayHandle={displayHandle}
          botState={botState}
          open={open}
          failedDeliveries={failedDeliveries ?? 0}
        />
        <div className="p-5">
          <SignOut className="w-auto" />
        </div>
      </div>
    </aside>
  );
}
