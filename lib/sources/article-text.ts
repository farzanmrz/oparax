// SERVER-ONLY. No caller until issue 2; roadmap section 5 reuses this extractor.
// `via` distinguishes readable articles from tag-stripped text for the onboarding checker.
// Until its first server caller, only typechecking covers this module.
import "server-only";

import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import { z } from "zod";

const MIN_BODY_LENGTH = 200;
const MAX_BODY_LENGTH = 20_000;
const MAX_HTML_LENGTH = 5_000_000;
const articleNode = z.object({ articleBody: z.string().optional() });
const graphNode = z.object({ "@graph": z.array(z.unknown()).optional() });

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_BODY_LENGTH);
}

function extractFromJsonLd(html: string): string | null {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of matches) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      // One malformed metadata block must not hide another block's article.
      continue;
    }
    const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      const article = articleNode.safeParse(candidate);
      if (article.success && article.data.articleBody !== undefined) {
        const text = normalizeText(article.data.articleBody);
        if (text.length >= MIN_BODY_LENGTH) return text;
      }
      const graph = graphNode.safeParse(candidate);
      if (graph.success && graph.data["@graph"]) {
        for (const node of graph.data["@graph"]) candidates.push(node);
      }
    }
  }
  return null;
}

export function extractArticleText(
  html: string,
  url: string,
): { text: string; via: "json-ld" | "readability" | "tag-strip" } {
  if (html.length <= MAX_HTML_LENGTH) {
    const jsonLd = extractFromJsonLd(html);
    if (jsonLd) return { text: jsonLd, via: "json-ld" };

    try {
      // JSDOM defaults leave scripts and external resources disabled.
      const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
      try {
        const article = new Readability(dom.window.document).parse();
        const text = normalizeText(article?.textContent ?? "");
        if (text.length >= MIN_BODY_LENGTH) return { text, via: "readability" };
      } finally {
        dom.window.close();
      }
    } catch {
      // Unparseable pages still get the same last-resort text extraction.
    }
  }

  return { text: normalizeText(html.replace(/<[^>]+>/g, " ")), via: "tag-strip" };
}
