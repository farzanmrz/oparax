> **History, September 16, 2026.** The September 14 algorithm and its measurements. It was replaced on September 15 by the one-loop version in [roadmap.md](roadmap.md) section 3; the comparison that settled Perplexity over native Grok web search still stands.

# Onboarding source discovery: the algorithm selected for build

September 14, 2026, evening. This closes the discovery investigation. Status: algorithm selected for build, not user-validated. No reporter has yet reacted to a list this pipeline produced; the cheapest next check is to show the five people their own lists and ask whether they would track them. Everything below was measured on the same five people (Farzan, Kush, Liam, Nihan, Reshad) with the same fresh X evidence. Raw runs are in `.monitoring-lab-runs/onboarding-compare-perplexity-20260914`, `onboarding-compare-native-20260914` and `onboarding-lean-20260914`. The runner is `scripts/discovery-comparison/onboarding-compare.mjs`. All of it is throwaway; the product feature is planned from this document, not from that code.

## The recommended algorithm

Given a person's X handle and a beat sentence:

1. **Fresh X research (Grok, native X search).** Read the person's own recent posts. Output: activity evidence (their post URLs with excerpts), accounts they interacted with, and websites they linked. About 11 to 18 cents.
2. **Web search (Grok calling Perplexity Search as a Gateway tool).** One call, three to five queries, 20 results with 256-token snippets. Tiny prompt: beat, six short activity hints, known catalog URLs to exclude. About 7 to 10 cents.
3. **Candidate extraction (Grok, low reasoning).** Turn the 20 results into up to 16 feed and 16 website candidates. The model may add the feed or section URL it knows for a publisher that appears in results, because step 4 verifies everything for free. About 3 cents.
4. **Checker (code, free).** The product's own detection, in the product's order, on every candidate:
   - article-shaped URL: rejected outright (this is what let single blog posts in before);
   - the page's own listing of article links (the section proves itself);
   - the site's sitemap, accepted only if it has entries under the candidate's path (the same band rule the app applies to a path prefix);
   - a feed at that URL (converted to a feed candidate);
   - otherwise rejected. Feeds advertised by any inspected page are checked too. For each surviving surface, code reads up to three sample articles, preferring ones under the section's own path, and keeps the surface only if two read as real articles. Direct fetch first, Bright Unlocker only after a 403 or 429. In the lean run 348 fetches went direct and 49 fell back to Bright, 7 cents across five people. The checker is the shipped product code (`lib/sources/discovery.ts`, `sitemap.ts`, `feed.ts`), bundled into the experiment through `live-source-tools.mjs`; only the ordering around it and the sample reading are experiment code.
5. **Selection (Grok, two calls).** First an exploration call with three tools (inspect page, inspect feed, section check), capped at four calls, low reasoning, prose notes out. Then a tool-free call that writes the structured answer from the evidence plus those notes. The split exists because Grok, given tools and a strict schema in one loop, answers with a placeholder object on its first step. About 18 to 23 cents.
6. **Beat X accounts (Grok, native X search, prose then extraction).** Search X for accounts that reliably publish on the beat, excluding the person and the activity-derived accounts. Each comes with a recent post URL from that account as evidence. About 13 to 18 cents.
7. **Grounding (code, free).** Accept only what the evidence supports: X accounts must be from step 1 or step 6; a personal-evidence claim must cite the person's own posts; every feed or website must be a surface the checker or the model's tool calls verified, with two sample URLs code actually read; a page and its own feed are one stream, feed preferred.

Rules given to the model that changed the outcome:

- An interaction is not a subscription. One-off tags, courtesy replies and event mentions do not justify monitoring an account. Repeatedly crediting an account as the source of stories the person reports does.
- Personal evidence is optional, and when claimed it must be the person's own post URL with an excerpt and a reason. Publisher articles are verification, not evidence, and live in the two sample URLs.
- The model may reject any initial X account. Nothing is force-kept by code.
- Target: up to 20 distinct fresh recurring streams, feed preferred, never padded. The old 10 feeds plus 10 websites split fought the "never both a site and its own feed" rule and left the website column with feedless pages, which are mostly articles.

## What it costs

Per person, all in, lean run:

| Person | Fresh X | Search | Extract | Selection | Beat X | Total |
|---|---:|---:|---:|---:|---:|---:|
| Farzan | $0.17 | $0.08 | $0.03 | $0.21 | $0.18 | $0.68 |
| Kush | $0.11 | $0.10 | $0.03 | $0.20 | $0.15 | $0.58 |
| Liam | $0.18 | $0.09 | $0.03 | $0.23 | $0.14 | $0.67 |
| Nihan | $0.15 | $0.09 | $0.02 | $0.18 | $0.14 | $0.59 |
| Reshad | $0.14 | $0.07 | $0.03 | $0.19 | $0.13 | $0.56 |

These figures are provisional. Grok 4.6 through Gateway at $2 per million tokens read, $6 per million written. The bill is token volume, not any one call: the expensive versions of this pipeline read the same evidence five or six times with medium reasoning. Retrieval is free except for Unlocker fallbacks. Fresh X research is priced before xAI's September 21 change to per-post and per-profile fees; the runner records call counts but not fetched units, so the exact new price is unknown.

## What it produced

Lean run, fresh picks only (known catalog reuse excluded):

| Person | X from activity | X from beat | Feeds | Websites |
|---|---:|---:|---:|---:|
| Farzan | 0 of 7 kept | 11 | 6 | 1 |
| Kush | 0 of 8 | 10 | 6 | 0 |
| Liam | 1 of 6 | 12 | 9 | 3 |
| Nihan | 0 of 4 | 10 | 3 | 2 |
| Reshad | 0 of 5 (Romano lost to a code bug, see below) | 10 | 7 | 0 |

Examples of what the lean pipeline chose: Farzan, AI news: VentureBeat AI, Ars Technica AI, The Decoder, MarkTechPost AI category, AI News, Meta AI blog, plus Reuters, WIRED, TechCrunch, Will Knight, Yann LeCun, Karpathy, Andrew Ng on X. Reshad, Barcelona: AS Barcelona tag feed, Barca Universal news feed, Barca Blaugranes news and transfer feeds, Football Espana Barcelona, BBC Sport Barcelona, plus SPORT, Mundo Deportivo, Barca Universal and Deadline Day Live on X. Liam, practical AI tools: Mistral news, NVIDIA developer blog, Google Research, LangChain blog, Ethan Mollick, Import AI, The Rundown, plus Mollick, swyx, Matt Shumer, Perplexity on X.

The checker rejected 23 single-article URLs across the five people that the earlier Codex run had accepted as websites, and 18 site-wide-only sitemaps that would have meant polling a whole domain for one section.

## Where the money goes and what it buys

The activity-derived X column came out nearly empty under the corrected rule (0 of 7, 0 of 8, 1 of 6, 0 of 4, 0 of 5 kept). The beat-keyed X search supplied 10 to 12 accounts per person for 13 to 18 cents, about a quarter of the total, and many of them are the accounts anyone on that beat would name (Reuters, WIRED, TechCrunch for AI news; SPORT, Mundo Deportivo for Barcelona). Fresh X research, another quarter of the cost, still earns its place through the activity evidence that shapes the web search and through the occasional strong personal signal (Liam's Bolt, Reshad's Romano), but it did not fill the X column. An open product question, not settled here: whether a per-beat account list maintained once, shared across people on the same beat, would serve the X column as well for a fraction of the price.

## The comparison that settled the search route

Same five people, same X evidence, same checker and rules; only the web-search route differed. Costs here include the reused fresh X research.

| Person | Perplexity (Codex candidates, corrected selection) | Native Grok web search | Lean Perplexity |
|---|---|---|---|
| Farzan | 12 fresh, $1.47 | 16 fresh, $1.32 | 7 fresh plus 11 beat X, $0.68 |
| Kush | 9 fresh, $1.28 | 16 fresh, $1.48 | 6 fresh plus 10 beat X, $0.58 |
| Liam | 3 fresh, $1.34 | 10 fresh, $1.93 | 12 fresh plus 12 beat X, $0.67 |
| Nihan | 3 fresh, $1.37 | 10 fresh, $1.54 | 5 fresh plus 10 beat X, $0.59 |
| Reshad | 3 fresh, $0.94 | 11 fresh, $2.03 | 7 fresh plus 10 beat X, $0.56 |

Native Grok web search finds the most candidates and its picks read like a mainstream news desk (MIT Technology Review AI, The Guardian AI, arXiv cs.AI, Fast Company AI). It costs 33 cents to $1.07 for a single search call, and four of five people needed a replacement search on top. The lean Perplexity route finds fewer but well-chosen streams at a tenth of the search cost, and its picks are on the beat. Verdict: Perplexity, lean, is the route. Native web search is worth revisiting only if a beat comes back with too few streams; it could be a paid second pass the user triggers, never the default.

Fairness note: the native route ran its own fresh search under the corrected rules, so its column is a fair measure. The first Perplexity column reused Codex's older candidate lists, which is why the lean column, a fresh Perplexity search under the same rules, is the one to compare against native. The verdict rests on native versus lean, not on the first column.

## Known issues in the throwaway code, relevant to the spec

- **Own-post evidence check.** Grounding required every cited post to be in the saved evidence list. Reshad's @FabrizioRomano was kept by the model on repeated credits and dropped by code because one cited post was his own but not in that list. Fixed in the runner after the run (any post under the person's handle counts); the spec should say the same.
- **Sample URLs from tool calls.** When the model verified a surface with its tools and chose sample URLs it saw there, code accepted them only for surfaces the checker had not already verified. Four picks were lost that way. Spec: any sample URL the model saw for that surface is acceptable once code re-reads it.
- **Grok placeholder behavior.** Strict JSON schema plus a native or provider tool in one request makes Grok emit a placeholder object and stop. Every model stage that uses a tool therefore answers in prose and a separate tool-free call extracts the structure. This is a Gateway plus Grok fact, not a prompt problem, and it cost two false starts today.
- **Perplexity page tokens.** `maxTokensPerPage` must be at least 256 or the tool returns a validation error that the SDK surfaces only as a tool-error content part.
- **Site-wide-only sitemaps.** Cursor's blog and Google's AI blog have JavaScript-rendered listings and sitemaps without entries under the section path. The product's detection cannot isolate them either; they are only monitorable via an advertised feed. This is a product limitation to show the user, not a bug.

## What is not measured

Sustained monitoring quality, the two-day feed a user would actually see, and user acceptance rates. The sample-article checks are point in time. Qwen was not part of onboarding in any run today.

## Spend today

Model spend across all runs today, confirmed Gateway cost: about $13.70 (first-pass Perplexity $1.84, reselect $1.52, native first pass $5.52, native reselect $2.01, lean $2.33, false starts $0.45). Bright retrieval estimate: 15 cents.
