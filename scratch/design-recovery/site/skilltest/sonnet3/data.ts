import { councilStories, digests, items, recentItems, packDm, type FeedStory } from "@/next/data/feed";
import { brief, chosenAccounts, chosenSites, beat } from "@/next/data/onboarding";
import { week, weekTotal, when, hostOf } from "@/next/council/data";

// Everything on the sonnet3 landing comes from the recorded feed and onboarding data the accepted feeds use.
export { digests, items, recentItems, brief, chosenAccounts, chosenSites, beat, week, weekTotal, when, hostOf };

const story = (id: string) => councilStories.find((s) => s.id === id) as FeedStory;
export const sol = story("st-gpt61-sol");
export const olmo = story("st-c-olmo");
export const mai = story("st-c-mai");
export const agent = story("st-c-agent");
export const mistral = story("st-c-mistral");

export const solDm = packDm("farzanmrz", [sol]);
export const olmoDm = packDm("farzanmrz", [olmo]);

/** A DM split into its header line and entries of headline, first fact and link. */
export function parseDm(text: string) {
  const [head, ...entries] = text.split("\n\n");
  return { head, entries: entries.map((e) => { const [headline, fact, url] = e.split("\n"); return { headline, fact, url }; }) };
}
