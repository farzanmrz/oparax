# Sources catalog sample (public.sources, read-only)

Queried 2026-10-01 from the oparax Supabase project. Only publisher-level columns were read. No user ids, emails or monitor data.

## Schema notes

The `sources` table has no homepage column, no separate feed column, no category/topic array and no quality or tier field. The columns that describe a source are:

- `id` (text slug), `kind`, `name`, `target` (the one URL: feed URL for rss, page URL for website, profile URL for x_account), `focus` (free text, one short line), `lang`, `description`.
- Activity proxies in place of a tier: `items_per_week` (rss and website only) and `followers` (x_account only).

## Counts

- Total rows: 150 (all 150 unpaused).
- By kind: x_account 74, rss 54, website 22.
- By lang: en 129, es 15, ca 5, fr 1.
- Distinct `focus` values: about 125 free-text strings, almost all unique (largest repeats: "FC Barcelona news" 7, "Company blog" 4, "AI industry news" 3). There is no controlled category field, so no meaningful category counts.
- Coverage gap: no CNBC, Bank of England, or any finance or economics publisher exists in the table. A name, focus and id search for cnbc, bank of england, reuters, bloomberg, financial, economist, finance, market, bank, business and stock returned only football transfer-market rows. The catalog is AI, developer tools, tech news and Barcelona football. Finance names in a fixture must be invented or sourced elsewhere.

## Most relevant rows (40)

Beat: AI developer tools and model releases, Next.js, Vercel, open models, plus general tech news.

| name | kind | target (url) | focus | per week / followers |
|---|---|---|---|---|
| Vercel | rss | https://vercel.com/atom | Product and platform news | 49.4/wk |
| Vercel | x_account | https://x.com/vercel | Vercel platform and AI Gateway | 459,693 |
| GitHub | x_account | https://x.com/github | GitHub and Copilot product news | 2,714,358 |
| Cursor | x_account | https://x.com/cursor_ai | coding agent product updates | 484,243 |
| Cursor | website | https://cursor.com/blog | Product and customer stories | 1.5/wk |
| Cognition | rss | https://devin.ai/rss.xml | Devin product updates | 1.8/wk |
| Lovable | x_account | https://x.com/Lovable | AI app builder product updates | 157,119 |
| Bolt.new | website | https://bolt.new/blog | Product and customer stories | 12.8/wk |
| Builder.io | rss | https://www.builder.io/blog/feed/atom | Company blog | 2.1/wk |
| LangChain | website | https://www.langchain.com/blog | Product and engineering blog | 4.4/wk |
| Linear | x_account | https://x.com/linear | Linear product and coding agent updates | 113,423 |
| Theo - t3.gg | x_account | https://x.com/theo | AI coding tool opinions | 391,965 |
| Peter Steinberger | x_account | https://x.com/steipete | OpenClaw and hands-on agent building | 592,196 |
| Simon Willison | rss | https://simonwillison.net/atom/everything/ | Personal tech blog | 23.9/wk |
| Simon Willison | x_account | https://x.com/simonw | hands-on model and tool evaluation | 226,300 |
| OpenRouter | rss | https://openrouter.ai/blog/feed.xml | Company blog | 4.4/wk |
| OpenRouter | x_account | https://x.com/OpenRouter | model routing and new model availability | 148,998 |
| LLM Gateway | website | https://llmgateway.io/blog | Company blog | 3.9/wk |
| TestingCatalog | x_account | https://x.com/testingcatalog | feature sightings across AI products | 77,407 |
| Anthropic | website | https://www.anthropic.com/news | Company announcements | 1.6/wk |
| Anthropic | x_account | https://x.com/AnthropicAI | Claude releases and research | 1,752,909 |
| OpenAI | rss | https://openai.com/news/rss.xml | Official news | 14.6/wk |
| OpenAI | x_account | https://x.com/OpenAI | GPT releases, ChatGPT, safety reports | 5,375,636 |
| Google DeepMind | x_account | https://x.com/GoogleDeepMind | Google's frontier models and research | 1,539,900 |
| Google | rss | https://blog.google/innovation-and-ai/technology/ai/rss/ | AI news and product updates | 6.2/wk |
| Mistral AI | rss | https://mistral.ai/rss.xml | Company news | 0.9/wk |
| DeepSeek | x_account | https://x.com/deepseek_ai | DeepSeek model releases and API pricing | 1,135,745 |
| Qwen | x_account | https://x.com/Alibaba_Qwen | Alibaba's Qwen open models | 291,692 |
| Hugging Face | rss | https://huggingface.co/blog/feed.xml | Community ML research blog | 4.8/wk |
| Hugging Face | x_account | https://x.com/huggingface | open models and community | 802,014 |
| Nathan Lambert | rss | https://www.interconnects.ai/feed | Open model analysis | 1.4/wk |
| NVIDIA | rss | https://developer.nvidia.com/blog/feed | Developer technical blog | 7.6/wk |
| Latent Space | rss | https://www.latent.space/feed | AI engineering newsletter and podcast | 7.5/wk |
| TLDR | rss | https://tldr.tech/api/rss/ai | AI newsletter | 5.8/wk |
| The Decoder | rss | https://the-decoder.com/feed/ | AI industry news | 72.5/wk |
| Ars Technica | rss | https://arstechnica.com/ai/feed | AI news | 26/wk |
| TechCrunch | rss | https://techcrunch.com/category/artificial-intelligence/feed/ | AI industry news | 267.7/wk |
| TechCrunch | x_account | https://x.com/TechCrunch | tech industry and startup news | 11,013,028 |
| The Verge | rss | https://www.theverge.com/rss/index.xml | General tech news | 261.1/wk |
| Wired | rss | https://www.wired.com/feed/tag/ai/latest/rss | AI news and policy | 68.2/wk |
| Y Combinator | x_account | https://x.com/ycombinator | YC-backed startup spotlights | 1,652,702 |
