import type { SettingsData, SettingsMonitor } from "@/app/[handle]/settings/settings-view";
import seedTable from "@/docs/source-table-seed.json";
import { type FeedStats, feedStats } from "@/lib/monitor/present";
import type { BuildLog, MonitorFeed, MonitorSources, PublicItem } from "@/lib/monitor/read";
import type { BuildState, Post } from "@/lib/onboarding/types";

export const previewHandle = "local-preview";
export const previewTitle = "Local preview";
export const previewNotice = "Development preview with example data. Nothing here is live.";

const DAY = 86_400_000;
const HOUR = 3_600_000;

// The example agent's sources are rows of the shared source table (real names, so their logos are real); the example
// stories are invented text about the example person's sentence, credited to those sources. Times are set from the
// moment the page is drawn, so the week's tiles count the example stories. Three stories carry a real public picture
// from the design preview's data (scratch/design-recovery/site/next/data/feed.ts); three have none.
const rowsOf = (kind: string, count: number) =>
  seedTable.filter((row) => row.kind === kind).slice(0, count);
const sourceRows = {
  accounts: rowsOf("x_account", 5),
  rss: rowsOf("rss", 5),
  websites: rowsOf("website", 3),
};
const handleOf = (target: string) => target.replace(/\/+$/, "").split("/").pop() ?? target;
const rowById = new Map(
  [...sourceRows.accounts, ...sourceRows.rss, ...sourceRows.websites].map((row) => [row.id, row]),
);

const images = {
  hf: "https://cdn-uploads.huggingface.co/production/uploads/638e39b249de7ae552d977b5/uKnK93gjkKbmJmSx94WO2.png",
  simon: "https://static.simonwillison.net/static/2026/live-20260929-092441.webp",
  vercel:
    "https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/4VUQPah80J1WYBwplwXQjh/341d68a8100d89550907348d511d49db/image__111_.png",
};

/** One example report from a preview source: a post from an account, an article from a site or feed. */
function report(n: number, rowId: string, published: string, title: string): PublicItem {
  const row = rowById.get(rowId);
  if (!row) throw new Error(`No preview source ${rowId}`);
  const post = row.kind === "x_account";
  const handle = handleOf(row.target);
  return {
    id: post ? `x:18900000000000001${String(n).padStart(2, "0")}` : `example-item-${n}`,
    url: post ? `https://x.com/${handle}` : new URL(row.target).origin,
    title,
    published_at: published,
    kind: post ? "post" : "article",
    lang: "en",
    source_id: post ? `x-${handle}` : row.id,
    author: post ? { handle, name: row.name } : null,
    publisher: row.name,
  };
}

const storyIds = {
  written: "14696e43-7a44-4c2d-a20f-4935a8b292a5",
  noCard: "55c2406d-d96e-40cd-a9d4-bd33f647d96a",
} as const;
const storyId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type Story = MonitorFeed["stories"][number];
function story(
  id: string,
  headline: string | null,
  facts: string[],
  image: string | null,
  reports: PublicItem[],
): Story {
  return {
    id,
    fallback_title: headline ?? reports[0].title,
    last_changed_at: reports[0].published_at,
    image,
    status: headline ? "written" : "no_card",
    card: headline
      ? {
          headline,
          headline_from: "writer",
          image,
          facts: facts.map((text) => ({ text, support: 0.9, attribution: 0.9, evidence: [] })),
          publishers: [],
        }
      : null,
    reports,
  };
}

/** The example feed as the feed read would return it at `now`, newest first. */
function exampleFeed(now: number) {
  const at = (days: number, hours: number) =>
    new Date(now - days * DAY - hours * HOUR).toISOString();
  const deepmind = sourceRows.accounts[0].id;
  const deepseek = sourceRows.accounts[1].id;
  const qwen = sourceRows.accounts[2].id;
  const lovable = sourceRows.accounts[3].id;
  const composio = sourceRows.accounts[4].id;
  const [google, altman, hf, openai, simon] = sourceRows.rss.map((row) => row.id);
  const [bolt, , anthropic] = sourceRows.websites.map((row) => row.id);

  const stories: Story[] = [
    story(
      storyIds.written,
      "Teams gain a clearer review step for agent work",
      [
        "The new tool lets a team inspect proposed agent actions before they run.",
        "Its release announcement also describes a shared review queue.",
      ],
      images.hf,
      [
        report(1, hf, at(0, 2), "A clearer review step for agent work"),
        report(2, deepmind, at(0, 3), "Reviewing what an agent proposes before it runs"),
      ],
    ),
    story(
      storyId(1),
      "A review queue now holds every proposed agent change until a person approves it",
      [
        "Each proposed change waits in one shared queue.",
        "A reviewer sees the diff, the agent's stated reason and the files it touched.",
        "Approvals and rejections are kept as a record the team can search later.",
      ],
      images.simon,
      [
        report(3, simon, at(1, 1), "Notes from a talk on agent review queues"),
        report(4, deepseek, at(1, 2), "Every proposed change now waits for a person"),
        report(5, openai, at(1, 4), "A shared queue for agent changes"),
        report(6, altman, at(1, 6), "On keeping people in the loop"),
        report(7, qwen, at(1, 7), "Our agents now ask before they change files"),
      ],
    ),
    story(storyIds.noCard, null, [], null, [
      report(8, simon, at(2, 3), "A workflow note on reviewing agent changes"),
    ]),
    story(
      storyId(2),
      "An agent framework adds a dry run mode",
      ["A dry run lists what the agent would do without doing it."],
      null,
      [report(9, bolt, at(3, 2), "Dry runs for agent builds")],
    ),
    story(
      storyId(3),
      "Two coding agent makers publish how their approval steps work, and where they differ on what counts as a risky change",
      [
        "One asks for approval before any file outside the project is touched.",
        "The other asks before any command that reaches the network.",
        "Both log the approval next to the change itself.",
        "Neither lets the agent approve its own change.",
      ],
      images.vercel,
      [
        report(10, anthropic, at(4, 1), "How our approval step works"),
        report(11, lovable, at(4, 5), "What counts as a risky change"),
      ],
    ),
    story(
      storyId(4),
      "A survey of teams running agents finds most review every change",
      [
        "Most of the teams asked review every agent change before it runs.",
        "Smaller teams review fewer changes than larger ones.",
      ],
      null,
      [
        report(12, google, at(5, 2), "A survey of teams running agents"),
        report(13, composio, at(5, 4), "Most teams review every agent change"),
      ],
    ),
  ];
  const items = [
    ...new Map(stories.flatMap((s) => s.reports).map((item) => [item.id, item])).values(),
  ].sort((a, b) => (a.published_at < b.published_at ? 1 : -1));
  const skipped = report(14, google, at(2, 6), "A roundup of this week's model releases");
  const feed: MonitorFeed = {
    stories,
    articles: items.map((item) => ({ item, card: null, score: null })),
    skipped: [{ item: skipped, card: null, score: null }],
    digests: [
      {
        id: "662b7c56-e2c5-4dbc-a0ab-4451235cfa87",
        kind: "github",
        name: "example/review-tool",
        url: "https://example.com/github/review-tool",
        description: "A sample repository for reviewing proposed agent actions.",
        why_now: "A new release was published.",
        created_at: at(0, 6),
      },
      {
        id: "5a8b8147-60d0-4d90-904a-e3af5a09b7b6",
        kind: "product_hunt",
        name: "Review Tool",
        url: "https://example.com/product-hunt/review-tool",
        description: "A sample product entry about agent reviews.",
        why_now: "It appeared in today's discovery digest.",
        created_at: at(0, 7),
      },
    ],
    // The checking state: two items are being checked against the sentence and one could not be processed.
    pending: 2,
    failed: 1,
    storiesBefore: undefined,
    storiesBeforeId: undefined,
    articlesBefore: undefined,
    articlesBeforeId: undefined,
    storyFound: false,
  };
  return { feed, items };
}

/** The example feed; a source from the aside keeps only what came from it, as the feed read does. */
export function previewFeed(storyId?: string, source?: string | null): MonitorFeed {
  const { feed } = exampleFeed(Date.now());
  const from = (item: PublicItem) => !source || item.source_id === source;
  return {
    ...feed,
    stories: feed.stories.filter((s) => s.reports.some(from)),
    articles: feed.articles.filter(({ item }) => from(item)),
    storyFound: storyId !== undefined && feed.stories.some((s) => s.id === storyId),
  };
}

/** The tiles' numbers, computed from the example feed exactly as the feed read computes them. */
export function previewStats(): FeedStats {
  const now = Date.now();
  const { feed, items } = exampleFeed(now);
  return feedStats(
    {
      stories: feed.stories.map((s) => s.reports[0].published_at),
      items: items.map((item) => ({ kind: item.kind, source_ids: [item.source_id] })),
      digests: feed.digests.length,
    },
    new Date(now),
  );
}

// The signed-in pages at rest, mid-run, failed and in settings, for the same example person. A run is frozen at one
// checkpoint: build_state exactly as the engine saves it there, and the build_log lines reported up to it.

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

const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0] ?? text;

/** The example agent's settings: rows of the shared table, a few of each kind, two accounts watched. */
export const previewSettings: SettingsData = {
  profile: {
    name: person.name,
    bio: "Building review tools for agent teams.",
    image: null,
    site: null,
  },
  sources: (["rss", "website"] as const).flatMap((kind) =>
    seedTable
      .filter((row) => row.kind === kind)
      .slice(0, kind === "rss" ? 6 : 3)
      .map((row, i) => ({
        id: row.id,
        kind,
        name: row.name,
        host: new URL(row.target).hostname.replace(/^www\./, ""),
        focus: row.focus,
        why: firstSentence(row.description),
        noFilter: false,
        note: kind === "rss" && i === 5 ? "Could not read its last 3 items." : null,
      })),
  ),
  accounts: seedTable
    .filter((row) => row.kind === "x_account")
    .slice(0, 7)
    .map((row, i) => ({
      handle: row.target.split("/").pop() ?? row.id,
      name: row.name,
      why: firstSentence(row.description),
      watched: i < 3,
      posts_per_day: i < 5 ? [3.4, 1.2, 6.8, 0.6, 2.1][i] : null,
      counts_checked_at: i < 5 ? "2026-09-28T06:00:00+00:00" : null,
    })),
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

/** The first try stopped after Jev scored, while choosing; one retry is left. */
export const previewFailed = { step: 3, state: scoredState, log: toAnswer };

/** The monitor while its run is under way or stopped: the free week has not started and nothing is watched yet. */
export function previewBuildingMonitor(status: "building" | "failed") {
  return { ...previewMonitor(), status, trial_started_at: null, pool_used: 0 };
}

/** The example agent's sources for the feed's aside: the rows the example stories are credited to. */
export const previewSources: MonitorSources = {
  accounts: sourceRows.accounts.map((row) => ({
    handle: handleOf(row.target),
    name: row.name,
    why: row.focus,
    watched: false,
  })),
  sources: [...sourceRows.rss, ...sourceRows.websites].map((row) => ({
    source_id: row.id,
    why: row.focus,
    sources: {
      id: row.id,
      name: row.name,
      kind: row.kind,
      focus: row.focus,
      target: row.target,
      unreadable_streak: 0,
      paused_at: null,
    },
  })),
};
