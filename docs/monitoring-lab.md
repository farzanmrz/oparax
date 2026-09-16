> **Throwaway, September 16, 2026.** The local lab page for the experiment runs; deleted with the scripts when slice one is planned ([roadmap.md](roadmap.md) section 13).

# Source discovery observation page

Open http://localhost:3000 after starting `node scripts/monitoring-lab/server.mjs`. The page is local, separate from the product, and does not require signup. The owner opens it in their browser. Loading it does not run a model.

## Current flow

The five tabs are Farzan, Kush, Liam, Nihan and Reshad. Each has the same fixed handle/beat used in the completed comparison. There is one Run all five button, with server-side sequential execution. Navigating between profiles, reconnecting or refreshing does not restart a request. Stop aborts active work and cancels queued profiles.

On startup, the page loads the actual completed native-search comparison, its exact requests, final recommendations, source inspections, exposed search calls, costs and 15 saved Qwen filter decisions. These are explicitly marked saved results, not a simulated live run. Reloading the server currently returns to that comparison; newly run batches remain on disk under `.monitoring-lab-runs/`.

## Archived Farzan candidate check

Farzan's tab retains a separate archived candidate inventory. It is a manually constructed list that was checked with weak URL and page-pattern relevance signals. It is not a complete automatic discovery run and does not establish that the listed sources are qualified.

The recorded 46.690 seconds covered validation only. It is neither full pipeline duration nor evidence for a processing cap. The archived list remains useful for tracing what was considered and rejected, not for making coverage claims.

## Renewed five-profile experiment

The page polls `.monitoring-lab-runs/renewed-five-20260914/` through a read-only local endpoint while the active five-profile run writes checkpoints. Each profile targets 10 RSS or Atom feeds and 10 distinct website monitoring surfaces. The display separates the Grok cost confirmed by the gateway from Bright Data, whose metering is separate and is never estimated from request counts. Saved native X activity evidence is reused, so the batch does not repurchase it.

Each registered source shows its reason, retrieval method, article samples and limitations. The page also shows the live count, elapsed time, search responses, source checks and recorded failures. Viewing the page never sends a model request, a Bright Data request, or starts another experiment.

The page keeps the historical five-profile views intact. The complete saved report remains at `.monitoring-lab-runs/farzan-source-trial-20260914/final-output/farzan-source-trial-report.json` and is available from the trial view.

A fresh run follows three stages:

1. One raw Gateway Responses request to Grok 4.6 with native X and web search, using the comparison's general prompt. No following-list API calls. No required source count or historical window. Temperature zero, medium effort, requested 4,000 output tokens and three native turns. The native limits proved best effort, not a verified aggregate spending cap.
2. Direct inspection of proposed websites/RSS, including advertised feeds. Bright Data's automatic role is specifically a website retrieval fallback after direct HTTP 403 or 429. It does not automatically conduct more search. Invalid/empty feeds are not magically made valid by scraping. Broader Bright Data coverage discovery remains a separate possible test.
3. Structured finalization using the saved research and inspection results. This stage cannot search again. The finalizer separates source proposals from verified retrieval results and preserves uncertainty.

The displayed comparison included independent post checks and broader pooled URL validation. New runs show only checks actually performed during that run; the historical validation is not silently represented as a live action.

## What is visible

- Sources: compact X account, RSS/Atom and website proposals, monitoring scope, one cited evidence excerpt, reason and verification state. No invented confidence categories absent from the comparison schema.
- Searches: one row per exposed provider call ID, readable query and requested limit. Raw metadata remains expandable.
- Source checks: direct retrieval findings and any explicitly triggered Bright Data fallback. Saved Qwen decisions demonstrate the downstream handoff but are not rerun automatically.
- Prompt: exact stage instructions and expandable full requests, including inputs and settings.
- Costs: research/finalization charges and announced September 21 repricing formula. Requested search limits and final citations are not actual fetched-result counts.
- Run details: streamed provider-exposed reasoning, original research response, final output, generation IDs and usage. Full raw stream logs remain on disk. Provider-hidden search bodies or reasoning cannot be reconstructed.

## Historical spending

The completed experiment spent $4.59237725, including the Qwen follow-up, against the owner's $10 non-Bright-Data authorization. The local page preserves that starting spend. A fresh profile requires $6.80 conservative headroom ($6.30 research plus $0.50 finalization); this is a planning reservation, not an upstream guaranteed hard cap. Therefore the remaining original authorization is insufficient for that reservation. Saved results are freely inspectable. The Costs view permits the owner to explicitly change the total ceiling before pressing Run. No limit is raised by the agent or by opening the page.

Calls run sequentially; known charges are persisted after each profile. An incomplete paid call with unresolved billing blocks subsequent runs. Bright Data credit is separate. The local accounting file is `.monitoring-lab-runs/web-discovery-wallet.json`. It does not track unrelated activity elsewhere on the same provider account.

## Pricing distinction

The measured native research average was $0.531. Adding the common finalizer gives approximately $0.566 per profile for the displayed native route. From September 21, 2026 at noon Pacific, announced X Search pricing changes from $0.005 per call to $0.005 per fetched post and $0.01 per fetched profile. For the same five research runs, the known model-plus-web component is $2.375 total; add the unknown fetched-X-result charge. Raw traces expose requested limits and calls, not complete returned-post/profile counts, so no exact reprice is available. See [official pricing](https://docs.x.ai/developers/pricing).

## Related results

Read [comparison results](discovery-comparison-results.md) and [all proposed sources](discovery-comparison-sources.md). This lab is not a product launch, a schema decision, or evidence of retention/payment. No feature workflow was launched. The next product test is whether these sources repeatedly deliver stories the people value.
