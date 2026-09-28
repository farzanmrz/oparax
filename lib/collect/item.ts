import "server-only";

import { createHash } from "node:crypto";
import { JSDOM, VirtualConsole } from "jsdom";
import { z } from "zod";
import { pagePublishedDate, parsePublishedDate, structuredArticles } from "@/lib/collect/date";
import { reportServerException } from "@/lib/observability/posthog-server";
import { extractArticleText } from "@/lib/sources/article-text";
import {
  fetchSafeSourceWithFinalUrl,
  readHtmlWithinLimit,
  stripTrackingParameters,
} from "@/lib/sources/discovery";
import type { SourceSampleEntry } from "@/lib/sources/sitemap";
import type { TablesInsert } from "@/lib/supabase/database.types";

export function canonicalArticleUrl(raw: string): string {
  const url = new URL(z.url({ protocol: /^https?$/ }).parse(raw));
  url.hash = "";
  url.protocol = "https:";
  stripTrackingParameters(url);
  url.pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${url.pathname === "/" ? "" : url.pathname}${url.search}`;
}

export function articleId(url: string): string {
  return createHash("sha1").update(canonicalArticleUrl(url)).digest("hex");
}

function cleanTitle(value: string): string {
  const title = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/[•·]\s*\d+\s*(?:min|hour|day|week|month|year)/i.test(title)) return "";
  return title
    .replace(/\s+(?:\||-)\s+[^|]+$/, "")
    .slice(0, 199)
    .trim();
}

function articleTitle(entry: SourceSampleEntry, document?: Document): string {
  const candidates = [entry.title ?? ""];
  if (document) {
    candidates.push(...structuredArticles(document).map((node) => node.headline ?? ""));
    for (const name of ["og:title", "twitter:title"]) {
      candidates.push(
        document
          .querySelector(`meta[property='${name}'], meta[name='${name}']`)
          ?.getAttribute("content") ?? "",
      );
    }
    const heading = [...document.querySelectorAll("h1")].find(
      (element) => !element.closest("[hidden], [aria-hidden='true'], nav, header, footer"),
    );
    candidates.push(heading?.textContent ?? "", document.title);
  }
  return candidates.map(cleanTitle).find((title) => title.length >= 8) ?? "";
}

function imageUrl(raw: string | null | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, base);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export type CollectedArticle = { row: TablesInsert<"items">; body: string; via: string };

export async function collectArticle(
  entry: SourceSampleEntry,
  source: { id: string; lang: string },
  signal?: AbortSignal,
): Promise<CollectedArticle | null> {
  let finalUrl = entry.url;
  let html: string | null = null;
  try {
    const fetched = await fetchSafeSourceWithFinalUrl("Article", entry.url, null, signal);
    finalUrl = fetched.finalUrl;
    if (fetched.res.status === 200) html = await readHtmlWithinLimit(fetched.res, entry.url);
    else {
      await fetched.res.body?.cancel();
      throw new Error(`Article ${entry.url} ${fetched.res.status}`);
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    reportServerException(error, {
      tags: { area: "collect", stage: "article" },
      extra: { source_id: source.id, url: entry.url },
    });
  }
  let dom: JSDOM | undefined;
  try {
    if (html !== null)
      dom = new JSDOM(html, { url: finalUrl, virtualConsole: new VirtualConsole() });
  } catch {
    html = null;
  }
  try {
    const document = dom?.window.document;
    const feedDate = parsePublishedDate(entry.publishedAt);
    const publishedAt = feedDate ?? (document ? pagePublishedDate(document) : null);
    if (!publishedAt) return null;
    const title = articleTitle(entry, document);
    const article =
      html !== null
        ? extractArticleText(html, finalUrl, title)
        : { text: title, body: "", via: "unavailable" };
    const length = article.body
      .replace(/\[quote\]|\[end quote\]/g, "")
      .replace(/\s+/g, " ")
      .trim().length;
    const teaser =
      entry.teaser
        ?.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() ?? "";
    const reason =
      article.via === "unavailable"
        ? "unavailable"
        : length < 400 && teaser.length >= 400
          ? "teaser"
          : length < 120
            ? "under_120"
            : null;
    const image =
      imageUrl(entry.image, finalUrl) ??
      imageUrl(
        document
          ?.querySelector("meta[property='og:image'], meta[name='twitter:image']")
          ?.getAttribute("content"),
        finalUrl,
      );
    return {
      body: article.body,
      via: article.via,
      row: {
        id: articleId(finalUrl),
        source_id: source.id,
        source_ids: [source.id],
        kind: "article",
        url: entry.url,
        final_url: canonicalArticleUrl(finalUrl),
        title,
        text: reason === "teaser" ? [title, teaser].filter(Boolean).join("\n\n") : article.text,
        published_at: publishedAt,
        date_source: feedDate ? "feed" : "page tag",
        text_from: reason === "teaser" ? "feed body" : `page:${article.via}`,
        outcome: reason ? "unreadable" : length >= 400 ? "full" : "short",
        unreadable_reason: reason,
        image,
        lang: document?.documentElement.lang || source.lang,
      },
    };
  } finally {
    dom?.window.close();
  }
}
