// One typed module for all fixed Pro Exploration copy, examples and counts.
// Story events are historical public reports from October 2024; DMs and summaries are authored previews,
// never a claim that Oparax processed or sent this event. Direct summaries mirror the single-source
// writer's shape (headline plus facts) and are not live Qwen output.
import { fiveEvidence as nasa } from "../content/evidence";
import { stories as referenceStories, type Source, type Story } from "../content/stories";
import { directItems as referenceDirect, type DirectItem } from "../content/direct-items";

export type { Source, Story, DirectItem };

export const stories: Story[] = referenceStories;
export const directItems: DirectItem[] = referenceDirect;
export const evidence = nasa;

export const brand = {
  name: "Oparax",
  handle: "@oparax_ai",
};

export const nav = {
  product: "Product",
  roadmap: "Roadmap",
  pricing: "Pricing",
  feed: "Feed",
  logIn: "Log In",
  signUp: "Sign Up",
  theme: "Switch light or dark mode",
  // Product pages exist; this preview shows the labels only.
  footer: ["Privacy", "Terms", "Contact"],
};

export const hero = {
  headline: "Your sources. One story. Delivered.",
  subhead:
    "Tell Oparax what you follow. It reads the posts and articles, joins related reports into one story, and sends it to your X DMs.",
  primary: "Sign Up",
  secondary: "See a sample feed",
  sample: "Sample: public reports from October 14, 2024.",
};

export const stages = {
  sources: { title: "Sources", note: "Posts and articles from the accounts and sites you follow." },
  engine: { title: "Oparax", note: "Matches your interests and joins reports about the same event." },
  delivery: { title: "Delivery", note: "One message on X with the story and a link to its sources." },
};

export const interest = {
  label: "Your interest",
  value: "Space missions and discovery",
  match: "Matches your interest",
};

export const dm = {
  ...nasa.dm,
  // Line shape follows lib/alerts/pack.ts: intro, headline, first fact, story link.
  headline: nasa.story.title,
  fact: nasa.story.firstFact,
};

export const feed = {
  title: "Your Feed",
  agent: "Space missions agent",
  modeLabel: "Feed view",
  direct: "Direct",
  clustered: "Clustered",
  directHint: "Each item is one source, summarized by Oparax.",
  clusteredHint: "Each story joins every source reporting the same event.",
  sourcesLabel: "Sources",
  openOriginal: "Open original",
  openStory: "Read story",
  addedFromUpdate: nasa.story.updatedLabel,
  sample: "Sample feed from public October 2024 reports. Accounts and monitoring are not connected in this preview.",
};

// Verified tiers: lib/billing/prices.ts and lib/landing/content.ts (docs/references/cogs.md section 6).
export const pricing = {
  title: "Pick your pace",
  intro:
    "Every plan includes your story feed and unlimited sites and feeds. Choose how much of X to watch and how often to hear from us.",
  period: "a month",
  postsLabel: "watched X posts a month",
  note: "Your free week starts when your agent is ready and includes 300 watched X posts.",
  included: [
    "Story feed with original sources",
    "Unlimited sites and RSS feeds",
    "Optional GitHub and Product Hunt digests",
  ],
  tiers: [
    { name: "Hobby", price: "$5", posts: "100", postsValue: 100, cadence: "Daily alerts on X" },
    { name: "Creator", price: "$30", posts: "3,000", postsValue: 3000, cadence: "Daily alerts on X" },
    {
      name: "Wire",
      price: "$99",
      posts: "4,000",
      postsValue: 4000,
      cadence: "Alerts every 15 minutes when there is news",
    },
  ],
};

export type LogoId =
  | "x"
  | "instagram"
  | "facebook"
  | "threads"
  | "messenger"
  | "reddit"
  | "linkedin"
  | "snapchat"
  | "tiktok"
  | "youtube"
  | "yahoofinance"
  | "googlenews"
  | "whatsapp"
  | "slack";

export type Channel = { id: LogoId | "web" | "sms" | "email"; label: string };

export const roadmap = {
  title: "Where Oparax goes next",
  intro: "More places to watch, more ways to reach you. Planned, with no release dates yet.",
  today: {
    label: "Works today",
    inputs: [
      { id: "x", label: "X accounts" },
      { id: "web", label: "Sites and RSS" },
    ] satisfies Channel[],
    outputs: [{ id: "x", label: "X DM" }] satisfies Channel[],
  },
  inputsTitle: "Planned sources",
  outputsTitle: "Planned destinations",
  inputs: [
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
    { id: "threads", label: "Threads" },
    { id: "messenger", label: "Messenger" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "reddit", label: "Reddit" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "snapchat", label: "Snapchat" },
    { id: "tiktok", label: "TikTok" },
    { id: "youtube", label: "YouTube" },
    { id: "yahoofinance", label: "Yahoo Finance" },
    { id: "googlenews", label: "Google News" },
  ] satisfies Channel[],
  outputs: [
    { id: "whatsapp", label: "WhatsApp" },
    { id: "slack", label: "Slack" },
    { id: "sms", label: "SMS" },
    { id: "email", label: "Email" },
  ] satisfies Channel[],
  planned: "Planned",
};

export const login = {
  title: "Log in to Oparax",
  body: "This preview opens a sample feed.",
};

export const signup = {
  title: "Create your Oparax account",
  body: "Sign up first, then tell Oparax what to follow. This preview opens a sample feed.",
  x: "Continue with X",
  google: "Continue with Google",
  email: "Continue with email",
};

// Official artwork, recorded in public/roadmap-brands/PROVENANCE.md. Never recolor or redraw.
export const logoSrc: Record<LogoId, string> = {
  x: "/roadmap-brands/x.png",
  instagram: "/roadmap-brands/instagram.webp",
  facebook: "/roadmap-brands/facebook.png",
  threads: "/roadmap-brands/threads.webp",
  messenger: "/roadmap-brands/messenger.png",
  reddit: "/roadmap-brands/reddit.png",
  linkedin: "/roadmap-brands/linkedin.png",
  snapchat: "/roadmap-brands/snapchat.png",
  tiktok: "/roadmap-brands/tiktok-app.png",
  youtube: "/roadmap-brands/youtube.png",
  yahoofinance: "/roadmap-brands/yahoofinance.png",
  googlenews: "/roadmap-brands/googlenews.png",
  whatsapp: "/roadmap-brands/whatsapp-app.png",
  slack: "/roadmap-brands/slack.png",
};

export const directions = [
  { id: 1, name: "Transform" },
  { id: 2, name: "Workspace" },
  { id: 3, name: "Bento Wire" },
  { id: 4, name: "Scroll Story" },
] as const;
