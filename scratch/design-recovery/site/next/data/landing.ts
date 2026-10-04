// Hero data: the Next.js 15 story from feed.ts plus the public GitHub release as a third input.
// The release (github.com/vercel/next.js/releases/tag/v15.0.0, published 2024-10-21T18:51:48Z) was read
// from the GitHub API on October 1, 2026; both spans below are verbatim lines of its notes.
// FLAG (NOTES.md): today's product keeps GitHub in a separate daily digest; GitHub joining a story is the
// owner's intent, not current behavior.
import { items, nextStory, type FeedStory, type ItemView } from "./feed";

export const githubRelease: ItemView = {
  id: "item-nextjs-release",
  source_id: "src-github-nextjs",
  kind: "article",
  title: "v15.0.0",
  text: "Support React 19 in App and Pages router: #65058\n[Breaking] Disable automatic fetch caching: #66004",
  published_at: "2024-10-21T18:51:48Z",
  url: "https://github.com/vercel/next.js/releases/tag/v15.0.0",
  image: null,
  lang: "en",
  outcome: "full",
  publisher: "GitHub",
  author: "vercel/next.js",
};

const base = nextStory;

/** The hero card: the same verified card, with the release adding evidence to the two facts it supports. */
export const heroStory: FeedStory = {
  ...base,
  items: [items.nextBlog, githubRelease, items.nextPost],
  card: {
    ...base.card,
    publishers: [
      ...base.card.publishers,
      { source_id: githubRelease.source_id, name: "GitHub", url: githubRelease.url },
    ],
    facts: base.card.facts.map((fact, i) =>
      i === 2
        ? { ...fact, evidence: [...fact.evidence, { item: githubRelease.id, span: "Support React 19 in App and Pages router" }] }
        : i === 3
          ? { ...fact, evidence: [...fact.evidence, { item: githubRelease.id, span: "Disable automatic fetch caching" }] }
          : fact,
    ),
  },
};

/** Arrival order is the real publication order on October 21, 2024 (UTC). */
export const heroArrivals = [items.nextBlog, githubRelease, items.nextPost];

/** The owner's example of choosing more than the obvious account; every row exists in the sources table. */
export const watchExample = {
  beat: "OpenAI",
  rows: [
    { kind: "x_account" as const, name: "@OpenAI", focus: "GPT releases, ChatGPT, safety reports" },
    { kind: "rss" as const, name: "OpenAI", focus: "Official news feed" },
    { kind: "rss" as const, name: "TechCrunch", focus: "AI industry news feed" },
    { kind: "x_account" as const, name: "@TechCrunch", focus: "tech industry and startup news" },
  ],
};
