import "server-only";

import { jev } from "@/lib/ai/jev";
import { CostUnbounded } from "@/lib/guards/ledger";
import { requireTime } from "./checks";
import { GROUP_QUESTION } from "./prompts";
import type { FeedContext, StoryView } from "./types";

export const WINDOW_H = 72;
export const JOIN_LINE = 0.75;
const GROUP_BATCH = 60;
const STATE_TOKENS = 32_000;
const REQUEST_TOKENS = 64_000;

export async function groupItem(
  context: FeedContext,
  stories: StoryView[],
): Promise<Record<string, number>> {
  async function batch(candidates: StoryView[]): Promise<Record<string, number>> {
    requireTime(context);
    const state = {
      item: { title: context.item.title, text: context.item.text },
      stories: Object.fromEntries(
        candidates.map(({ id, headline, facts }) => [id, { headline, facts }]),
      ),
    };
    const questions = Object.fromEntries(
      candidates.map(({ id }) => [
        id,
        { ...GROUP_QUESTION, instructions: GROUP_QUESTION.instructions.replace("<id>", id) },
      ]),
    );
    const tooLarge =
      Object.values(questions).some(
        (q) => (JSON.stringify(state).length + JSON.stringify(q).length) / 2 > STATE_TOKENS,
      ) || JSON.stringify({ state, questions }).length / 2 > REQUEST_TOKENS;
    if (tooLarge) {
      if (candidates.length === 1) throw new CostUnbounded("state_too_large");
      const middle = Math.ceil(candidates.length / 2);
      const parts = await Promise.all([
        batch(candidates.slice(0, middle)),
        batch(candidates.slice(middle)),
      ]);
      return Object.assign({}, ...parts);
    }
    return jev(state, questions, {
      kind: "group",
      monitorId: context.monitorId,
      sourceId: context.item.source_id,
    });
  }
  const batches: StoryView[][] = [];
  for (let offset = 0; offset < stories.length; offset += GROUP_BATCH)
    batches.push(stories.slice(offset, offset + GROUP_BATCH));
  const results = await Promise.all(batches.map(batch));
  return Object.assign({}, ...results);
}
