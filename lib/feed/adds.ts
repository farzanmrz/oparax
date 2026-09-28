import "server-only";

import { jev } from "@/lib/ai/jev";
import { requireTime } from "./checks";
import { ADDS_QUESTION } from "./prompts";
import type { FeedContext, StoryView } from "./types";

export const ADDS_LINE = 0.75;

export async function addsToStory(context: FeedContext, story: StoryView): Promise<number> {
  requireTime(context);
  const { adds } = await jev(
    {
      story: { headline: story.headline, facts: story.facts },
      item: { title: context.item.title, text: context.item.text, source: context.source },
    },
    { adds: ADDS_QUESTION },
    { kind: "adds", monitorId: context.monitorId, sourceId: context.item.source_id },
  );
  return adds;
}
