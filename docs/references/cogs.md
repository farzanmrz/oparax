# What it costs to serve one person (COGS)

The one place for every cost Oparax pays to run the product, across every surface it touches: the unit price, where that price comes from, what was measured, and the arithmetic per person per month. Any plan, brief or pricing discussion takes its numbers from here and nowhere else. When a price or a measurement changes, change it here first.

Rules for this file: a number is either **verified** (read from the provider's own documentation or bill, with the date) or **measured** (from a real run, with the date) or it is marked **unknown**. Nothing is guessed. No selling price is decided; this file is only about cost.

Started September 19, 2026.

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
| Grok 4.7 through the Vercel AI Gateway | tokens | $1.20 in, $3.60 out, $0.30 cached input read, per million | verified from the Gateway catalog, September 21; the onboarding model since that day (owner, September 21), replacing Grok 4.6 at $2 in and $6 out |
| Qwen 3.7 Flash through the Gateway (`alibaba/qwen3.7-flash`, the judging and writing model today) | tokens | $0.03 in, $0.13 out per million | verified from the Gateway catalog, September 21; retention none, no training |
| Candidates for judging and writing, compared September 21 at the owner's request on the product's real prompts (2 cents, 708 calls; full write-up in [model-comparison-2026-09-21.md](model-comparison-2026-09-21.md); no choice made yet) | tokens | GLM 5.3 Flash (`zai/glm-5.3-flash`): billed $0.075 in / $0.25 out (Vercel's public page; the catalog's $0.15 / $0.50 is not what is charged), paid through a DeepInfra key attached to the Gateway account, not Gateway credits; Ling 3.0 Flash (`inclusionai/ling-3.0-flash`): $0.021 / $0.063, about half that in practice from cache reads; Ling 3.0 Flash VL free (`inclusionai/ling-3.0-flash-vl-free`): $0 | Per person per month at 2,000 judged and 500 written, reasoning off: Qwen $0.09, GLM $0.23, Ling paid $0.05, Ling free $0. Quality: GLM best judge on every set and the only writer with no invented facts (but slow, and dropped the title on 3 of 12); Qwen fast and always well formed but invented or inverted a fact in 4 of 12 articles; free Ling matched GLM on clean judging sets, never rate-limited in 350 calls, carries no retention promise |
| Jev (TypeSafe) through the Gateway as `typesafe-ai/jev` | input tokens; output free | $0.042 per million | verified from the Gateway catalog, September 21; the Gateway response now reports the dollar figure per call (`providerMetadata.gateway.cost` charged, `marketCost` at list), so Jev's cost is read, not estimated. The September 21 test call (3,336 tokens) reported marketCost $0.000140 and cost $0 charged; the direct TypeSafe API, the previous path, reported tokens only |
| Perplexity search through the Gateway | per search | read from the Gateway response per call | not recorded as a unit price |
| Websites and feeds | fetching | free | conditional requests that return "not changed" cost nothing |
| GitHub API | reads of public data | free | the limit is request rate (search 30 a minute), not money |
| Product Hunt API and feed | reads | free | the limit is 6,250 points per 15 minutes; commercial use needs their permission by email |
| Bright Data | one unlocked fetch | $0.0015 | verified; left out of the first build |
| Stripe | per successful card payment | unknown here | its standard published rate has not been checked for this file |
| Vercel, Supabase, PostHog, Gmail | fixed monthly bills | unknown here | amounts not recorded; they do not change per person at this size |
| X ads | acquisition | set by the owner per campaign | not a serving cost; tracked apart |

## 2. What was measured

| What | Result | When |
| --- | --- | --- |
| Onboarding one person (read, rank, pick, write rows), on Grok 4.6 | $0.076 for Reshad, $0.256 for Liam; at Grok 4.7's price the same runs come to about $0.054 and $0.164 (Grok's token share times 0.6; the X search fees, 2 cents a person, and Jev unchanged; Liam's one Perplexity search assumed at half a cent, its price never read) | September 19, recomputed September 21 |
| The same before the algorithm was simplified | $0.97 and $1.06 | September 15 |
| The read step once xAI bills per post | adds roughly $0.10 to $0.15 | estimate from the post limits |
| Judging one item (Qwen) | $0.000116 | August |
| Writing one item into English headline and fact lines (Qwen) | $0.00025 | August |
| Jev judging 24 items twice plus 8 pairs twice | about $0.0004 in total | September 19 |
| The downstream lab end to end, two people, 47 items, four writers with reasoning on (downstream-lab-2026-09-21.md) | $0.030 for everything; per writer for 32 cards: Qwen $0.016, GLM $0.013, Ling and Laguna $0; a Jev fit request 1,270 tokens, $0.000053 at list, charged $0 | September 21 |
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

**Bot alerts.** Decided for now (owner, September 19): the bot alerts once a day. 30 sends × $0.015 = **$0.45 a month per person**, plus $0.010 each time the person replies to the bot. For comparison, other cadences at the same price per send:

| Cadence | Sends a month | Cost a month |
| --- | --- | --- |
| Once a day (current) | 30 | $0.45 |
| Every 4 hours | 180 | $2.70 |
| Every 2 hours | 360 | $5.40 |
| Hourly | 720 | $10.80 |
| Every story the moment it lands, busy monitor | 450 to 1,500 | $7 to $22 |

**Judging and writing.** Every new item from every source is judged ($0.000116); items on the beat are also written ($0.00025). A monitor seeing 2,000 items a month of which a quarter are on beat: 2,000 × $0.000116 + 500 × $0.00025 = about $0.36. Jev as the first pass costs less than a tenth of a cent a month at that volume. Earlier estimates of $1 to $8 a month came from busier monitors. Measured on the new design September 21 with reasoning on: under $0.40 a person a month on a paid writer (Qwen or GLM at 300 cards), under $0.25 on a free one, Jev included at list price.

**Onboarding.** Once per person: $0.08 to $0.26 measured on Grok 4.6 (about $0.05 to $0.16 at Grok 4.7's price), plus $0.10 to $0.15 when xAI's per-post billing starts. A new source found during onboarding is saved to the shared table, so the next person with that beat does not pay to find it again.

**Fetching.** Free. Each source is fetched once for everyone who watches it, so this does not grow with the number of people.

**GitHub and Product Hunt.** Free to read. Their cost is the same judging and writing as any item.

## 4. One person, added up

With alerts once a day, before payment fees and fixed bills:

| Person | Watched X posts | Alerts | Judging and writing | About, a month |
| --- | --- | --- | --- | --- |
| Web only, no watched accounts | $0 | $0.45 | under $1 | $1 to $1.50 |
| Five company or founder accounts, replies filtered out | about $2 | $0.45 | under $1 | about $3.50 |
| The same five, replies not filtered | $5 to $10 | $0.45 | under $1 | $6 to $11 |
| 3,000 watched posts a month, fully used | $15 | $0.45 | $1 to $2 | about $17 |
| A football wire: one outlet and two journalists | about $28 | $0.45 | $1 to $2 | about $30 |

## 5. Unknown, and what would settle each

- Whether the filtered stream's price per delivered post is the same $0.005 (X's pricing page did not state it separately). One delivered post on a real rule settles it.
- Stripe's fee on a real payment. The first sandbox payment shows it.
- What Perplexity charges per search through the Gateway as a unit. The Gateway response of the next real build shows it.
- The fixed monthly bills (Vercel, Supabase, PostHog, Gmail). The owner's invoices.
- Judging and writing cost on the new product's real volume. The first week of a live monitor.
