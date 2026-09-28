import { z } from "zod";
import type { Tables } from "@/lib/supabase/database.types";

export const DM_STORIES = 10;
const DM_CODE_POINTS = 9_000;
const cardSchema = z.object({
  headline: z.string().trim().min(1),
  facts: z.array(z.object({ text: z.string().trim().min(1) })).min(1),
});
type Story = Pick<Tables<"stories">, "id" | "card">;

export function packStories(handle: string, input: Story[]): { text: string; stories: Story[] } {
  const oneLine = (text: string) => text.replace(/\s+/gu, " ").trim();
  const entries = input
    .flatMap((story) => {
      const card = cardSchema.safeParse(story.card);
      if (!card.success) return [];
      return [
        {
          story,
          text: `${oneLine(card.data.headline)}\n${oneLine(card.data.facts[0].text)}\nhttps://oparax.ai/${encodeURIComponent(handle)}/${encodeURIComponent(story.id)}`,
        },
      ];
    })
    .slice(0, DM_STORIES);
  while (entries.length) {
    const text = `Oparax: ${entries.length} new ${entries.length === 1 ? "story" : "stories"} for you\n\n${entries.map((entry) => entry.text).join("\n\n")}`;
    if (Array.from(text).length < DM_CODE_POINTS) {
      return { text, stories: entries.map((entry) => entry.story) };
    }
    entries.pop();
  }
  return { text: "", stories: [] };
}
