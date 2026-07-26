// lib/voice/corpus.ts
//
// The ONE designated extraction X-read. Thin adapter over lib/x/timeline.ts's fetchUserTimeline:
// fetch a reporter's recent original posts, shape them into extractVoiceGuide's CorpusPost input,
// return them. SERVER-ONLY, admin-client-only (transitively).
//
// Does NOT meter usage_events here — fetchUserTimeline already stamps "x_timeline_read"
// internally. Double-metering the same read would double-count a single acquisition.
//
// Previously wrapped Bright Data's pullXTimeline; that source is deleted (it returns zero records
// for every X profile now — see lib/x/timeline.ts's header for the probe).
import type { XTimelinePost } from "@/lib/x/timeline";
import { fetchUserTimeline } from "@/lib/x/timeline";
// extractVoiceGuide's input shape is frozen — re-export it rather than defining a competing
// type, so this file and extract-guide.ts can never drift apart.
import type { CorpusPost } from "./extract-guide";

export type { CorpusPost };

/** Maps X's timeline shape onto CorpusPost. `likes`/`reposts` carry REAL engagement now: the X
 *  API returns `public_metrics` per post, where the Bright Data rows this replaced exposed only
 *  id/text/date and forced both fields to be zeroed. `long` is derived the same way
 *  measured-facts.ts treats "long" — over the 280-char threshold it reports against — so this
 *  corpus's LONG marker agrees with the MEASURED FACTS block extractVoiceGuide sees for the same
 *  posts. `reactingTo` stays omitted: it describes quote-post context, which this read does not
 *  fetch, and inventing it would be exactly the fabrication the extraction recipe forbids. */
function toCorpusPost(post: XTimelinePost): CorpusPost {
  return {
    id: post.xPostId,
    date: post.postedAt,
    text: post.text,
    likes: post.likeCount,
    reposts: post.repostCount,
    long: post.text.length > 280,
    // Carried through so the extractor can SEE what a post's link actually resolved to. Without
    // it, `🥺🥺🥺 https://t.co/…` reaches the model as three emoji and an opaque string, and any
    // rule it writes about that post shape is unlearnable by the drafting model downstream.
    media: post.media,
  };
}

/**
 * Fetch and adapt a reporter's recent X timeline into extractVoiceGuide's corpus input. Throws on
 * the same failures fetchUserTimeline throws on (missing bearer token, a handle that resolves to
 * no account, a non-2xx from X); callers decide their own fallback.
 */
export async function fetchCorpus(handle: string, ownerId: string): Promise<CorpusPost[]> {
  const posts = await fetchUserTimeline(handle, ownerId);
  return posts.map(toCorpusPost);
}
