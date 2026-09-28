export const monitorContent = {
  metadataTitle: (name: string) => `${name}'s Oparax agent`,
  skipToNews: "Skip to news",
  title: (handle: string) => `@${handle}'s agent`,
  missing: (handle: string) => `No agent for @${handle} yet.`,
  missingStory: "This agent or story could not be found.",
  home: "Build your agent",
  settings: "Settings",
  brief: "Your Brief",
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
  buildReason: "The build could not finish.",
  retry: "Try again",
  retryFailed: "The retry could not start. Try again.",
  trial: (n: number) => `${n} days left in your free week. Plans from $5 a month.`,
  exhausted:
    "Your free week's allowance ran out early. Updates are paused; your cards stay readable. Plans open when the week ends.",
  frozenTitle: "Your free week is over.",
  frozen:
    "Your agent has stopped watching. Old cards stay readable. Pick a plan to keep it running.",
  lapsed: "Payment failed. Update your card to keep your agent running.",
  updateCard: "Update card",
  paused: "This agent paused because nobody visited it. It is starting again now.",
  pool: (used: number, limit: number) => `${used} of ${limit} watched posts used this month.`,
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
    `Opens X with a one-time code addressed to @oparax_ai. Send it from @${handle} to connect.`,
  botActive: "Alerts on. Reply STOP to the bot to stop.",
  botPaused: "Alerts paused. Reply RESUME to the bot.",
  botStopped: "Alerts stopped. Connect again to get news.",
  activationFailed: "X connection could not start. Try again.",
  activationUnavailable: "Alerts can connect during your free week or an active plan.",
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
