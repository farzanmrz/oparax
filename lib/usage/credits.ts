// Live platform credit/balance readout. All endpoints are free account-management
// calls, so we fetch them on every dashboard load (in parallel). Each is
// best-effort: a missing key or error yields nulls, never a throw.

export interface PlatformCredit {
  platform: string; // "vercel gateway" | "deepseek" | "deepinfra" | "xai"
  /** Available balance/credits in USD (null when the platform is postpaid/unknown). */
  balance: number | null;
  /** Spend so far in USD (lifetime or since last invoice, platform-dependent). */
  used: number | null;
  /** Spending limit in USD, if the platform exposes one. */
  limit: number | null;
  note: string;
  /** True when the balance is running low / spend is near the limit. */
  low: boolean;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : null;
  return n != null && Number.isFinite(n) ? n : null;
}

/** Vercel AI Gateway fallback credits — keep BYOK topped up so this isn't used. */
async function vercelCredits(): Promise<PlatformCredit> {
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const base: PlatformCredit = {
    platform: "vercel gateway",
    balance: null,
    used: null,
    limit: null,
    note: "fallback — keep BYOK topped up",
    low: false,
  };
  if (!key) return { ...base, note: "no AI_GATEWAY_API_KEY" };
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/credits", {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return { ...base, note: `error ${res.status}` };
    const j = (await res.json()) as { balance?: string; total_used?: string };
    const balance = num(j.balance);
    return { ...base, balance, used: num(j.total_used), low: balance != null && balance < 5 };
  } catch (error) {
    return { ...base, note: String(error) };
  }
}

/** DeepSeek prepaid balance. */
async function deepseekCredits(): Promise<PlatformCredit> {
  const key = process.env.DEEPSEEK_API_KEY;
  const base: PlatformCredit = {
    platform: "deepseek",
    balance: null,
    used: null,
    limit: null,
    note: "byok",
    low: false,
  };
  if (!key) return { ...base, note: "no DEEPSEEK_API_KEY" };
  try {
    const res = await fetch("https://api.deepseek.com/user/balance", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) return { ...base, note: `error ${res.status}` };
    const j = (await res.json()) as {
      balance_infos?: Array<{ currency?: string; total_balance?: string }>;
    };
    const usd = j.balance_infos?.find((b) => b.currency === "USD") ?? j.balance_infos?.[0];
    const balance = num(usd?.total_balance);
    return { ...base, balance, low: balance != null && balance < 2 };
  } catch (error) {
    return { ...base, note: String(error) };
  }
}

/** DeepInfra: /v1/me checklist — stripe_balance (negative = funds), recent spend, limit. */
async function deepinfraCredits(): Promise<PlatformCredit> {
  const key = process.env.DEEPINFRA_API_KEY;
  const base: PlatformCredit = {
    platform: "deepinfra",
    balance: null,
    used: null,
    limit: null,
    note: "byok",
    low: false,
  };
  if (!key) return { ...base, note: "no DEEPINFRA_API_KEY" };
  try {
    const res = await fetch("https://api.deepinfra.com/v1/me?checklist=true", {
      headers: { Authorization: `Bearer ${key}`, "xi-api-key": key },
    });
    if (!res.ok) return { ...base, note: `error ${res.status}` };
    const j = (await res.json()) as {
      checklist?: { stripe_balance?: number; recent?: number; limit?: number | null };
    };
    const stripe = j.checklist?.stripe_balance ?? null;
    // Negative stripe_balance = prepaid funds available; positive = amount owed.
    const balance = stripe != null ? (stripe < 0 ? -stripe : 0) : null;
    const limit = num(j.checklist?.limit);
    return {
      ...base,
      balance,
      used: num(j.checklist?.recent),
      limit,
      low: balance != null && balance < 5,
    };
  } catch (error) {
    return { ...base, note: String(error) };
  }
}

/** xAI: prepaid credit balance + postpaid spending limit (team-scoped management key). */
async function xaiCredits(): Promise<PlatformCredit> {
  const key = process.env.XAI_MANAGEMENT_KEY;
  const base: PlatformCredit = {
    platform: "xai",
    balance: null,
    used: null,
    limit: null,
    note: "byok",
    low: false,
  };
  if (!key) return { ...base, note: "no XAI_MANAGEMENT_KEY" };
  try {
    const apiBase = "https://management-api.x.ai";
    const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    let teamId = process.env.XAI_TEAM_ID ?? null;
    if (!teamId) {
      const v = await fetch(`${apiBase}/auth/management-keys/validation`, { headers });
      if (v.ok) {
        const j = (await v.json()) as { teamId?: string; scopeId?: string };
        teamId = j.teamId ?? j.scopeId ?? null;
      }
    }
    if (!teamId) return { ...base, note: "no team id" };

    // xAI is postpaid: prepaid "balance" can be negative (failed top-up), so we
    // surface used + limit instead, and only show a balance if it's truly positive.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usageBody = {
      analyticsRequest: {
        timeRange: {
          startTime: since.toISOString().slice(0, 19).replace("T", " "),
          endTime: new Date().toISOString().slice(0, 19).replace("T", " "),
          timezone: "Etc/GMT",
        },
        timeUnit: "TIME_UNIT_NONE",
        values: [{ name: "usd", aggregation: "AGGREGATION_SUM" }],
        groupBy: [] as string[],
        filters: [] as string[],
      },
    };
    const [prepaid, limits, usage] = await Promise.all([
      fetch(`${apiBase}/v1/billing/teams/${teamId}/prepaid/balance`, { headers }),
      fetch(`${apiBase}/v1/billing/teams/${teamId}/postpaid/spending-limits`, { headers }),
      fetch(`${apiBase}/v1/billing/teams/${teamId}/usage`, {
        method: "POST",
        headers,
        body: JSON.stringify(usageBody),
      }),
    ]);

    let balance: number | null = null;
    if (prepaid.ok) {
      const pj = (await prepaid.json()) as { total?: { val?: string } };
      const cents = num(pj.total?.val);
      // xAI ledger convention: a NEGATIVE total.val is prepaid credit ready to
      // spend (e.g. -14836 = $148.36 available); positive would mean amount owed.
      if (cents != null && cents < 0) balance = Number((-cents / 100).toFixed(2));
    }
    let limit: number | null = null;
    if (limits.ok) {
      const lj = (await limits.json()) as {
        spendingLimits?: { effectiveHardSl?: { val?: string }; effectiveSl?: { val?: string } };
      };
      const sl = lj.spendingLimits;
      const cents = num(sl?.effectiveHardSl?.val ?? sl?.effectiveSl?.val);
      if (cents != null && cents > 0) limit = Number((cents / 100).toFixed(2));
    }
    let used: number | null = null;
    if (usage.ok) {
      const uj = (await usage.json()) as {
        timeSeries?: Array<{ dataPoints?: Array<{ values?: number[] }> }>;
      };
      let sum = 0;
      for (const ts of uj.timeSeries ?? []) {
        for (const dp of ts.dataPoints ?? []) sum += dp.values?.[0] ?? 0;
      }
      used = Number(sum.toFixed(2));
    }
    const low =
      (balance != null && balance > 0 && balance < 5) ||
      (limit != null && used != null && used / limit > 0.8);
    return { ...base, balance, used, limit, low, note: "byok · postpaid" };
  } catch (error) {
    return { ...base, note: String(error) };
  }
}

/** Fetch all platform credits in parallel. Order: gateway first, then BYOK providers. */
export async function fetchCredits(): Promise<PlatformCredit[]> {
  return Promise.all([vercelCredits(), deepseekCredits(), deepinfraCredits(), xaiCredits()]);
}
