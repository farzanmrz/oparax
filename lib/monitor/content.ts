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
    open: "Oparax menu",
    pages: "Pages",
    feed: "Feed",
    sources: "Sources",
    notifications: "Notifications",
    signOut: "Sign out",
    signingOut: "Signing out",
    signOutFailed: "Could not sign out. Try again.",
  },
  brief: "Your Brief",
  yourFeed: "Your Feed",
  clustered: "Clustered",
  direct: "Direct",
  clusteredLine: "Articles and posts about the same event, stacked into one story.",
  directLine: "Each article and post on its own card, newest first.",
  sourcesLine: "What your agent reads. Chosen when it was built.",
  noSourcesYet: "Your agent chooses its sources once it is built.",
  openSource: "Open",
  dmLine: "Oparax can alert you on X DMs.",
  dmLink: "Turn on notifications.",
  stories: "Stories",
  articles: "Articles",
  feed: "News views",
  sources: "Sources",
  accounts: "X Accounts",
  watched: "Watched",
  skipped: "Skipped",
  digests: "Daily Digests",
  github: "GitHub",
  productHunt: "Product Hunt",
  digestEmpty: "Your next digest will appear here.",
  noSources: "No sites or feeds selected yet.",
  noAccounts: "No X accounts selected yet.",
  noNews: "No relevant news yet.",
  failedItems: (n: number) => `Could not process ${n} items.`,
  pendingItems: (n: number) => `${n} items being checked.`,
  score: (score: number) => `${score.toFixed(2)} against your beat`,
  unverified: "Unverified report",
  reports: (n: number) => `${n} further reports`,
  source: "Source",
  original: "Read original",
  loadMore: "Load more",
  imageAlt: "",
  building: "Building Your Agent",
  steps: (handle: string) => [
    `Looking up @${handle} on X`,
    `Reading @${handle}'s newest posts`,
    "Choosing sources and X accounts",
  ],
  buildFailed: (step: string, reason: string) => `Building stopped at: ${step}. ${reason}`,
  onboarding: {
    // The engine reports three steps; these are the One titles for them, in order.
    steps: ["Find your X profile", "Read your newest posts", "Choose sources and write your brief"],
    stepsLabel: "Steps",
    waiting: "Waiting",
    running: "Running",
    done: "Done",
    stopped: "Stopped",
    stoppedTitle: "Building stopped",
    ready: "Your agent is ready",
    openFeed: "Open your feed",
    work: "The agent's work",
    posts: "Your newest posts",
    post: "Post",
    quote: "Quote",
    thread: (parts: number) => `Thread, ${parts} parts`,
    sourcesHint: "Click on any source to see the reason.",
    groups: { x: "X accounts", rss: "RSS feeds", website: "Websites" },
    fromPosts: "From your posts",
    side: "Your profile and brief",
    pinned: "Pinned post",
    brief: "Your brief",
    briefWaiting: "Written after the sources are chosen.",
    about: (name: string) => `About ${name}`,
    interests: "Interests",
    language: "Language",
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
    `Your watched X accounts are paused until ${date}. Sites and feeds keep running.`,
  trialPoolPaused: "Your free week's watched X posts are used up. Sites and feeds keep running.",
  renewal: "your next renewal",
  unreadable: (n: number) => `Could not read its last ${n} items.`,
  sourcePaused: "Paused today: unusual spending.",
  unlimited: "Sites and feeds unlimited.",
  plans: [
    {
      tier: "hobby",
      label: "Hobby, $5 a month",
      detail: "100 watched X posts a month, one DM a day",
    },
    {
      tier: "creator",
      label: "Creator, $30 a month",
      detail: "3,000 watched X posts a month, one DM a day",
    },
    {
      tier: "wire",
      label: "Wire, $99 a month",
      detail: "4,000 watched X posts a month, a digest every 15 minutes",
    },
  ],
  bot: "Get alerts on X",
  botHelp: (handle: string) =>
    `Opens a message to @oparax_ai with "Start alerts" typed. Send it from @${handle} to connect alerts; that message is how Oparax confirms the account is yours. The bot will not reply.`,
  botActive: "Alerts on. Send STOP to the bot to stop.",
  botPaused: "Alerts paused. Send RESUME to the bot to continue.",
  botStopped: 'Alerts stopped. Send "Start alerts" from your X account to turn them on again.',
  activationFailed: "X connection could not start. Try again.",
  activationUnavailable: "Open the alert connection during your free week or an active plan.",
  checkConnection: "Check connection",
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
