import { JSDOM, VirtualConsole } from "jsdom";
import { isPrivateHostname, stripTrackingParameters } from "@/lib/sources/discovery";
import type { SourceSampleEntry } from "@/lib/sources/sitemap";

const NAVIGATION =
  /\/(?:tags?|categories|category|authors?|pages?|search|log-?in|sign-?up|register|about|contact|privacy|terms|careers?|jobs?|pricing|docs|legal|feeds?|rss|events?)(?:\/|$)/i;

export function parseListingEntries(html: string, finalUrl: string): SourceSampleEntry[] {
  if (html.length > 5_000_000) throw new Error("Listing parse unavailable");
  const dom = new JSDOM(html, { url: finalUrl, virtualConsole: new VirtualConsole() });
  try {
    const page = new URL(finalUrl);
    page.hash = "";
    stripTrackingParameters(page);
    const entries = new Map<string, SourceSampleEntry>();
    for (const anchor of dom.window.document.querySelectorAll("a[href]")) {
      if (anchor.closest("nav, header, footer, [role='navigation']")) continue;
      let url: URL;
      try {
        url = new URL(anchor.getAttribute("href") ?? "", page);
      } catch {
        continue;
      }
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        isPrivateHostname(url.hostname)
      )
        continue;
      if (url.hostname.replace(/^www\./, "") !== page.hostname.replace(/^www\./, "")) continue;
      let path: string;
      try {
        path = decodeURIComponent(url.pathname);
      } catch {
        continue;
      }
      const leaf = path.split("/").filter(Boolean).at(-1) ?? "";
      if (
        NAVIGATION.test(path) ||
        /\.[a-z0-9]{1,8}$/i.test(leaf) ||
        leaf.length < 8 ||
        !/[-\d]/.test(leaf)
      )
        continue;
      url.hash = "";
      stripTrackingParameters(url);
      const key = url.toString();
      if (key === page.toString() || entries.has(key)) continue;
      entries.set(key, { url: key, title: anchor.textContent?.replace(/\s+/g, " ").trim() });
    }
    return [...entries.values()];
  } finally {
    dom.window.close();
  }
}
