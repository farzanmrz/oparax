import "server-only";

import { z } from "zod";
import { ledgerRows } from "@/lib/guards/ledger";
import { reportServerException } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";

const balanceSchema = z.object({
  console: z.number().finite().nullable(),
  checked_at: z.iso.datetime({ offset: true }).nullable(),
  status: z.enum(["ok", "unknown", "failed"]),
});
export type XBalance = z.infer<typeof balanceSchema>;
const unknownBalance: XBalance = { console: null, checked_at: null, status: "unknown" };

export async function refreshXBalance(previous: XBalance = unknownBalance): Promise<XBalance> {
  let balance: XBalance;
  try {
    const token = process.env.X_BEARER_TOKEN;
    if (!token) throw new Error("Missing X app token");
    const response = await fetch("https://api.x.com/2/usage/credits", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`X credits ${response.status}`);
    const body = z
      .object({ data: z.object({ total_balance: z.coerce.number().finite() }) })
      .parse(await response.json());
    balance = {
      console: body.data.total_balance,
      checked_at: new Date().toISOString(),
      status: "ok",
    };
  } catch (error) {
    reportServerException(error, { tags: { area: "credits" } });
    balance = { ...previous, status: "failed" };
  }
  const { error } = await createAdminClient().from("config").upsert({
    key: "x_balance",
    value: balance,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return balance;
}

export async function guards(): Promise<{
  killSwitch: boolean;
  anonBuildsOpen: boolean;
  trialPollingOpen: boolean;
  balanceEstimate: number | null;
}> {
  const { data, error } = await createAdminClient().from("config").select("key,value");
  if (error) throw error;
  const config = Object.fromEntries(data.map((row) => [row.key, row.value]));
  const killSwitch = z.boolean().catch(true).parse(config.kill_switch);
  const budget = z.number().finite().nonnegative().catch(0).parse(config.anon_budget_usd);
  let balance = balanceSchema.catch(unknownBalance).parse(config.x_balance);
  const stale =
    balance.status !== "ok" ||
    balance.console === null ||
    !balance.checked_at ||
    Date.now() - Date.parse(balance.checked_at) > 25 * 60 * 60 * 1000;
  if (stale && !killSwitch) balance = await refreshXBalance(balance);
  let balanceEstimate: number | null = null;
  if (balance.status === "ok" && balance.console !== null && balance.checked_at) {
    const rows = await ledgerRows({ service: "x", since: balance.checked_at });
    balanceEstimate =
      balance.console -
      rows
        .filter((r) => r.kind !== "post_share")
        .reduce((n, r) => n + (r.settled ? r.usd : r.usd_reserved), 0);
  }
  const reservations = (await ledgerRows({ service: "reservation" })).reduce(
    (n, r) => n + (r.settled ? r.usd : r.usd_reserved),
    0,
  );
  const trialPollingOpen = !killSwitch && balanceEstimate !== null && balanceEstimate >= 15;
  return {
    killSwitch,
    balanceEstimate,
    trialPollingOpen,
    anonBuildsOpen: trialPollingOpen && reservations + 3 <= budget,
  };
}
