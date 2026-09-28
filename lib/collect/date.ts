import { z } from "zod";

const metadataNode = z.object({
  headline: z.string().optional(),
  datePublished: z.string().optional(),
  dateCreated: z.string().optional(),
  uploadDate: z.string().optional(),
  "@graph": z.array(z.unknown()).optional(),
  mainEntity: z.unknown().optional(),
});

export function structuredArticles(document: Document): z.infer<typeof metadataNode>[] {
  const result: z.infer<typeof metadataNode>[] = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    let raw: unknown;
    try {
      raw = JSON.parse(script.textContent ?? "");
    } catch {
      // A malformed metadata block must not hide the next publisher's date or headline.
      continue;
    }
    const queue: unknown[] = Array.isArray(raw) ? [...raw] : [raw];
    for (let index = 0; index < queue.length; index += 1) {
      const parsed = metadataNode.safeParse(queue[index]);
      if (!parsed.success) continue;
      result.push(parsed.data);
      queue.push(...(parsed.data["@graph"] ?? []));
      if (parsed.data.mainEntity) queue.push(parsed.data.mainEntity);
    }
  }
  return result;
}

export function parsePublishedDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  let input = value.trim();
  if (!/\d{4}/.test(input)) return null;
  if (!/(?:Z|[+-]\d{2}:?\d{2}|\b(?:GMT|UTC|[ECMP][DS]T))$/i.test(input)) {
    input = /^\d{4}-\d{2}-\d{2}(?:[T ]|$)/.test(input)
      ? `${input.replace(" ", "T")}${input.length === 10 ? "T00:00:00" : ""}Z`
      : `${input} UTC`;
  }
  const timestamp = Date.parse(input);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function pagePublishedDate(document: Document): string | null {
  const tags = [
    "article:published_time",
    "datepublished",
    "date",
    "pubdate",
    "publishdate",
    "publish-date",
    "publication_date",
    "publication-date",
    "parsely-pub-date",
    "dc.date.issued",
    "dc.date",
    "dcterms.created",
    "og:published_time",
    "og:updated_time",
  ];
  const meta = [...document.querySelectorAll("meta")];
  for (const tag of tags) {
    for (const element of meta) {
      const name =
        element.getAttribute("property") ??
        element.getAttribute("name") ??
        element.getAttribute("itemprop");
      if (name?.toLowerCase() !== tag) continue;
      const date = parsePublishedDate(element.getAttribute("content"));
      if (date) return date;
    }
  }
  const structured = structuredArticles(document);
  for (const key of ["datePublished", "dateCreated", "uploadDate"] as const) {
    for (const entry of structured) {
      const date = parsePublishedDate(entry[key]);
      if (date) return date;
    }
  }
  return parsePublishedDate(document.querySelector("time[datetime]")?.getAttribute("datetime"));
}
