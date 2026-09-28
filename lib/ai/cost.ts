import "server-only";

import { z } from "zod";

export { BudgetRefused, CostUnbounded, withCost } from "@/lib/guards/ledger";

// USD per million tokens, Gateway model list checked 2026-09-28.
export const LUNA_IN = 0.2;
export const LUNA_OUT = 1;
const costValue = z
  .union([z.number(), z.string().min(1).transform(Number)])
  .pipe(z.number().finite().nonnegative());
const metadataSchema = z.object({ gateway: z.object({ cost: costValue, marketCost: costValue }) });

export function gatewayCost(providerMetadata: unknown): { charged: number; market: number } {
  const { gateway } = metadataSchema.parse(providerMetadata);
  return { charged: gateway.cost, market: gateway.marketCost };
}
