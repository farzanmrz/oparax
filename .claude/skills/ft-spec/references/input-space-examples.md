# Input-space examples: enumerations and reality probes

Worked derivations for phase 3 (spec the input space) and phase 2 (ground against reality). The rule these examples serve: the miss that ships is rarely exotic — it is the most common real behavior, displaced because the spec was written around one demo example.

## Enumeration: website source entry (the shipped miss, #112)

The entry point admits at least these classes; #112's spec named only one (the section page) and every other class inherited whatever the code happened to do:

| Class | Real instance | Disposition the spec must state |
| --- | --- | --- |
| Apex with a news sitemap | `nytimes.com` | handled — sitemap discovery |
| Apex, bot-blocked, no sitemap/feed | `cadenaser.com` (homepage 403s, robots has no `Sitemap:`, all `/sitemap*.xml` 404) | the class that shipped as a silent hard-fail; a spec must pick: intelligent narrowing, probe fallback, or graceful failure with recovery copy |
| Section page, article-dense | `cadenaser.com/deportes/futbol/` (52 article links, ratio 0.38 — passes listing) | handled — listing extraction |
| Article URL | any article-shaped path | handled or rejected with copy naming what to paste instead |
| Unreachable / NXDOMAIN | typo'd domain | graceful failure — "Couldn't reach this site" |
| Reachable but not a news site | `example.com` | graceful failure — honest "no articles found" |
| Private/internal host | `localhost`, `10.x` | rejected inline before reservation (existing invariant) |

## Enumeration: X handle entry

| Class | Disposition to state |
| --- | --- |
| `@handle` clean | handled |
| handle without `@` | normalize and handle |
| full profile URL pasted (`x.com/name`) | normalize or reject with copy |
| nonexistent / suspended handle | graceful failure, never a silently dead source |
| the owner's own handle | handled — allowed by owner decision 2026-08-08; self-posts flow through drafting |

## Enumeration: Slack reply entry (dormant email analog identical)

| Class | Disposition to state |
| --- | --- |
| plain replacement text | handled — draft body replaced |
| "approve" with casing/whitespace noise | handled |
| reply carrying Slack's auto-quoted `>` lines | quotes stripped before comparison |
| emoji reaction, no reply | state it: acted on, or explicitly inert |
| reply after the draft was already actioned | idempotent, with feedback |
| attachment-only reply | explicitly inert with feedback, or out of scope at the gate |

## Enumeration: free-text fields (beat, guidance)

One word, two words, a pasted paragraph, non-English, emoji. The modal beat is two words, not the well-formed sentence demos use; every model prompt consuming the field is specced against the two-word case.

## What "probe the real thing" concretely means

- **A domain the journeys name:** `curl -sS -A "Mozilla/5.0" -o /dev/null -w "%{http_code}" https://<domain>/`, plus its `robots.txt` (does a `Sitemap:` line exist — a bot NAME containing "sitemap" does not count), plus the conventional `/sitemap*.xml` and feed paths. Thirty seconds; run it for the apex AND the deep link, because they take different discovery paths.
- **An external API the slice consumes:** one real call with the least-privileged token available; record the actual payload shape next to the type the code assumes — the two diverge more often than not.
- **Existing data the feature reads:** the real Supabase rows (via `supabase-runner` for bulk), not the schema file's idea of them; a column that is nullable in practice invalidates a spec that assumed presence.
- **A third-party rendering surface** (Slack Block Kit, email clients): render the real payload in the real surface once (Block Kit builder counts) before the spec commits to a layout.

Every probe result lands in `.feature/probes.md` with the date — the critique lanes get it as ground truth, and a stale probe is re-run, not trusted.
