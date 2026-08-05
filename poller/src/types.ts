import { createHash } from "node:crypto";

/** Matches the app's /api/ingest zod schema's "website" branch exactly
 *  (app/api/ingest/route.ts) — do not add, drop, or rename a field without checking that
 *  route first. */
export interface WebsiteDeliveryBody {
  source: "website";
  external_id: string;
  url: string;
  title: string;
  text: string;
  author_handle: null; // websites have no author-handle concept (draft-pipeline.ts:807-808)
  published_at: string | null;
  raw?: unknown;
}

/** sha256(canonicalUrl + "\n" + (publishedAt ?? "")) — matches the literal comment on
 *  /api/ingest's zod schema ("sha256(canonicalUrl + \"\\n\" + publishedAtIso)"). Reused
 *  verbatim as source_seen_items.item_key too — one hash, two purposes (delivery
 *  idempotency key AND seen-item dedup key), no second hash function needed. */
export function buildExternalId(canonicalUrl: string, publishedAt: string | null): string {
  return createHash("sha256")
    .update(`${canonicalUrl}\n${publishedAt ?? ""}`)
    .digest("hex");
}
