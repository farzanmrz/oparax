import type { MonitorFeed, PublicItem } from "@/lib/monitor/read";

export const previewHandle = "local-preview";
export const previewTitle = "Local preview";
export const previewNotice = "Development preview with example data. Nothing here is live.";

const sourceIds = {
  site: "c601f31b-f29e-4684-a249-124510864cd2",
  account: "2061da12-108a-4c32-8980-37d3141943b7",
} as const;

const reportIds = {
  post: "x:1890000000000000001",
  article: "0123456789abcdef0123456789abcdef01234567",
  later: "89abcdef0123456789abcdef0123456789abcdef",
} as const;

const reports: Record<"post" | "article" | "later", PublicItem> = {
  post: {
    id: reportIds.post,
    url: "https://example.com/posts/tool-launch",
    title: "A new tool helps teams review agent actions",
    published_at: "2026-09-28T17:00:00+00:00",
    kind: "post",
    lang: "en",
    source_id: sourceIds.account,
    author: { handle: "example_builder", name: "Example Builder" },
    publisher: "Example Builder",
  },
  article: {
    id: reportIds.article,
    url: "https://example.com/articles/agent-review",
    title: "Teams can now inspect an agent's proposed changes before they run",
    published_at: "2026-09-28T16:00:00+00:00",
    kind: "article",
    lang: "en",
    source_id: sourceIds.site,
    author: null,
    publisher: "Example Journal",
  },
  later: {
    id: reportIds.later,
    url: "https://example.com/articles/workflow-notes",
    title: "A workflow note on reviewing agent changes",
    published_at: "2026-09-27T14:00:00+00:00",
    kind: "article",
    lang: "en",
    source_id: sourceIds.site,
    author: null,
    publisher: "Example Journal",
  },
};

const storyIds = {
  written: "14696e43-7a44-4c2d-a20f-4935a8b292a5",
  noCard: "55c2406d-d96e-40cd-a9d4-bd33f647d96a",
} as const;

const stories: MonitorFeed["stories"] = [
  {
    id: storyIds.written,
    fallback_title: "A clearer way to review agent work",
    last_changed_at: "2026-09-28T18:00:00+00:00",
    image: null,
    status: "written",
    card: {
      headline: "Teams gain a clearer review step for agent work",
      headline_from: "writer",
      image: null,
      facts: [
        {
          text: "The new tool lets a team inspect proposed agent actions before they run.",
          support: 0.94,
          attribution: 0.97,
          evidence: [{ item: reportIds.article, span: "inspect proposed changes before they run" }],
        },
        {
          text: "Its release announcement also describes a shared review queue.",
          support: 0.91,
          attribution: 0.95,
          evidence: [{ item: reportIds.post, span: "a shared review queue" }],
        },
      ],
      publishers: [
        {
          source_id: sourceIds.site,
          name: "Example Journal",
          url: "https://example.com/articles/agent-review",
        },
        {
          source_id: sourceIds.account,
          name: "Example Builder",
          url: "https://example.com/posts/tool-launch",
        },
      ],
    },
    reports: [reports.article, reports.post],
  },
  {
    id: storyIds.noCard,
    fallback_title: "A workflow note on reviewing agent changes",
    last_changed_at: "2026-09-27T15:00:00+00:00",
    image: null,
    status: "no_card",
    card: null,
    reports: [reports.later],
  },
];

const feed: MonitorFeed = {
  stories,
  articles: [
    { item: reports.post, card: null, score: 0.93 },
    { item: reports.article, card: null, score: 0.89 },
  ],
  skipped: [{ item: reports.later, card: null, score: 0.28 }],
  digests: [
    {
      id: "662b7c56-e2c5-4dbc-a0ab-4451235cfa87",
      kind: "github",
      name: "example/review-tool",
      url: "https://example.com/github/review-tool",
      description: "A sample repository for reviewing proposed agent actions.",
      why_now: "A new release was published.",
      created_at: "2026-09-28T09:00:00+00:00",
    },
    {
      id: "5a8b8147-60d0-4d90-904a-e3af5a09b7b6",
      kind: "product_hunt",
      name: "Review Tool",
      url: "https://example.com/product-hunt/review-tool",
      description: "A sample product entry about agent reviews.",
      why_now: "It appeared in today's discovery digest.",
      created_at: "2026-09-28T08:00:00+00:00",
    },
  ],
  pending: 0,
  failed: 0,
  storiesBefore: undefined,
  storiesBeforeId: undefined,
  articlesBefore: undefined,
  articlesBeforeId: undefined,
  storyFound: false,
};

export function previewFeed(storyId?: string): MonitorFeed {
  return {
    ...feed,
    storyFound: storyId !== undefined && stories.some((story) => story.id === storyId),
  };
}
