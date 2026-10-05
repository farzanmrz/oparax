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

/** The shared source table every run starts from: the 150 rows of docs/source-table-seed.json (kind, name and
 * target only), in the table's own order. The table holds X accounts, RSS feeds and websites; no GitHub rows. */
export type TableRow = { id: string; kind: Kind; name: string; target: string };
export const sourceTable: TableRow[] = [
  { id: "google-ai-news-and-product-updates", kind: "rss", name: "Google", target: "https://blog.google/innovation-and-ai/technology/ai/rss/" },
  { id: "sam-altman-personal-blog", kind: "rss", name: "Sam Altman", target: "https://blog.samaltman.com/posts.atom" },
  { id: "bolt-new-product-and-customer-stories", kind: "website", name: "Bolt.new", target: "https://bolt.new/blog" },
  { id: "hugging-face-community-ml-research-blog", kind: "rss", name: "Hugging Face", target: "https://huggingface.co/blog/feed.xml" },
  { id: "openai-official-news", kind: "rss", name: "OpenAI", target: "https://openai.com/news/rss.xml" },
  { id: "simon-willison-personal-tech-blog", kind: "rss", name: "Simon Willison", target: "https://simonwillison.net/atom/everything/" },
  { id: "techcrunch-ai-industry-news", kind: "rss", name: "TechCrunch", target: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { id: "techcrunch-startup-and-technology-news", kind: "rss", name: "TechCrunch", target: "https://techcrunch.com/feed/" },
  { id: "tim-urban-personal-essays-blog", kind: "rss", name: "Tim Urban", target: "https://waitbutwhy.com/feed" },
  { id: "google-google-workspace-product-updates", kind: "website", name: "Google", target: "https://workspaceupdates.googleblog.com/" },
  { id: "anthropic-company-announcements", kind: "website", name: "Anthropic", target: "https://www.anthropic.com/news" },
  { id: "melty-labs-changelog", kind: "rss", name: "Melty Labs", target: "https://www.conductor.build/changelog/rss.xml" },
  { id: "fc-barcelona-first-team-news", kind: "website", name: "FC Barcelona", target: "https://www.fcbarcelona.com/en/football/first-team/news" },
  { id: "latent-space-ai-engineering-newsletter-and-podcast", kind: "rss", name: "Latent Space", target: "https://www.latent.space/feed" },
  { id: "lesswrong-rationalist-community-blog", kind: "rss", name: "LessWrong", target: "https://www.lesswrong.com/feed.xml" },
  { id: "mundo-deportivo-fc-barcelona", kind: "rss", name: "Mundo Deportivo", target: "https://www.mundodeportivo.com/feed/rss/futbol/fc-barcelona" },
  { id: "mundo-deportivo-transfer-market", kind: "rss", name: "Mundo Deportivo", target: "https://www.mundodeportivo.com/feed/rss/futbol/fichajes" },
  { id: "sport-fc-barcelona-club-news", kind: "website", name: "Sport", target: "https://www.sport.es/es/barca/" },
  { id: "sport-fc-barcelona-transfer-market", kind: "website", name: "Sport", target: "https://www.sport.es/es/temas/fichajes-fc-barcelona-19851" },
  { id: "the-verge-ai-news", kind: "rss", name: "The Verge", target: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { id: "the-verge-general-tech-news", kind: "rss", name: "The Verge", target: "https://www.theverge.com/rss/index.xml" },
  { id: "wired-ai-news-and-policy", kind: "rss", name: "Wired", target: "https://www.wired.com/feed/tag/ai/latest/rss" },
  { id: "marca-fc-barcelona-news", kind: "rss", name: "Marca", target: "https://www.marca.com/rss/googlenews/futbol/barcelona.xml" },
  { id: "barca-universal-fc-barcelona-news", kind: "rss", name: "Barca Universal", target: "https://barcauniversal.com/barca-news/feed/" },
  { id: "barca-blaugranes-fc-barcelona-news", kind: "rss", name: "Barca Blaugranes", target: "https://www.barcablaugranes.com/rss/index.xml" },
  { id: "fc-barcelona-noticias-fc-barcelona-news", kind: "rss", name: "FC Barcelona Noticias", target: "https://www.fcbarcelonanoticias.com/feed/" },
  { id: "fc-barcelona-confirmed-transfers", kind: "website", name: "FC Barcelona", target: "https://www.fcbarcelona.com/en/transfer-market" },
  { id: "supermemory-company-engineering-blog", kind: "rss", name: "Supermemory", target: "https://supermemory.ai/blog/rss.xml" },
  { id: "openrouter-company-blog", kind: "rss", name: "OpenRouter", target: "https://openrouter.ai/blog/feed.xml" },
  { id: "sarthak-rastogi-ai-agent-engineering", kind: "rss", name: "Sarthak Rastogi", target: "https://sarthakai.substack.com/feed" },
  { id: "ai-engineering-insider-ai-interview-prep-guides", kind: "rss", name: "AI Engineering Insider", target: "https://aiengineeringinsider.substack.com/feed" },
  { id: "hugo-bowne-anderson-ai-engineering-podcast", kind: "rss", name: "Hugo Bowne-Anderson", target: "https://api.substack.com/feed/podcast/2632531.rss" },
  { id: "nathan-lambert-ai-research-podcast", kind: "rss", name: "Nathan Lambert", target: "https://api.substack.com/feed/podcast/48206.rss" },
  { id: "builder-io-company-blog", kind: "rss", name: "Builder.io", target: "https://www.builder.io/blog/feed/atom" },
  { id: "llm-gateway-company-blog", kind: "website", name: "LLM Gateway", target: "https://llmgateway.io/blog" },
  { id: "mem0-ai-agent-memory", kind: "website", name: "Mem0", target: "https://mem0.ai/blog" },
  { id: "microsoft-microsoft-365-and-copilot-news", kind: "rss", name: "Microsoft", target: "https://www.microsoft.com/en-us/microsoft-365/blog/feed/" },
  { id: "microsoft-ai-ai-model-announcements", kind: "website", name: "Microsoft AI", target: "https://microsoft.ai/blog/" },
  { id: "productdirs-daily-ai-tool-launches", kind: "website", name: "ProductDirs", target: "https://productdirs.com/blog" },
  { id: "microsoft-cowork-feature-changelog", kind: "website", name: "Microsoft", target: "https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/whats-new" },
  { id: "ars-technica-ai-news", kind: "rss", name: "Ars Technica", target: "https://arstechnica.com/ai/feed" },
  { id: "jack-clark-ai-newsletter", kind: "rss", name: "Jack Clark", target: "https://importai.substack.com/feed" },
  { id: "nathan-lambert-open-model-analysis", kind: "rss", name: "Nathan Lambert", target: "https://www.interconnects.ai/feed" },
  { id: "sebastian-raschka-llm-research-explainer", kind: "rss", name: "Sebastian Raschka", target: "https://magazine.sebastianraschka.com/feed" },
  { id: "alex-volkov-weekly-ai-news-podcast", kind: "rss", name: "Alex Volkov", target: "https://sub.thursdai.news/feed" },
  { id: "nvidia-corporate-news", kind: "rss", name: "NVIDIA", target: "https://blogs.nvidia.com/feed/" },
  { id: "mistral-ai-company-news", kind: "rss", name: "Mistral AI", target: "https://mistral.ai/rss.xml" },
  { id: "chip-huyen-personal-blog", kind: "rss", name: "Chip Huyen", target: "https://huyenchip.com/feed.xml" },
  { id: "cursor-product-and-customer-stories", kind: "website", name: "Cursor", target: "https://cursor.com/blog" },
  { id: "lovable-product-guides", kind: "website", name: "Lovable", target: "https://lovable.dev/en/guides" },
  { id: "vercel-product-and-platform-news", kind: "rss", name: "Vercel", target: "https://vercel.com/atom" },
  { id: "captain-s-meta-ai-side-hustle-guides", kind: "rss", name: "Captain's Meta", target: "https://captainsmeta.com/rss.xml" },
  { id: "the-decoder-ai-industry-news", kind: "rss", name: "The Decoder", target: "https://the-decoder.com/feed/" },
  { id: "marktechpost-ai-research-news", kind: "rss", name: "MarkTechPost", target: "https://www.marktechpost.com/category/technology/artificial-intelligence/feed/" },
  { id: "aimodels-fyi-ai-research-digest", kind: "rss", name: "AIModels.fyi", target: "https://aimodels.substack.com/feed" },
  { id: "google-research-blog", kind: "rss", name: "Google", target: "https://research.google/blog/rss/" },
  { id: "cognition-devin-product-updates", kind: "rss", name: "Cognition", target: "https://devin.ai/rss.xml" },
  { id: "nvidia-developer-technical-blog", kind: "rss", name: "NVIDIA", target: "https://developer.nvidia.com/blog/feed" },
  { id: "nvidia-company-newsroom", kind: "rss", name: "NVIDIA", target: "https://nvidianews.nvidia.com/rss.xml" },
  { id: "langchain-product-and-engineering-blog", kind: "website", name: "LangChain", target: "https://www.langchain.com/blog" },
  { id: "ethan-mollick-personal-ai-newsletter", kind: "rss", name: "Ethan Mollick", target: "https://www.oneusefulthing.org/feed" },
  { id: "jack-clark-ai-research-newsletter", kind: "rss", name: "Jack Clark", target: "https://jack-clark.net/feed/" },
  { id: "ai-news-ai-industry-news", kind: "rss", name: "AI News", target: "https://www.artificialintelligence-news.com/feed/" },
  { id: "the-rundown-ai-ai-newsletter-and-tutorials", kind: "website", name: "The Rundown AI", target: "https://therundown.ai/" },
  { id: "tldr-ai-newsletter", kind: "rss", name: "TLDR", target: "https://tldr.tech/api/rss/ai" },
  { id: "cohere-company-blog", kind: "website", name: "Cohere", target: "https://cohere.com/blog" },
  { id: "think-facility-ai-news-tracker", kind: "website", name: "Think Facility", target: "https://www.thinkfacility.com/tracker/" },
  { id: "as-fc-barcelona-news", kind: "rss", name: "AS", target: "https://feeds.as.com/mrss-s/list/as/site/en.as.com/tag/fc_barcelona_a" },
  { id: "barca-blaugranes-fc-barcelona-news-digest", kind: "rss", name: "Barca Blaugranes", target: "https://www.barcablaugranes.com/rss/barcelona-news/index.xml" },
  { id: "barca-blaugranes-fc-barcelona-transfer-rumours", kind: "rss", name: "Barca Blaugranes", target: "https://www.barcablaugranes.com/rss/fc-barcelona-transfer-rumors-news/index.xml" },
  { id: "football-espan-a-fc-barcelona-news", kind: "rss", name: "Football España", target: "https://www.football-espana.net/category/la-liga/barcelona/feed" },
  { id: "bbc-sport-fc-barcelona-news", kind: "rss", name: "BBC Sport", target: "https://feeds.bbci.co.uk/sport/football/teams/barcelona/rss.xml" },
  { id: "lumalabs-ai-video-prompts", kind: "website", name: "Luma", target: "https://lumalabs.ai/news" },
  { id: "newsletter-practical-ai-newsletter", kind: "website", name: "Futurepedia", target: "https://newsletter.futurepedia.io/" },
  { id: "tinyfish-product-and-gtm-blog", kind: "website", name: "TinyFish", target: "https://www.tinyfish.ai/blog" },
  { id: "creativeainews-ai-tools-for-creators", kind: "website", name: "Creative AI News", target: "https://www.creativeainews.com/" },
  { id: "x-googledeepmind", kind: "x_account", name: "Google DeepMind", target: "https://x.com/GoogleDeepMind" },
  { id: "x-deepseek_ai", kind: "x_account", name: "DeepSeek", target: "https://x.com/deepseek_ai" },
  { id: "x-alibaba_qwen", kind: "x_account", name: "Qwen", target: "https://x.com/Alibaba_Qwen" },
  { id: "x-lovable", kind: "x_account", name: "Lovable", target: "https://x.com/Lovable" },
  { id: "x-composio", kind: "x_account", name: "Composio", target: "https://x.com/composio" },
  { id: "x-youdotcom", kind: "x_account", name: "You.com", target: "https://x.com/youdotcom" },
  { id: "x-render", kind: "x_account", name: "Render", target: "https://x.com/render" },
  { id: "x-openai", kind: "x_account", name: "OpenAI", target: "https://x.com/OpenAI" },
  { id: "x-anthropicai", kind: "x_account", name: "Anthropic", target: "https://x.com/AnthropicAI" },
  { id: "x-mistralai", kind: "x_account", name: "Mistral AI", target: "https://x.com/MistralAI" },
  { id: "x-aiatmeta", kind: "x_account", name: "AI at Meta", target: "https://x.com/AIatMeta" },
  { id: "x-cursor_ai", kind: "x_account", name: "Cursor", target: "https://x.com/cursor_ai" },
  { id: "x-perplexity_ai", kind: "x_account", name: "Perplexity", target: "https://x.com/perplexity_ai" },
  { id: "x-techcrunch", kind: "x_account", name: "TechCrunch", target: "https://x.com/TechCrunch" },
  { id: "x-huggingface", kind: "x_account", name: "Hugging Face", target: "https://x.com/huggingface" },
  { id: "x-ycombinator", kind: "x_account", name: "Y Combinator", target: "https://x.com/ycombinator" },
  { id: "x-github", kind: "x_account", name: "GitHub", target: "https://x.com/github" },
  { id: "x-vercel", kind: "x_account", name: "Vercel", target: "https://x.com/vercel" },
  { id: "x-cognition", kind: "x_account", name: "Cognition", target: "https://x.com/cognition" },
  { id: "x-openrouter", kind: "x_account", name: "OpenRouter", target: "https://x.com/OpenRouter" },
  { id: "x-theo", kind: "x_account", name: "Theo - t3.gg", target: "https://x.com/theo" },
  { id: "x-bcherny", kind: "x_account", name: "Boris Cherny", target: "https://x.com/bcherny" },
  { id: "x-steipete", kind: "x_account", name: "Peter Steinberger 🦞", target: "https://x.com/steipete" },
  { id: "x-linear", kind: "x_account", name: "Linear", target: "https://x.com/linear" },
  { id: "x-karpathy", kind: "x_account", name: "Andrej Karpathy", target: "https://x.com/karpathy" },
  { id: "x-verge", kind: "x_account", name: "The Verge", target: "https://x.com/verge" },
  { id: "x-paulg", kind: "x_account", name: "Paul Graham", target: "https://x.com/paulg" },
  { id: "x-heygen", kind: "x_account", name: "HeyGen", target: "https://x.com/HeyGen" },
  { id: "x-dreamina_ai", kind: "x_account", name: "Dreamina AI", target: "https://x.com/dreamina_ai" },
  { id: "x-odysseyml", kind: "x_account", name: "Odyssey", target: "https://x.com/odysseyml" },
  { id: "x-relume_ai", kind: "x_account", name: "Relume", target: "https://x.com/relume_ai" },
  { id: "x-qoder_ai_ide", kind: "x_account", name: "Qoder", target: "https://x.com/qoder_ai_ide" },
  { id: "x-cresta", kind: "x_account", name: "Cresta", target: "https://x.com/cresta" },
  { id: "x-svpino", kind: "x_account", name: "Santiago", target: "https://x.com/svpino" },
  { id: "x-digitalocean", kind: "x_account", name: "DigitalOcean", target: "https://x.com/digitalocean" },
  { id: "x-runwayml", kind: "x_account", name: "Runway", target: "https://x.com/runwayml" },
  { id: "x-n8n_io", kind: "x_account", name: "n8n.io", target: "https://x.com/n8n_io" },
  { id: "x-rowancheung", kind: "x_account", name: "Rowan Cheung", target: "https://x.com/rowancheung" },
  { id: "x-producthunt", kind: "x_account", name: "Product Hunt", target: "https://x.com/ProductHunt" },
  { id: "x-elevenlabs", kind: "x_account", name: "ElevenLabs", target: "https://x.com/ElevenLabs" },
  { id: "x-testingcatalog", kind: "x_account", name: "TestingCatalog", target: "https://x.com/testingcatalog" },
  { id: "x-aihighlight", kind: "x_account", name: "AI Highlight", target: "https://x.com/AIHighlight" },
  { id: "x-getsurething", kind: "x_account", name: "SureThing", target: "https://x.com/getsurething" },
  { id: "x-boltzbit", kind: "x_account", name: "Boltzbit", target: "https://x.com/boltzbit" },
  { id: "x-claudeai", kind: "x_account", name: "Claude", target: "https://x.com/claudeai" },
  { id: "x-midjourney", kind: "x_account", name: "Midjourney", target: "https://x.com/midjourney" },
  { id: "x-fabrizioromano", kind: "x_account", name: "Fabrizio Romano", target: "https://x.com/FabrizioRomano" },
  { id: "x-david_ornstein", kind: "x_account", name: "David Ornstein", target: "https://x.com/David_Ornstein" },
  { id: "x-mattemoretto", kind: "x_account", name: "Matteo Moretto", target: "https://x.com/MatteMoretto" },
  { id: "x-fabricehawkins", kind: "x_account", name: "Fabrice Hawkins", target: "https://x.com/FabriceHawkins" },
  { id: "x-mariocortegana", kind: "x_account", name: "Mario Cortegana", target: "https://x.com/MarioCortegana" },
  { id: "x-martinezferran", kind: "x_account", name: "Ferran Martínez", target: "https://x.com/martinezferran" },
  { id: "x-monfortcarlos", kind: "x_account", name: "Carlos Monfort", target: "https://x.com/monfortcarlos" },
  { id: "x-catalunyaradio", kind: "x_account", name: "Catalunya Ràdio", target: "https://x.com/CatalunyaRadio" },
  { id: "x-fcbarcelona", kind: "x_account", name: "FC Barcelona", target: "https://x.com/FCBarcelona" },
  { id: "x-mundodeportivo", kind: "x_account", name: "Mundo Deportivo", target: "https://x.com/mundodeportivo" },
  { id: "x-diarioas", kind: "x_account", name: "Diario AS", target: "https://x.com/diarioas" },
  { id: "x-esport3", kind: "x_account", name: "Esport3", target: "https://x.com/esport3" },
  { id: "x-gerardromero", kind: "x_account", name: "Gerard Romero", target: "https://x.com/gerardromero" },
  { id: "x-plettigoal", kind: "x_account", name: "Florian Plettenberg", target: "https://x.com/Plettigoal" },
  { id: "x-realmadrid", kind: "x_account", name: "Real Madrid C.F.", target: "https://x.com/realmadrid" },
  { id: "x-fcbfemeni", kind: "x_account", name: "FC Barcelona Femení", target: "https://x.com/FCBfemeni" },
  { id: "x-premierleague", kind: "x_account", name: "Premier League", target: "https://x.com/premierleague" },
  { id: "x-theathleticfc", kind: "x_account", name: "The Athletic | Football", target: "https://x.com/TheAthleticFC" },
  { id: "x-spacexai", kind: "x_account", name: "SpaceXAI", target: "https://x.com/SpaceXAI" },
  { id: "x-nvidia", kind: "x_account", name: "NVIDIA", target: "https://x.com/nvidia" },
  { id: "x-a16z", kind: "x_account", name: "a16z", target: "https://x.com/a16z" },
  { id: "x-simonw", kind: "x_account", name: "Simon Willison", target: "https://x.com/simonw" },
  { id: "x-sama", kind: "x_account", name: "Sam Altman", target: "https://x.com/sama" },
  { id: "x-therundownai", kind: "x_account", name: "The Rundown AI", target: "https://x.com/TheRundownAI" },
  { id: "x-sport", kind: "x_account", name: "Diario SPORT", target: "https://x.com/sport" },
  { id: "x-jijantesfc", kind: "x_account", name: "Jijantes FC", target: "https://x.com/JijantesFC" },
  { id: "x-fcbarcelona_es", kind: "x_account", name: "FC Barcelona", target: "https://x.com/FCBarcelona_es" },
  { id: "x-totcosta", kind: "x_account", name: "Tot costa", target: "https://x.com/totcosta" },
];
