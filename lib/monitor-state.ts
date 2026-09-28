import type { Tables } from "@/lib/supabase/database.types";

type MonitorRow = Tables<"monitors">;
type StateInput = Pick<
  MonitorRow,
  | "status"
  | "build_finished_at"
  | "trial_started_at"
  | "last_viewed_at"
  | "paid_through"
  | "tier"
  | "pool_limit"
  | "pool_used"
  | "cadence"
  | "subscription_status"
  | "budget_exhausted_at"
>;
export type MonitorState = {
  state:
    | "building"
    | "failed"
    | "dormant"
    | "paused"
    | "trial"
    | "exhausted"
    | "frozen"
    | "paid"
    | "lapsed";
  daysLeft: number | null;
  trialEndsAt: Date | null;
  poolOpen: boolean;
  cadence: "daily" | "every_15m";
};
const DAY = 86_400_000;

export function monitorState(m: StateInput, now = new Date()): MonitorState {
  const time = now.getTime();
  const trialEndsAt = m.trial_started_at
    ? new Date(Date.parse(m.trial_started_at) + 7 * DAY)
    : null;
  let state: MonitorState["state"];
  if (m.status === "building") state = "building";
  else if (m.status === "failed") state = "failed";
  else if (m.paid_through && Date.parse(m.paid_through) > time) state = "paid";
  else if (m.paid_through && Date.parse(m.paid_through) <= time) state = "lapsed";
  else if (trialEndsAt && trialEndsAt.getTime() <= time) state = "frozen";
  else if (m.tier === "free" && m.budget_exhausted_at) state = "exhausted";
  else if (
    m.tier === "free" &&
    (m.status === "paused" ||
      (m.build_finished_at &&
        time -
          Math.max(
            Date.parse(m.build_finished_at),
            m.last_viewed_at ? Date.parse(m.last_viewed_at) : 0,
          ) >=
          14 * DAY))
  )
    state = "paused";
  else if (trialEndsAt) state = "trial";
  else state = "dormant";
  return {
    state,
    trialEndsAt,
    daysLeft: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - time) / DAY)) : null,
    poolOpen: (state === "trial" || state === "paid") && m.pool_used < m.pool_limit,
    cadence: m.cadence === "every_15m" ? "every_15m" : "daily",
  };
}

export function dueDailySlot(
  m: Pick<MonitorRow, "alert_hour" | "alert_timezone">,
  now = new Date(),
): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: m.alert_timezone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const slots = new Map<string, number>();
  const end = Math.floor(now.getTime() / 60_000) * 60_000;
  // Walking real minutes also covers half-hour DST shifts and missing local hours.
  // Keep the first occurrence per date so a repeated hour cannot send twice.
  for (let time = end - 3 * DAY; time <= end; time += 60_000) {
    const parts = Object.fromEntries(formatter.formatToParts(time).map((p) => [p.type, p.value]));
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    if (Number(parts.hour) >= m.alert_hour && !slots.has(date)) slots.set(date, time);
  }
  return new Date(Math.max(...slots.values()));
}
