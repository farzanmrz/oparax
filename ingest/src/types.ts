/** Shared shapes — the X filtered-stream payload and the exact /api/ingest request body. */

export interface StreamTweetData {
  id: string;
  /** TRUNCATED at ~280 chars for a long ("note") post — X cuts at a token boundary and appends
   *  a t.co link to the full post, so the result reads as complete prose and nothing
   *  downstream can tell it apart from a short post. Never forward this field directly; use
   *  `note_tweet.text` when present (see mapTweetToDelivery). */
  text: string;
  /** The COMPLETE body of a long post — present only when `note_tweet` is in `tweet.fields`
   *  on the stream URL. Measured 2026-07-26: post 2081154657573883993 arrives as 293 chars in
   *  `text` and 393 in `note_tweet.text`. */
  note_tweet?: { text?: string };
  author_id?: string;
  created_at?: string;
  /** X's machine-detected BCP-47 language code. */
  lang?: string;
  attachments?: { media_keys?: string[] };
}

export interface StreamIncludesUser {
  id: string;
  username: string;
}

export interface StreamIncludesMedia {
  media_key?: string;
  type?: string;
  url?: string;
  preview_image_url?: string;
}

export interface StreamPayload {
  data: StreamTweetData;
  includes?: { users?: StreamIncludesUser[]; media?: StreamIncludesMedia[] };
  matching_rules?: Array<{ id: string; tag?: string }>;
}

/** One attached image the drafting stage can actually look at — a photo's own url,
 *  or a video/GIF's poster frame (the one still frame available; the settled decision is
 *  descriptors only, never a playable variant). Mirrors `XTimelineMedia` in lib/x/timeline.ts
 *  exactly, so both acquisition paths (live stream, voice-extraction timeline read) hand the
 *  app the same shape. */
export interface IngestDeliveryMedia {
  kind: string;
  imageUrl: string;
}

/** Matches the app's /api/ingest zod schema's "x" branch exactly (app/api/ingest/route.ts) —
 *  do not add, drop, or rename a field without checking that route first. `source: "x"` is
 *  required as of the Slice 5 discriminated-union schema (QC fix — this worker only ever
 *  sends X deliveries, so the literal is fixed here). */
export interface IngestDeliveryBody {
  source: "x";
  x_post_id: string;
  author_handle: string;
  text: string;
  posted_at: string;
  lang: string | null;
  media?: IngestDeliveryMedia[];
  raw?: unknown;
}

export interface RuleGroup {
  tag: string;
  value: string;
  handles: string[];
}
