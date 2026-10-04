// Recorded preview data in the product's real shapes (lib/feed/types.ts: VerifiedCard, ItemView).
// Every fact and span is verified against the public source (pro-exploration/examples-verified.json).
// Round 1 change 18: Direct and Clustered hold the SAME four reports, arranged two ways. Clustered joins
// the @nextjs post with the Next.js blog post, and the @bankofengland post with the CNBC article; Direct
// shows each report as its own single-source item. Newest first, as the feed orders. Nothing calls a model.

export type ItemView = {
  id: string;
  source_id: string;
  kind: "article" | "post";
  title: string;
  text: string;
  published_at: string;
  url: string;
  image: string | null;
  lang: string | null;
  outcome: "full" | "short" | "unreadable";
  publisher: string;
  /** X posts only: the account handle the post came from. */
  author?: string;
};

export type VerifiedFact = {
  text: string;
  evidence: { item: string; span: string }[];
  support: number;
  attribution: number;
};

export type VerifiedCard = {
  headline: string;
  facts: VerifiedFact[];
  publishers: { source_id: string; name: string; url: string }[];
  image: string | null;
  headline_from: "writer" | "title" | "first fact";
};

export type FeedStory = {
  id: string;
  arrangement: "clustered" | "direct";
  card: VerifiedCard;
  items: ItemView[];
};

export const PREVIEW_NOTE = "Preview data from public sources, not from your agent.";

const nextPost: ItemView = {
  id: "item-nextjs-post",
  source_id: "src-x-nextjs",
  kind: "post",
  title: "Next.js 15 and Turbopack Dev are now stable.",
  text: "Next.js 15 and Turbopack Dev are now stable.\n\nUpgrade automatically with our new CLI and codemods.\n\nnextjs.org/15",
  published_at: "2024-10-21T19:58:15Z",
  url: "https://x.com/nextjs/status/1848453766900539742",
  image: null,
  lang: "en",
  outcome: "full",
  publisher: "Next.js",
  author: "@nextjs",
};

const nextBlog: ItemView = {
  id: "item-nextjs-blog",
  source_id: "src-nextjs-blog",
  kind: "article",
  title: "Next.js 15",
  text: "Next.js 15 is officially stable and ready for production. This release builds on the updates from both RC1 and RC2.",
  published_at: "2024-10-21T17:00:00Z",
  url: "https://nextjs.org/blog/next-15",
  image: "https://h8dxkfmaphn8o0p3.public.blob.vercel-storage.com/static/blog/next-15/twitter-card.png",
  lang: "en",
  outcome: "full",
  publisher: "Next.js Blog",
};

const boePost: ItemView = {
  id: "item-boe-post",
  source_id: "src-x-bankofengland",
  kind: "post",
  title: "The Monetary Policy Committee voted by a majority of 5-4 to cut interest rates to 4%.",
  text: "The Monetary Policy Committee voted by a majority of 5-4 to cut interest rates to 4%.\n\nFind out more in our #MonetaryPolicyReport",
  published_at: "2025-08-07T11:02:15Z",
  url: "https://x.com/bankofengland/status/1953411358281634007",
  image: "https://pbs.twimg.com/media/GxvpQv7WkAEVcu0.jpg",
  lang: "en",
  outcome: "full",
  publisher: "Bank of England",
  author: "@bankofengland",
};

const cnbc: ItemView = {
  id: "item-cnbc-boe",
  source_id: "src-cnbc",
  kind: "article",
  title: "Bank of England narrowly votes to cut interest rates to 4% as balancing act continues",
  text: 'The Bank of England cut interest rates from 4.25% to 4% on Thursday as the central bank resumes a "gradual and careful" approach to lowering interest rates.',
  published_at: "2025-08-07T11:01:41Z",
  url: "https://www.cnbc.com/2025/08/07/bank-of-england-cuts-interest-rates-by-a-quarter-point-to-4percent.html",
  image:
    "https://image.cnbcfm.com/api/v1/image/108118813-1742464050338-gettyimages-2201301185-20250219_bank_of_england_002.jpeg?v=1774352648&w=1920&h=1080",
  lang: "en",
  outcome: "full",
  publisher: "CNBC",
};

export const items = { nextPost, nextBlog, boePost, cnbc };

/** Clustered: the Next.js 15 story, joined from the X post and the blog post. */
export const nextStory: FeedStory = {
  id: "st-next-15",
  arrangement: "clustered",
  items: [nextPost, nextBlog],
  card: {
    headline: "Next.js 15 is released as stable",
    headline_from: "writer",
    image: nextBlog.image,
    publishers: [
      { source_id: "src-x-nextjs", name: "Next.js", url: nextPost.url },
      { source_id: "src-nextjs-blog", name: "Next.js Blog", url: nextBlog.url },
    ],
    facts: [
      {
        text: "Next.js 15 was declared stable and ready for production on October 21, 2024.",
        evidence: [
          { item: nextPost.id, span: "Next.js 15 and Turbopack Dev are now stable." },
          { item: nextBlog.id, span: "Next.js 15 is officially stable and ready for production." },
        ],
        support: 0.97,
        attribution: 0.96,
      },
      {
        text: "Turbopack for local development ships as stable in this release.",
        evidence: [
          { item: nextPost.id, span: "Turbopack Dev are now stable" },
          { item: nextBlog.id, span: "Turbopack Dev (Stable): Performance and stability improvements." },
        ],
        support: 0.95,
        attribution: 0.94,
      },
      {
        text: "The release adds support for React 19.",
        evidence: [
          {
            item: nextBlog.id,
            span: "React 19 Support: Support for React 19, React Compiler (Experimental), and hydration error improvements.",
          },
        ],
        support: 0.96,
        attribution: 0.95,
      },
      {
        text: "Fetch requests, GET Route Handlers and client navigations are no longer cached by default.",
        evidence: [
          {
            item: nextBlog.id,
            span: "fetch requests, GET Route Handlers, and client navigations are no longer cached by default.",
          },
        ],
        support: 0.98,
        attribution: 0.97,
      },
      {
        text: "A new codemod CLI automates the upgrade.",
        evidence: [
          { item: nextPost.id, span: "Upgrade automatically with our new CLI and codemods." },
          { item: nextBlog.id, span: "Easily upgrade to the latest Next.js and React versions." },
        ],
        support: 0.93,
        attribution: 0.92,
      },
    ],
  },
};

/** Clustered: the Bank of England story; facts and spans exactly as examples-verified.json records them. */
const boeStory: FeedStory = {
  id: "st-boe-story",
  arrangement: "clustered",
  items: [boePost, cnbc],
  card: {
    headline: "Bank of England cuts interest rates to 4% on a 5-4 vote",
    headline_from: "writer",
    image: boePost.image,
    publishers: [
      { source_id: "src-x-bankofengland", name: "Bank of England", url: boePost.url },
      { source_id: "src-cnbc", name: "CNBC", url: cnbc.url },
    ],
    facts: [
      {
        text: "The Bank of England cut its main interest rate from 4.25% to 4% on August 7, 2025.",
        evidence: [
          { item: boePost.id, span: "voted by a majority of 5-4 to cut interest rates to 4%" },
          { item: cnbc.id, span: "voted by a fine margin to cut interest rates from 4.25% to 4% on Thursday" },
        ],
        support: 0.97,
        attribution: 0.96,
      },
      {
        text: "The decision was narrow, a 5-4 split on the Monetary Policy Committee.",
        evidence: [{ item: boePost.id, span: "voted by a majority of 5-4" }],
        support: 0.94,
        attribution: 0.95,
      },
      {
        text: "It was the fifth cut since the July 2024 general election.",
        evidence: [
          {
            item: cnbc.id,
            span: "the central bank's fifth interest rate cut since the last general election in July 2024",
          },
        ],
        support: 0.95,
        attribution: 0.94,
      },
      {
        text: "Inflation complicated the decision: UK CPI rose to 3.6% in June from 3.4% in May.",
        evidence: [
          {
            item: cnbc.id,
            span: "the consumer price index (CPI) rose to a hotter-than-expected 3.6% in June from 3.4% in May",
          },
        ],
        support: 0.95,
        attribution: 0.93,
      },
    ],
  },
};

/** Direct: the @nextjs post alone, citing only its own verified spans. */
const nextPostStory: FeedStory = {
  id: "st-next-post",
  arrangement: "direct",
  items: [nextPost],
  card: {
    headline: "Next.js 15 and Turbopack Dev are now stable",
    headline_from: "writer",
    image: null,
    publishers: [{ source_id: "src-x-nextjs", name: "Next.js", url: nextPost.url }],
    facts: [
      {
        text: "Next.js 15 is now stable.",
        evidence: [{ item: nextPost.id, span: "Next.js 15 and Turbopack Dev are now stable." }],
        support: 0.96,
        attribution: 0.96,
      },
      {
        text: "Turbopack for local development is stable too.",
        evidence: [{ item: nextPost.id, span: "Turbopack Dev are now stable" }],
        support: 0.94,
        attribution: 0.94,
      },
      {
        text: "A new CLI and codemods upgrade projects automatically.",
        evidence: [{ item: nextPost.id, span: "Upgrade automatically with our new CLI and codemods." }],
        support: 0.93,
        attribution: 0.93,
      },
    ],
  },
};

/** Direct: the Next.js blog post alone, citing only its own verified spans. */
const nextBlogStory: FeedStory = {
  id: "st-next-blog",
  arrangement: "direct",
  items: [nextBlog],
  card: {
    headline: "Next.js 15 is stable and ready for production",
    headline_from: "writer",
    image: nextBlog.image,
    publishers: [{ source_id: "src-nextjs-blog", name: "Next.js Blog", url: nextBlog.url }],
    facts: [
      {
        text: "Next.js 15 is officially stable and ready for production.",
        evidence: [{ item: nextBlog.id, span: "Next.js 15 is officially stable and ready for production." }],
        support: 0.97,
        attribution: 0.96,
      },
      {
        text: "Turbopack for local development ships as stable.",
        evidence: [{ item: nextBlog.id, span: "Turbopack Dev (Stable): Performance and stability improvements." }],
        support: 0.95,
        attribution: 0.94,
      },
      {
        text: "The release adds support for React 19.",
        evidence: [
          {
            item: nextBlog.id,
            span: "React 19 Support: Support for React 19, React Compiler (Experimental), and hydration error improvements.",
          },
        ],
        support: 0.96,
        attribution: 0.95,
      },
      {
        text: "Fetch requests, GET Route Handlers and client navigations are no longer cached by default.",
        evidence: [
          {
            item: nextBlog.id,
            span: "fetch requests, GET Route Handlers, and client navigations are no longer cached by default.",
          },
        ],
        support: 0.98,
        attribution: 0.97,
      },
      {
        text: "Upgrading to the latest Next.js and React versions is easier.",
        evidence: [{ item: nextBlog.id, span: "Easily upgrade to the latest Next.js and React versions." }],
        support: 0.9,
        attribution: 0.92,
      },
    ],
  },
};

const boePostStory: FeedStory = {
  id: "st-boe-post",
  arrangement: "direct",
  items: [boePost],
  card: {
    headline: "Bank of England cuts interest rates to 4% on a 5-4 vote",
    headline_from: "writer",
    image: boePost.image,
    publishers: [{ source_id: "src-x-bankofengland", name: "Bank of England", url: boePost.url }],
    facts: [
      {
        text: "The Monetary Policy Committee voted to cut interest rates to 4%.",
        evidence: [{ item: boePost.id, span: "voted by a majority of 5-4 to cut interest rates to 4%" }],
        support: 0.97,
        attribution: 0.97,
      },
      {
        text: "The committee was split, with 5 members voting for the cut and 4 against.",
        evidence: [{ item: boePost.id, span: "voted by a majority of 5-4" }],
        support: 0.9,
        attribution: 0.94,
      },
    ],
  },
};

const cnbcStory: FeedStory = {
  id: "st-boe-cnbc",
  arrangement: "direct",
  items: [cnbc],
  card: {
    headline: "Bank of England narrowly votes to cut rates to 4%",
    headline_from: "writer",
    image: null,
    publishers: [{ source_id: "src-cnbc", name: "CNBC", url: cnbc.url }],
    facts: [
      {
        text: "The Bank of England cut interest rates from 4.25% to 4% on Thursday, August 7, 2025.",
        evidence: [{ item: cnbc.id, span: "cut interest rates from 4.25% to 4% on Thursday" }],
        support: 0.96,
        attribution: 0.95,
      },
      {
        text: "The bank says it is taking a gradual and careful approach to lowering rates.",
        evidence: [{ item: cnbc.id, span: 'resumes a "gradual and careful" approach to lowering interest rates' }],
        support: 0.94,
        attribution: 0.93,
      },
      {
        text: "It was the fifth cut since the general election in July 2024.",
        evidence: [
          {
            item: cnbc.id,
            span: "the central bank's fifth interest rate cut since the last general election in July 2024",
          },
        ],
        support: 0.95,
        attribution: 0.94,
      },
      {
        text: "UK inflation rose to 3.6% in June from 3.4% in May.",
        evidence: [
          {
            item: cnbc.id,
            span: "the consumer price index (CPI) rose to a hotter-than-expected 3.6% in June from 3.4% in May",
          },
        ],
        support: 0.95,
        attribution: 0.93,
      },
    ],
  },
};

/** Both arrangements, newest report first (the Bank of England reports are from August 2025). */
export const stories: FeedStory[] = [boeStory, nextStory, boePostStory, cnbcStory, nextPostStory, nextBlogStory];

/** Plain-text DM exactly as lib/alerts/pack.ts builds it for these stories. */
export function packDm(handle: string, list: FeedStory[]) {
  const entries = list
    .slice(0, 10)
    .map((s) => `${s.card.headline}\n${s.card.facts[0].text}\nhttps://oparax.ai/${encodeURIComponent(handle)}/${encodeURIComponent(s.id)}`);
  return `Oparax: ${entries.length} new ${entries.length === 1 ? "story" : "stories"} for you\n\n${entries.join("\n\n")}`;
}

// ───────────── Council feed directions (October 1, 2026): six more reports from configured sources ─────────────
// Each report below was fetched read-only from a public page of a source in next/data/onboarding.ts
// chosenSites, and every evidence span is a verbatim substring of that page's text (checked by script).
// published_at is the page's own publication time. Images are the page's own og/twitter image.

// verified 2026-10-01 from https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/
const simonSol: ItemView = {
  id: "item-simon-devday",
  source_id: "simon-willison-personal-tech-blog",
  kind: "article",
  title: "OpenAI DevDay 2026 live blog",
  text: "10:21 People have been asking for GPT-6 Astra but cheaper and faster. Today they're launching GPT-6.1 Sol.",
  published_at: "2026-09-29T15:55:13Z",
  url: "https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/",
  image: "https://static.simonwillison.net/static/2026/live-20260929-092441.webp",
  lang: "en",
  outcome: "full",
  publisher: "Simon Willison",
};

// verified 2026-10-01 from https://www.latent.space/p/ainews-openai-devday-2026-dots-61
const latentSol: ItemView = {
  id: "item-latent-devday",
  source_id: "latent-space-ai-engineering-newsletter-and-podcast",
  kind: "article",
  title: "[AINews] OpenAI DevDay 2026: Dots, 6.1 Sol, Ultrafast, Decisions API, Agents API, Spaces, Marketplace, and 1.2 Billion ChatGPT WAU",
  text: "GPT-6.1 Sol: OpenAI pitches it as “near-Astra intelligence for a fifth of the price”.",
  published_at: "2026-09-30T05:53:10Z",
  url: "https://www.latent.space/p/ainews-openai-devday-2026-dots-61",
  image: null,
  lang: "en",
  outcome: "full",
  publisher: "Latent Space",
};

// verified 2026-10-01 from https://vercel.com/changelog/microsoft-ai-models-are-now-available-on-ai-gateway
const vercelMai: ItemView = {
  id: "item-vercel-mai",
  source_id: "vercel-product-and-platform-news",
  kind: "article",
  title: "Microsoft AI models are now available on AI Gateway",
  text: "Vercel and Microsoft AI (MAI) have partnered to make MAI models available on AI Gateway.",
  published_at: "2026-10-01T00:00:00Z",
  url: "https://vercel.com/changelog/microsoft-ai-models-are-now-available-on-ai-gateway",
  image:
    "https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/4VUQPah80J1WYBwplwXQjh/341d68a8100d89550907348d511d49db/image__111_.png",
  lang: "en",
  outcome: "full",
  publisher: "Vercel",
};

// verified 2026-10-01 from https://vercel.com/changelog/vercel-agent-now-installs-private-packages-from-npm-and-custom-registries
const vercelAgent: ItemView = {
  id: "item-vercel-agent",
  source_id: "vercel-product-and-platform-news",
  kind: "article",
  title: "Vercel Agent now installs private packages from npm and custom registries",
  text: "Vercel Agent can install private dependencies from npm and custom registries using credentials stored as shared environment variables on Vercel.",
  published_at: "2026-09-30T23:22:00Z",
  url: "https://vercel.com/changelog/vercel-agent-now-installs-private-packages-from-npm-and-custom-registries",
  image:
    "https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/51AkvmukWt34TIFhJ3XTdX/d5b58e4e05bbcc635816d8658d54617e/image__41_.png",
  lang: "en",
  outcome: "full",
  publisher: "Vercel",
};

// verified 2026-10-01 from https://huggingface.co/blog/allenai/olmocore3
const olmoCore: ItemView = {
  id: "item-hf-olmocore3",
  source_id: "hugging-face-community-ml-research-blog",
  kind: "article",
  title: "Introducing Olmo-core 3: Open, scalable training infrastructure for large MoEs",
  text: "Olmo-core 3 is designed to scale MoE training into the trillion-parameter range while preserving computational efficiency.",
  published_at: "2026-10-01T15:01:43Z",
  url: "https://huggingface.co/blog/allenai/olmocore3",
  image: "https://cdn-uploads.huggingface.co/production/uploads/638e39b249de7ae552d977b5/uKnK93gjkKbmJmSx94WO2.png",
  lang: "en",
  outcome: "full",
  publisher: "Hugging Face",
};

// verified 2026-10-01 from https://mistral.ai/news/hallo-deutschland/
const mistralMunich: ItemView = {
  id: "item-mistral-munich",
  source_id: "mistral-ai-company-news",
  kind: "article",
  title: "Mistral Opens German Hub in Munich to Advance Industrial AI in Europe’s Largest Economy",
  text: "Today, we are putting that conviction into practice by opening our new hub in Munich.",
  published_at: "2026-09-28T15:57:59Z",
  url: "https://mistral.ai/news/hallo-deutschland/",
  image: "https://mistral.ai/cms-media/api/media/file/Linkedin_Mistral02%20(1).png",
  lang: "en",
  outcome: "full",
  publisher: "Mistral AI",
};

export const recentItems = { simonSol, latentSol, vercelMai, vercelAgent, olmoCore, mistralMunich };

const ev = (item: ItemView, span: string) => ({ item: item.id, span });
const fact = (text: string, evidence: { item: string; span: string }[], support = 0.95): VerifiedFact => ({
  text,
  evidence,
  support,
  attribution: support,
});
const pub = (item: ItemView) => ({ source_id: item.source_id, name: item.publisher, url: item.url });
const single = (id: string, item: ItemView, headline: string, facts: VerifiedFact[]): FeedStory => ({
  id,
  arrangement: "direct",
  items: [item],
  card: { headline, headline_from: "writer", image: item.image, publishers: [pub(item)], facts },
});
const both = (story: FeedStory, id: string): FeedStory => ({ ...story, id, arrangement: "clustered" });

/** Clustered: GPT-6.1 Sol, joined from Simon Willison's live blog and Latent Space's AINews issue. */
const solStory: FeedStory = {
  id: "st-gpt61-sol",
  arrangement: "clustered",
  items: [latentSol, simonSol],
  card: {
    headline: "OpenAI launches GPT-6.1 Sol at a fifth of Astra's price",
    headline_from: "writer",
    image: simonSol.image,
    publishers: [pub(latentSol), pub(simonSol)],
    facts: [
      fact("OpenAI launched GPT-6.1 Sol at DevDay 2026 on September 29.", [
        ev(simonSol, "Today they're launching GPT-6.1 Sol."),
      ]),
      fact("OpenAI pitches it as near-Astra intelligence for a fifth of the price.", [
        ev(simonSol, '"Near-Astra level intelligence at a fifth of the price"'),
        ev(latentSol, "OpenAI pitches it as “near-Astra intelligence for a fifth of the price”"),
      ]),
      fact("API pricing is $2/$10 per million tokens, with cached input at $0.10.", [
        ev(latentSol, "$2/$10 per M tokens, with cached input at $0.10"),
      ]),
      fact("A new Ultrafast mode generates up to 300 tokens a second.", [
        ev(simonSol, "Ultrafast. 8x faster - up to 300 tokens/second."),
        ev(latentSol, "Ultrafast offers up to 8x faster generation (300 tok/s) in Codex and 6x in the API."),
      ]),
      fact("Artificial Analysis places it 1 point below Astra at $0.72 per task.", [
        ev(latentSol, "AA places it 1 pt below Astra on its Intelligence Index at $0.72 vs $3.26 per task."),
      ]),
    ],
  },
};

const simonSolStory = single("st-simon-sol", simonSol, "OpenAI launches GPT-6.1 Sol and an Ultrafast mode", [
  fact("OpenAI launched GPT-6.1 Sol at DevDay 2026.", [ev(simonSol, "Today they're launching GPT-6.1 Sol.")]),
  fact("OpenAI calls it near-Astra intelligence at a fifth of the price.", [
    ev(simonSol, '"Near-Astra level intelligence at a fifth of the price"'),
  ]),
  fact("Ultrafast runs up to 300 tokens a second, for Astra 6 now and Sol 6.1 soon.", [
    ev(simonSol, "Ultrafast. 8x faster - up to 300 tokens/second."),
    ev(simonSol, "Ultrafast is available for Astra 6 today, and Sol 6.1 soon."),
  ]),
]);

const latentSolStory = single("st-latent-sol", latentSol, "GPT-6.1 Sol costs $2/$10 per million tokens", [
  fact("OpenAI pitches GPT-6.1 Sol as near-Astra intelligence for a fifth of the price.", [
    ev(latentSol, "OpenAI pitches it as “near-Astra intelligence for a fifth of the price”"),
  ]),
  fact("Pricing is $2/$10 per million tokens, with cached input at $0.10.", [
    ev(latentSol, "$2/$10 per M tokens, with cached input at $0.10"),
  ]),
  fact("Artificial Analysis places it 1 point below Astra at $0.72 per task.", [
    ev(latentSol, "AA places it 1 pt below Astra on its Intelligence Index at $0.72 vs $3.26 per task."),
  ]),
]);

const maiStory = single("st-vercel-mai", vercelMai, "Microsoft AI models arrive on Vercel's AI Gateway", [
  fact("Vercel and Microsoft AI partnered to make MAI models available on AI Gateway.", [
    ev(vercelMai, "Vercel and Microsoft AI (MAI) have partnered to make MAI models available on AI Gateway."),
  ]),
  fact("MAI-Voice-2.1 and its Flash version generate speech; MAI-Transcribe-2 Streaming transcribes live audio.", [
    ev(
      vercelMai,
      "MAI-Voice-2.1 and MAI-Voice-2.1-Flash generate speech, while MAI-Transcribe-2 Streaming returns transcript updates as audio arrives.",
    ),
  ]),
  fact("AI Gateway bills them at listed rates, with no platform fee or markup.", [
    ev(vercelMai, "AI Gateway bills these models at their listed rates, with no platform fee or markup on inference."),
  ]),
]);

const agentStory = single("st-vercel-agent", vercelAgent, "Vercel Agent can now install private npm packages", [
  fact("Vercel Agent installs private dependencies from npm and custom registries.", [
    ev(
      vercelAgent,
      "Vercel Agent can install private dependencies from npm and custom registries using credentials stored as shared environment variables on Vercel.",
    ),
  ]),
  fact("Credentials stay outside the sandbox, so the agent cannot read them.", [
    ev(vercelAgent, "Credential values stay outside the sandbox, so the agent cannot read them."),
  ]),
  fact("It reads only team-shared variables, not project-scoped ones.", [
    ev(vercelAgent, "Vercel Agent reads only team-shared variables, not project-scoped ones."),
  ]),
]);

const olmoStory = single("st-hf-olmocore3", olmoCore, "Olmo-core 3 scales open MoE training past a trillion parameters", [
  fact("Olmo-core 3 is built to scale MoE training into the trillion-parameter range.", [
    ev(olmoCore, "Olmo-core 3 is designed to scale MoE training into the trillion-parameter range while preserving computational efficiency."),
  ]),
  fact("On eight B300 GPUs, a 47B MoE processed 52,000 tokens per second per GPU, up from 19,400.", [
    ev(
      olmoCore,
      "a 47-billion-parameter MoE processed 52,000 tokens per second per GPU with the new stack, compared with 19,400 using our earlier implementation",
    ),
  ]),
  fact("The next-generation Olmo will use an MoE architecture.", [ev(olmoCore, "Our next-generation Olmo will use an MoE architecture")]),
  fact("Researchers can use it to train their own MoEs.", [
    ev(olmoCore, "researchers and developers can use Olmo-core 3 to train their own MoEs"),
  ]),
]);

const mistralStory = single("st-mistral-munich", mistralMunich, "Mistral opens a Munich hub for physics and industrial AI", [
  fact("Mistral opened a new hub in Munich.", [
    ev(mistralMunich, "Today, we are putting that conviction into practice by opening our new hub in Munich."),
  ]),
  fact("The hub houses research teams for Physics AI and Industrial AI.", [
    ev(mistralMunich, "Our Munich hub will house specialised research teams dedicated to Physics AI and Industrial AI"),
  ]),
  fact("It works with BMW on crash simulations and Siemens Energy on industrial AI.", [
    ev(
      mistralMunich,
      "we are working with BMW on crash simulations and engineering AI, and with Siemens Energy on industrial AI applications",
    ),
  ]),
  fact("Mistral says it will build one gigawatt of European compute by 2030.", [
    ev(mistralMunich, "Mistral will build one gigawatt of European compute capacity by 2030."),
  ]),
]);

/** Both arrangements for the council directions, newest first; the original six stories follow unchanged. */
export const councilStories: FeedStory[] = [
  both(olmoStory, "st-c-olmo"),
  olmoStory,
  both(maiStory, "st-c-mai"),
  maiStory,
  both(agentStory, "st-c-agent"),
  agentStory,
  solStory,
  latentSolStory,
  simonSolStory,
  both(mistralStory, "st-c-mistral"),
  mistralStory,
  ...stories,
];

export type DigestEntry = {
  kind: "github" | "product_hunt";
  name: string;
  url: string;
  description: string;
  /** The product's why_now line is model-written; null here because none was recorded for this entry. */
  why_now: string | null;
  /** Release time from the GitHub API, shown as "released"; the product's digest created_at is not recorded. */
  released_at: string;
  detail: string;
};

// verified in pro-exploration/examples-verified.json (GitHub API, fetched 2026-10-01) from
// https://github.com/vercel/next.js/releases/tag/v15.0.0
export const digests: DigestEntry[] = [
  {
    kind: "github",
    name: "vercel/next.js v15.0.0",
    url: "https://github.com/vercel/next.js/releases/tag/v15.0.0",
    description: "The React Framework",
    why_now: null,
    released_at: "2024-10-21T18:51:48Z",
    detail: "Release tag v15.0.0, not a prerelease. The body is a changelog of merged PRs.",
  },
];
