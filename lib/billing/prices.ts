import "server-only";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./stripe";

export const paidTierSchema = z.enum(["hobby", "creator", "wire"]);
export type PaidTier = z.infer<typeof paidTierSchema>;

export const paidTiers = {
  hobby: { name: "Hobby", cents: 500, pool: 100, cadence: "daily" },
  creator: { name: "Creator", cents: 3000, pool: 3000, cadence: "daily" },
  wire: { name: "Wire", cents: 9900, pool: 4000, cadence: "every_15m" },
} as const;

const tierCacheSchema = z.partialRecord(paidTierSchema, z.string().startsWith("price_"));
const cacheSchema = z.object({
  live: tierCacheSchema.optional(),
  test: tierCacheSchema.optional(),
});

export async function priceIdFor(tier: PaidTier): Promise<string> {
  const key = z
    .string()
    .regex(/^sk_(live|test)_/)
    .parse(process.env.STRIPE_SECRET_KEY);
  const mode = key.startsWith("sk_live_") ? "live" : "test";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("config")
    .select("value")
    .eq("key", "stripe_prices")
    .single();
  if (error) throw error;
  const cache = cacheSchema.parse(data.value);
  const modeCache = cache[mode] ?? {};
  if (modeCache[tier]) return modeCache[tier];

  const stripe = getStripe();
  const lookupKey = `oparax_${tier}_monthly`;
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  let price = prices.data[0];
  if (!price) {
    const product = await stripe.products.create(
      { id: `oparax_${tier}`, name: `Oparax ${paidTiers[tier].name}` },
      { idempotencyKey: `product_${lookupKey}` },
    );
    price = await stripe.prices.create(
      {
        product: product.id,
        lookup_key: lookupKey,
        currency: "usd",
        unit_amount: paidTiers[tier].cents,
        recurring: { interval: "month" },
      },
      { idempotencyKey: lookupKey },
    );
  }
  if (
    price.unit_amount !== paidTiers[tier].cents ||
    price.currency !== "usd" ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1
  )
    throw new Error("Stripe price does not match the approved tier.");

  const { error: cacheError } = await admin
    .from("config")
    .update({
      value: { ...cache, [mode]: { ...modeCache, [tier]: price.id } },
    })
    .eq("key", "stripe_prices");
  if (cacheError) throw cacheError;
  return price.id;
}
