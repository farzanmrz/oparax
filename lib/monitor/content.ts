export const monitorContent = {
  metadataTitle: (name: string) => `${name}: Oparax agent`,
  skipToNews: "Skip to news",
  title: (handle: string) => `Agent for @${handle}`,
  personalization: (handle: string) => `Built around @${handle}'s public posts.`,
  missing: (handle: string) => `No agent for @${handle} yet.`,
  missingStory: "This agent or story could not be found.",
  home: "Build your agent",
  settings: "Settings",
  menu: {
    pages: "Pages",
    feed: "Feed",
    settings: "Settings",
    account: "Account",
    theme: "Theme",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    daysLeft: (n: number) => (n === 1 ? "day left" : "days left"),
    pool: (used: number, limit: number) => `${used} of ${limit} watched Twitter posts used`,
    signOut: "Sign out",
    signingOut: "Signing out",
    signOutFailed: "Could not sign out. Try again.",
  },
  brief: "Your Brief",
  feedTitle: "Feed",
  kinds: { post: "Post", article: "Article" },
  tiles: {
    stories: "Stories this week",
    byDate: "By publication date",
    range: (from: string, to: string) => `${from} to ${to}`,
    reports: "Reports by kind",
    posts: (n: number) => `${n} ${n === 1 ? "post" : "posts"}`,
    articles: (n: number) => `${n} ${n === 1 ? "article" : "articles"}`,
    digests: (n: number) => `${n} ${n === 1 ? "digest" : "digests"}`,
    agent: "Agent",
    live: "Live",
    stopped: "Stopped",
    checking: (n: number) => `${n} checking`,
    failed: (n: number) => `${n} failed`,
    watching: (sites: number, accounts: number) =>
      [
        sites ? `${sites} ${sites === 1 ? "site or feed" : "sites and feeds"}` : null,
        accounts ? `${accounts} Twitter ${accounts === 1 ? "account" : "accounts"}` : null,
      ]
        .filter(Boolean)
        .join(", "),
    pool: (used: number, limit: number) => `${used} of ${limit} watched posts`,
    checkingRow: (n: number) => `Checking ${n} ${n === 1 ? "item" : "items"} against your sentence`,
  },
  digestCard: "Daily digest",
  aside: {
    title: "Sources",
    all: "All sources",
    more: "Show more",
    less: "Show less",
    collapse: "Collapse",
    add: "Add",
    empty: "Your agent chooses its sources once it is built.",
  },
  noNewsFrom: (name: string) => `Nothing from ${name} in your feed yet.`,
  clustered: "Clustered",
  direct: "Direct",
  clusteredLine: "Articles and posts about the same event, stacked into one story.",
  directLine: "Each article and post on its own card, newest first.",
  sourcesLine: "What your agent reads. Chosen when it was built.",
  noSourcesYet: "Your agent chooses its sources once it is built.",
  openSource: "Open",
  stories: "Stories",
  articles: "Articles",
  feed: "News views",
  sources: "Sources",
  accounts: "Twitter Accounts",
  watched: "Watched",
  skipped: "Skipped",
  digests: "Daily Digests",
  github: "GitHub",
  productHunt: "Product Hunt",
  digestEmpty: "Your next digest will appear here.",
  noSources: "No sites or feeds selected yet.",
  noAccounts: "No Twitter accounts selected yet.",
  noNews: "No relevant news yet.",
  failedItems: (n: number) => `Could not process ${n} items.`,
  pendingItems: (n: number) => `${n} items being checked.`,
  unverified: "Unverified report",
  reports: (n: number) => `${n} further reports`,
  source: "Source",
  original: "Read original",
  loadMore: "Load more",
  imageAlt: "",
  building: "Building Your Agent",
  steps: (handle: string) => [
    `Looking up @${handle} on Twitter`,
    `Reading @${handle}'s newest posts`,
    "Choosing sources and Twitter accounts",
  ],
  buildFailed: (step: string, reason: string) => `Building stopped at: ${step}. ${reason}`,
  onboarding: {
    // The seven phases the run page reads from the engine's three steps and its checkpoints, with what each does
    // (design preview next/building/steps.ts, verbatim).
    phases: {
      profile: {
        title: "Find your Twitter profile",
        does: "Looks your handle up on Twitter: name, bio, picture, pinned post.",
      },
      posts: {
        title: "Read your newest posts",
        does: "Reads your newest 10 posts; threads count as one; reposts and replies left out.",
      },
      gather: {
        title: "Gather candidates",
        does: "Collects every row of the shared source table and every account you quoted.",
      },
      jev: {
        title: "Jev scores every candidate",
        does: "Jev asks, per candidate, whether it is a useful recurring source for your beat.",
      },
      choose: {
        title: "Choose sources and write the brief",
        does: "One model call picks sites, feeds and Twitter accounts with a reason each, and writes your brief.",
      },
      search: {
        title: "Search Twitter for more accounts",
        does: "Runs one Twitter search only if too few accounts fit.",
      },
      save: { title: "Save your agent", does: "Saves your agent and opens your feed." },
    },
    phasesLabel: "Steps",
    stoppedTitle: "Building stopped",
    ready: "Your agent is ready",
    openFeed: "Open your feed",
    yourAccount: ", your Twitter account",
    runLabel: "Your run",
    gathering: "Gathering candidates",
    gatheredFrom: "from the source list and the accounts you quoted",
    scoring: "Jev is scoring the candidates.",
    bands: { strong: "Strong match", possible: "Possible match", aside: "Set aside" },
    more: (n: number) => `${n} more`,
    found: (name: string) => `Found ${name} on Twitter`,
    read: (n: number) => `Read ${n} newest posts`,
    gathered: (table: number, quoted: number) =>
      `Gathered ${table} from the source list, ${quoted} ${quoted === 1 ? "account" : "accounts"} you quoted`,
    kept: (kept: number, total: number) => `Jev kept ${kept} of ${total} candidates`,
    chose: (sites: number, accounts: number) =>
      `Chose ${sites} ${sites === 1 ? "site or feed" : "sites and feeds"} and ${accounts} Twitter ${accounts === 1 ? "account" : "accounts"}, wrote your brief`,
    searched: (terms: string) => `Searched Twitter for: ${terms}`,
    searchFailed: "The Twitter search did not answer.",
    enough: "Skipped: enough accounts already fit",
    notAsked: "Skipped: the model did not ask for one",
    saved: "Saved your agent",
    you: "You",
    about: "About",
    brief: "Brief",
    sentence: "Your sentence",
    scored: (n: number) => `Scored ${n} candidates`,
    interests: "Interests",
    language: "Language",
    posts: "Your newest posts",
    post: "Post",
    quote: "Quote",
    thread: (parts: number) => `Thread, ${parts} parts`,
    groups: { x: "Twitter accounts", rss: "RSS feeds", website: "Websites", github: "GitHub" },
  },
  buildReason: "Preparation could not finish. Your free week has not started.",
  retry: "Try again",
  retryFailed: "The retry could not start. Try again.",
  trial: (n: number) => `${n} days left in your free week. Plans from $5 a month.`,
  exhausted:
    "Your free week's allowance ran out early. Updates are paused; your cards stay readable. Plans open when the week ends.",
  frozenTitle: "Your free week is over.",
  frozen:
    "Your agent has stopped watching. Old cards stay readable. Pick a plan to keep it running.",
  lapsed: "Your paid access has ended. Open billing or choose a plan to resume updates.",
  publicFrozen: "Updates have stopped. Existing stories remain readable.",
  updateCard: "Update card",
  pool: (used: number, limit: number) => `${used} of ${limit} watched posts used this month.`,
  trialPool: (used: number, limit: number) =>
    `${used} of ${limit} watched posts used in your free week.`,
  poolPaused: (date: string) =>
    `Your watched Twitter accounts are paused until ${date}. Sites and feeds keep running.`,
  trialPoolPaused:
    "Your free week's watched Twitter posts are used up. Sites and feeds keep running.",
  renewal: "your next renewal",
  unreadable: (n: number) => `Could not read its last ${n} items.`,
  sourcePaused: "Paused today: unusual spending.",
  unlimited: "Sites and feeds unlimited.",
  plans: [
    {
      tier: "hobby",
      label: "Hobby, $5 a month",
      detail: "100 watched Twitter posts a month, one DM a day",
    },
    {
      tier: "creator",
      label: "Creator, $30 a month",
      detail: "3,000 watched Twitter posts a month, one DM a day",
    },
    {
      tier: "wire",
      label: "Wire, $99 a month",
      detail: "4,000 watched Twitter posts a month, a digest every 15 minutes",
    },
  ],
  notifications: {
    title: "Notifications",
    states: { active: "Connected", none: "Not connected", paused: "Paused", stopped: "Stopped" },
    xdm: "Twitter DMs",
    xdmLine: (handle: string) => `Oparax messages @${handle} on Twitter when a story matters.`,
    message: "Message @oparax_ai",
    commands:
      'Commands, sent to @oparax_ai on Twitter: STOP pauses alerts, RESUME turns them back on, and "Start alerts" connects them again after a stop.',
  },
  botHelp: (handle: string) =>
    `Opens a message to @oparax_ai with "Start alerts" typed. Send it from @${handle} to connect alerts; that message is how Oparax confirms the account is yours. The bot will not reply.`,
  botActive: "Alerts on. Send STOP to the bot to stop.",
  botPaused: "Alerts paused. Send RESUME to the bot to continue.",
  botStopped:
    'Alerts stopped. Send "Start alerts" from your Twitter account to turn them on again.',
  activationFailed: "Twitter connection could not start. Try again.",
  activationUnavailable: "Open the alert connection during your free week or an active plan.",
} as const;

export function safeWebUrl(value: string | null | undefined, httpsOnly = false): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || (!httpsOnly && url.protocol === "http:")) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function displayTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}
