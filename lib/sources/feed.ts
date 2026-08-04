// lib/sources/feed.ts
//
// Fetches and parses an RSS 2.0 feed — the fallback change-detection path when a site has
// no discoverable news sitemap. Also produces `SourceSampleEntry` (lib/sources/sitemap.ts
// owns the shared type), the one difference being feed entries usually carry a teaser
// (description/content:encoded), which the sitemap-only path never has. Uses
// fast-xml-parser, same as sitemap.ts. Pure I/O module: no Supabase, no React.

import { XMLParser } from "fast-xml-parser";
import { assertFetchOk, fetchWithTimeout } from "@/lib/http-fetch";
import type { SourceSampleEntry } from "@/lib/sources/sitemap";

export type { SourceSampleEntry } from "@/lib/sources/sitemap";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

type RawFeedItem = {
  link?: string;
  guid?: string | { "#text"?: string };
  title?: string;
  pubDate?: string;
  description?: string;
  "content:encoded"?: string;
  category?: string | string[];
};

function guidAsUrl(guid: RawFeedItem["guid"]): string | undefined {
  if (typeof guid === "string") return guid;
  return guid?.["#text"];
}

function toSampleEntry(raw: RawFeedItem): SourceSampleEntry | null {
  const url = raw.link ?? guidAsUrl(raw.guid);
  if (!url) return null;
  const teaser = raw.description ?? raw["content:encoded"];
  const keywords = Array.isArray(raw.category) ? raw.category.join(", ") : raw.category;
  return {
    url,
    publishedAt: raw.pubDate,
    title: raw.title,
    keywords,
    teaser,
  };
}

/** Fetches a sample of up to `limit` recent items from an RSS 2.0 `feedUrl`. */
export async function fetchFeedSample(
  feedUrl: string,
  limit: number,
): Promise<SourceSampleEntry[]> {
  const res = await fetchWithTimeout("Feed", feedUrl, feedUrl, { method: "GET" });
  await assertFetchOk("Feed", feedUrl, res);
  const xml = await res.text();
  const parsed = parser.parse(xml);

  const rawItems = asArray<RawFeedItem>(parsed.rss?.channel?.item);
  const entries = rawItems
    .map(toSampleEntry)
    .filter((entry): entry is SourceSampleEntry => entry !== null);
  return entries.slice(0, limit);
}
