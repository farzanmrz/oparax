// app/agents/[id]/source-tweet.tsx
//
// The Feed's source post as a compact evidence card — react-tweet's body under Oparax's own
// header template. A Server Component: react-tweet ships a dedicated "react-server" entry;
// the only client leaves here are RelativeTime and ExpandableBody.
//
// The header is OURS, not X's, and its template is the product's answer to "where did this
// story come from" for every present and future source platform:
//
//   [avatar] @handle ···················· [platform chip] [relative time]
//
// - Identity leads (avatar + a bold @handle at avatar scale); provenance trails — the
//   platform chip (avatar-sized, X today, a globe when websites ship) sits right, where the
//   draft column will mirror it, giving one template across both columns. Square chip vs
//   circular avatar keeps the two roles visually distinct.
// - Display name and X's verified badge are dropped on purpose: the reporter chose these
//   sources in Setup, so X's trust chrome is noise and @handle is the recognized identity.
// - The relative time (far right) IS the link to the original post — the X-native convention
//   — which is why there is no separate "view source" control anywhere on the card.
//
// `TweetBody` stays react-tweet's (entity linkification — hashtags, mentions, resolved t.co
// urls — is exactly the fiddly part worth taking from the library), clamped by
// ExpandableBody so a long premium post can't wreck the row pairing against a ≤280-char
// draft. Media renders as a fixed-height thumbnail strip, never full-size: the job is "know
// media exists", consumption happens on X. Premium bold/italic formatting is NOT in the
// syndication payload (nor the v2 API) — the text arrives complete but plain for every
// embed on the internet, not just ours; the click-through shows the real thing. A long
// ("note") post arrives TRUNCATED for the same reason — see the `truncated` comment below.
//
// TWO SOURCES, deliberately. The syndication API (free, unauthenticated, NOT our metered X
// tier) serves the live post — avatar, media. Our own `source_posts` row is the fallback AND
// the source of record: reporters delete and edit posts constantly, and a story we already
// drafted must not hollow out into "Tweet not found". When the post is gone the card says so
// — "No longer on X · archived" — because holding the record X no longer serves is part of
// what the product is. Fetch failures are normal operation here, never an error.
import { enrichTweet, TweetBody, TweetContainer } from "react-tweet";
import type { Tweet } from "react-tweet/api";
import { getTweet } from "react-tweet/api";
import type { FeedStory } from "@/lib/agent/feed-query";
import { buildSyntheticTweet } from "@/lib/x/tweet-shape";
import { ExpandableBody } from "./expandable-body";
import { RelativeTime } from "./relative-time";
import styles from "./source-tweet.module.css";
import { XAvatar } from "./x-avatar";

/** Tweet data is public and identical for every viewer, so it caches at the FETCH layer —
 *  `getTweet` forwards its second argument straight to `fetch`, and Next's `next.revalidate`
 *  keys on the request URL, which already carries the tweet id. A day is long relative to how
 *  fast a post's content changes and short relative to how long a story stays on the feed.
 *
 *  Deliberately NOT `unstable_cache`: at module scope in a Server Component it makes
 *  Turbopack's dev server fail the server render outright ("SourceTweet is not defined") and
 *  silently downgrade the page to client rendering, while `pnpm build` stays green — bisected
 *  live against the dev server. Fetch-level revalidation is also the Next 16 idiom. */
async function getCachedTweet(id: string): Promise<Tweet | undefined> {
  try {
    return await getTweet(id, { next: { revalidate: 60 * 60 * 24 } } as RequestInit);
  } catch {
    // A syndication outage must never take the Feed down — the stored copy still renders.
    return undefined;
  }
}

/** The provenance mark on every card header's far right — one glyph per platform the product
 *  can ingest from (X today; a website glyph joins when website sources leave dormancy).
 *  Exported: the draft card mirrors the same header template (see feed-item.tsx). */
export function SourceChip({ kind }: { kind: "x" | "website" }) {
  return (
    <span
      aria-label={kind === "x" ? "Source: X" : "Source: website"}
      className={styles.chip}
      role="img"
    >
      {kind === "x" ? (
        <svg aria-hidden="true" fill="currentColor" height="12" viewBox="0 0 24 24" width="12">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          fill="none"
          height="12"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="12"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )}
    </span>
  );
}

/** Fixed-height thumbnail strip — media is signposted, not consumed here. Deliberately NOT a
 *  link: the card's one outbound affordance is the explicit "View on X" footer button, so an
 *  image click can't silently teleport the reporter off the feed. Videos get a play glyph
 *  over their poster frame. */
function MediaStrip({ tweet }: { tweet: Tweet }) {
  const media = tweet.mediaDetails ?? [];
  if (media.length === 0) return null;
  const shown = media.slice(0, 4);
  return (
    <div className={styles.mediaStrip}>
      {shown.map((m) => (
        <span className={styles.thumb} key={m.media_url_https}>
          {/* biome-ignore lint/performance/noImgElement: X CDN thumbnails at fixed strip height — next/image would only proxy them */}
          <img alt="" src={`${m.media_url_https}?name=small`} />
          {m.type !== "photo" ? (
            <span aria-hidden="true" className={styles.playGlyph}>
              ▶
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export async function SourceTweet({
  sourcePost,
}: {
  sourcePost: FeedStory["sourcePosts"][number];
}) {
  const fetched = sourcePost.xPostId ? await getCachedTweet(sourcePost.xPostId) : undefined;
  // The post existed on X (we have its id) but the syndication API no longer serves it —
  // deleted, protected, or the author renamed. Our stored copy is the record now.
  const missing = Boolean(sourcePost.xPostId) && !fetched;

  const tweet =
    fetched ??
    buildSyntheticTweet({
      id: sourcePost.xPostId,
      text: sourcePost.text,
      createdAt: sourcePost.postedAt,
      handle: sourcePost.authorHandle ?? "source",
      name: sourcePost.authorName,
    });
  // `note_tweet` marks a long ("note") post whose body X TRUNCATES — and the marker is the ONLY
  // thing it carries: measured live on @BarcaUniversal 2081154657573883993, the payload ends at
  // 294 chars on a dangling "• " and `note_tweet` is `{ id }` with the missing text nowhere in
  // the response. Our own stored copy is NOT fuller — `source_posts.text` for that post is the
  // identical 294-char string (the filtered stream doesn't request the note-tweet field either),
  // so rendering `sourcePost.text` instead would trade react-tweet's index-based entity
  // linkification for exactly zero extra words. The full body exists only on X.
  //
  // So the marker is dropped before enriching — react-tweet's TweetBody would otherwise append
  // its own "Show more" anchor beside our in-place expander's identical label — and the
  // truncation is re-surfaced honestly instead: a truncated card gets ONE control, a link to the
  // complete post, rather than an expander that would claim to reveal everything.
  const truncated = Boolean(fetched?.note_tweet);
  const enriched = enrichTweet({ ...tweet, note_tweet: undefined });

  const hasRealAvatar = !tweet.user.profile_image_url_https.startsWith("data:");
  const timeLabel = sourcePost.postedAt ? (
    <RelativeTime iso={tweet.created_at} prefix="Posted" />
  ) : null;

  return (
    <div className={styles.wrapper}>
      <TweetContainer>
        <div className={styles.header}>
          <a
            className={styles.identity}
            href={enriched.user.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {hasRealAvatar ? (
              // biome-ignore lint/performance/noImgElement: X CDN avatar, already sized (_normal = 48px) — next/image would only proxy it
              <img alt="" className={styles.avatar} src={tweet.user.profile_image_url_https} />
            ) : (
              // Archive fallback: the tweet payload (and its avatar) are gone, but the
              // ACCOUNT usually still exists — resolve its picture by handle instead of
              // showing a monogram for an author whose face the reporter knows.
              <XAvatar handle={tweet.user.screen_name} />
            )}
            <span className={styles.handle}>@{tweet.user.screen_name}</span>
          </a>
          {/* The source link sits WITH the identity, not in a footer — a trailing footer row
              made every card taller than its content for one icon, and the card should end
              where Show more ends. */}
          {missing ? null : (
            <a
              className={styles.sourceLink}
              href={enriched.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="sr-only">View this post on X</span>
              <svg
                aria-hidden="true"
                fill="none"
                height="14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="14"
              >
                <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
          )}
          <span className={styles.spacer} />
          {missing ? <span className={styles.archived}>No longer on X · archived</span> : null}
          {missing ? (
            <span className={styles.time}>{timeLabel}</span>
          ) : (
            <a
              className={styles.time}
              href={enriched.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {timeLabel}
            </a>
          )}
          <SourceChip kind={sourcePost.xPostId ? "x" : "website"} />
        </div>
        {/* Text and media share ONE height budget inside the clamp — see expandable-body.tsx. */}
        <ExpandableBody truncatedHref={truncated ? enriched.url : undefined}>
          <TweetBody tweet={enriched} />
          {fetched?.mediaDetails?.length ? <MediaStrip tweet={fetched} /> : null}
        </ExpandableBody>
        <div aria-hidden="true" className={styles.grow} />
      </TweetContainer>
    </div>
  );
}
