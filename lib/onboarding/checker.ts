import "server-only";
import { extractText, getDocumentProxy, getMeta } from "unpdf";
// The checker and the page reader, on the product's own fetch and parse code.
import { extractArticleText } from "@/lib/sources/article-text";

// A download guard for PDFs, the same idea as the page download limit: it stops a runaway file,
// it never cuts the text of a PDF that is read.
const MAX_PDF_BYTES = 25_000_000;

import {
  discoverChangeDetection,
  extractListingSample,
  fetchSafeSourceWithFinalUrl,
  isArticleShapedPath,
  readHtmlWithinLimit,
} from "@/lib/sources/discovery";
import { fetchFeedSample } from "@/lib/sources/feed";
import { fetchSitemapSample, type SourceSampleEntry } from "@/lib/sources/sitemap";

const REFUSED_HOSTS = ["x.com", "twitter.com", "t.co", "github.com", "producthunt.com"];
const FRESH_DAYS = 60;

export type CheckResult = {
  url: string;
  accepted: boolean;
  reason: string;
  mechanism?: string;
  target?: string;
  lang?: string | null;
  itemsPerWeek?: number | null;
  sample: { title?: string; teaser?: string; publishedAt?: string; url: string }[];
};

function host(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function itemsPerWeek(entries: SourceSampleEntry[]): number | null {
  const dates = entries
    .map((e) => (e.publishedAt ? Date.parse(e.publishedAt) : Number.NaN))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a);
  if (dates.length < 2) return null;
  const spanDays = Math.max((dates[0] - dates[dates.length - 1]) / 86_400_000, 1 / 24);
  return Math.round((dates.length / spanDays) * 7 * 10) / 10;
}

/** A sample that carries no titles gives the row writer nothing true to write, so it is not
 *  accepted even when the addresses look right. */
function hasTitles(entries: SourceSampleEntry[]): boolean {
  return entries.filter((e) => e.title && e.title.trim().length > 3).length >= 3;
}

function isFresh(entries: SourceSampleEntry[]): boolean {
  const cutoff = Date.now() - FRESH_DAYS * 86_400_000;
  return entries.some((e) => e.publishedAt && Date.parse(e.publishedAt) >= cutoff);
}

/** A feed found for a section page is that section's feed only when at least half of its items live under
 *  the section's path; a root address keeps the site feed (Kingy's video section advertised the launch feed). */
function ownsSection(items: SourceSampleEntry[], pathname: string): boolean {
  const sectionPath = pathname.replace(/\/$/, "");
  if (!sectionPath) return true;
  const under = items.filter((e) => {
    try {
      return new URL(e.url).pathname.startsWith(sectionPath);
    } catch {
      return false;
    }
  });
  return under.length * 2 >= items.length;
}

function langOf(html: string | null): string | null {
  const m = html?.match(/<html[^>]*\blang=["']?([a-zA-Z-]+)/i);
  return m ? m[1].slice(0, 2).toLowerCase() : null;
}

/** Accepts a recurring stream (a feed with fresh items, or a section page that lists
 *  articles) and refuses single articles, dead feeds and social hosts, with a plain reason. */
// io is the network, so --selftest can stand in for it.
export async function checkSource(
  url: string,
  io = {
    discover: discoverChangeDetection,
    feed: fetchFeedSample,
    fetchPage: fetchSafeSourceWithFinalUrl,
  },
): Promise<CheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return { url, accepted: false, reason: "not a valid address", sample: [] };
  }
  const h = host(parsed.toString());
  if (REFUSED_HOSTS.some((r) => h === r || h.endsWith(`.${r}`))) {
    return { url, accepted: false, reason: `${h} is not read as a stream`, sample: [] };
  }
  let found: Awaited<ReturnType<typeof discoverChangeDetection>>;
  try {
    found = await io.discover(parsed);
  } catch (e) {
    return {
      url,
      accepted: false,
      reason: `could not reach it: ${(e as Error).message}`,
      sample: [],
    };
  }
  const lang = langOf(found.exactPageHtml);
  const trim = (s: SourceSampleEntry[]) =>
    s
      .slice(0, 5)
      .map((e) => ({ title: e.title, teaser: e.teaser, publishedAt: e.publishedAt, url: e.url }));

  if (found.mechanism === "rss" && found.feedUrl) {
    try {
      const items = await io.feed(found.feedUrl, 10, host(found.feedUrl));
      if (items.length < 3)
        return {
          url,
          accepted: false,
          reason: "the feed has fewer than three items",
          mechanism: "rss",
          target: found.feedUrl,
          lang,
          sample: trim(items),
        };
      if (!isFresh(items))
        return {
          url,
          accepted: false,
          reason: `the feed is readable but nothing in it is newer than ${FRESH_DAYS} days`,
          mechanism: "rss",
          target: found.feedUrl,
          lang,
          sample: trim(items),
        };
      if (!hasTitles(items))
        return {
          url,
          accepted: false,
          reason: "the feed items carry no titles",
          mechanism: "rss",
          target: found.feedUrl,
          lang,
          sample: trim(items),
        };
      // An address that is itself the feed has no section to own: its path is the feed's, not its articles' (round 7).
      const isFeedAddress =
        found.feedUrl === found.exactPageFinalUrl || found.feedUrl === parsed.toString();
      if (!isFeedAddress && !ownsSection(items, parsed.pathname)) {
        const page = await sectionPage(parsed, url, trim, io);
        if (page) return page;
        return {
          url,
          accepted: false,
          reason: `the feed found is the site's, not this section's: fewer than half its items live under ${parsed.pathname.replace(/\/$/, "")}, and the page lists none of its own articles`,
          mechanism: "rss",
          target: found.feedUrl,
          lang,
          sample: trim(items),
        };
      }
      return {
        url,
        accepted: true,
        reason: "a feed with fresh items",
        mechanism: "rss",
        target: found.feedUrl,
        lang,
        itemsPerWeek: itemsPerWeek(items),
        sample: trim(items),
      };
    } catch (e) {
      return {
        url,
        accepted: false,
        reason: `the feed could not be read: ${(e as Error).message}`,
        mechanism: "rss",
        target: found.feedUrl,
        lang,
        sample: [],
      };
    }
  }
  if (isArticleShapedPath(parsed.pathname)) {
    return {
      url,
      accepted: false,
      reason: "this is a single article, not a stream",
      lang,
      sample: [],
    };
  }
  if (
    found.mechanism === "listing" &&
    found.listingSample &&
    found.listingSample.length >= 5 &&
    hasTitles(found.listingSample)
  ) {
    return {
      url,
      accepted: true,
      reason: `a section page listing ${found.listingSample.length} articles`,
      mechanism: "listing",
      target: found.resolvedUrl,
      lang,
      itemsPerWeek: null,
      sample: trim(found.listingSample),
    };
  }
  if (found.mechanism === "sitemap" && found.sitemapUrl) {
    try {
      const entries = await fetchSitemapSample(found.sitemapUrl, 50);
      const under = entries.filter((e) =>
        new URL(e.url).pathname.startsWith(parsed.pathname.replace(/\/$/, "") || "/"),
      );
      if (under.length >= 5 && isFresh(under) && hasTitles(under))
        return {
          url,
          accepted: true,
          reason: `a section with ${under.length} recent sitemap entries under its path`,
          mechanism: "sitemap",
          target: found.resolvedUrl,
          lang,
          itemsPerWeek: itemsPerWeek(under),
          sample: trim(under),
        };
      const page = await sectionPage(parsed, url, trim, io);
      if (page) return page;
      return {
        url,
        accepted: false,
        reason:
          under.length < 5
            ? "the sitemap is site-wide, and the page itself lists no articles and has no feed"
            : "the sitemap entries under this path are not fresh",
        mechanism: "sitemap",
        lang,
        sample: trim(under),
      };
    } catch (e) {
      return {
        url,
        accepted: false,
        reason: `the sitemap could not be read: ${(e as Error).message}`,
        lang,
        sample: [],
      };
    }
  }
  return {
    url,
    accepted: false,
    reason: "no feed, no article listing and no sitemap section found",
    lang,
    sample: [],
  };
}

/** When the site's sitemap says nothing about a section, the section page itself decides:
 *  its own feed link, else its own listing of article links. */
async function sectionPage(
  parsed: URL,
  url: string,
  trim: (s: SourceSampleEntry[]) => CheckResult["sample"],
  io: { feed: typeof fetchFeedSample; fetchPage: typeof fetchSafeSourceWithFinalUrl },
): Promise<CheckResult | null> {
  try {
    const { res, finalUrl } = await io.fetchPage("Section", parsed.toString(), parsed.hostname);
    if (!res.ok) return null;
    const html = await readHtmlWithinLimit(res, parsed.toString());
    const lang = langOf(html);
    const feed =
      html.match(
        /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i,
      )?.[1] ??
      html.match(
        /<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/(?:rss|atom)\+xml["']/i,
      )?.[1];
    if (feed) {
      const feedUrl = new URL(feed, finalUrl).toString();
      try {
        const items = await io.feed(feedUrl, 10, host(feedUrl));
        // A section page usually advertises the site-wide feed.
        if (
          items.length >= 3 &&
          isFresh(items) &&
          hasTitles(items) &&
          ownsSection(items, parsed.pathname)
        )
          return {
            url,
            accepted: true,
            reason: "the section's own feed, with fresh items",
            mechanism: "rss",
            target: feedUrl,
            lang,
            itemsPerWeek: itemsPerWeek(items),
            sample: trim(items),
          };
      } catch {
        // A dead advertised feed is not a reason to refuse the section itself.
      }
    }
    // A section's articles rarely live under the section's path (TechCrunch's startups section lists /2026/09/26/...,
    // Mundo Deportivo's topic pages list /futbol/...), so the listing is accepted on its own; whether the listed
    // items fit the gap is the Jev question the caller asks next.
    const listing = extractListingSample(html, finalUrl);
    if (listing.length >= 5 && hasTitles(listing))
      return {
        url,
        accepted: true,
        reason: `a section page listing ${listing.length} articles`,
        mechanism: "listing",
        target: finalUrl,
        lang,
        itemsPerWeek: null,
        sample: trim(listing),
      };
    return null;
  } catch {
    return null;
  }
}

/** Reads the body up to a byte limit and stops the download the moment it passes it. */
async function readBytesWithinLimit(res: Response, limit: number): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > limit) {
    await res.body?.cancel();
    return null;
  }
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array(await res.arrayBuffer());
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** Reads one linked page: its title and its whole text (a PDF up to maxPages pages, owner, September 26). */
// A person's link may redirect to another site (a shortener, an affiliate hop): any public destination is allowed.
export async function readPage(
  url: string,
  maxPages = 10,
): Promise<{
  url: string;
  finalUrl?: string;
  title: string | null;
  text: string;
  via?: string;
  pages?: number;
  error?: string;
}> {
  try {
    const target = new URL(url.startsWith("http") ? url : `https://${url}`);
    const { res, finalUrl } = await fetchSafeSourceWithFinalUrl("Page", target.toString(), null);
    if (!res.ok) return { url, finalUrl, title: null, text: "", error: `HTTP ${res.status}` };
    // A web page is read as one; a PDF's text is extracted (owner, September 26); an image or any other
    // file is reported, not decoded as text.
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type === "application/pdf") {
      const bytes = await readBytesWithinLimit(res, MAX_PDF_BYTES);
      if (!bytes)
        return {
          url,
          finalUrl,
          title: null,
          text: "",
          error: `PDF larger than ${MAX_PDF_BYTES} bytes; not downloaded`,
        };
      const pdf = await getDocumentProxy(bytes);
      const meta = await getMeta(pdf).catch(() => null);
      const { totalPages, text: pages } = await extractText(pdf, { mergePages: false });
      const text = pages
        .slice(0, maxPages)
        .join("\n\n")
        .replace(/[ \t]+/g, " ")
        .trim();
      const title = (meta?.info as { Title?: string } | undefined)?.Title?.trim() || null;
      return { url, finalUrl, title, text, via: "pdf", pages: totalPages };
    }
    if (type && type !== "text/html" && type !== "application/xhtml+xml") {
      await res.body?.cancel();
      return { url, finalUrl, title: null, text: "", error: `not a web page (${type})` };
    }
    const html = await readHtmlWithinLimit(res, target.toString());
    // The title comes from raw HTML, where "&" arrives as "&amp;"; decode it once so it is escaped only once later.
    const rawTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
    const title =
      rawTitle &&
      rawTitle
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&amp;/g, "&");
    const { text, via } = extractArticleText(html, finalUrl);
    return { url, finalUrl, title, text, via };
  } catch (e) {
    return { url, title: null, text: "", error: (e as Error).message };
  }
}
