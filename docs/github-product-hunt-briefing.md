<!-- Recovered September 15, 2026 from the Codex session of September 11 (rollout 01a08915-102a). The owner attached this file, written from Grok output, as standing context. One short passage in section 14 was truncated in the transcript. The roadmap (section 3.8) records what was decided about it. -->

# GitHub repo tracking — full briefing

**Date:** 2026-09-11  
**Purpose:** Hand this to another session as standing context. Covers how public GitHub (and adjacent surfaces) are actually monitored, which APIs exist, what does *not* exist, how accounts like @ottleyai / @CodebyNihan and sites like skills.sh / SkillsMP work, and a concrete design for a 10-minute beat digest correlated with Product Hunt and GitHub Trending.

**Product frame:** Oparax is a news desk — watch public sources, decide what is worth posting for a specific audience, then write. GitHub is one source type. Editorial judgment still sits after retrieval. Topic match alone is not enough.

---

## 1. What people think exists vs what exists

There is **no** official GitHub API called “trending,” “explore,” or “notify me of new tools in my niche.”

What exists:

| Surface | Official? | Role |
|---|---|---|
| Search Repositories | Yes | Discover repos by topic, stars, dates, language, keywords |
| Search Code | Yes | Find files (`SKILL.md`, `mcp.json`, etc.) across public GitHub |
| Events API | Yes | Recent activity (stars, forks, releases, pushes). Laggy, partial |
| Repo REST + GraphQL | Yes | Metadata, README, releases, topics for a *known* repo |
| Star history | Yes (2026-09-04) | Privacy-safe weekly/daily star counts, no stargazer identities |
| Webhooks / GitHub Apps | Yes | Real-time, but only for repos you can install on |
| `github.com/trending` | UI only | Must scrape or use unofficial wrappers |
| Topic pages (`/topics/mcp`) | UI + Search qualifier | Same data as `q=topic:mcp` |
| Product Hunt GraphQL | Separate product | Launches, votes, topics, often a GitHub/website URL |

Tracker accounts and marketplaces are **pipelines**: poll these surfaces on a schedule, store snapshots, compute velocity, join identities across sites, then rewrite into posts.

---

## 2. Two jobs (do not collapse them)

### Discovery — find *new* candidates in a beat

“New MCP server this week.” “New `SKILL.md` wave.” “Repo that went 12 → 800 stars.”

Tools: Search Repositories, Search Code, Trending scrape, PH daily posts, HN/X as extras.

### Watching — follow *known* entities

Releases, README changes, star deltas, new topics, first PH launch, appearance on Trending.

Tools: `GET /repos/{owner}/{repo}`, releases, star history, Events, conditional requests (`ETag` / `If-None-Match`).

A 10-minute product update is a **watch + emit** loop over a watchlist. Wide discovery belongs on a slower job (1–6 hours).

---

## 3. GitHub APIs in detail

Base: `https://api.github.com`  
Auth: `Authorization: Bearer <PAT>` plus `Accept: application/vnd.github+json`  
CLI: `gh api ...` (preferred locally)

Unauthenticated REST: 60 req/hour. Authenticated: 5,000 req/hour primary. Search is a **separate, tighter** budget.

### 3.1 Search repositories — main discovery API

```
GET /search/repositories?q={query}&sort=stars|forks|updated|help-wanted-issues&order=desc&per_page=100&page=1
```

Useful qualifiers:

```
topic:mcp
topic:ai-agents
language:TypeScript
stars:>=2500
stars:50..2000
created:>2026-09-01
created:2026-09-01..2026-09-10
pushed:>2026-09-03
in:name,description
in:readme
in:topics
user:OWNER
org:ORG
is:public
archived:false
fork:false
```

Examples:

```bash
# New-ish MCP repos gaining stars
gh api "/search/repositories?q=topic:mcp+created:>2026-08-01+stars:>20+archived:false&sort=stars&order=desc&per_page=20"

# Incumbent watchlist seed
gh api "/search/repositories?q=topic:ai-agents+stars:>=2500+archived:false&sort=updated&order=desc&per_page=50"

# Keyword beat (GitHub is NOT semantic)
gh api "/search/repositories?q=SKILL.md+OR+%22coding+agent%22+pushed:>2026-09-01&sort=updated"
```

Limits that shape every tracker:

- Max **1,000 results** per query (10 pages × 100).
- Query string max ~256 chars; keep AND/OR/NOT sparse.
- Search index lag: minutes to hours. Not a live firehose.
- Authenticated general search: about **30 req/min**. Code search tighter (~10/min).
- Unauthenticated search: about **10 req/min**.
- `incomplete_results: true` means the query timed out — treat as partial.

Topic pages on the website are this API with `q=topic:{name}`. There is no separate Topics-page endpoint.

### 3.2 Search code — how skill marketplaces exist

```
GET /search/code?q={query}
```

Requires authentication. Default branch only. Files under 384 KB.

This is the mechanism behind skills.sh / SkillsMP-style indexes. They do not wait for submissions. They grep public GitHub for a stable filename, fetch the file, parse frontmatter, store `owner/repo/path`, recrawl on a timer.

```
filename:SKILL.md
path:.claude/skills filename:SKILL.md
filename:mcp.json
filename:openclaw.json
path:.github filename:copilot-instructions.md
"name:" filename:SKILL.md
```

Same pattern works for any beat that has a **file convention**.

SkillsMP has indexed millions of public `SKILL.md` files. Aggregators (e.g. skilldb) merge SkillsMP + skills.sh + ClawHub. ClawHub also exposes its own list API (`GET https://clawhub.ai/api/v1/skills`, cursor pagination, no auth), which is how “skills weekly / movers vs rockets” tools snapshot install counts daily.

### 3.3 Events API — activity, not discovery

```
GET /events                          # public firehose (sampled)
GET /repos/{owner}/{repo}/events     # one repo
GET /users/{username}/events         # one user
GET /users/{username}/events/public
```

Relevant event types: `WatchEvent` (star), `ForkEvent`, `ReleaseEvent`, `PushEvent`, `CreateEvent` (repo or tag), `PublicEvent`.

Caveats:

- Explicitly **not** real-time. Latency 30 seconds to several hours.
- Public timeline is sampled, not complete.
- About **30 days** retained; older events disappear.
- Repo event timelines cap around 300 events.

Use as a cheap “something happened” signal. Do not treat as a complete ledger of stars.

### 3.4 Webhooks / GitHub Apps

Push, release, star, public, etc. immediately — **only** if the owner installs your app or you own the repo. A desk that covers the public internet cannot webhook every new repo. Public trackers poll Search + Events + metadata.

### 3.5 Repo metadata, README, releases

```
GET /repos/{owner}/{repo}
GET /repos/{owner}/{repo}/readme
GET /repos/{owner}/{repo}/releases
GET /repos/{owner}/{repo}/topics
GET /repos/{owner}/{repo}/commits?since=...
```

Always send `If-None-Match: {etag}` from the last snapshot. `304 Not Modified` is the cheap 10-minute poll.

Fields that matter for a desk: `stargazers_count`, `forks_count`, `pushed_at`, `updated_at`, `created_at`, `description`, `topics`, `homepage`, `license`, `archived`, `default_branch`.

### 3.6 Star history (shipped 2026-09-04)

```
GET /repos/{owner}/{repo}/stargazers/history
```

Privacy-safe replacement after individual stargazer listing was locked down to collaborators. Returns weekly buckets with per-day breakdowns. Cost scales with **repo age**, not star count (tens of requests for a huge old repo vs hundreds/thousands under the old page-every-stargazer method).

This is how you compute **stars/day** without storing who starred.

### 3.7 GitHub Trending — no official API

`https://github.com/trending?since=daily|weekly|monthly` plus optional `?spoken_language_code=` and language path.

GitHub has confirmed there is no first-party `/trending` or `/explore` REST endpoint. Options:

- Scrape the HTML (brittle; expect markup changes).
- Unofficial community APIs (they die without warning).
- Approximate trending yourself: Search `created:` or `pushed:` in a short window, sort by stars, compute stars/day from star history.

Treat scrape as an **extra signal**, not the core store.

### 3.8 GraphQL

Same data, fewer round trips when hydrating a watchlist (stars + releases + README + topics in one query). Primary budget is points/hour (~5,000 for a user token), separate from REST. Secondary limits still apply (concurrency, CPU). Use GraphQL for watch hydration; keep Search on REST.

---

## 4. Rate-limit math (why you do not recrawl the world every 10 minutes)

| API | Practical budget |
|---|---|
| GitHub REST primary | 5,000/hour authenticated |
| GitHub Search (repos etc.) | ~30/min authenticated |
| GitHub Search code | ~10/min |
| GitHub GraphQL | ~5,000 points/hour |
| Product Hunt GraphQL | ~6,250 complexity points / 15 min |
| PH other v2 | ~450 req / 15 min (treat as “fair use,” they reserve the right to cut you off) |

A beat watchlist of 200–400 repos cannot call Search for each of them every 10 minutes. Pattern:

1. Search / Trending / PH on **slow** clocks → candidates.
2. Persist a watchlist.
3. 10-minute loop only **diffs** watchlist metadata + Trending/PH snapshots.
4. Conditional GETs so unchanged repos cost almost nothing.

---

## 5. Product Hunt as a correlated source

Endpoint: `https://api.producthunt.com/v2/api/graphql`  
Auth: developer token, `Authorization: Bearer {token}`.

What you pull:

- Today’s featured/posts (name, tagline, votes, topics, comments, website, makers).
- Often a GitHub or homepage URL on the post — that is the join key.
- Vote counts over the launch day (velocity).

PH does **not** update like GitHub stars. New posts cluster after midnight Pacific. Votes move hard for ~24 hours, then freeze into a daily leaderboard.

Poll:

- Off launch window: hourly is enough.
- Launch day for posts already on the beat watchlist: 10–15 minutes for vote deltas.
- Do not page all of Product Hunt history every tick.

Join logic (identity resolution):

1. Explicit `github.com/owner/repo` on the PH post or website.
2. Homepage domain equals repo `homepage`.
3. Fuzzy name + maker GitHub handles.
4. Store one entity with `sources: [github, producthunt, trending]`.

A tool that is on Trending **and** launched on PH today should outrank a 12k-star incumbent that gained 3 stars.

---

## 6. How the public “repo news” accounts actually work

Accounts such as **@ottleyai (Liam \| AI Tools & News)** and **@CodebyNihan** are not raw GitHub bots. They are tool-news publishers. The hidden pipeline is almost always:

1. **Ingest many sources** — GitHub Search + Trending scrape, Product Hunt, HN Algolia (`item?tags=story,show_hn`), X, changelogs, Discord/Reddit.
2. **Dedupe** on canonical URL / repo full name.
3. **Score** — stars/day, PH upvotes, HN points, README-looks-like-a-product, recency, beat match.
4. **Editorial filter** — why this audience should care *today*. This is the desk layer.
5. **Rewrite** — README + first release notes → thread (hook, what it does, how to try, screenshot).
6. **Publish on a cadence** — RSS/queue → Typefully/Buffer, human picks the top few.

Google News picks them up when they also publish on a site/Substack with enough structure. Google is not reading GitHub.

Skills directories exploded because **`SKILL.md` is a grep-able convention**. Same architecture, narrower query, plus marketplace install counts.

---

## 7. Semantic beat vs GitHub topics

The user communicates a **beat** in natural language (“agent skills and coding-agent tooling,” “AI-orchestrated Linux / context fragmentation,” etc.).

GitHub Search is **boolean/keyword/topic**, not embedding search. You cannot send the beat sentence to `/search/repositories` and get meaning-ranked results.

Split the beat into a **profile**:

```yaml
beat:
  name: "agent skills & coding agents"
  embed_query: "tools that let coding agents install reusable skills and workflows"
  topics:
    - mcp
    - ai-agents
    - claude-code
    - openclaw
    - llm-agents
  keywords:
    - SKILL.md
    - "coding agent"
    - "agent skill"
    - "mcp server"
  code_patterns:
    - filename:SKILL.md
    - filename:mcp.json
  exclude_topics:
    - crypto
    - awesome-list
    - course
  exclude_name_regex:
    - "(?i)awesome-"
    - "(?i)cheat-sheet"
```

**Retrieval** (cheap, recall): topics + keywords + PH topic + trending language slice + code-filename search.

**Ranking** (semantic): embed `{name, description, topics, README first ~2k chars}` and compare to `embed_query`. Drop low similarity even if stars are high.

Incumbent list (LangChain, Open WebUI, ComfyUI, etc.) can be seeded once from `stars:>=2500 topic:...` and then only watched.

---

## 8. The 2.5k star floor — use it as a track, not the only gate

`stars >= 2500` means **already famous**. Good for:

- An incumbent watchlist.
- Ignoring junk forks and tutorial repos when you only want category leaders.

Bad as the only filter for “emerging tools.” The posts people notice are often:

- New repo, 80 → 1,200 stars in 48 hours.
- PH #1 today with a GitHub repo at 400 stars.
- First day on `github.com/trending`.

### Dual track

**Track A — Incumbents**  
`stars >= 2500` AND beat match. Watch releases, star velocity, PH mentions. Low noise.

**Track B — Rockets**  
Created or pushed recently, beat match, velocity above a cutoff (example: ≥80 stars/day, or first time on Trending/PH). Star floor low or none (50–200). No 2.5k requirement.

One output queue, each item tagged `incumbent` | `rocket`.

Lifetime stars are a **gate on track A**, not the rank function.

---

## 9. Cadence design (10-minute desk tick)

A 10-minute **emit** cadence is right. A 10-minute **full recrawl** is wrong.

| Job | Clock | Work |
|---|---|---|
| Desk tick | 10 min | Diff snapshots; emit only if something moved |
| Trending scrape | 15–30 min | Daily + weekly, 2–3 languages |
| PH today | 15 min on launch day, else 60 min | Posts + votes |
| Watchlist metadata | 10–30 min | Conditional `GET /repos` + releases |
| Star history | 6–24 h | Rebuild velocity; not every tick |
| Wide discovery (Search + code search) | 1–6 h | New candidates onto watchlist |
| README embed refresh | On change only | Hash README; re-embed if changed |
| Watchlist GC | Daily | Drop archived / 90 days stale + flat stars |

Empty ticks are success. Do not generate a “top 10” of the same 40 names every 10 minutes.

Pseudo-loop:

```
every 10 min:
  load last snapshots
  refresh cheap sources if their own TTL expired
  dirty = entities with Δstars, new release, new trending row,
          PH votes +N, new source link, first_seen
  if dirty is empty:
    emit nothing
  else:
    rescore dirty ∪ previous top band
    emit 5–15 items with "why this tick"
```

Overnight / hourly discovery:

```
q=topic:mcp stars:>=50 created:>2026-08-01 archived:false
q=topic:ai-agents pushed:>2026-09-03
q=filename:SKILL.md pushed:>yesterday   # code search
```

Promote anything that clears similarity + velocity onto the watchlist.

**Watchlist size target per beat:** 150–400 entities, not “every repo over 2.5k on GitHub.”

---

## 10. Scoring

Suggested starting weights (tune per beat):

```
S = 0.35 * beat_similarity
  + 0.25 * velocity
  + 0.20 * source_overlap
  + 0.10 * freshness
  + 0.10 * incumbent_bonus
```

Definitions:

- **beat_similarity** — embedding cosine vs `embed_query`, plus binary topic/keyword hits. Hard drop below a floor (e.g. 0.35).
- **velocity** — GitHub stars/day and PH votes/hour. Use recent window (24–72h), not lifetime.
- **source_overlap** — +1 on Trending now, +1 PH launched today, +1 featured on a topic page / collection.
- **freshness** — first seen in last 72 hours.
- **incumbent_bonus** — small constant so a Claude Code / LangChain *release* still surfaces without drowning rockets.

“Why this tick” examples to attach to each card:

- “+420 stars in 18h; first time on Trending (TypeScript, daily).”
- “PH #2 today, repo linked, 310 votes in 6h, beat similarity 0.72.”
- “Incumbent: new GitHub Release v1.4.0 after 3 weeks quiet.”

That sentence is what the desk (or the other model session) needs. Raw star totals are not.

---

## 11. Data model (minimum)

```text
beats
  id, name, embed_query, topics[], keywords[], code_patterns[],
  exclude[], incumbent_star_floor (default 2500)

entities                          # one tool / project
  id, canonical_name,
  github_full_name, github_url, homepage,
  ph_slug, ph_url,
  description, topics[],
  first_seen_at, last_seen_at,
  track (incumbent|rocket|watch),
  beat_similarity,
  archived

snapshots                         # time series
  entity_id, ts,
  stars, forks, pushed_at,
  ph_votes, ph_rank,
  on_trending (bool + period + language),
  sources[]

releases
  entity_id, tag, published_at, name, body_excerpt

documents
  entity_id, readme_hash, readme_excerpt, embedding

events_out                        # what the desk emitted
  ts, entity_id, score, why_this_tick, payload
```

Identity keys, in order: `github_full_name` → PH slug → homepage host → fuzzy name.

---

## 12. Suggested source adapters

### GitHub Search adapter

- Build 3–6 queries from the beat profile (incumbents, recent created, recent pushed, keyword).
- Paginate to at most a few hundred hits per query; stop at 1,000 cap.
- Upsert entities; never use Search as the 10-minute path.

### GitHub watch adapter

- Conditional GET metadata.
- Releases since `last_release_at`.
- Star history every 6–24h → `stars_per_day_24h`, `stars_per_day_7d`.

### Trending adapter

- Scrape or unofficial JSON for `since=daily|weekly`, languages relevant to the beat (often TypeScript, Python, Go, or “all”).
- Mark `on_trending=true` for those full names this period.
- Join to entities; create rocket candidates if unknown.

### Product Hunt adapter

- GraphQL: today’s posts (and yesterday during the morning overlap).
- Fields: name, tagline, votesCount, commentsCount, topics, website, url, slug, createdAt.
- Resolve GitHub URL.
- Store vote snapshots for launch-day velocity.

### Code-search / skills adapter (optional, beat-specific)

- `filename:SKILL.md` (or beat-specific filenames).
- Parse YAML frontmatter.
- Entity path = `owner/repo/skill-path`.
- Snapshot whatever install counts the marketplace APIs expose.

### Optional extras (same join, lower priority)

- HN Algolia: `http://hn.algolia.com/api/v1/search?query=github.com/{owner}/{repo}`
- X: keyword or semantic search for the repo URL or tool name (noisy; use as overlap bonus, not retrieval).

---

## 13. What you can build on top (in increasing product depth)

1. Personal watchlist of ~50 named repos → Slack/email on release or star jump.
2. Interest-area firehose → daily digest of new + fast repos in a topic.
3. Creator desk → GitHub + PH + Trending + HN → scored queue → draft posts (Oparax-shaped).
4. Marketplace clone → index every `SKILL.md`, snapshot installs, publish a directory.
5. Competitor radar → watch a set of orgs and their new public repos.

Oparax sits at (3): candidates in, editorial “should we post, in what angle” after the score.

---

## 14. Worked example (one beat, one hour)

Beat: “coding-agent skills and MCP tools.”

Hourly discovery queries:

```
topic:mcp stars:>=50 archived:false
topic:ai-agents created:>2026-08-01 stars:>=20
topic:claude-code pushed:>2026-09-01
filename:SKILL.md   # code search, recent indexed
```

Incumbent seed (run once, then watch):

```
(topic:mcp OR topic:ai-agents OR topic:llm-agents) stars:>=2500 archived:false
```

10-minute tick sees, for example:

- `someorg/fast-skills` — created 2 days ago, 90 → 640 stars, on Trending daily TS, README men…61 tokens truncated… with overlap bonus.

Digest to the desk: 7 cards, each with why-this-tick. Empty is allowed.

---

## 15. Implementation notes

- Prefer `gh` + official Octokit over one-off HTTP.
- Cache Search results by query hash + hour.
- Respect `Retry-After` and secondary rate limits (too much concurrency, too much CPU). Cap concurrent GitHub calls well under 100.
- Trending scrapers break. Isolate them. Core store must survive a dead scraper.
- README embeddings: truncate, skip binary/huge READMEs, skip awesome-lists via exclude rules.
- Do not page stargazer lists; use `/stargazers/history`.
- Stars can be gamed. Pair velocity with overlap (PH/HN/Trending) and README-looks-real heuristics (has install instructions, license, more than one commit day).
- Archived, mirrors, and `awesome-*` lists should be default-excluded unless the beat is “curated lists.”

Official docs to keep:

- Search: https://docs.github.com/en/rest/search/search
- Events: https://docs.github.com/en/rest/activity/events
- Rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Star history changelog: https://github.blog/changelog/2026-09-04-new-api-endpoint-provides-privacy-safe-star-history-data/
- Product Hunt API: https://www.producthunt.com/v2/docs
- PH GraphQL: https://api.producthunt.com/v2/api/graphql

---

## 16. Decisions already made in this thread (carry forward)

1. GitHub is a **source adapter** for a news desk, not the product.
2. Use official Search / Code / repo / star-history / Events. Scrape Trending only as a bonus signal.
3. Semantic understanding lives in **our** embed + exclude layer, not in GitHub Search.
4. Correlate GitHub × Product Hunt × Trending via a canonical entity, not three separate feeds.
5. 10 minutes = change digest. Discovery is slower.
6. 2.5k stars = incumbent track. Rockets use velocity + overlap with a low or no floor.
7. Emit only when something moved. Attach “why this tick.”
8. Editorial judgment (is this worth posting, for whom, in what angle) remains after ranking.

---

## 17. One-paragraph summary for a new session

Monitor a user-defined beat by turning it into topics, keywords, and an embedding query. Retrieve with GitHub Search (`topic:`, `created:`, `pushed:`, `stars:`) and Search Code (`filename:SKILL.md` etc.), plus Product Hunt’s GraphQL daily posts and a scrape of `github.com/trending`. There is no official Trending API. Join everything onto one entity keyed by `owner/repo`. Watch incumbents (e.g. ≥2.5k stars) and rockets (low star floor, high stars/day or first PH/Trending hit) separately. Poll Search/discovery every few hours; every 10 minutes only diff watchlist metadata, PH votes on launch day, and Trending membership; emit a short scored digest when deltas exist. Rank by beat similarity, velocity, source overlap, and freshness — not lifetime stars. That queue is input to the desk, not the published post.
