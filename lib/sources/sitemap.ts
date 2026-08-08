// lib/sources/sitemap.ts
//
// Fetches and parses a news sitemap (plain <urlset> or a <sitemap> index that points at
// dated sub-sitemaps), producing a sample of recent URLs for the onboarding model call
// and code-side prefilter verification. Uses fast-xml-parser rather than hand-rolled
// string/regex matching — sitemap `news:` extensions live in a distinct namespace that a
// real parser handles correctly. Pure I/O module: no Supabase, no React.

import { XMLParser } from "fast-xml-parser";
import { assertFetchOk } from "@/lib/http-fetch";
import { fetchSafeSource, isSafeDiscoveredUrl } from "@/lib/sources/discovery";

/** The one shared shape both sitemap.ts and feed.ts produce — `countPathMatches` and the
 *  onboarding model-call input builder consume it uniformly regardless of which discovery
 *  path found the sample. `teaser` is absent on the sitemap-only path (no summary text
 *  exists there); present when the entry came from feed.ts's RSS parsing. */
export type SourceSampleEntry = {
  url: string;
  publishedAt?: string;
  title?: string;
  keywords?: string;
  teaser?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

type RawSitemapUrlEntry = {
  loc?: string;
  lastmod?: string;
  "news:news"?: {
    "news:title"?: string;
    "news:keywords"?: string;
    "news:publication_date"?: string;
  };
};

function toSampleEntry(raw: RawSitemapUrlEntry): SourceSampleEntry | null {
  if (!raw.loc) return null;
  const news = raw["news:news"];
  return {
    url: raw.loc,
    publishedAt: news?.["news:publication_date"] ?? raw.lastmod,
    title: news?.["news:title"],
    keywords: news?.["news:keywords"],
  };
}

async function fetchXml(endpoint: string, url: string, expectedHostname: string): Promise<string> {
  const res = await fetchSafeSource(endpoint, url, expectedHostname);
  await assertFetchOk("Sitemap", endpoint, res);
  return res.text();
}

const NO_LASTMOD_CANDIDATE_CAP = 10;

/** Fetches `sitemapUrl` and parses it into leaf `<urlset>` entries, following a
 *  `<sitemap>` index to its newest-dated sub-sitemap (by `<lastmod>`). When no entry carries
 *  a date, list position carries no reliable meaning — some sites shard content into the
 *  first sub-sitemap and leave the rest as empty placeholders, others do the reverse — so
 *  candidates are tried in order (capped) until one actually yields entries, rather than
 *  guessing a single position and giving up on an empty pick (found live: manutd.com's index
 *  has no `<lastmod>` anywhere; its real content is in the first sub-sitemap, the rest are
 *  empty shards). Each followed `<loc>` is site-controlled content, so it passes
 *  `isSafeDiscoveredUrl` against `expectedHostname` before this server fetches it — an index
 *  entry pointing at an internal address is dropped, not followed. `maxDepth` bounds the
 *  recursion (real sitemap indexes nest at most 1-2 levels deep) so a self-referencing or
 *  cyclic index can't recurse indefinitely; it is exhausted, not treated as an error. */
async function fetchLeafEntries(
  sitemapUrl: string,
  expectedHostname: string,
  maxDepth = 5,
): Promise<RawSitemapUrlEntry[]> {
  if (maxDepth <= 0) return [];

  const xml = await fetchXml(sitemapUrl, sitemapUrl, expectedHostname);
  const parsed = parser.parse(xml);

  const indexEntries = asArray<{ loc?: string; lastmod?: string }>(parsed.sitemapindex?.sitemap);
  if (indexEntries.length === 0) return asArray<RawSitemapUrlEntry>(parsed.urlset?.url);

  const dated = indexEntries.filter(
    (entry): entry is { loc: string; lastmod: string } => !!entry.loc && !!entry.lastmod,
  );
  if (dated.length > 0) {
    const newest = dated.reduce((a, b) => (new Date(a.lastmod) >= new Date(b.lastmod) ? a : b));
    if (!isSafeDiscoveredUrl(newest.loc, expectedHostname)) return [];
    return fetchLeafEntries(newest.loc, expectedHostname, maxDepth - 1);
  }

  for (const entry of indexEntries.slice(0, NO_LASTMOD_CANDIDATE_CAP)) {
    if (!entry.loc || !isSafeDiscoveredUrl(entry.loc, expectedHostname)) continue;
    const leaves = await fetchLeafEntries(entry.loc, expectedHostname, maxDepth - 1);
    if (leaves.length > 0) return leaves;
  }
  return [];
}

/** Fetches a sample of up to `limit` recent entries from `sitemapUrl`, resolving a
 *  sitemap index down to its leaf `<urlset>` first. */
export async function fetchSitemapSample(
  sitemapUrl: string,
  limit: number,
  expectedHostname = new URL(sitemapUrl).hostname,
): Promise<SourceSampleEntry[]> {
  const rawEntries = await fetchLeafEntries(sitemapUrl, expectedHostname);
  const entries = rawEntries
    .map(toSampleEntry)
    .filter((entry): entry is SourceSampleEntry => entry !== null);
  return entries.slice(0, limit);
}

/** Counts how many `entries` have a URL path starting with `pathPrefix` — the code-side
 *  verification of the model's proposed filter. */
export function countPathMatches(entries: SourceSampleEntry[], pathPrefix: string): number {
  return entries.filter((entry) => {
    try {
      return new URL(entry.url).pathname.startsWith(pathPrefix);
    } catch {
      return false;
    }
  }).length;
}
