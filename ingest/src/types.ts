/** Shared shapes — the X filtered-stream payload and the exact /api/ingest request body. */

export interface StreamTweetData {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
}

export interface StreamIncludesUser {
  id: string;
  username: string;
}

export interface StreamPayload {
  data: StreamTweetData;
  includes?: { users?: StreamIncludesUser[] };
  matching_rules?: Array<{ id: string; tag?: string }>;
}

/** Matches the app's /api/ingest zod schema exactly (app/api/ingest/route.ts) — do not add,
 *  drop, or rename a field without checking that route first. */
export interface IngestDeliveryBody {
  x_post_id: string;
  author_handle: string;
  text: string;
  posted_at: string;
  raw?: unknown;
}

export interface RuleGroup {
  tag: string;
  value: string;
  handles: string[];
}
