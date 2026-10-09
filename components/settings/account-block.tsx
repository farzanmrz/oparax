"use client";

// The settings work column (council, October 8): three small lifted objects, the person, the plan, and Notifications.
// Every control is an existing one: the Stripe portal, the Twitter DM activation form that opens the "Start alerts"
// message to the bot, the alert hour and timezone, and the digest switches. Alerts turn on when that message arrives,
// so the DM line shows bot_state as it is. Sign out lives in the header's account menu.

import Link from "next/link";
import { startTransition, useActionState, useId, useRef } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { ProfileAvatar } from "@/components/monitor/agent-header";
import type { ShellPlan } from "@/components/one/header";
import { lift, primaryButton } from "@/components/one/stage";
import { Segments } from "@/components/one/tiles";
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
const card = cn(lift, "p-5");
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

/** The person: the picture, the name, the handle under it, and the signed-in email. */
export function PersonCard({
  profile,
  displayHandle,
  email,
  className,
}: {
  profile: Profile | null;
  displayHandle: string;
  email: string | null;
  className?: string;
}) {
  return (
    <section aria-label={monitorContent.menu.account} className={cn(card, className)}>
      <div className="flex items-center gap-3.5">
        <ProfileAvatar profile={profile} />
        <div className="min-w-0">
          <p className="truncate text-[16px] leading-tight font-semibold text-t1">
            {profile?.name || `@${displayHandle}`}
          </p>
          <p className="mt-0.5 truncate text-[13px] leading-tight text-t3">@{displayHandle}</p>
          {email ? <p className="mt-1.5 truncate text-[12.5px] text-t2">{email}</p> : null}
        </div>
      </div>
    </section>
  );
}

export type AccountPlan = ShellPlan & {
  paidThrough: string | null;
  lapsed: boolean;
  /** Paid or lapsed: the plan has a subscription to manage. */
  subscribed: boolean;
  /** The Stripe portal can open for this monitor. */
  billing: boolean;
};

/** The plan: its name and Plans, the free week's meter and days left (or the paid-through date), the posts used. */
export function PlanCard({
  handle,
  monitorId,
  plan,
}: {
  handle: string;
  monitorId: string;
  plan: AccountPlan;
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
    <section aria-label={copy.billing.plans} className={card}>
      <div className="flex items-baseline gap-3">
        <p className={heading}>{plan.name}</p>
        <Link
          href="/#pricing"
          className="ml-auto shrink-0 rounded-sm text-[13px] text-t2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-t1 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
        >
          {copy.billing.plans}
        </Link>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        {plan.daysLeft !== null ? (
          <p className="flex items-baseline gap-1.5">
            <span className="text-[22px] leading-none font-semibold text-t1 tabular-nums">
              {plan.daysLeft}
            </span>
            <span className="text-[13px] text-t2">
              {monitorContent.menu.daysLeft(plan.daysLeft)}
            </span>
          </p>
        ) : plan.paidThrough ? (
          <p className="text-[12.5px] text-t3">
            {copy.billing.through}{" "}
            <time dateTime={plan.paidThrough} className="text-t1">
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                new Date(plan.paidThrough),
              )}
            </time>
          </p>
        ) : null}
        <p className="ml-auto text-[12px] text-t3 tabular-nums">
          {monitorContent.menu.pool(plan.used, plan.limit)}
        </p>
      </div>
      {plan.daysLeft !== null ? (
        <div className="mt-3">
          <Segments total={plan.days} filled={plan.daysLeft} />
        </div>
      ) : null}
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
          <form action={action} className="mt-4 grid gap-2" aria-busy={pending}>
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
    </section>
  );
}

function Alerts({
  handle,
  hour,
  timezone,
  timezones,
  cadence,
}: {
  handle: string;
  hour: number;
  timezone: string;
  timezones: string[];
  cadence: "daily" | "every_15m";
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
            disabled={pending}
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
            disabled={pending}
            className={field}
          >
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className={quietButton}>
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
}: {
  handle: string;
  kind: "github" | "product_hunt";
  on: boolean;
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
          disabled={pending}
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

const stateTone: Record<string, string> = {
  active: "bg-[var(--ok)]",
  paused: "bg-[var(--caution)]",
  stopped: "bg-[var(--error)]",
};

/** Notifications: the Twitter DM connection in words and its action, the alert time, and the two digests. */
export function NotificationsCard({
  handle,
  monitorId,
  displayHandle,
  botState,
  open,
  failedDeliveries,
  alerts,
  digests,
  className,
}: {
  handle: string;
  monitorId: string;
  displayHandle: string;
  botState: string;
  /** The free week or a paid plan is running, so the connection can open. */
  open: boolean;
  /** Null when the delivery read failed. */
  failedDeliveries: number | null;
  alerts: { hour: number; timezone: string; timezones: string[]; cadence: "daily" | "every_15m" };
  digests: { github: boolean; productHunt: boolean };
  className?: string;
}) {
  const on = botState === "active";
  const paused = botState === "paused";
  const word =
    botState === "active" || botState === "paused" || botState === "stopped"
      ? dm.states[botState]
      : dm.states.none;
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
    <section aria-label={dm.title} className={cn(lift, "divide-y divide-line", className)}>
      <div className="p-5">
        <p className="text-[15px] font-semibold text-t1">{dm.title}</p>
        <div className="mt-4 flex items-center gap-2.5">
          <span className="grid size-6 place-items-center rounded-md border border-line-strong bg-raised shadow-[var(--top-light)]">
            <BrandIcon name="x" className="size-3 text-t1" />
          </span>
          <p className={heading}>{dm.xdm}</p>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-t2">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", stateTone[botState] ?? "border border-t3")}
            />
            {word}
          </span>
        </div>
        <p className={cn(note, "mt-2 text-t3")}>{dm.xdmLine(displayHandle)}</p>
        {open && !on && !paused ? (
          <form method="post" action="/api/activation" className="mt-3">
            <input type="hidden" name="monitorId" value={monitorId} />
            <button
              type="submit"
              className={cn(primaryButton, "h-9 rounded-md px-3.5 text-[13px]")}
            >
              <BrandIcon name="x" className="size-3" />
              {dm.message}
            </button>
          </form>
        ) : null}
        <p className={cn(note, "mt-3", on ? "text-t1" : "text-t2")}>{line}</p>
        {failedDeliveries ? (
          <p role="alert" className={cn(note, "mt-2 text-[var(--error)]")}>
            {copy.alerts.deliveries(failedDeliveries)}
          </p>
        ) : null}
        {on || paused ? <p className={cn(note, "mt-2 text-t3")}>{dm.commands}</p> : null}
      </div>
      <div className="p-5">
        <Alerts handle={handle} {...alerts} />
      </div>
      <div className="grid gap-2 p-5">
        <p className={heading}>{copy.digests.title}</p>
        <DigestSwitch handle={handle} kind="github" on={digests.github} />
        <DigestSwitch handle={handle} kind="product_hunt" on={digests.productHunt} />
      </div>
    </section>
  );
}
