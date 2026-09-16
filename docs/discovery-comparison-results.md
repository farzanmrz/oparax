> **History, September 16, 2026.** The September 13 comparison. See [roadmap.md](roadmap.md).

# Source discovery experiment, September 13, 2026

## Decision

Start with Grok native X/web search to understand the person and propose sources, then verify those sources with the existing direct website/RSS checker. Keep Bright Data search for finding additional publishing surfaces and Web Unlocker for selected blocked pages. For a sparse profile such as Farzan, be honest that most of the useful desk may come from the stated beat rather than personal activity. This test does not establish that adding another general search provider to every onboarding improves the result.

The important working mechanism is: pay to discover a source once, identify its RSS/Atom feed or recurring publication page, then poll that surface directly. It worked on real sources in this test. It does not guarantee exhaustive coverage, permanent access, or willingness to pay.

[Browse the actual recommendations for all five people and four routes](/Users/farzanm4/Desktop/repos/oparax/docs/discovery-comparison-sources.md).

## What was actually tested

Five fixed inputs: Farzan (@farzanmrz, AI startups and big companies), Kush (@kushbhuwalka, AI and tech), Liam (@ottleyai, practical AI developments/tools worth sharing), Nihan (@CodebyNihan, useful AI tools/product updates worth sharing), and Reshad (@ReshadRahman, FC Barcelona men's first team and transfers).

Four discovery routes used the same handle and beat, without a following-list download or manually seeded sources: Grok native X/web search, Grok with Bright Data Google search, Grok with Bright Data Bing search, and Grok with Perplexity Search through Vercel Gateway. The model was spacexai/grok-4.6, temperature 0, medium reasoning. There was no required recommendation count or fixed history window.

Bright Data Discover was checked first. Its API returned HTTP 410 with “Discover API is no longer available”; the hosted MCP catalog also omitted it. Bing replaced that unavailable route. Two hosted MCP Google searches returned empty organic results; direct SERP requests using the documented [parsed JSON option](https://docs.brightdata.com/api-reference/serp/google-search/parsed-json) returned nine results for the corresponding queries. This is a finding about these requests, not proof that every MCP request fails.

The first pass exposed integration problems. Three native answers were initially misclassified as failed because the cost reader expected an xAI field instead of Gateway's marketCost. Their completed answers and charges were recovered from raw responses without repeating searches. Some app-tool runs researched successfully but ended in placeholders; one exceeded the test's input-size bound. Their saved research was passed to a separate, common, no-tool finalizer. Two routes initially made no search call and received an explicit search-only probe. All original outputs and failures are preserved.

The first discovery pass used a final-output schema throughout the tool loop. Separating research from the common structured final answer recovered useful outputs without new searches. This is an integration finding, not proof that structured output should be abandoned. These are small engineering trials, not a statistically controlled provider benchmark. Different routes can retrieve different evidence. A placeholder from the shared Grok/output loop is not evidence that the underlying search engine failed.

## Native discovery costs

These amounts include model usage and native X/web search, before the common finalizer and direct validation:

- Farzan: $0.371960, 19 billed search calls.
- Kush: $0.593392, 26 calls.
- Liam: $0.634220, 18 calls.
- Nihan: $0.250852, 17 calls.
- Reshad: $0.804576, 24 calls.

Total: $2.655000, or $0.531 per person. The 104 search calls account for $0.52 at the observed rate; the remainder is model usage. Grok 4.6 has a [higher pricing tier at 200,000 input tokens](https://vercel.com/ai-gateway/models/grok-4.6). Kush, Liam and Reshad crossed it, which doubles input, cached-input and output token rates. The reported amounts already include that tier. Each native profile used one client request. Some query text repeated inside the model's search process. No automatic client retries or following-list API calls were used.

Requested native max_turns and output settings did not act as strict aggregate limits across internal search execution. Do not represent prompt instructions or those fields alone as a guaranteed dollar cap. The test tracked reservations and actual costs, including failed attempts, and resumed only work that had not executed.

## Production pricing change and the Qwen handoff

The $0.531 native-research average is a measured historical cost, not a production forecast. [xAI has announced](https://docs.x.ai/developers/pricing) that on September 21, 2026 at 12 PM PT, native X Search changes from $5 per 1,000 calls to $5 per 1,000 posts fetched and $10 per 1,000 profiles fetched. Parent and quoted posts count too. Web search remains $5 per 1,000 calls, with model tokens charged separately.

At those announced rates, 100 posts plus 10 profiles costs $0.60 for X retrieval; 500 posts plus 20 profiles costs $2.70, before model tokens and web search. These are scenarios, not observed future bills. The saved native traces do not expose complete actual fetched-post/profile counts, so they cannot honestly be repriced exactly. Combining queries alone will not avoid the new per-result charge. Our existing xAI BYOK routing means this upstream pricing is relevant even when Gateway supplies the model.

Grok 4.6 token rates are currently $2 input, $0.50 cached input and $6 output per million below 200,000 input tokens. At or above that threshold they become $4, $1 and $12 across the request. Pricing must be checked again before launch, rather than embedding this test's average in the free-preview budget.

The intended recurring path is independent of Grok: verified feed/publication -> new article retrieval -> Qwen beat filtering -> accepted story processing -> feed/delivery. Onboarding supplies source identity, the verified retrieval location, proposed coverage guidance and the evidence behind the recommendation. The user's explicit beat remains authoritative. Qwen consumes the article text and those preferences; it does not need to rediscover the website or repeat Grok's X searches for each article.

Feeds containing article links are useful even without full text, provided the linked articles can be retrieved. A readable homepage alone is weaker: it still needs a reliable recurring listing/feed/parser. Sources that need paid unlocking or X post access retain those upstream costs. Qwen cannot make a blocked or X-exclusive source free.

[Gateway's Qwen 3.7 Flash pricing](https://vercel.com/ai-gateway/models/qwen3.7-flash) starts at $0.03 input and $0.13 output per million tokens below 32,000 input tokens. Higher context tiers apply above that. An illustrative 3,000-input/300-output-token filter costs $0.000129, or $0.129 for 1,000 article-to-desk decisions. That excludes synthesis, hosting, storage, paid retrieval and notifications. Shared retrieval can be reused across desks; personalized filtering still has per-desk work.

## What the five people showed

### Farzan

Sparse activity still permits a useful baseline desk. Native search found the actual Chirp hackathon post, and public oEmbed confirmed the Gemini/Google DeepMind wording. That proves use of a tool in a project, not a strong desire to monitor its company. TechCrunch AI and official-lab feeds are sensible beat-based suggestions; they should be presented as suggestions rather than discovered personal preferences.

### Kush

Native search recovered agent-infrastructure interests and a Daytona reference. Bing also surfaced a Conductor stack mention. These are more specific than generic “AI and tech.” His own site and reading list provided further clues, but the model also recommended his own RSS, a static archive and an individual essay. Those are examples of confusing evidence about a person with a source worth monitoring for that person.

Conductor's homepage exposed a changelog RSS feed. Sam Altman's blog exposed an Atom feed. That is the concrete path from a discovered company or author to a low-cost recurring source. Some Greptile attribution could not be substantiated in the returned post body and must remain unverified.

### Liam

Native search found practical workflow/tool interests, with public post evidence for n8n and Bolt. The web routes added publication and official-lab coverage, but several duplicated a publication's website and RSS. Some source attributions were weaker than their labels claimed. GitHub and Product Hunt remain deliberate coverage gaps in this pass, even where a model suggested them.

### Nihan

Native search recovered tool roundups, Google/Gemini content and practical creator-oriented AI coverage. This supports a different emphasis from a funding-heavy AI business desk. A tool appearing in a huge roundup remains weaker evidence than repeated discussion. Some long-post and quoted-post references are not fully visible through oEmbed, so their specific target attribution remains unverified.

### Reshad

Native search produced the strongest direct source attribution: Fabrizio Romano, Matteo Moretto, Ferran Correas and Fernando Polo, with cited public posts. Mundo Deportivo's Barcelona feed and the official first-team news page were reachable. SPORT's advertised Barça RSS returned valid XML but zero entries, so it is not yet a usable monitoring feed. The test did not measure breaking-news latency or establish that these web sources replace reporters' X exclusives.

## Direct monitoring checks

Before finalization, the union contained 38 distinct proposed website/feed URLs. Direct checks read 32 successfully: 18 website pages and 14 feeds. Thirteen feeds contained entries; SPORT's feed was empty. Two proposed feeds returned 404: Anthropic's guessed news RSS and The Sequence's FeedBurner URL. Other unsuccessful checks included a blocked publication, a rate-limited article, a directory exceeding the existing 5 MB limit, and deferred Product Hunt.

The page inspections discovered four additional advertised feeds, all parseable. From available feeds, 31 of 33 sampled article URLs were readable directly. Two LessWrong article requests returned 429; Bright Data's scraper successfully retrieved a separate LessWrong article that direct inspection could not read. These are point-in-time checks, not a month-long reliability test. OpenAI's news page also showed intermittent 403 responses across checks, while its RSS worked.

Twenty distinct cited X posts returned public [oEmbed metadata](https://docs.x.com/x-for-websites/embedded-posts/overview). This independently checks author and visible text, without buying X API post reads. It does not expose every quoted post, full long post, repost relationship or image. A live URL alone does not validate the model's interpretation.

## What this means for the first implementation

1. Take the stated beat and optional handle.
2. Run native Grok research once and obtain an ordinary source proposal with reasons and citations.
3. Verify candidate sites and advertised feeds in code. Reject invalid feeds; distinguish an empty feed, a readable page, and a usable publishing stream. Use the resolved canonical URL.
4. Prefer the specific feed, changelog, author stream or publication section. Keep account-specific X monitoring where it supplies something the web sources do not.
5. Use Bright Data search to fill a demonstrated coverage gap, and Unlocker for selected blocked sources. Reuse discovery across users where appropriate.
6. Show editable recommendations and explicit uncertainty, then test the actual stories that reach the feed. Do not treat inferred interests as established beliefs.

A native-search research pass followed by ordinary, saved findings avoids the previously observed loss of native search context when mixing it into a local-tool continuation. The existing source checker can be a normal agent tool in the subsequent stage. No new agent framework is required for this experiment.

Direct RSS/web requests have no search-provider charge in these checks, but hosting, parsing, article retrieval and downstream filtering still cost money. We have not measured recurring coverage, hourly freshness, retention, payment, or notification value. The next product learning is whether these desks repeatedly surface stories the person would use, and whether they pay after the trial.

## Artifacts and setup

Full raw research, requests, provider metadata, usage and original failures are under `.discovery-comparison-runs/2026-09-14T00-24-12-589Z` and `.discovery-comparison-runs/2026-09-14T00-32-32-740Z`. The consolidated review, source inspections, public post checks and final answers are under `.monitoring-lab-runs/discovery-review-20260913`. These directories are git-ignored.

Exact shared prompts and test controls are in `scripts/discovery-comparison`. The native responses requested up to three turns; app-tool routes allowed five model steps and eight local-tool calls, with an explicit input-size bound and no retries. These are test controls, not a product specification. The trial also exposed a parallel-call counter race: counting completed calls let some bursts exceed eight local tools. The runner now reserves a started-call slot before awaiting execution. Historical outputs and costs were retained; the change did not rerun the research. Native provider tools still need their own separate cost controls.

One new Bright Data User-permission key was created, installed locally as BRIGHTDATA_API_KEY, and recorded in Basic Memory under “Oparax Experiment 1 - Bright Data discovery”, linked from the credential index. It expires December 13, 2026. Existing SERP/Unlocker zones and the existing Vercel Gateway key were reused. Perplexity Search ran as a [Gateway-provided tool](https://vercel.com/blog/use-perplexity-web-search-with-vercel-ai-gateway). No new Perplexity key, subscription, ad, database deployment or production release was needed.

## Final totals

**Source-discovery comparison usage: $4.589894. Including the subsequent Qwen handoff test, total non-Bright-Data usage is $4.59237725, rounded to $4.59.** This includes all 88 recorded Gateway generations, native X/web searches, Perplexity search charges, the initially unhelpful attempts, two explicit tool probes and the common finalization calls. No paid experiment process remains running.

Across all routes and finalization, the per-person totals were:

- Farzan: $0.812458.
- Kush: $0.991378.
- Liam: $0.985222.
- Nihan: $0.625486.
- Reshad: $1.175350.

These are comparison totals for four approaches per person, not the cost of one onboarding. Grouped by route, including finalization and its associated probes: native $2.830208; Bright Google plus Grok $0.603686; Bright Bing plus Grok $0.449268; Perplexity plus Grok $0.706732. Bright Data's own usage is excluded from those figures under the owner's boundary.

Gateway's existing xAI BYOK connection served the model calls. We counted Gateway's marketCost, which includes the underlying model usage and relevant search fees, rather than treating a zero Gateway model debit as free. An independent token-and-search calculation, including the long-context tier, matches the recorded costs. Do not add the generation endpoint's upstreamInferenceCost to totalCost blindly: its Perplexity records include search in the market-cost field already.

Bright Data: 59 logged successful direct SERP requests, three hosted MCP search calls, one hosted MCP scrape, and the rejected Discover probe. The console balance remained $94.64; free credits changed from 893 to 840. Its displayed account-period “Consumed $0.07” is not a proven experiment-only debit. No funds were added.

After common finalization, there were 30 distinct proposed website/feed URLs. Direct validation read 29: 17 webpages and 12 nonempty feeds. The remaining AI-tool directory exceeded the checker’s 5 MB limit. Page inspection found five further advertised feeds, all parseable; 29 of 31 sampled article pages were readable directly. This is access validation, not automatic endorsement of every recommendation. Some inferred-interest labels still need human review.

All 20 route/profile combinations have an original research record and a separate final structured recommendation. Reshad's Perplexity route recovered useful website and feed candidates from its saved research, so its initial placeholder/input-size failure should not be scored as failure of Perplexity search itself. Google also recovered account candidates. The final choice is based on native X's stronger account evidence and the simplicity of the working native-plus-checker path, not a claim that one general search engine universally wins.

The immediate next test should use the verified sources to populate the five desks and judge the stories they produce. Additional source-provider comparisons are not needed before that learning.

## Actual Qwen handoff test

After discovery, 15 saved article-to-desk decisions were run through Qwen 3.7 Flash: three for each of the five profiles. This reused the existing filter system prompt, explicit beat and the native discovery result's inferred beat. The articles came from the pooled verified sources. No new discovery searches were made. Each request was text-only, temperature 0, low reasoning, no retries, with a 1,500 output-token test ceiling. No product database, synthesis or delivery path was invoked.

All 15 returned valid structured decisions. Ten candidate stories were kept and all five deliberately cross-beat stories were rejected. For example, Conductor's release was kept for Kush/Liam; Google Search's running article was kept for Nihan because its body explained AI features; the Barça report was rejected for the four AI desks and accepted for Reshad. The OpenAI article was rejected for Reshad. This is a small, deliberately selected connection test, not an accuracy score or proof those users would value every accepted story. Several explanations describe inferred interests as part of the beat; those explanations should not be presented as literal user statements.

Gateway's actual charge was **$0.00248325 for all 15 decisions**, including reasoning tokens. At this sample's average token usage, that is **about $0.166 per 1,000 article-to-desk filter decisions**. Token-price recalculation matches the recorded charges. Filtering the same article for several desks incurs several decisions; downloading the article itself can be shared. Summary generation, other model stages, source access, storage, hosting and notifications remain separate costs.

The complete experiment now totals **$4.59237725 across 103 Gateway generations**, still below the $10 non-Bright-Data limit. No paid experiment process remains running. Exact Qwen requests/results are in `.monitoring-lab-runs/discovery-review-20260913/qwen-handoff/`; the combined ledger is `combined-cost-reconciliation.json`. This establishes that discovered readable sources can feed the existing kind of cheap Qwen filtering. It does not mean the new source plans are already wired into the deployed product.

## Observation page follow-up

The local page at http://localhost:3000 now loads the five completed native runs, exact requests, exposed calls, direct source checks, full returned research/final outputs, cost breakdowns and saved Qwen decisions. New runs use one native research request, direct inspection, optional Bright Data website retrieval only after HTTP 403/429, then no-tools finalization. Automatic Bright Data search is not enabled. See [monitoring lab](monitoring-lab.md) for the explicit remaining-budget controls. No new paid batch was run to render these results.

Raw-count audit: Farzan made 14 X/5 web calls; Kush 10/16; Liam 10/8; Nihan 10/7; Reshad 12/12. Actual returned post/profile counts are absent. Holding token and web usage fixed, the September 21 known component before X-result fees is respectively $0.301960, $0.543392, $0.584220, $0.200852 and $0.744576. Across five it is $2.375, versus the current complete research charge of $2.655. Add $0.005 per actually fetched X post and $0.01 per fetched profile. Requested limits and final citations must not be substituted for those units.
