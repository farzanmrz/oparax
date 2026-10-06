import type { FeedStory } from "@/lib/monitor/present";

// The fixed sample deck behind the log in and sign up form (design preview v2/one/login.tsx). A signed-out page has
// no agent, so these are three public stories from the week of October 1, 2026, each fact taken from the linked
// pages (verified in the preview's data, next/data/feed.ts). Pictures are the publishers' own public images. Never a
// person's own feed. Nothing here links: the fan is a picture of the product, not a reading surface.

const item = (
  id: string,
  label: string,
  mark: string,
  time: string,
  title: string,
): FeedStory["items"][number] => ({ id, title, url: null, time, kind: "article", label, mark });

const story = (
  id: string,
  headline: string,
  image: string,
  items: FeedStory["items"],
  facts: string[],
): FeedStory => ({
  id,
  headline,
  facts,
  image,
  time: items.map((entry) => entry.time).sort()[items.length - 1],
  items,
  href: null,
  current: false,
});

/** The readable front card. */
const front = story(
  "fan-gpt61-sol",
  "OpenAI launches GPT-6.1 Sol at a fifth of Astra's price",
  "https://static.simonwillison.net/static/2026/live-20260929-092441.webp",
  [
    item(
      "fan-latent-devday",
      "Latent Space",
      "latent.space",
      "2026-09-30T05:53:10Z",
      "[AINews] OpenAI DevDay 2026",
    ),
    item(
      "fan-simon-devday",
      "Simon Willison",
      "simonwillison.net",
      "2026-09-29T15:55:13Z",
      "OpenAI DevDay 2026 live blog",
    ),
  ],
  [
    "OpenAI launched GPT-6.1 Sol at DevDay 2026 on September 29.",
    "OpenAI pitches it as near-Astra intelligence for a fifth of the price.",
    "API pricing is $2/$10 per million tokens, with cached input at $0.10.",
    "A new Ultrafast mode generates up to 300 tokens a second.",
    "Artificial Analysis places it 1 point below Astra at $0.72 per task.",
  ],
);

/** The compact card tilted behind, nearest the form. */
const middle = story(
  "fan-olmo-core-3",
  "Olmo-core 3 scales open MoE training past a trillion parameters",
  "https://cdn-uploads.huggingface.co/production/uploads/638e39b249de7ae552d977b5/uKnK93gjkKbmJmSx94WO2.png",
  [
    item(
      "fan-hf-olmocore3",
      "Hugging Face",
      "huggingface.co",
      "2026-10-01T15:01:43Z",
      "Introducing Olmo-core 3",
    ),
  ],
  [],
);

/** The compact card furthest back. */
const back = story(
  "fan-mistral-munich",
  "Mistral opens a Munich hub for physics and industrial AI",
  "https://mistral.ai/cms-media/api/media/file/Linkedin_Mistral02%20(1).png",
  [
    item(
      "fan-mistral-munich-item",
      "Mistral AI",
      "mistral.ai",
      "2026-09-28T15:57:59Z",
      "Mistral Opens German Hub in Munich",
    ),
  ],
  [],
);

export const authFan = { label: "Three sample stories", front, middle, back } as const;
