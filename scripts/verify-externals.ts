// scripts/verify-externals.ts
//
// Actually CALLS every outbound dependency the app has, through the app's OWN modules.
//
// This exists because the QC battery could not catch a whole class of failure. `pnpm build`
// compiles /api/ingest and never invokes it; tsc, Biome, a boot smoke and a browser sweep all
// pass against an integration that is 100% dead at the network layer. Three real examples, all
// found on the first run of this script and none catchable by any other gate: the voice corpus
// source had been returning zero records for every X profile; the pre-flight gate it fed was
// rejecting live accounts; and every BYOK model call was recording $0. All three compiled,
// linted, booted and rendered perfectly. Nothing short of making the call finds them.
//
// It imports the REAL lib/* functions rather than re-implementing the requests. A probe that
// rebuilds the fetch by hand proves the vendor is up; it does not prove OUR code reaches it, and
// the difference is exactly where the last failure lived.
//
// Usage:
//   pnpm dlx tsx --env-file=.env.local scripts/verify-externals.ts [--paid] [--only=name,name]
//
// FREE checks run by default — including the corpus read, which is free within X's monthly post
// cap and is the single most important thing here. `--paid` adds the model calls (cents).
// NOTHING here posts to X, sends an email, or writes a draft. Read-only or self-addressed.

import { generateText } from "ai";
import { resolveGatewayCost } from "@/lib/agent/gateway-cost";
import { QWEN_DRAFT_MODEL } from "@/lib/agent/qwen-draft-config";
import { getSlackAccount } from "@/lib/slack/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXTRACTION_MODEL } from "@/lib/voice/extract-guide";
import { fetchMe, refreshTokens } from "@/lib/x/api";
import { getXAccount, updateXTokens } from "@/lib/x/store";
import { fetchUserTimeline } from "@/lib/x/timeline";

type Status = "PASS" | "FAIL" | "SKIP";
type Check = { name: string; paid: boolean; run: () => Promise<string> };

const results: { name: string; status: Status; detail: string; ms: number }[] = [];

const args = process.argv.slice(2);
const runPaid = args.includes("--paid");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length).split(",") : null;

/** Resolved once — several checks need a real owner to scope their reads and metering to. */
async function resolveOwner(): Promise<{ ownerId: string; handle: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agents")
    .select("owner_id, reporter_handle")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("no agents row to scope probes against — create an agent first");
  return { ownerId: data.owner_id, handle: data.reporter_handle };
}

function buildChecks(owner: { ownerId: string; handle: string | null }): Check[] {
  return [
    {
      name: "supabase:service-role",
      paid: false,
      run: async () => {
        const admin = createAdminClient();
        // A deny-all table: proves the SECRET key is in play, not the publishable one.
        const { error } = await admin.from("x_accounts").select("user_id").limit(1);
        if (error) throw error;
        return "service-role read against a deny-all table succeeded";
      },
    },
    {
      name: "supabase:rls-denies-anon",
      paid: false,
      run: async () => {
        // The security claim the whole schema rests on, asserted rather than assumed.
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) throw new Error("supabase public env missing");
        const res = await fetch(`${url}/rest/v1/x_accounts?select=user_id&limit=1`, {
          headers: { apikey: key, authorization: `Bearer ${key}` },
        });
        const body = await res.text();
        if (body.trim() !== "[]" && res.ok) {
          throw new Error(`anon key READ rows from x_accounts (${body.slice(0, 120)})`);
        }
        return `anon key blocked from x_accounts (HTTP ${res.status})`;
      },
    },
    {
      name: "ai-gateway:auth+cost",
      paid: true,
      run: async () => {
        // Cheapest real call on the drafting model, priced through the app's OWN resolver.
        // maxOutputTokens is generous on purpose: v4-flash reasons natively, and a 16-token
        // budget is consumed entirely by reasoning, returning empty text that reads as a
        // failure when the model is fine.
        const r = await generateText({
          model: QWEN_DRAFT_MODEL,
          prompt: "Reply with the single word: ok",
          maxOutputTokens: 512,
        });
        if (!r.text.trim()) throw new Error("model returned empty text");
        const { costUsd, generationId } = await resolveGatewayCost(r);
        if (!generationId)
          throw new Error("gateway returned NO generationId — cost is unrecoverable");
        // A null cost here is EXPECTED, not a failure: the usage event is not queryable for
        // ~19s, so BYOK calls price later via reconcileMissingCosts(). What must hold is that a
        // generationId came back, because that is the handle the repair pass needs.
        return `replied "${r.text.trim().slice(0, 12)}", gen=${generationId.slice(0, 14)}, cost=${costUsd ?? "null (reconciles later — BYOK)"}`;
      },
    },
    {
      name: "ai-gateway:extraction-model",
      paid: true,
      run: async () => {
        // The exact model id extraction uses. A wrong/retired id fails ONLY here — the app would
        // otherwise discover it at the end of a paid corpus pull.
        const r = await generateText({
          model: EXTRACTION_MODEL,
          prompt: "Reply with the single word: ok",
          maxOutputTokens: 16,
        });
        return `${EXTRACTION_MODEL} reachable, replied "${r.text.trim().slice(0, 20)}"`;
      },
    },
    {
      name: "x:corpus-read",
      paid: false,
      run: async () => {
        // THE extraction dependency. Free within the project's monthly post cap, so it runs on
        // every pass rather than hiding behind --paid: this is the exact call that silently
        // returned nothing for months under the vendor it replaced.
        if (!owner.handle) throw new Error("no reporter_handle on the newest desk");
        const posts = await fetchUserTimeline(owner.handle, owner.ownerId);
        if (posts.length === 0) throw new Error(`returned ZERO posts for @${owner.handle}`);
        const newest = posts.reduce((a, b) => (a.postedAt > b.postedAt ? a : b));
        return `${posts.length} posts for @${owner.handle}; newest ${newest.postedAt}; ${posts.filter((p) => p.likeCount > 0).length} with engagement`;
      },
    },
    {
      name: "x:app-bearer",
      paid: false,
      run: async () => {
        // App-only credential the ingestion worker's filtered stream uses. Sent RAW — URL-decoding
        // the portal's escapes produces a 401 (.claude/rules/x.md).
        const token = process.env.X_BEARER_TOKEN;
        if (!token) return "X_BEARER_TOKEN not set — SKIP";
        const res = await fetch("https://api.x.com/2/tweets/search/stream/rules/counts", {
          headers: { authorization: `Bearer ${token}` },
        });
        const body = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
        return `stream rules reachable — ${body.slice(0, 160)}`;
      },
    },
    {
      name: "x:oauth-token",
      paid: false,
      run: async () => {
        // The reporter's linked account. Refreshing here MUST persist the rotated token —
        // X invalidates the old refresh_token the moment it issues a new one, so a probe that
        // refreshes and discards the result silently breaks the reporter's live X connection.
        // (It did exactly that on first run. lib/x/actions.ts always got this right; this probe
        // did not, which is precisely why it now reuses the same store function the app does.)
        const acct = await getXAccount(owner.ownerId);
        if (!acct) return "no linked X account for this owner — SKIP";
        let accessToken = acct.access_token;
        const expired = new Date(acct.token_expires_at).getTime() < Date.now() + 60_000;
        let note = "";
        if (expired) {
          const set = await refreshTokens(acct.refresh_token);
          if (!("accessToken" in set))
            throw new Error(
              `refresh failed (the stored refresh_token is dead — reconnect X in the UI): ${JSON.stringify(set).slice(0, 160)}`,
            );
          accessToken = set.accessToken;
          await updateXTokens(owner.ownerId, {
            accessToken: set.accessToken,
            refreshToken: set.refreshToken ?? acct.refresh_token,
            tokenExpiresAt: new Date(Date.now() + set.expiresInSec * 1000).toISOString(),
          });
          note = " (token was expired; refreshed AND persisted)";
        }
        const me = await fetchMe(accessToken);
        return `linked as @${me.username} (id ${me.id})${note}`;
      },
    },
    {
      name: "slack:per-desk-token",
      paid: false,
      run: async () => {
        const admin = createAdminClient();
        const { data: desk } = await admin
          .from("agents")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!desk) return "no desk — SKIP";
        const acct = await getSlackAccount(desk.id);
        if (!acct) return "no Slack account linked to the newest desk — SKIP";
        // auth.test is read-only: it validates the token without posting anything.
        const res = await fetch("https://slack.com/api/auth.test", {
          method: "POST",
          headers: { authorization: `Bearer ${acct.access_token}` },
        });
        const json = (await res.json()) as { ok: boolean; team?: string; error?: string };
        if (!json.ok) throw new Error(`auth.test failed: ${json.error}`);
        return `token valid for team "${json.team}", channel #${acct.channel_name}`;
      },
    },
    {
      name: "slack:legacy-webhook",
      paid: false,
      run: async () => {
        // Reachability only — deliberately NOT posting. A webhook cannot be validated without
        // sending a message into a real channel, and that is the owner's call, not a probe's.
        const url = process.env.SLACK_WEBHOOK_URL;
        if (!url) return "SLACK_WEBHOOK_URL not set — SKIP";
        return `configured (${url.slice(0, 34)}…) — NOT exercised: verifying it means posting a real message`;
      },
    },
    {
      name: "sentry:dsn-ingest",
      paid: false,
      run: async () => {
        // Does an event actually LAND? The SDK wiring was verified locally but delivery never was.
        const { SENTRY_DSN } = await import("@/lib/observability/sentry-shared");
        const m = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
        if (!m) throw new Error("DSN did not parse");
        const [, key, host, projectId] = m;
        const envelope =
          `${JSON.stringify({ event_id: "0".repeat(32), dsn: SENTRY_DSN })}\n` +
          `${JSON.stringify({ type: "event" })}\n` +
          `${JSON.stringify({ message: "verify-externals probe", level: "info", platform: "node" })}\n`;
        const res = await fetch(`https://${host}/api/${projectId}/envelope/`, {
          method: "POST",
          headers: {
            "content-type": "application/x-sentry-envelope",
            "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=oparax-probe/1.0`,
          },
          body: envelope,
        });
        const body = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
        return `envelope accepted (HTTP ${res.status}) — an "info" event titled "verify-externals probe" should appear in Sentry`;
      },
    },
    {
      name: "resend:configured",
      paid: false,
      run: async () => {
        const key = process.env.RESEND_API_KEY;
        if (!key)
          return "RESEND_API_KEY not set — SKIP (documented as not-yet-provisioned; the email leg is switched off behind EMAIL_DELIVERY_ENABLED)";
        const res = await fetch("https://api.resend.com/domains", {
          headers: { authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return "API key valid";
      },
    },
  ];
}
async function main() {
  const owner = await resolveOwner();
  const CHECKS = buildChecks(owner);

  for (const check of CHECKS) {
    if (only && !only.includes(check.name)) continue;
    if (check.paid && !runPaid) {
      results.push({
        name: check.name,
        status: "SKIP",
        detail: "costs money — pass --paid",
        ms: 0,
      });
      continue;
    }
    const t0 = Date.now();
    try {
      const detail = await check.run();
      const skipped = detail.includes("— SKIP");
      results.push({
        name: check.name,
        status: skipped ? "SKIP" : "PASS",
        detail,
        ms: Date.now() - t0,
      });
    } catch (e) {
      results.push({
        name: check.name,
        status: "FAIL",
        detail: e instanceof Error ? e.message : String(e),
        ms: Date.now() - t0,
      });
    }
  }

  report();
}

function report(): void {
  const pad = Math.max(...results.map((r) => r.name.length));
  console.log("");
  for (const r of results) {
    const mark = r.status === "PASS" ? "\u2713" : r.status === "FAIL" ? "\u2717" : "\u2013";
    console.log(`${mark} ${r.status.padEnd(4)} ${r.name.padEnd(pad)}  ${r.ms}ms  ${r.detail}`);
  }
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("verify-externals: harness failed before any check ran\n", e);
  process.exit(1);
});
