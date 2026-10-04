const brand = "Oparax";

export const landingCtas = {
  sign_up: { label: "Sign Up", destination: "/signup" },
  log_in: { label: "Log In", destination: "/login" },
  setup: { label: "Finish setting up your agent", destination: "/onboarding" },
  open_agent: { label: "Open your agent" },
} as const;

export type LandingCtaName = keyof typeof landingCtas;
export type LandingCtaPlacement = "header" | "hero" | "pricing";

export const landingContent = {
  brand,
  navigation: {
    skipToContent: "Skip to content",
    sectionsLabel: "Sections",
    sections: [
      { label: "Product", href: "/#product" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Roadmap", href: "/#roadmap" },
    ],
    logOut: "Log Out",
    pending: "Signing out",
    error: "Could not sign out. Try again.",
  },
  hero: {
    headline: "Oparax turns the news you follow into sourced stories.",
    description:
      "Pick what you follow. Oparax watches the sites, feeds and X accounts around it, groups related reports into one story with its sources attached, and can alert you on X.",
    trial: "Free for a week once your agent is ready.",
  },
  scene: {
    label: "Three NASA reports become one sourced story and a message on X",
    sources: "Your sources",
    engine: "Oparax",
    delivered: "Your story, delivered",
    caption:
      "Historical example from October 14, 2024. The story and the message are a preview, not a live result.",
    fromReports: "From reports to a story",
    interestLabel: "What you care about",
    interest: "Space missions, ocean worlds and what we learn along the way.",
    decisions: [
      { title: "Matches your interest", detail: "Europa is an ocean world." },
      { title: "One event, one story", detail: "Three reports describe the same launch." },
      {
        title: "Sources stay attached",
        detail: "The release, the post and the update stay beside the facts.",
      },
    ],
    result: "Three reports, one clear story",
    dm: {
      conversationLabel: "X conversation, preview only",
      back: "Back to messages",
      info: "Conversation information",
      composer: "Start a new message",
      composerLabel: "Message composer, preview only",
      send: "Send message",
    },
  },
  platforms: {
    title: "What Oparax watches, and where it can reach you",
    worksToday: "Works today",
    planned: "Planned",
    today: [
      { icon: "x", name: "X accounts", detail: "Posts from the accounts you pick" },
      { icon: "rss", name: "Sites and RSS feeds", detail: "Articles from the sites you follow" },
      {
        icon: "github",
        name: "GitHub discovery digest",
        detail: "Optional, daily, for tool beats",
      },
      {
        icon: "producthunt",
        name: "Product Hunt digest",
        detail: "Optional, daily, for tool beats",
      },
      { icon: "x", name: "Alerts on X", detail: "A direct message at your plan's cadence" },
    ],
    later: [
      { icon: "reddit", name: "Reddit", detail: "Community discussions" },
      { icon: "google", name: "Search", detail: "Search results" },
      { icon: "mail", name: "Email", detail: "A briefing in your inbox" },
      { icon: "slack", name: "Slack", detail: "Updates in your workspace" },
      { icon: "message", name: "Text", detail: "Stories on your phone" },
    ],
    note: "Planned additions are not available today; release dates are not set.",
  },
  pricing: {
    title: "Pick your pace",
    intro:
      "Every plan includes your story feed and unlimited sites and feeds. Choose how much of X to watch and how often to hear from us.",
    comparison: "Compare Oparax plans",
    period: "a month",
    rows: {
      posts: "Watched X posts a month",
      alerts: "Alerts on X",
      sites: "Sites and RSS feeds",
      stories: "Stories with original sources",
      github: "GitHub discovery digest",
      productHunt: "Product Hunt digest",
      unlimited: "Unlimited",
      included: "Included",
      optionalDaily: "Optional, daily",
    },
    note: "Your free week starts when your agent is ready and includes 300 watched X posts. Choose a plan on your agent's page when the week ends.",
    // Selling prices, watched-post pools and alert cadences: docs/references/cogs.md section 6.
    tiers: [
      {
        name: "Hobby",
        price: "$5",
        pool: "100 watched X posts a month",
        cadence: "Daily alerts on X.",
        postsPerMonth: "100",
        alertCadence: "Daily",
      },
      {
        name: "Creator",
        price: "$30",
        pool: "3,000 watched X posts a month",
        cadence: "Daily alerts on X.",
        postsPerMonth: "3,000",
        alertCadence: "Daily",
      },
      {
        name: "Wire",
        price: "$99",
        pool: "4,000 watched X posts a month",
        cadence: "Alerts every 15 minutes when there is news.",
        postsPerMonth: "4,000",
        alertCadence: "Every 15 minutes when there is news",
      },
    ],
  },
  motion: {
    pause: "Pause background motion",
    resume: "Resume background motion",
    reduced: "Background motion follows your reduced motion setting",
  },
  footer: {
    label: "Legal and contact",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  contact: {
    trigger: "Contact",
    title: "Contact Us",
    description:
      "Email us with what you think of Oparax, what you want it to watch, or what went wrong. We reply by email.",
    address: "support@oparax.ai",
    subject: "Oparax",
    mailApp: "Open your mail app",
    gmail: "Open in Gmail",
    copy: "Copy address",
    copied: "Copied",
  },
  sharing: {
    title: "Oparax",
    headline: "Your beat, watched for you",
    description:
      "Oparax watches the internet, GitHub and Product Hunt for your beat, and alerts you on X.",
    alt: "Oparax. Your beat, watched for you.",
    domain: "oparax.ai",
    origin: "https://oparax.ai",
  },
} as const;
