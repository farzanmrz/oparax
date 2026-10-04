import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import { fetchSafeSource, readHtmlWithinLimit } from "@/lib/sources/discovery";
import type { SourceSampleEntry } from "@/lib/sources/sitemap";

export type { SourceSampleEntry } from "@/lib/sources/sitemap";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});
const nodeSchema = z.record(z.string(), z.unknown());
const textSchema = z.union([z.string(), z.object({ "#text": z.string().optional() })]);
type FeedNode = z.infer<typeof nodeSchema>;

function nodes(value: unknown): FeedNode[] {
  return (Array.isArray(value) ? value : [value]).flatMap((entry) => {
    const parsed = nodeSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

function text(value: unknown): string | undefined {
  const parsed = textSchema.safeParse(value);
  if (!parsed.success) return undefined;
  return typeof parsed.data === "string" ? parsed.data : parsed.data["#text"];
}

function publicLink(value: unknown, baseUrl: string): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw, baseUrl);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function entryImage(entry: FeedNode, body: string | undefined, url: string): string | undefined {
  for (const enclosure of [...nodes(entry.enclosure), ...nodes(entry.link)]) {
    const type = text(enclosure["@_type"]);
    const rel = text(enclosure["@_rel"]);
    if ((rel && rel !== "enclosure") || !type?.startsWith("image/")) continue;
    const image = publicLink(enclosure["@_url"] ?? enclosure["@_href"], url);
    if (image) return image;
  }
  const media = [...nodes(entry["media:thumbnail"]), ...nodes(entry["media:content"])];
  for (const group of nodes(entry["media:group"])) {
    media.push(...nodes(group["media:thumbnail"]), ...nodes(group["media:content"]));
  }
  for (const image of media) {
    const type = text(image["@_type"]);
    const medium = text(image["@_medium"]);
    if (type && !type.startsWith("image/")) continue;
    if (medium && medium !== "image") continue;
    const link = publicLink(image["@_url"], url);
    if (link) return link;
  }
  return publicLink(body?.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1], url);
}

export function parseFeedEntries(xml: string, feedUrl: string): SourceSampleEntry[] {
  if (
    xml.length > 5_000_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  ) {
    throw new Error("Feed parse unavailable");
  }
  const root = nodeSchema.parse(parser.parse(xml));
  const atom = nodes(root.feed)[0];
  const rss = nodes(nodes(root.rss)[0]?.channel)[0];
  const rdf = nodes(root["rdf:RDF"] ?? root.RDF)[0];
  if (!atom && !rss && !rdf) throw new Error("Feed parse unavailable");
  return nodes(atom ? atom.entry : rss ? rss.item : rdf?.item).flatMap((entry) => {
    const links = nodes(entry.link);
    const alternate = links.find((link) => !link["@_rel"] || link["@_rel"] === "alternate");
    const url = publicLink(
      atom ? (alternate?.["@_href"] ?? entry.id) : (entry.link ?? entry.guid),
      feedUrl,
    );
    if (!url) return [];
    const body =
      text(entry["content:encoded"]) ??
      text(entry.content) ??
      text(entry.description) ??
      text(entry.summary);
    const categories = Array.isArray(entry.category) ? entry.category : [entry.category];
    const keywords = categories
      .flatMap((category) => {
        const term = text(category) ?? text(nodes(category)[0]?.["@_term"]);
        return term ? [term] : [];
      })
      .join(", ");
    return [
      {
        url,
        title: text(entry.title),
        publishedAt:
          text(entry.pubDate) ??
          text(entry.date) ??
          text(entry["dc:date"]) ??
          text(entry.published) ??
          text(entry.updated),
        teaser: body,
        keywords: keywords || undefined,
        image: entryImage(entry, body, url),
      },
    ];
  });
}

export async function fetchFeedSample(
  feedUrl: string,
  limit: number,
  expectedHostname = new URL(feedUrl).hostname,
): Promise<SourceSampleEntry[]> {
  const res = await fetchSafeSource("Feed", feedUrl, expectedHostname);
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`Feed ${feedUrl} ${res.status}`);
  }
  return parseFeedEntries(await readHtmlWithinLimit(res, feedUrl), feedUrl).slice(0, limit);
}
