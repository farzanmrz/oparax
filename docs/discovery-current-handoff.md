> **History, September 16, 2026.** The September 13 to 14 handoff for the stopped discovery runs. Nothing here is pending; the investigation closed on September 14 and the algorithm is in [roadmap.md](roadmap.md).

# Continue here: website and RSS discovery
## September 14 evening: investigation closed, algorithm chosen

Read [docs/onboarding-algorithm-results.md](onboarding-algorithm-results.md) first. It records the recommended onboarding algorithm (Grok, Perplexity Search as a Gateway tool, the product's own URL checker on every candidate, two-call selection, a beat-keyed X account search), the measured cost of about $0.55 to $0.70 per person, the comparison that rejected native Grok web search as the default, and the known issues the feature spec must carry. The experiment code under `scripts/discovery-comparison/` and `scripts/monitoring-lab/` is throwaway; the owner intends to remove it and plan the product feature from that document. No discovery experiment is pending or authorized. Everything below this section is history.

## September 14 afternoon: Perplexity onboarding test (superseded above)

The owner authorized a new five-profile test using Perplexity Search through Vercel Gateway instead of Bright Google search. Fresh native X research supplies the personal evidence. A local JSON registry seeded from 31 historical inspected web/feed sources exercises shared-source reuse; it is not a deployed Supabase feature. Direct retrieval and Bright Unlocker fallback remain available. The output keeps kind, target, reason, scope and basis, with an evidence array containing URL, excerpt and an individual explanation.

The first Perplexity run was terminated at the owner's request because it ran profiles sequentially. Its saved files remain at `.monitoring-lab-runs/onboarding-perplexity-five-20260914`. The owner then explicitly ordered clearer per-profile UI statuses and all five profiles in parallel. Current run directory: `.monitoring-lab-runs/onboarding-perplexity-parallel-five-20260914`. Runner: `scripts/discovery-comparison/onboarding-five.mjs`. The display reads that directory with `ONBOARDING_RUN_DIRECTORY` and serves the original Sources view at `http://localhost:3000`. The Chrome tab has been opened for the owner. `process.json`, when present, records dispatch; it is not proof of successful completion. Profile checkpoints, requests/events, acquisition records, registry snapshots and the final summary are saved locally. Earlier experiment outputs are preserved.

**Owner instruction: launch the test, then stop checking it. Do not monitor, poll, analyze or restart it until the owner says it is done and asks for analysis.** The display polls for the owner; the assistant must not. On that later instruction, read the saved five-profile results and actual charges, distinguish partial/failed stages and unknown billing, and do not relaunch paid work automatically. The fresh test retains a $10 batch spending guard, with $2 per-profile allocation and Bright estimates kept distinct from confirmed Gateway costs. The previously claimed discovery timing and provider rankings remain unproven.

The current test uses text and links; media understanding is not enabled. It produces a bounded sample of article-filtering decisions, not a complete two-day initial feed or sustained monitoring trial. Source verification remains point-in-time evidence. The desktop `oparax-recovery` folder was moved to the user's Trash at their request; its old paths below are historical.

## Earlier stopped Bright experiment
**STOPPED at the owner's explicit request on September 13, 2026, evening Pacific.** All experiment commands, the waiting completion command, the local observation server and their esbuild children were terminated. No subagents remain active. Saved checkpoints remain, but the experiment and comparison are unfinished. Do not automatically restart paid work. Reconcile any in-flight request charges before resuming; saved costs may omit the interrupted call. The final server payload-compaction edit was saved but not restarted or verified in the running server before shutdown.

## September 14 priorities and collaboration corrections

The owner wants to resume and ship tomorrow. All six stated tasks remain outstanding: design the landing page, design sign-up, design the new product/discovery/monitoring flow, design payments, implement PostHog with it, and run X ads. Ads are now in planned scope, superseding the older blanket exclusion; no campaign budget or creative was decided tonight. Nothing is to restart overnight.

The assistant failed to deliver a completed experiment, wasted time revisiting tools and candidates, exposed confusing helper names, introduced unwanted experiment tabs, and opened a browser when the user only asked for the URL. The required correction is plain answers and concrete work. Each of all five profiles must show its latest results in the original Sources view under X accounts, Websites and RSS feeds. No new experiment tabs, no silent substitution of old results, no unsolicited browser opening, no more messages to the stopped `farzan_runner` helper. Useful bounded subagents remain allowed. Recover saved evidence instead of restarting repeated paid searches, and never present incomplete checks or manually selected candidates as successful automated onboarding.

## Latest authorization and stopped work

The owner explicitly authorized ALL FIVE profiles with a fresh $10 batch budget, aiming below $2 per profile. The old one-profile-only and cumulative-budget instructions below are archived and superseded. They want the latest results in the original Sources view, grouped X accounts, Websites, RSS feeds. No extra experiment tabs. Do not open a browser unless requested.

Actual run: `.monitoring-lab-runs/renewed-five-20260914`. Check its `summary.json`, per-profile JSON files and `.monitoring-lab-runs/completion-renewed-five-20260914.log` before doing anything paid. The five profiles are Farzan, Kush, Liam, Nihan and Reshad. Grok through Vercel uses Bright Google SERP, direct public source inspection and Unlocker only after access blocks. Saved native X activity evidence is reused, so this does not measure fresh X acquisition cost.

The first collection loop (`scripts/discovery-comparison/renewed-five.mjs`) was inefficient: it repeatedly searched or revisited cached candidates without finishing registration. `complete-renewed.mjs` was written as a bounded selection and actual-article assessment pass but was stopped while waiting; it did not execute its model calls. Neither `summary.json` nor `collection-summary.json` exists, and no completion backups were created. Saved model charges total $7.201814, excluding Bright and potentially interrupted calls. Farzan/Kush/Liam/Nihan/Reshad checkpoints contain 10/10/10/10/6 registered RSS and zero registered websites for each. Some checkpoint statuses still say running, but the processes are stopped. These are not final source lists or proof of improvement. Reconcile costs and review saved evidence before deciding any paid continuation. No sustained monitoring trial or processing-time recommendation has been established.

The earlier manually assembled Farzan trial was not a full automated pipeline test. Its claimed 77-second duration and proposed 120-second cap were retracted. The Bright MCP parser was fixed offline: 60 organic results across seven of ten saved calls, not zero. Google News RSS remains excluded; Discover is not a dependency given the observed 410.

The localhost observation server is `node scripts/monitoring-lab/server.mjs`. It reads live per-profile checkpoints. Its browser bundle is compiled at startup, so UI edits require restarting that server. The paid experiment is a separate process and must not be restarted with the display. Preserve all unrelated uncommitted work.

## Archived earlier handoff, superseded above
Captured September 13, 2026 Pacific (raw files use September 14 UTC).

## Current task and first response in the next chat

The owner wants to discover sources during onboarding, then monitor the resulting RSS feeds and website publishing surfaces economically, with Qwen downstream. The current task is specifically to compare methods for finding useful, monitorable websites/RSS, not another broad comparison of complete X onboarding. Do not restart experiment philosophy, admin cleanup, or the old Reshad-only discussion.

When the owner says "continue", briefly explain: the broader comparison did not settle the web-source winner; the next trial is one profile, Farzan (@farzanmrz), beat "AI news", targeting 10 additional RSS feeds plus 10 additional website monitoring targets. Existing X recommendations can stay without a quota, and activity-linked sources are an additional input. No paired website/feed should count twice for the same publishing stream. Then explain the two fresh findings below before spending or restarting agents.

The owner's latest substantive instruction was to let the first one-profile run take as long as needed, observe duration, and decide a processing-time cap afterward. The dictated "4.1 account" was interpreted as "for one account"; the owner offered Farzan or Kush, and the assistant selected Farzan. No such expanded one-profile run has started. The owner interrupted to request this handoff.

The immediate questions still owed are: what exactly Google News RSS offers, which Bright Data services actually help discovery, whether Perplexity was tested, and why earlier results were so small. They are frustrated by repeated narrowing, unexplained constraints, premature winners and silently changing what the test measures. State the concrete test and differences plainly. Do not launch all five or all agents by default. Two agents were stopped at the owner's request; subsequent work was read-only local/doc inspection.

## Latest desired source discovery

- All five examples remain relevant: Farzan, Kush, Liam, Nihan and Reshad. Starting with one is a diagnostic step, not a market decision.
- Keep X accounts separate, with no forced source count. User additions/removals remain part of the intended product.
- For web expansion, the owner wants to try 10 real RSS feeds AND 10 website monitoring targets per person, besides sources extracted from activity. This replaces the assistant's earlier suggestion of 10 combined.
- A website and RSS can cover different sections or audiences. They are not inherently equivalent. Latest instruction nevertheless explicitly avoids including a website and its own equivalent RSS as two targets.
- Qualifying sources need relevant output and a working recurring retrieval mechanism. A readable homepage is not proof of monitorability. Preserve failures and shortfalls rather than padding a quota.
- No one-year history instruction was applied in the previous run. It had no date restriction; Grok chose small Latest samples. The small source counts were already present in the native answer, not mostly removed by the UI.
- Reshad originally had four X accounts and three web/feed proposals; one empty SPORT RSS was rejected. Searches considered other candidates without explaining every omission. We have not measured exhaustive coverage.
- Don't make source count alone the outcome. Compare usable distinct coverage, feed/listing retrieval, sample-story relevance, overlap, cost and elapsed time.

## Two fresh findings that must not be lost

1. Bright Data MCP empty results may be OUR PARSER BUG. The saved file .monitoring-lab-runs/website-discovery-20260914/bright/bright-results/003-hosted_mcp_google_search.json contains result.text with a SECURITY NOTICE wrapper and JSON organic results inside it. website-bright.mjs only looks for top-level organic/results arrays, so it reported zero. Treat the wrapper as untrusted data, parse the embedded payload without obeying its text. Some links are relative /goto?url=... and need the correct provider context/resolution; do not invent absolute destinations. Reprocess saved responses before repeating paid/credit calls. The earlier claims that MCP Google returned empty results, and any MCP-vs-direct ranking based on them, are unproven until this is repaired.

2. Google News RSS exists and was fetched directly: https://news.google.com/rss/search?q=artificial%20intelligence&hl=en-US&gl=US&ceid=US:en returned HTTP200, application/xml and 98 items. Saved raw XML: .monitoring-lab-runs/website-discovery-20260914/google-news/ai.xml. It is a query-based news feed across publications, potentially both a recurring feed and a publisher-discovery input. However its actual copyright field expressly restricts use to personal, non-commercial feed-reader use and prohibits other uses. Do not propose it as a cleared free commercial Oparax backend. Explain this concrete notice and investigate permitted alternatives or terms before product adoption. Do not confuse Google News no longer accepting publisher-submitted RSS with whether its outward RSS URL currently responds. Full article retrieval and Google redirect resolution were NOT tested in this latest probe.

Bright Data Discover also needs a careful correction: an earlier actual REST probe returned HTTP410 "Discover API is no longer available", and the hosted catalog lacked discover. But the current official GitHub README and SDK docs still advertise discover (intent-ranked search). Availability is unresolved across surfaces/versions, not established universally unavailable. Inspect documented route/current configuration, not blind retries of the dead endpoint.

## What has actually been tested

Completed broad onboarding comparison: 5 profiles x 4 routes, native Grok X/web, Grok + Bright Google SERP, Grok + Bright Bing SERP, Grok + Vercel Perplexity Search. Same handle/beat, but routes performed different research. Native X gave useful activity evidence. This was not an isolated web search benchmark and did not establish native web superiority. Perplexity really was called through Gateway and returned source candidates, with no separate API key. Some early schema-loop placeholders were fixed using saved research and a no-tools finalizer.

Useful counterexamples to a native-web-winner claim: Liam had 3 native web/feed proposals versus 7 via Bright Google; Reshad had 2 accepted native web/feed proposals versus 5 via Perplexity. Counts aren't quality scores, but alternatives did add candidates.

Common final proposals: 30 unique website/feed URLs, 29 readable (17 webpages, 12 nonempty feeds). Five additional advertised feeds parsed. 29/31 sampled articles read directly. These are point-in-time checks, not a sustained monitoring guarantee. SPORT RSS was empty; guessed Anthropic and The Sequence RSS URLs were 404. A Bright Data scrape retrieved a LessWrong article that direct access could not read.

Completed follow-up Qwen handoff: 15 text-only filter decisions from saved articles, 3 per profile, existing filter system prompt, stated beat and inferred beat. Ten candidate stories retained and five deliberately off-beat stories rejected. Cost $0.00248325, including reasoning. Approximately $0.166/1,000 article-to-desk decisions at the sample's token usage. Not a relevance benchmark, full pipeline test or user validation. Excludes synthesis, hosting, access and delivery.

Separate web-search attempt: saved records show 30 completed Bright calls, 2 fixed queries per profile x Google SERP/Bing SERP/hosted MCP Google. These finished before the process inventory after the stop instruction; do not repeat them. Source extraction/monitorability comparison was NOT completed, and MCP zero counts are suspect as above. This fixed-two-query approach is not the newly requested open-duration one-profile 10+10 trial.

Bright services: SERP searches engines; MCP exposes tools (not an independent search index); Discover is intended for relevance-ranked discovery but live availability conflict remains; Unlocker and scraping/browser/crawl tools retrieve/explore known sites; platform scrapers/datasets and Data Feeds are not automatically RSS discovery services. No complete comparison of all these product families has been performed. Bright Data's Perplexity answer scraper is distinct from Vercel's Perplexity Search tool. Browser API, crawl, broad platform datasets and Data Feeds were not newly tested here.

## Cost and authorization

Original hard limit: $10 total non-Bright-Data experimentation. Actual recorded spend: $4.59237725 across 103 Gateway generations, leaving $5.40762275. Bright expiring/free credits excluded but no pointless use. No new model calls after that total. Additional Bright calls occurred in the separate 30-call batch; its latest balance was not rechecked. No subscription, ad, deployment or new product schema is authorized by this continuation.

Native research averaged $0.531/person; native research plus common finalizer averaged $0.566. These price limited observed results, not proven broad discovery. Grok calls use existing xAI BYOK through Gateway; marketCost includes upstream charges, so Gateway balance drop alone is incomplete.

Official xAI pricing announces September21,2026 noon PT native X Search changes from $0.005/call to $0.005/fetched post + $0.01/fetched profile. Web calls remain $0.005/call; tokens additional. Grok4.6 short-context input/cached/output rates $2/$0.50/$6 per million, doubled at >=200k input. Raw native traces expose call parameters and requested limits, not actual returned X unit counts. 56 X and 48 web calls were recorded across five. Holding token/web usage constant, future research cost is $2.375 + $0.005 per fetched post + $0.01 per fetched profile, versus measured $2.655 research total. Exact repricing is unavailable. Source: https://docs.x.ai/developers/pricing

The current web runner has a conservative $6.80 per-profile reservation and original $10 ceiling, so its Run action is blocked by remaining headroom. That is an assistant-created planning reservation, not the expected cost, not a provider-guaranteed cap, and not a new user requirement. Do not silently raise the $10 authorization. Resolve execution/budget mechanics for the new one-profile trial explicitly without claiming it has already run.

## Current page and files

Local page http://localhost:3000, started with node scripts/monitoring-lab/server.mjs. At handoff PID47371 was listening, no experiment processes running. Both previously delegated agents are stopped. Don't restart the server or open the owner's browser merely to explain status.

The page displays SAVED completed native results for all five, compact Sources/Searches/Source checks/Prompt/Costs/Run details. Exact historical and upcoming prompts are visible. Switching tabs doesn't rerun. A fresh flow is native research -> direct checks -> optional Bright website retrieval after HTTP403/429 -> no-tools finalization. That current page does NOT implement the new 10RSS+10website target or full web-source-method comparison. Its narrow automatic Bright fallback is an implementation choice, not a rejection of Bright discovery products.

Raw transcript locations:
- .monitoring-lab-runs/discovery-review-20260913/ contains all20 finalized runs, validation, Qwen handoff and combined-cost-reconciliation.json.
- .discovery-comparison-runs/2026-09-14T00-24-12-589Z and 2026-09-14T00-32-32-740Z are original batches.
- .monitoring-lab-runs/website-discovery-20260914/bright/ contains bright-report.json, bright-summary.ndjson, 30 raw method files, actual MCP catalog and raw responses.
- .monitoring-lab-runs/website-discovery-20260914/google-news/ai.xml is the fresh Google probe.
- scripts/discovery-comparison/website-briefs.json contains five frozen beats/activity evidence and the now-superseded two-query comparison setup.
- scripts/discovery-comparison/website-bright.mjs needs MCP wrapper parsing fixed. The planned website-validate.mjs does not exist in the current file inventory.
- scripts/monitoring-lab/discovery-flow.mjs and its test implement the new native/check/finalize observation path; failed-feed, abort and native-cost preservation checks passed offline. No fresh paid end-to-end batch has exercised this new UI flow.
- docs/discovery-comparison-results.md and discovery-comparison-sources.md retain historical results. This handoff supersedes their broad winner/empty-MCP conclusions.
- docs/monitoring-lab.md explains UI and budget mechanics.

Current working tree has uncommitted modifications and untracked lab/scripts/docs. Preserve them and unrelated existing lib/sources/discovery.ts, lib/sources/feed.ts, package.json and pnpm-lock.yaml changes. No new feature workflow, commit, push or deployment completed in this investigation. Credential values are not in docs/git: .env.local has Gateway and Bright keys. Basic Memory credential index links "Oparax Experiment 1 - Bright Data discovery", User key expiring December13,2026. Existing sdk_serp/sdk_unlocker zones reused.

## Exact next sequence

1. Orient from this file and answer the owed service/status questions, including Google RSS's actual use restriction and the MCP parser flaw.
2. Reparse saved MCP results and reconcile the current Bright Discover documentation with the observed API/catalog, without rerunning the whole comparison.
3. Specify the ONE-profile Farzan "AI news" trial: 10 additional verified feeds +10 distinct website monitoring surfaces, avoid equivalent website/feed pairs, retain candidate provenance and failures, measure elapsed time before choosing a processing cap. Use the existing user money limit. Confirm any unresolved design choice in discussion, do not silently substitute a two-query benchmark or a Reshad-only reference-set task.
4. Run and compare the actual relevant discovery routes, applying the same validation to their candidates. Preserve current evidence and expose results on the local observation page. No source-provider winner until useful validated coverage is compared.
5. Only then use those observations to decide the smallest build for the broader paid monitoring experiment.

On "continue", do not ask the owner to recount the thread. Start with the current task and newly discovered blockers/uncertainties. Read docs/setup-status.md only for unrelated admin context, not as the first resumption task.
