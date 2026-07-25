// lib/x/tweet-shape.ts
//
// Builds react-tweet's own `Tweet` object out of data WE hold, so its rendering parts
// (`TweetContainer`/`TweetHeader`/`TweetBody`/`TweetInfo`) can render a post that the
// syndication API either won't serve or has never heard of. Pure — no fetch, no I/O.
//
// Two callers, one shape:
//   1. The Feed's source card, when the syndication fetch misses. A reporter's source posts
//      get deleted and edited constantly; the story still happened and our stored copy is
//      what the drafting council actually read, so the card must never hollow out into
//      "Tweet not found".
//   2. (Next) the draft card, whose post has no id at all because it hasn't been published —
//      there is nothing to fetch, so a hand-built object is the ONLY way to render a draft
//      through the same parts the real posts use.
//
// What we can't fake, we omit rather than invent: no avatar (the stream payload carries no
// `profile_image_url_https`), no engagement counts, no media. `favorite_count`/
// `conversation_count` are zero because the parts require the fields, NOT as a claim that the
// post has no likes — every surface built on this must drop the actions/replies bar rather
// than render zeroes as if they were measured.
import type { Tweet } from "react-tweet/api";

/** A blank 1x1 transparent PNG. `TweetHeader` renders an `<img>` unconditionally, so the
 *  field must be a loadable URL; a data URI keeps it self-contained and network-free rather
 *  than 404-ing against X's CDN or shipping an asset for a slot we intend to hide in CSS. */
const BLANK_AVATAR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export type SyntheticTweetInput = {
  /** X's numeric post id when one exists. A draft has never been posted, so it has none —
   *  pass null and the parts still render; only the permalink is lost. */
  id: string | null;
  text: string;
  /** ISO 8601. Falsy/unparseable falls back to now, since `TweetInfo` will format whatever
   *  it is given and an Invalid Date renders as literal "Invalid Date" on the card. */
  createdAt: string | null;
  /** Bare handle, no leading `@`. */
  handle: string;
  /** Display name. Falls back to the handle — a header reading "@handle @handle" is poor,
   *  but a header reading "undefined" is worse. */
  name: string | null;
};

/**
 * Assemble a `Tweet` react-tweet will render. Every entity sub-array is present and empty on
 * purpose: `enrichTweet` iterates `hashtags`/`user_mentions`/`urls`/`symbols` unconditionally
 * and throws "entities is not iterable" on any that is missing — the same normalization the
 * repo's earlier syndication proxy had to do by hand against X's own responses.
 */
export function buildSyntheticTweet(input: SyntheticTweetInput): Tweet {
  const createdAt = input.createdAt ?? "";
  const parsed = Number.isNaN(Date.parse(createdAt)) ? new Date() : new Date(createdAt);
  const idStr = input.id ?? `draft-${input.handle}`;

  return {
    __typename: "Tweet",
    lang: "en",
    created_at: parsed.toISOString(),
    // The full text range — react-tweet slices the body by this, so a short range would
    // silently truncate the post.
    display_text_range: [0, input.text.length],
    entities: { hashtags: [], urls: [], user_mentions: [], symbols: [], media: [] },
    id_str: idStr,
    text: input.text,
    user: {
      id_str: idStr,
      name: input.name ?? input.handle,
      profile_image_url_https: BLANK_AVATAR,
      profile_image_shape: "Circle",
      screen_name: input.handle,
      verified: false,
      is_blue_verified: false,
    },
    edit_control: {
      edit_tweet_ids: [idStr],
      editable_until_msecs: "0",
      is_edit_eligible: false,
      edits_remaining: "0",
    },
    isEdited: false,
    isStaleEdit: false,
    favorite_count: 0,
    conversation_count: 0,
    news_action_type: "conversation",
  };
}
