// lib/voice/corpus.ts
//
// The ONE designated extraction X-read (the plan's "no silent third path" placement table).
// Thin adapter over lib/web/brightdata.ts's pullXTimeline: fetch a reporter's recent timeline,
// shape it into extractVoiceGuide's CorpusPost input, return it. SERVER-ONLY, admin-client-only
// (transitively, via pullXTimeline).
//
// Does NOT meter usage_events here — pullXTimeline already stamps "scrape_x_timeline"
// internally (lib/web/brightdata.ts, Wave 2 Round 1). Double-metering the same pull would
// double-count spend for a single billable call.
import { pullXTimeline, type XTimelinePost } from "@/lib/web/brightdata";
// extractVoiceGuide's input shape is frozen this slice — re-export it rather than defining a
// competing type, so this file and extract-guide.ts can never drift apart.
import type { CorpusPost } from "./extract-guide";

export type { CorpusPost };

/** X timeline posts (`XTimelinePost`) carry no engagement counts or reply-context — the raw
 *  dataset row only exposes `id`/`description`/`date_posted` (lib/web/brightdata.ts). Those
 *  three fields map onto CorpusPost's `id`/`text`/`date`; `likes`/`reposts` are reserved
 *  fields with no live source and are zeroed rather than fabricated, `reactingTo` is omitted
 *  (undefined, matching its optional-with-no-default shape), and `long` is derived the same
 *  way measured-facts.ts already treats "long" — over the 280-char threshold used for its own
 *  reporting — so this corpus's LONG marker agrees with the MEASURED FACTS block extractVoiceGuide
 *  sees for the same posts. */
function toCorpusPost(post: XTimelinePost): CorpusPost {
  return {
    id: post.xPostId,
    date: post.postedAt,
    text: post.text,
    likes: 0,
    reposts: 0,
    long: post.text.length > 280,
  };
}

/**
 * Fetch and adapt a reporter's recent X timeline into extractVoiceGuide's corpus input. Wraps
 * pullXTimeline — throws on the same failures pullXTimeline throws on (bad env, trigger/poll/
 * download failure); callers decide their own fallback.
 */
export async function fetchCorpus(handle: string, ownerId: string): Promise<CorpusPost[]> {
  const posts = await pullXTimeline(handle, ownerId);
  return posts.map(toCorpusPost);
}
