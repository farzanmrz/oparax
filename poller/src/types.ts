import { createHash } from "node:crypto";

/** Matches the app's /api/ingest zod schema's "website" branch exactly
 *  (app/api/ingest/route.ts) — do not add, drop, or rename a field without checking that
 *  route first. */
export interface WebsiteDeliveryBody {
  source: "website";
  /** The exact onboarded source that found this article. The ingest pipeline uses this instead
   *  of rematching by hostname, which cannot distinguish two tracked paths on one publisher. */
  source_config_id: string;
  external_id: string;
  url: string;
  title: string;
  text: string;
  author_handle: null; // websites have no author-handle concept (draft-pipeline.ts:807-808)
  published_at: string | null;
  /** Onboarding-detected source language; null means unknown. */
  lang: string | null;
  raw?: unknown;
}

/** sha256(canonicalUrl + "\n" + (publishedAt ?? "")), matching the literal comment on
 *  /api/ingest's zod schema ("sha256(canonicalUrl + \"\\n\" + publishedAtIso)"). This hash is
 *  the delivery external_id only. The seen-items key is itemKey (sitemap URL or feed guid). */
export function buildExternalId(canonicalUrl: string, publishedAt: string | null): string {
  return createHash("sha256")
    .update(`${canonicalUrl}\n${publishedAt ?? ""}`)
    .digest("hex");
}
