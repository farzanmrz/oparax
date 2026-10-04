// Recorded onboarding run in the product's real shapes (product-data.md section 10, ILLUSTRATIVE values).
// Source names, kinds, focus lines and targets are real rows of docs/source-table-seed.json; scores, whys,
// posts and bio are fixture values. Nothing here calls a model, and reloading replays the same run.

export type Kind = "rss" | "website" | "x_account";

export type Candidate = {
  id: string;
  kind: Kind;
  name: string;
  focus: string;
  target: string;
  score: number;
  /** Quoted in the person's own posts, which is how a non-table account becomes a candidate. */
  quoted?: boolean;
};

export type Post = {
  id: string;
  date: string;
  kind: "original" | "quote" | "thread";
  text: string;
  quoted?: { author: string; text: string };
  parts?: number;
};

export const beat = "AI developer tools and model releases, especially Next.js, Vercel and open models";

export const profile = {
  id: "1000000000000000001",
  handle: "@farzanmrz",
  name: "Farzan Mirza",
  bio: "Building developer tools. Next.js, Vercel and open models. Notes from the build.",
  // Fixture URL on pbs.twimg.com would 404, so the render shows the name initial (the product's own fallback).
  image: null as string | null,
  pinned: {
    id: "1900000000000000010",
    date: "2026-07-14",
    kind: "original" as const,
    text: "I ship small tools for people who build with Next.js and open models. This is what I use and why.",
  },
};

export const POSTS_MAX = 10;
export const DAYS = 90;

/** build_state.posts: 10 units after thread folding; the fixture records 3 in full and 7 by summary only. */
export const postsRead = 10;
export const posts: Post[] = [
  {
    id: "1910000000000000003",
    date: "2026-09-27",
    kind: "original",
    text: "Moved a Next.js app to the new App Router caching defaults today. Build time dropped by a third on Vercel.",
  },
  {
    id: "1910000000000000002",
    date: "2026-09-24",
    kind: "quote",
    text: "This is the clearest explanation of the new rendering model I have seen.",
    quoted: {
      author: "@rauchg",
      text: "Next.js ships a faster default build and clearer caching. Details in the post.",
    },
  },
  {
    id: "1910000000000000001",
    date: "2026-09-20",
    kind: "thread",
    text: "Running open models locally: what worked.\n\nQwen and Mistral weights ran fine on a single GPU.",
    parts: 2,
  },
];

export const KEEP_LINE = 0.35;

const row = (id: string, kind: Kind, name: string, focus: string, target: string, score: number, quoted?: boolean) =>
  ({ id, kind, name, focus, target, score, quoted }) satisfies Candidate;

/** build_state.scores for the 35 kept candidates (18 sites and feeds, 14 table accounts, 3 quoted accounts). */
export const kept: Candidate[] = [
  row("vercel-product-and-platform-news", "rss", "Vercel", "Product and platform news", "https://vercel.com/atom", 0.97),
  row("x-vercel", "x_account", "Vercel", "Vercel platform and AI Gateway", "https://x.com/vercel", 0.96),
  row("q-nextjs", "x_account", "Next.js", "", "https://x.com/nextjs", 0.93, true),
  row("q-rauchg", "x_account", "Guillermo Rauch", "", "https://x.com/rauchg", 0.91, true),
  row("x-huggingface", "x_account", "Hugging Face", "open models and community", "https://x.com/huggingface", 0.89),
  row("hugging-face-community-ml-research-blog", "rss", "Hugging Face", "Community ML research blog", "https://huggingface.co/blog/feed.xml", 0.88),
  row("q-leerob", "x_account", "Lee Robinson", "", "https://x.com/leerob", 0.88, true),
  row("x-simonw", "x_account", "Simon Willison", "hands-on model and tool evaluation", "https://x.com/simonw", 0.87),
  row("simon-willison-personal-tech-blog", "rss", "Simon Willison", "Personal tech blog", "https://simonwillison.net/atom/everything/", 0.86),
  row("nathan-lambert-open-model-analysis", "rss", "Nathan Lambert", "Open model analysis", "https://www.interconnects.ai/feed", 0.83),
  row("x-theo", "x_account", "Theo - t3.gg", "AI coding tool opinions", "https://x.com/theo", 0.82),
  row("latent-space-ai-engineering-newsletter-and-podcast", "rss", "Latent Space", "AI engineering newsletter and podcast", "https://www.latent.space/feed", 0.81),
  row("builder-io-company-blog", "rss", "Builder.io", "Company blog", "https://www.builder.io/blog/feed/atom", 0.74),
  row("openrouter-company-blog", "rss", "OpenRouter", "Company blog", "https://openrouter.ai/blog/feed.xml", 0.72),
  row("x-openrouter", "x_account", "OpenRouter", "model routing and new model availability", "https://x.com/OpenRouter", 0.71),
  row("x-alibaba_qwen", "x_account", "Qwen", "Alibaba's Qwen open models", "https://x.com/Alibaba_Qwen", 0.69),
  row("cursor-product-and-customer-stories", "website", "Cursor", "Product and customer stories", "https://cursor.com/blog", 0.66),
  row("x-deepseek_ai", "x_account", "DeepSeek", "DeepSeek model releases and API pricing", "https://x.com/deepseek_ai", 0.64),
  row("the-decoder-ai-industry-news", "rss", "The Decoder", "AI industry news", "https://the-decoder.com/feed/", 0.62),
  row("openai-official-news", "rss", "OpenAI", "Official news", "https://openai.com/news/rss.xml", 0.58),
  row("x-karpathy", "x_account", "Andrej Karpathy", "LLM insights from a researcher", "https://x.com/karpathy", 0.58),
  row("mistral-ai-company-news", "rss", "Mistral AI", "Company news", "https://mistral.ai/rss.xml", 0.57),
  row("x-mistralai", "x_account", "Mistral AI", "European frontier lab, funding, partnerships", "https://x.com/MistralAI", 0.55),
  row("x-github", "x_account", "GitHub", "GitHub and Copilot product news", "https://x.com/github", 0.52),
  row("techcrunch-ai-industry-news", "rss", "TechCrunch", "AI industry news", "https://techcrunch.com/category/artificial-intelligence/feed/", 0.49),
  row("langchain-product-and-engineering-blog", "website", "LangChain", "Product and engineering blog", "https://www.langchain.com/blog", 0.47),
  row("x-steipete", "x_account", "Peter Steinberger", "OpenClaw and hands-on agent building", "https://x.com/steipete", 0.47),
  row("x-cursor_ai", "x_account", "Cursor", "coding agent product updates", "https://x.com/cursor_ai", 0.45),
  row("tldr-ai-newsletter", "rss", "TLDR", "AI newsletter", "https://tldr.tech/api/rss/ai", 0.44),
  row("anthropic-company-announcements", "website", "Anthropic", "Company announcements", "https://www.anthropic.com/news", 0.43),
  row("nvidia-developer-technical-blog", "rss", "NVIDIA", "Developer technical blog", "https://developer.nvidia.com/blog/feed", 0.41),
  row("x-svpino", "x_account", "Santiago", "AI engineering lessons and tool reviews", "https://x.com/svpino", 0.4),
  row("lovable-product-guides", "website", "Lovable", "Product guides", "https://lovable.dev/en/guides", 0.38),
  row("x-lovable", "x_account", "Lovable", "AI app builder product updates", "https://x.com/Lovable", 0.37),
  row("bolt-new-product-and-customer-stories", "website", "Bolt.new", "Product and customer stories", "https://bolt.new/blog", 0.36),
];

/** A recorded sample of rows under the keep line (the fixture records 12 of the 118 dropped). */
export const droppedSample: Candidate[] = [
  row("x-paulg", "x_account", "Paul Graham", "startup and AI essays", "https://x.com/paulg", 0.31),
  row("x-ycombinator", "x_account", "Y Combinator", "YC-backed startup spotlights", "https://x.com/ycombinator", 0.29),
  row("think-facility-ai-news-tracker", "website", "Think Facility", "AI news tracker", "https://www.thinkfacility.com/tracker/", 0.22),
  row("x-elevenlabs", "x_account", "ElevenLabs", "AI voice, speech and audio tools", "https://x.com/ElevenLabs", 0.18),
  row("captain-s-meta-ai-side-hustle-guides", "rss", "Captain's Meta", "AI side hustle guides", "https://captainsmeta.com/rss.xml", 0.17),
  row("x-midjourney", "x_account", "Midjourney", "image model release notes", "https://x.com/midjourney", 0.14),
  row("lesswrong-rationalist-community-blog", "rss", "LessWrong", "Rationalist community blog", "https://www.lesswrong.com/feed.xml", 0.12),
  row("x-heygen", "x_account", "HeyGen", "AI avatar video tools", "https://x.com/HeyGen", 0.09),
  row("tim-urban-personal-essays-blog", "rss", "Tim Urban", "Personal essays blog", "https://waitbutwhy.com/feed", 0.04),
  row("fc-barcelona-first-team-news", "website", "FC Barcelona", "First team news", "https://www.fcbarcelona.com/en/football/first-team/news", 0.01),
  row("mundo-deportivo-transfer-market", "rss", "Mundo Deportivo", "Transfer market", "https://www.mundodeportivo.com/feed/rss/futbol/fichajes", 0.01),
  row("x-fabrizioromano", "x_account", "Fabrizio Romano", "European transfer wire", "https://x.com/FabrizioRomano", 0.01),
];

export const candidateCount = 153; // 150 table rows plus 3 quoted accounts
export const tableRows = 150;
export const batches = [60, 60, 33];

export const SITES_MAX = 10;
export const ACCOUNTS_MIN = 5;

const byId = new Map(kept.map((c) => [c.id, c]));
const pick = (id: string, why: string) => ({ ...byId.get(id)!, why });

/** build_state.answer after the code check, in the order the answer gave them. */
export const chosenSites = [
  pick("vercel-product-and-platform-news", "Vercel's own feed carries the Next.js and platform news your posts follow most closely."),
  pick("hugging-face-community-ml-research-blog", "It covers open models and releases, the open-model half of your beat."),
  pick("simon-willison-personal-tech-blog", "Hands-on notes on new models and developer tools, in the style of the posts you write."),
  pick("nathan-lambert-open-model-analysis", "Analysis of open model releases that you would otherwise read as scattered posts."),
  pick("latent-space-ai-engineering-newsletter-and-podcast", "AI engineering coverage for people who build with these tools, matching your developer-tools focus."),
  pick("builder-io-company-blog", "Frontend and framework writing that overlaps with the Next.js work in your posts."),
  pick("openrouter-company-blog", "New model availability and routing, useful for tracking open model releases."),
  pick("cursor-product-and-customer-stories", "Coding-tool product news that fits the developer tools part of your beat."),
  pick("mistral-ai-company-news", "Open-weight releases from a lab you mention when you talk about open models."),
  pick("the-decoder-ai-industry-news", "A general AI news feed to catch model releases the specialist sources miss."),
];

export const chosenAccounts = [
  pick("q-nextjs", "The official Next.js account, and you quote it in your posts."),
  pick("x-vercel", "Platform and AI Gateway updates for the Vercel half of your beat."),
  pick("q-rauchg", "Vercel's CEO, quoted in your posts, announces Next.js direction first."),
  pick("q-leerob", "Writes about Next.js practice, which you quote and build on."),
  pick("x-huggingface", "Open model releases and community work."),
  pick("x-simonw", "Hands-on evaluation of new models and tools."),
  pick("x-alibaba_qwen", "Qwen open models, which you tried locally."),
].map((a) => ({ ...a, handle: a.target.replace("https://x.com/", "@").toLowerCase() }));

export const keptSites = kept.filter((c) => c.kind !== "x_account").length; // 18
export const keptAccounts = kept.filter((c) => c.kind === "x_account").length; // 17

export const brief = {
  summary:
    "Farzan builds developer tools and writes about Next.js, Vercel and open models. Their recent posts cover moving Next.js apps to new caching defaults, running Qwen and Mistral weights locally, and the Vercel AI SDK. They quote Vercel and Next.js leaders and read Hugging Face for open model news. They write in English.",
  interests: ["Next.js", "Vercel and its AI Gateway", "open models", "developer tools", "AI SDK"],
  languages: ["English"],
};

/** The stored build_log, exactly as the product writes it today (shown in NOTES, not on screen). */
export const buildLog = [
  { step: 1, message: "Profile identity confirmed", at: "2026-10-01T14:02:12.418Z" },
  { step: 1, message: "Looking up @farzanmrz on X", at: "2026-10-01T14:02:14.201Z" },
  { step: 2, message: "Reading @farzanmrz's newest posts", at: "2026-10-01T14:02:14.688Z" },
  { step: 2, message: "Reading @farzanmrz's newest posts", at: "2026-10-01T14:02:14.903Z" },
  { step: 2, message: "Reading @farzanmrz's newest posts", at: "2026-10-01T14:02:16.355Z" },
  { step: 3, message: "Read 10 posts; Jev is scoring 153 candidate sources", at: "2026-10-01T14:02:17.512Z" },
  { step: 3, message: "Jev passed 35 candidates; choosing from them", at: "2026-10-01T14:02:31.907Z" },
  { step: 3, message: "Choosing recommendations and writing the brief", at: "2026-10-01T14:02:32.011Z" },
];

// Jev returns only a probability. The product shows three bands, never the number (the engine's own lines).
export const STRONG_LINE = 0.75;
export type Band = "strong" | "possible" | "set-aside";
export const bandOf = (score: number): Band => (score >= STRONG_LINE ? "strong" : score >= KEEP_LINE ? "possible" : "set-aside");
export const bandLabel: Record<Band, string> = { strong: "Strong match", possible: "Possible match", "set-aside": "Set aside" };

export const strongCandidates = kept.filter((c) => bandOf(c.score) === "strong");
export const possibleCandidates = kept.filter((c) => bandOf(c.score) === "possible");
export const setAsideCount = candidateCount - kept.length; // 118, of which the fixture records 12 by name
export const chosenIdSet = new Set([...chosenSites, ...chosenAccounts].map((c) => c.id));
export const quotedCandidates = kept.filter((c) => c.quoted);
export const storedPosts = posts.length; // 3 stored in full; the other 7 have no stored text
