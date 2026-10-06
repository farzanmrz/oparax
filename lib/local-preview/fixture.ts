import type { SettingsData, SettingsMonitor } from "@/app/[handle]/settings/settings-view";
import seedTable from "@/docs/source-table-seed.json";
import type { BuildLog, MonitorFeed, PublicItem } from "@/lib/monitor/read";
import type { BuildState, Post } from "@/lib/onboarding/types";

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

// The signed-in pages at rest, mid-run, failed and in settings, for the same example person. A run is frozen at one
// checkpoint: build_state exactly as the engine saves it there, and the build_log lines reported up to it.

const DAY = 86_400_000;
const person = { id: "1890000000000000000", handle: "example_builder", name: "Example Builder" };

/** The example person's one sentence. */
export const previewBeat = "Tools that let teams review what AI agents change before it runs";

/** The example person's sign-in address, shown in the shell's account. */
export const previewEmail = "builder@example.com";

/** The example person's monitor: two days into the free week, with some of its watched X posts used. */
export function previewMonitor(now = Date.now()) {
  return {
    id: "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b",
    handle: previewHandle,
    display_handle: person.handle,
    status: "live",
    trial_started_at: new Date(now - 2 * DAY).toISOString(),
    paid_through: null,
    tier: "free",
    pool_limit: 300,
    pool_used: 42,
    cadence: "daily",
    budget_exhausted_at: null,
    alert_hour: 8,
    alert_timezone: "UTC",
    bot_state: "none",
    digest_github: true,
    digest_product_hunt: true,
    stripe_customer_id: null,
  } satisfies SettingsMonitor & { handle: string; display_handle: string };
}

export const previewSettings: SettingsData = {
  sources: [
    {
      id: "langchain-product-and-engineering-blog",
      name: "LangChain",
      focus: "Product and engineering blog",
      noFilter: false,
    },
    {
      id: "sarthak-rastogi-ai-agent-engineering",
      name: "Sarthak Rastogi",
      focus: "AI agent engineering",
      noFilter: false,
    },
  ],
  accounts: [
    {
      handle: "cursor_ai",
      name: "Cursor",
      watched: true,
      posts_per_day: 3.4,
      counts_checked_at: "2026-09-28T06:00:00+00:00",
    },
    {
      handle: "example_review",
      name: "Example Reviewer",
      watched: false,
      posts_per_day: 1.2,
      counts_checked_at: "2026-09-28T06:00:00+00:00",
    },
  ],
  repos: [{ repo: "example/review-tool", threshold: 50, stars: 820 }],
  failedDeliveries: 0,
};

const post = (id: string, date: string, text: string, quoted: Post["quoted"] = null): Post => ({
  id,
  date,
  kind: quoted ? "quote" : "original",
  lang: "en",
  text,
  quoted,
  links: [],
  link_meta: {},
  mentions: [],
  hashtags: [],
  cashtags: [],
  media: [],
});

const pinned = post(
  "1890000000000000010",
  "2026-09-20T15:00:00.000Z",
  "We build tools that let a team see what an agent is about to change before it runs.",
);
const posts = [
  post(
    "1890000000000000013",
    "2026-09-28T17:00:00.000Z",
    "Shipped a shared review queue today: every proposed agent action waits for a person to approve it.",
  ),
  post(
    "1890000000000000012",
    "2026-09-27T12:30:00.000Z",
    "Good thread on why diffs beat summaries when you review what a coding agent did.",
    {
      id: "1890000000000000020",
      author: "@example_review",
      name: "Example Reviewer",
      bio: "Writes about reviewing software changes.",
      text: "A summary tells you what the agent meant to do. The diff tells you what it did.",
    },
  ),
  post(
    "1890000000000000011",
    "2026-09-25T09:15:00.000Z",
    "Reading every changelog from the agent tool makers this week. Approval steps are everywhere now.",
  ),
];

const profileState: BuildState = {
  profile: {
    ...person,
    handle: `@${person.handle}`,
    bio: "Building review tools for agent teams.",
    pinned,
  },
  x_user_id: person.id,
  pinnedId: pinned.id,
  profileComplete: true,
};
const postsState: BuildState = { ...profileState, posts };
// Example scores for every table row, spread so most rows fall below the possible line as in a real run; the rows
// the example answer picks are set by hand below.
const spread = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
};
const exampleScores = Object.fromEntries(
  seedTable.map((row) => [row.id, Math.round(spread(row.id) ** 3 * 90) / 100]),
);
const scoredState: BuildState = {
  ...postsState,
  scores: {
    ...exampleScores,
    "langchain-product-and-engineering-blog": 0.86,
    "sarthak-rastogi-ai-agent-engineering": 0.78,
    "x-cursor_ai": 0.81,
    "q-example_review": 0.74,
    "google-ai-news-and-product-updates": 0.22,
  },
};
const chosenState: BuildState = {
  ...scoredState,
  answer: {
    sites: [
      {
        id: "langchain-product-and-engineering-blog",
        why: "Covers the agent frameworks the posts compare.",
      },
      {
        id: "sarthak-rastogi-ai-agent-engineering",
        why: "Writes about engineering agents that act safely.",
      },
    ],
    accounts: [
      { handle: "cursor_ai", why: "Ships coding agent updates the posts discuss." },
      { handle: "example_review", why: "Quoted on reviewing what an agent changed." },
    ],
    search: null,
    brief: {
      summary:
        "Builds review tools for teams that run agents. Follows how agent tool makers add approval steps, diffs and review queues.",
      interests: ["Agent review", "Coding agents", "Developer tools"],
      languages: ["English"],
      topic_terms: ["agent review", "approval step", "coding agent"],
    },
  },
  searched: null,
  turns: 1,
};

// The log as the engine reports it (lib/onboarding/engine.ts), one line per report() call, in order.
const scores = scoredState.scores ?? {};
const kept = Object.values(scores).filter((score) => score >= 0.35).length;
const total = Object.keys(scores).length;
const at = (second: number) => `2026-09-28T18:00:${String(second).padStart(2, "0")}.000Z`;
const line = (step: number, message: string, second: number) => ({ step, message, at: at(second) });
const lookingUp = line(1, `Looking up @${person.handle} on X`, 1);
const found = line(1, `Found ${person.name} on X`, 2);
const reading = line(2, `Reading @${person.handle}'s newest posts`, 3);
const read = line(2, `Read ${posts.length} newest posts`, 8);
const gathered = line(
  3,
  `Gathered ${seedTable.length} from the source list, 1 accounts you quoted`,
  8,
);
const scoring = line(3, `Read ${posts.length} posts; Jev is scoring ${total} candidate sources`, 9);
const jevKept = line(3, `Jev kept ${kept} of ${total} candidates`, 31);
const passed = line(3, `Jev passed ${kept} candidates; choosing from them`, 31);
const choosing = line(3, "Choosing recommendations and writing the brief", 32);
const saving = line(3, "Saving your agent", 52);
const toPosts = [lookingUp, found, reading, read];
const toScores = [...toPosts, gathered, scoring];
const toAnswer = [...toScores, jevKept, passed, choosing];

export const previewCheckpoints = ["profile", "posts", "scoring", "jev", "chosen", "done"] as const;
export type PreviewCheckpoint = (typeof previewCheckpoints)[number];

/** The run at one checkpoint: the engine's step, its saved state and the log so far. */
export const previewRun: Record<
  PreviewCheckpoint,
  { step: number; ready: boolean; state: BuildState; log: BuildLog }
> = {
  profile: { step: 2, ready: false, state: profileState, log: [lookingUp, found, reading] },
  posts: { step: 2, ready: false, state: postsState, log: toPosts },
  scoring: { step: 3, ready: false, state: postsState, log: toScores },
  jev: { step: 3, ready: false, state: scoredState, log: toAnswer },
  chosen: { step: 3, ready: false, state: chosenState, log: [...toAnswer, saving] },
  done: { step: 3, ready: true, state: chosenState, log: [...toAnswer, saving] },
};

/** The first try stopped while reading posts; one retry is left. */
export const previewFailed = { step: 2, state: profileState, log: [lookingUp, found, reading] };

/** The monitor while its run is under way or stopped: the free week has not started and nothing is watched yet. */
export function previewBuildingMonitor(status: "building" | "failed") {
  return { ...previewMonitor(), status, trial_started_at: null, pool_used: 0 };
}
