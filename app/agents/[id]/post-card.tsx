// app/agents/[id]/post-card.tsx
//
// The Feed's card shell and body renderer — ours, not react-tweet's.
//
// WHY THIS EXISTS. The cards used to be built on react-tweet's `TweetContainer`/`TweetBody`,
// and its `theme.css` ships an UNLAYERED reset — `:where(.react-tweet-theme) * { margin: 0;
// padding: 0 }`. Unlayered declarations beat Tailwind's `@layer utilities` regardless of
// specificity, so inside those cards every Tailwind margin/padding utility silently computed
// to nothing (`px-5` measured 0px; `mt-auto` never pinned anything). Three separate spacing
// fixes looked correct in source and did nothing in the browser. A card whose ordinary
// Tailwind classes are dead is a trap for whoever writes the next one, so the presentation
// layer is hand-rolled and the reset is gone. Tailwind works normally in these cards again.
//
// react-tweet's DATA layer is deliberately KEPT (`getTweet`/`Tweet` in source-tweet.tsx): the
// syndication API is free, unauthenticated, off our metered X tier, and supplies avatars,
// media and URL entities. It never caused a problem — only its CSS did.
//
// The body renders OUR stored `source_posts.text`, never the syndication payload's `text`.
// That is a correctness requirement, not a preference: for a long ("note") post X truncates
// `text` at ~280 chars, and syndication carries the remainder NOWHERE (`note_tweet: { id }`
// and no body). Our stored copy is complete because the ingest worker asks the v2 stream for
// `note_tweet` — see ingest/src/stream.ts. Rendering the syndication text would silently
// reintroduce the truncation this replaced.
import type { ReactNode } from "react";
import styles from "./source-tweet.module.css";

/** The card shell — a plain article, replacing react-tweet's `TweetContainer`. Column layout
 *  so a card's last row can pin to the bottom edge via the `.grow` spacer, and `flex: 1` on
 *  the wrapper so a row's two cards always match height. */
export function PostCard({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <article className={styles.card}>{children}</article>
    </div>
  );
}

/** One `t.co` link's resolution, keyed by the shortened URL as it appears in the text. */
export interface UrlEntity {
  url: string;
  expanded_url: string;
  display_url: string;
}

// URLs, @mentions and #hashtags in one pass. Mentions cap at X's 15-character handle limit;
// hashtags take any unicode letter/number so non-Latin beats (the product does not filter by
// language — see .claude/rules/x.md) linkify too.
const TOKEN = /(https?:\/\/\S+)|(@[A-Za-z0-9_]{1,15})|(#[\p{L}\p{N}_]+)/gu;
// A URL match runs to the next space, so sentence punctuation after a link gets swallowed.
// t.co ids are alphanumeric, so trimming these is always safe and keeps prose punctuation
// outside the anchor.
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

function Linkified({ text, urls }: { text: string; urls: Map<string, UrlEntity> }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const start = match.index;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    cursor = start + match[0].length;

    if (match[1]) {
      // Split trailing punctuation back out into plain text so it isn't part of the link.
      const trailing = TRAILING_PUNCTUATION.exec(match[1])?.[0] ?? "";
      const url = trailing ? match[1].slice(0, -trailing.length) : match[1];
      const resolved = urls.get(url);
      nodes.push(
        <a
          href={resolved?.expanded_url ?? url}
          key={key++}
          rel="noopener noreferrer"
          target="_blank"
        >
          {resolved?.display_url ?? url}
        </a>,
      );
      if (trailing) nodes.push(trailing);
      continue;
    }

    const token = match[0];
    const href = match[2]
      ? `https://x.com/${token.slice(1)}`
      : `https://x.com/hashtag/${encodeURIComponent(token.slice(1))}`;
    nodes.push(
      <a href={href} key={key++} rel="noopener noreferrer" target="_blank">
        {token}
      </a>,
    );
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

/**
 * A post's body: the complete stored text, linkified, with media links removed.
 *
 * `mediaUrls` are the `t.co` links X appends for attached photos/video. X's own client hides
 * them (its `display_text_range` stops short of them) because the media renders as the
 * attachment instead — here that attachment is the thumbnail strip, so showing the raw link
 * as well would be the same content twice. They are stripped by EXACT string match on
 * `entities.media[].url` rather than by index: our text and the syndication payload's text
 * are different strings for a note post, so syndication's character offsets do not apply.
 *
 * Newlines survive through `white-space: pre-wrap` — a bulleted post is common on this beat
 * and collapsing its lines would destroy the structure the reporter is reading for.
 */
export function PostBody({
  text,
  urls = [],
  mediaUrls = [],
}: {
  text: string;
  urls?: UrlEntity[];
  mediaUrls?: string[];
}) {
  let body = text;
  for (const mediaUrl of mediaUrls) {
    body = body.replace(mediaUrl, "");
  }

  const urlMap = new Map(urls.map((u) => [u.url, u]));
  return (
    <p className={styles.body} dir="auto">
      <Linkified text={body.trimEnd()} urls={urlMap} />
    </p>
  );
}
