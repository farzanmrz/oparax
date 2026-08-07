// lib/sources/feed.ts
//
// Fetches and parses an RSS 2.0 or Atom feed — the fallback change-detection path when a
// site has no discoverable news sitemap. Also produces `SourceSampleEntry`
// (lib/sources/sitemap.ts owns the shared type), the one difference being feed entries
// usually carry a teaser (description/content:encoded, or Atom's summary/content), which
// the sitemap-only path never has. Uses fast-xml-parser, same as sitemap.ts. Pure I/O
// module: no Supabase, no React.

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

// Atom (RFC 4287): root is <feed><entry>, not RSS 2.0's <rss><channel><item> — a distinct
// schema, not a variant, so it needs its own raw shape and mapper. <link> is a self-closing
// element carrying its URL in an `href` attribute (never text content), and a single entry
// can repeat it with different `rel` values; `rel="alternate"` (or no rel, the Atom default)
// is the one this cares about. <category> likewise carries its value in a `term` attribute.
// An element with attributes (e.g. <summary type="html">, <title type="text">) parses to
// `{ "@_type": ..., "#text": ... }`, not a plain string — any Atom text-construct field can
// take either shape depending on whether the source feed put an attribute on that tag.
type AtomTextConstruct = string | { "#text"?: string };
type RawAtomLink = { "@_href"?: string; "@_rel"?: string };
type RawAtomCategory = { "@_term"?: string };
type RawAtomEntry = {
  link?: RawAtomLink | RawAtomLink[];
  id?: string;
  title?: AtomTextConstruct;
  updated?: string;
  published?: string;
  summary?: AtomTextConstruct;
  content?: AtomTextConstruct;
  category?: RawAtomCategory | RawAtomCategory[];
};

function atomText(value: AtomTextConstruct | undefined): string | undefined {
  return typeof value === "string" ? value : value?.["#text"];
}

function atomLinkHref(link: RawAtomEntry["link"]): string | undefined {
  const links = asArray(link);
  const alternate = links.find((entry) => !entry["@_rel"] || entry["@_rel"] === "alternate");
  return (alternate ?? links[0])?.["@_href"];
}

function atomTeaser(entry: RawAtomEntry): string | undefined {
  return atomText(entry.summary) ?? atomText(entry.content);
}

function atomKeywords(category: RawAtomEntry["category"]): string | undefined {
  const terms = asArray(category)
    .map((entry) => entry["@_term"])
    .filter((term): term is string => !!term);
  return terms.length > 0 ? terms.join(", ") : undefined;
}

function toAtomSampleEntry(raw: RawAtomEntry): SourceSampleEntry | null {
  const url = atomLinkHref(raw.link) ?? raw.id;
  if (!url) return null;
  return {
    url,
    publishedAt: raw.updated ?? raw.published,
    title: atomText(raw.title),
    keywords: atomKeywords(raw.category),
    teaser: atomTeaser(raw),
  };
}

/** Fetches a sample of up to `limit` recent items from an RSS 2.0 or Atom `feedUrl`,
 *  detected by root element (`<rss>` vs `<feed>`) — a site's declared `type="..."` on the
 *  discovering `<link>` tag isn't trustworthy on its own (managingmadrid.com labels its
 *  Atom feed `application/rss+xml`), so this parses whichever shape the fetched body
 *  actually is. */
export async function fetchFeedSample(
  feedUrl: string,
  limit: number,
): Promise<SourceSampleEntry[]> {
  const res = await fetchWithTimeout("Feed", feedUrl, feedUrl, { method: "GET" });
  await assertFetchOk("Feed", feedUrl, res);
  const xml = await res.text();
  const parsed = parser.parse(xml);

  const entries = parsed.feed
    ? asArray<RawAtomEntry>(parsed.feed?.entry)
        .map(toAtomSampleEntry)
        .filter((entry): entry is SourceSampleEntry => entry !== null)
    : asArray<RawFeedItem>(parsed.rss?.channel?.item)
        .map(toSampleEntry)
        .filter((entry): entry is SourceSampleEntry => entry !== null);
  return entries.slice(0, limit);
}
