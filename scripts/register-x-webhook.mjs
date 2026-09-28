import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const webhookUrl = "https://oparax.ai/api/x/webhook";
const xId = z.string().regex(/^\d+$/);
const webhookSchema = z.object({ id: xId, url: z.url(), valid: z.boolean() });

class RegistrationBlocker extends Error {}

async function xRequest(path, token, body) {
  const method = body ? "POST" : "GET";
  const response = await fetch(`https://api.x.com/2/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  console.log(`${method} /2/${path}: ${response.status}`);
  if (!response.ok) {
    throw new RegistrationBlocker(
      `X refused ${method} /2/${path} (${response.status}). Check app access, webhook CRC and the bot token's dm.read scope in the X console.`,
    );
  }
  const json = await response.json();
  const errors = z.object({ errors: z.array(z.unknown()).optional() }).safeParse(json);
  if (!errors.success || errors.data.errors?.length) {
    throw new RegistrationBlocker(
      `X reported an error for ${method} /2/${path}. Check the X console.`,
    );
  }
  return json;
}

async function main() {
  if (existsSync(".env.local")) loadEnvFile(".env.local");
  const env = z
    .object({
      X_BEARER_TOKEN: z.string().min(1),
      X_BOT_BEARER_TOKEN: z.string().min(1),
      NEXT_PUBLIC_SUPABASE_URL: z.url(),
      SUPABASE_SECRET_KEY: z.string().min(1),
    })
    .safeParse(process.env);
  if (!env.success) {
    throw new RegistrationBlocker(
      `Missing or invalid configuration: ${env.error.issues.map((issue) => issue.path.join(".")).join(", ")}.`,
    );
  }
  const db = createClient(env.data.NEXT_PUBLIC_SUPABASE_URL, env.data.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.from("config").select("value").eq("key", "bot").single();
  if (error) throw new RegistrationBlocker("Could not read the stored bot identity from Supabase.");
  const bot = z.object({ x_user_id: xId }).safeParse(data?.value);
  if (!bot.success) {
    throw new RegistrationBlocker(
      "Bot identity is missing. Run the credits cron to fill config.bot before registering.",
    );
  }

  const listed = z
    .union([
      z.object({ data: z.array(webhookSchema) }).transform((body) => body.data),
      z.object({ meta: z.object({ result_count: z.literal(0) }) }).transform(() => []),
    ])
    .parse(await xRequest("webhooks?webhook_config.fields=id,url,valid", env.data.X_BEARER_TOKEN));
  let webhook = listed.find((entry) => entry.url === webhookUrl);
  if (webhook) console.log(`Reusing webhook ${webhook.id} (valid: ${webhook.valid}).`);
  else {
    const created = z
      .object({ data: webhookSchema })
      .parse(await xRequest("webhooks", env.data.X_BEARER_TOKEN, { url: webhookUrl }));
    webhook = created.data;
    console.log(`Created webhook ${webhook.id} (valid: ${webhook.valid}).`);
  }
  if (!webhook.valid) {
    throw new RegistrationBlocker(
      `Webhook ${webhook.id} failed CRC validation. Fix the deployed webhook and validate it in the X console.`,
    );
  }

  // https://docs.x.com/x-api/activity/create-x-activity-subscription, checked September 28, 2026.
  const subscription = z
    .object({
      data: z.object({
        subscription: z.object({
          subscription_id: z.string().min(1),
          event_type: z.literal("dm.received"),
          webhook_id: z.literal(webhook.id),
          filter: z.object({ user_id: z.literal(bot.data.x_user_id) }),
        }),
      }),
    })
    .parse(
      await xRequest("activity/subscriptions", env.data.X_BOT_BEARER_TOKEN, {
        event_type: "dm.received",
        filter: { user_id: bot.data.x_user_id },
        webhook_id: webhook.id,
      }),
    );
  console.log(
    `DM subscription ${subscription.data.subscription.subscription_id} is connected to webhook ${webhook.id}.`,
  );
}

main().catch((error) => {
  console.error(
    `BLOCKER: ${error instanceof RegistrationBlocker ? error.message : "Registration could not finish because of a network failure or an unexpected response. Check the status lines above and the X console."}`,
  );
  process.exitCode = 1;
});
