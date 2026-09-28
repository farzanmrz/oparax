import "server-only";

import { jev } from "@/lib/ai/jev";
import { requireTime } from "./checks";
import { FIT_QUESTION } from "./prompts";
import type { FeedContext } from "./types";

export const FIT_ON = 0.5;
export const FIT_OFF = 0.35;

export async function fitItem(
  context: FeedContext,
  noFilter: boolean,
): Promise<{ score: number | null; band: "on" | "off" | "unsure" }> {
  if (noFilter) return { score: null, band: "on" };
  requireTime(context);
  const { item } = context;
  const { fit } = await jev(
    {
      beat: context.beat,
      person: { brief: context.brief },
      source: context.source,
      preferences: [],
      examples: [],
      item: { title: item.title, text: item.text, published_at: item.published_at },
    },
    { fit: FIT_QUESTION },
    { kind: "fit", monitorId: context.monitorId, sourceId: item.source_id },
  );
  return { score: fit, band: fit >= FIT_ON ? "on" : fit < FIT_OFF ? "off" : "unsure" };
}
