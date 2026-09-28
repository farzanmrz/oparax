# What it costs to serve one person (COGS)

The one place for every cost Oparax pays to run the product, across every surface it touches: the unit price, where that price comes from, what was measured, and the arithmetic per person per month. Any plan, brief or pricing discussion takes its numbers from here and nowhere else. When a price or a measurement changes, change it here first.

Rules for this file: a number is either **verified** (read from the provider's own documentation or bill, with the date) or **measured** (from a real run, with the date) or it is marked **unknown**. Nothing is guessed. No selling price is decided; this file is only about cost.

Started September 19, 2026; the tiers, the free week and the spending guards (section 6) added September 28.

## 1. Unit prices

| Surface | What is charged | Price | Status |
| --- | --- | --- | --- |
| X API | one post read or delivered (including each post a watched account makes) | $0.005 | verified, X pricing page, September 19 |
| X API | one user lookup | $0.010 | verified, same |
| X API | one counts request (how many posts match, without fetching them) | $0.005 | verified, same; used September 19 |
| X API | one post created that contains a URL (a promoted post with a link, for instance) | $0.200 | verified, X pricing page, September 21; a DM with a link is still a DM send |
| X API | one DM sent | $0.015 | verified from X's documentation, September 17 |
| X API | one DM event received (the person replies to the bot) | $0.010 | verified, September 19 |
| X API | the same post billed twice in one UTC day | not charged again | verified, September 19 |
| xAI X search inside Grok | until September 21, 2026: per search call; after: per post fetched and per profile | $0.005 a call, then $0.005 a post and $0.010 a profile | verified from xAI's pricing page, September 11 |
| Grok 4.7 through the Vercel AI Gateway | tokens | $1.20 in, $3.60 out, $0.30 cached input read, per million | verified from the Gateway catalog, September 21; the onboarding model from that day (owner, September 21), replacing Grok 4.6 at $2 in and $6 out, until GPT-6 Luna fast (`openai/gpt-6-luna-fast`) replaced it in the September 26 to 27 lab and the app; Luna fast's unit price is not yet recorded in this file |
| Qwen 3.7 Flash through the Gateway (`alibaba/qwen3.7-flash`, the judging and writing model today) | tokens | $0.03 in, $0.13 out per million | verified from the Gateway catalog, September 21; retention none, no training |
| Candidates for judging and writing, compared September 21 at the owner's request on the product's real prompts (2 cents, 708 calls; full write-up in [model-comparison-2026-09-21.md](model-comparison-2026-09-21.md); no choice made yet) | tokens | GLM 5.3 Flash (`zai/glm-5.3-flash`): billed $0.075 in / $0.25 out (Vercel's public page; the catalog's $0.15 / $0.50 is not what is charged), paid through a DeepInfra key attached to the Gateway account, not Gateway credits; Ling 3.0 Flash (`inclusionai/ling-3.0-flash`): $0.021 / $0.063, about half that in practice from cache reads; Ling 3.0 Flash VL free (`inclusionai/ling-3.0-flash-vl-free`): $0 | Per person per month at 2,000 judged and 500 written, reasoning off: Qwen $0.09, GLM $0.23, Ling paid $0.05, Ling free $0. Quality: GLM best judge on every set and the only writer with no invented facts (but slow, and dropped the title on 3 of 12); Qwen fast and always well formed but invented or inverted a fact in 4 of 12 articles; free Ling matched GLM on clean judging sets, never rate-limited in 350 calls, carries no retention promise |
| Jev (TypeSafe) through the Gateway as `typesafe-ai/jev` | input tokens; output free | $0.042 per million | verified from the Gateway catalog, September 21; the Gateway response now reports the dollar figure per call (`providerMetadata.gateway.cost` charged, `marketCost` at list), so Jev's cost is read, not estimated. The September 21 test call (3,336 tokens) reported marketCost $0.000140 and cost $0 charged; the direct TypeSafe API, the previous path, reported tokens only |
| Perplexity search through the Gateway | per search | read from the Gateway response per call | not recorded as a unit price; onboarding no longer runs a web search (removed September 27) |
| Websites and feeds | fetching | free | conditional requests that return "not changed" cost nothing |
| GitHub API | reads of public data | free | the limit is request rate (search 30 a minute), not money |
| Product Hunt API and feed | reads | free | the limit is 6,250 points per 15 minutes; commercial use needs their permission by email |
| Bright Data | one unlocked fetch | $0.0015 | verified; left out of the first build |
| Stripe | per successful card payment | 2.9% plus $0.30 per domestic card charge, plus 0.7% Stripe Billing on subscriptions (about $1.38 on a $30 charge); +1.5% international cards, +1% currency conversion | verified from Stripe's pricing page, September 22 |
| Vercel, Supabase, PostHog, Gmail | fixed monthly bills | unknown here | amounts not recorded; they do not change per person at this size |
| X ads | acquisition | set by the owner per campaign | not a serving cost; tracked apart |

## 2. What was measured

| What | Result | When |
| --- | --- | --- |
| Onboarding one person (read, rank, pick, write rows), on Grok 4.6 | $0.076 for Reshad, $0.256 for Liam; at Grok 4.7's price the same runs come to about $0.054 and $0.164 (Grok's token share times 0.6; the X search fees, 2 cents a person, and Jev unchanged; Liam's one Perplexity search assumed at half a cent, its price never read) | September 19, recomputed September 21 |
| The same before the algorithm was simplified | $0.97 and $1.06 | September 15 |
| Onboarding one person, the cut-down loop (profile, 10 posts, one GPT-6 Luna fast call over the whole table, no search needed) | $0.277 for Liam, X and the model together, one model call, 23 seconds | September 27, evening |
| The same with Jev scoring the table first (150 candidates, 107 passed) | $0.278 for Liam, X, Jev and the model together, 24 seconds | September 27, evening |
| Onboarding one person on the lab's tool-loop agent (nine tools, GPT-6 Luna fast; the design before the September 27 cut), the run record's total as the lab's `figures.py` printed it | Farzan $0.15, Kush $0.28, Reshad $0.35, Liam $0.83, Nihan $1.20 | September 27: Reshad, Kush and Nihan at 06:36 to 06:37 UTC; Farzan and Liam at 23:26 to 23:28 UTC (the reruns with post images); records in the tag archive/lab-2026-09-27 |
| The read step once xAI bills per post | adds roughly $0.10 to $0.15 | estimate from the post limits |
| Judging one item (Qwen) | $0.000116 | August |
| Writing one item into English headline and fact lines (Qwen) | $0.00025 | August |
| Jev judging 24 items twice plus 8 pairs twice | about $0.0004 in total | September 19 |
| The downstream lab end to end, two people, 47 items, four writers with reasoning on (downstream-lab-2026-09-21.md) | $0.030 for everything; per writer for 32 cards: Qwen $0.016, GLM $0.013, Ling and Laguna $0; a Jev fit request 1,270 tokens, $0.000053 at list, charged $0 | September 21 |
| The downstream lab on its final code: the writer (Qwen 3.7 Flash, reasoning on, repairs included), per person | Liam $0.0223 for 23 cards (81 facts kept); on the pipeline before its last fixes, Nihan $0.0084 for 11 cards and Reshad $0.0256 for 26 cards; Jev's cost per call is read from the gateway and not summed here | September 27 (Liam 06:40 UTC, Nihan 02:55 UTC, Reshad 02:01 UTC); records in the tag archive/lab-2026-09-27 |
| Reading a person's full following list | $39.64 for five people; never again | September 13 |
| One source stuck in a loop for three days | $69 | August; the reason a daily spend watchdog exists |

How much watched accounts post, over seven days (X counts endpoint, September 19):

| Account type | Example | All posts a day | Own posts and quotes only |
| --- | --- | --- | --- |
| Company or lab | OpenAI, Anthropic, Sam Altman | about 1 | under 1 |
| Founder who argues in replies | levelsio | 49 | 8 |
| Transfer journalist | Fabrizio Romano | 34 | 33 |
| Sports outlet | Mundo Deportivo | 125 | 117 |

On X's Activity API a watched account's replies, quotes and reposts are all delivered and all billed, and cannot be filtered out. On the filtered stream they can be excluded before billing (verified from X's documentation, September 19).

## 3. The arithmetic per person per month

**Watched X posts.** Posts a day × 30 × $0.005. An account is billed once however many people watch it, so this is a ceiling for one person watching alone.

| Watched posts a day | Cost a month |
| --- | --- |
| 5 | $0.75 |
| 15 | $2.25 |
| 33 (one transfer journalist) | $5 |
| 100 | $15 |
| 117 (one sports outlet, alone) | $17.55 |

**Bot alerts.** A story is alerted once, ever, and the cadence is per tier (owner, September 28; the daily alert was first set September 19). Hobby and Creator: once a day, 30 sends × $0.015 = **$0.45 a month per person** (Creator may ask for every 2 hours later: 360 sends, $5.40). Wire: a mini digest every 15 minutes when there is news, at most 96 sends a day, 2,880 a month, **$43.20 a month** when every slot carries news; for a normal week the assistant assumes about half the slots do, 48 sends a day, $21.60 a month. Each reply from the person costs $0.010. X allows 1,440 DM sends a day per app, so about 15 Wire users at full pace fill the sender's whole day. For comparison, other cadences at the same price per send:

| Cadence | Sends a month | Cost a month |
| --- | --- | --- |
| Once a day (Hobby and Creator) | 30 | $0.45 |
| Every 4 hours | 180 | $2.70 |
| Every 2 hours (Creator, if asked later) | 360 | $5.40 |
| Hourly | 720 | $10.80 |
| Every 15 minutes when there is news (Wire, every slot) | 2,880 | $43.20 |
| Every story the moment it lands, busy monitor (no instant alerts: owner, September 28) | 450 to 1,500 | $7 to $22 |

**Judging and writing.** Every new item from every source is judged ($0.000116); items on the beat are also written ($0.00025). A monitor seeing 2,000 items a month of which a quarter are on beat: 2,000 × $0.000116 + 500 × $0.00025 = about $0.36. Jev as the first pass costs less than a tenth of a cent a month at that volume. Earlier estimates of $1 to $8 a month came from busier monitors. Measured on the new design September 21 with reasoning on: under $0.40 a person a month on a paid writer (Qwen or GLM at 300 cards), under $0.25 on a free one, Jev included at list price.

**Onboarding.** Once per person. The app's cut-down loop (September 27): $0.278 for Liam, X, Jev and GPT-6 Luna fast together, measured twice. The lab's tool-loop agent before the cut, on Luna fast: $0.15 to $1.20 (Farzan $0.15, Kush $0.28, Reshad $0.35, Liam $0.83, Nihan $1.20; section 2). The September 19 design on Grok measured $0.08 to $0.26 (about $0.05 to $0.16 at Grok 4.7's price). Onboarding now recommends only from the shared table and finds no new sources, runs no web search, and reads X through X's own API.

**Fetching.** Free. Each source is fetched once for everyone who watches it, so this does not grow with the number of people.

**GitHub and Product Hunt.** Free to read. Their cost is the same judging and writing as any item.

## 4. One person, added up

With alerts once a day, before payment fees and fixed bills (the tiers' arithmetic, with fees, is section 6):

| Person | Watched X posts | Alerts | Judging and writing | About, a month |
| --- | --- | --- | --- | --- |
| Web only, no watched accounts | $0 | $0.45 | under $1 | $1 to $1.50 |
| Five company or founder accounts, replies filtered out | about $2 | $0.45 | under $1 | about $3.50 |
| The same five, replies not filtered | $5 to $10 | $0.45 | under $1 | $6 to $11 |
| 3,000 watched posts a month, fully used | $15 | $0.45 | $1 to $2 | about $17 |
| A football wire: one outlet and two journalists | about $28 | $0.45 | $1 to $2 | about $30 |

## 5. Unknown, and what would settle each

- Whether the filtered stream's price per delivered post is the same $0.005 (X's pricing page did not state it separately). One delivered post on a real rule settles it.
- What Perplexity charges per search through the Gateway as a unit. No longer needed for onboarding, which has run no web search since September 27.
- GPT-6 Luna fast's unit price per million tokens (the onboarding model). The Gateway catalog; its measured runs are in section 2.
- How many of a Wire monitor's 15-minute slots carry news on a real week (section 6 assumes half). The first Wire week.
- The fixed monthly bills (Vercel, Supabase, PostHog, Gmail). The owner's invoices.
- Judging and writing cost on the new product's real volume. The first week of a live monitor.

## 6. The tiers, the free week and the spending guards

Ruled September 28 (owner; the $5 and $30 are his, the $99 and the three pools the assistant's recommendation he accepted; decisions.md, Payment). Sites and feeds are unlimited on every tier; only watched X posts are pooled, and the monthly pool is the only allowance number. The arithmetic uses this file's unit prices: $0.005 a watched post, $0.015 a DM, judging and writing at the top of section 3's range ($1 a month for a light monitor, $2 for a full pool: the assistant's choice of the upper end), and Stripe at 2.9% plus $0.30 plus 0.7% Billing. Onboarding ($0.278 once) is not a monthly cost.

| Tier | Price a month | Pool of watched posts | X posts at full use | Alerts | Judging and writing | Stripe fee | Cost at full use | Margin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hobby | $5 | 100 | $0.50 | daily, $0.45 | $1 | $0.48 | $2.43 | about 50% |
| Creator | $30 | 3,000 | $15 | daily, $0.45 | $2 | $1.38 | $18.83 | about 37% |
| Wire, every 15-minute slot carrying news | $99 | 4,000 | $20 | 96 a day, $43.20 | $2 | $3.86 | $69.06 | about 30% |
| Wire, a normal week (half the slots, the assistant's assumption) | $99 | 4,000 | $20 | 48 a day, $21.60 | $2 | $3.86 | $47.46 | about 52% |

Stripe's fee per charge: $5 is $0.145 + $0.30 + $0.035 = $0.48; $30 is $0.87 + $0.30 + $0.21 = $1.38; $99 is $2.87 + $0.30 + $0.69 = $3.86. A fourth tier waits for a first payer. At zero the person's accounts pause until the month resets and sites continue; the picker shows each account's posts per day (one counts request, $0.005, cached) and a running total, and warns once when an account would empty the pool in under 10 days.

**The free week.** 300 watched posts (owner: "I'm okay with a $300 free week allowance", read as 300 posts) × $0.005 = $1.50, plus onboarding $0.278, plus a week of judging and writing (under $0.25, a quarter of section 3's "under $1" a month): about $2 a page, the assistant's arithmetic. The daily cap on anonymous builds is $200 (owner: "I'll give you a $200 budget for it"), reserved before each build and covering that page's free week, so it covers about 100 builds a day.

**X credits.** No auto top-up (owner: "I'm not switching on auto top-up at all"). The owner loaded $50 on September 28 for the test period; the Developer Console balance is $19.21 after it, so it was about $31 negative before; the console spend cap is $51.64 per billing cycle, and the cycle runs from the 5th to the 5th (now September 5 to October 5). The assistant's recommendation, recorded as such: load $50 more now (balance about $69) and set the cap to $70 for this cycle, then about $100 before ads or the first ten paying users; the month-one estimate of about $100 at ten paying users rests on an account being billed once however many people watch it and few people using a full pool. Code reads `GET /2/usage/credits` once a day and alerts at $20 and $10; when the ledger's own balance estimate drops under $15, public builds and free-week polling pause so paying users keep running. PostHog alerts to Slack on daily X spend, per-page spend and errors.

**The AI Gateway.** A budget on the key is a hard stop at its limit; the amount is the owner's to set and is not recorded here yet.
