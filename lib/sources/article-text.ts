// SERVER-ONLY. The reader preserves whole passages and their quotation boundaries.
import "server-only";

import { JSDOM, VirtualConsole } from "jsdom";

type Paragraph = { element: Element; block: Element; text: string; quoted: boolean };
export type ArticleText = {
  text: string;
  body: string;
  via: "article" | "main" | "paragraphs" | "unavailable";
};

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function paragraphLength(paragraphs: Paragraph[]): number {
  return paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0);
}

function bodyParagraphs(paragraphs: Paragraph[]): Paragraph[] {
  const blocks = new Map<Element, Paragraph[]>();
  for (const paragraph of paragraphs) {
    const block = blocks.get(paragraph.block) ?? [];
    block.push(paragraph);
    blocks.set(paragraph.block, block);
  }
  const largest =
    [...blocks.values()].sort((a, b) => paragraphLength(b) - paragraphLength(a))[0] ?? [];
  const length = paragraphLength(largest);
  if (length < 400 || length < paragraphLength(paragraphs) * 0.6) return paragraphs;
  const kept = new Set<Paragraph>();
  for (const block of blocks.values()) {
    if (block === largest || paragraphLength(block) >= 200 || block.some((p) => p.quoted)) {
      for (const paragraph of block) kept.add(paragraph);
    }
  }
  // Use the original kept set so adjacency cannot expand into an unrelated paragraph chain.
  const adjacent = paragraphs.filter(
    (p, index) =>
      /[.!?。！？]["'”’)]?$/.test(p.text) &&
      (kept.has(paragraphs[index - 1]) || kept.has(paragraphs[index + 1])),
  );
  for (const paragraph of adjacent) kept.add(paragraph);
  return paragraphs.filter((paragraph) => kept.has(paragraph));
}

export function extractArticleText(html: string, url: string, title = ""): ArticleText {
  const unavailable: ArticleText = { text: title, body: "", via: "unavailable" };
  if (html.length > 5_000_000) return unavailable;
  let dom: JSDOM | undefined;
  try {
    // Scripts and external resources stay disabled in JSDOM.
    dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
    const document = dom.window.document;
    document
      .querySelectorAll(
        "script, style, noscript, nav, header, footer, aside, form, button, iframe, svg, template, canvas, object, [hidden], [aria-hidden='true']",
      )
      .forEach((element) => {
        element.remove();
      });
    // Bare quote text needs a paragraph boundary too, including text beside a quoted paragraph.
    for (const quote of document.querySelectorAll("blockquote")) {
      const walker = document.createTreeWalker(quote, dom.window.NodeFilter.SHOW_TEXT);
      const bare: Node[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.parentElement?.closest("p") && normalized(node.textContent ?? ""))
          bare.push(node);
      }
      for (const node of bare) {
        const paragraph = document.createElement("p");
        node.parentNode?.replaceChild(paragraph, node);
        paragraph.append(node);
      }
    }
    const paragraphs: Paragraph[] = [...document.querySelectorAll("p")].flatMap((element) => {
      const text = normalized(element.textContent ?? "");
      const quote = element.closest("blockquote");
      const block = quote?.parentElement ?? element.parentElement;
      return text && block ? [{ element, block, text, quoted: quote !== null }] : [];
    });
    const within = (element: Element) => paragraphs.filter((p) => element.contains(p.element));
    const largest = (selector: string) =>
      [...document.querySelectorAll(selector)]
        .map((element) => ({ element, paragraphs: within(element) }))
        .sort((a, b) => paragraphLength(b.paragraphs) - paragraphLength(a.paragraphs))[0];
    const article = largest("article");
    const main = largest("main, [role='main']");
    const preferred =
      article && paragraphLength(article.paragraphs) >= 400
        ? article
        : main && paragraphLength(main.paragraphs) >= 400
          ? main
          : null;
    let selected: Paragraph[];
    let via: ArticleText["via"];
    if (preferred) {
      selected = bodyParagraphs(preferred.paragraphs);
      via = preferred === article ? "article" : "main";
    } else {
      const containers = new Set(paragraphs.map((p) => p.block));
      selected =
        [...containers].map(within).sort((a, b) => paragraphLength(b) - paragraphLength(a))[0] ??
        [];
      if (paragraphLength(selected) < 400) {
        const fallback = paragraphs.filter((p) => p.text.length > 40 || p.quoted);
        if (paragraphLength(fallback) > paragraphLength(selected)) selected = fallback;
      }
      via = "paragraphs";
    }
    const body = selected
      .map((p) => (p.quoted ? `[quote] ${p.text} [end quote]` : p.text))
      .join("\n\n");
    return { body, text: [normalized(title), body].filter(Boolean).join("\n\n"), via };
  } catch {
    return unavailable;
  } finally {
    dom?.window.close();
  }
}
