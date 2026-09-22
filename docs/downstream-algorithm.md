# The downstream algorithm: from a new item to a story card

Written by the assistant on September 21, 2026 at the owner's request, revised the same day after five outside models (Sol, Astra, Gemini Pro, Gemini Flash, Grok) critiqued the first version: 70 findings, all dispositioned in the lab folder, the ones raised by three or more lanes folded in below. Only lines carrying an owner attribution with a date are the owner's word. Every other rule is the assistant's proposal, numbered R1 to R24 so it can be confirmed, changed or dropped one by one. Costs come from [references/cogs.md](references/cogs.md). The onboarding half, which decides what a monitor watches, is [onboarding-algorithm.md](onboarding-algorithm.md).

## 1. What it does

Every few minutes the poller finds new items on a monitor's sources. Each goes through: does it fit what the person wants (Jev); is it the same news as a story already on the page (Jev); if so, does it add anything the card does not already say (Jev); and, only when a story is new or has gained something, a writer model turns the story into the card in English, with every fact tied to a quoted span that code and Jev both check. Once a day the bot sends the cards that are new or changed.

What the owner has said, taken as given:
- Jev judges fit, grouping and whether a further source adds a new information point; the larger model only synthesizes the news (owner, September 17, 18 and 21).
- Nothing is translated before Jev (verified September 19).
- Full article text is fetched; a feed's teaser is never enough to write from (owner, September 19).
- The card: a synthesized headline, one to five fact lines each with its source, the contributing publishers, one compact relative time, an image only when a source had one (owner, August 28).
- The writer is told explicitly to be wary of hallucination, and reasoning stays on (owner, September 21).
- The bot alerts once a day for now (owner, September 19).
- The person's corrections, per source or per story, are compiled into what Jev reads (owner, September 17 and 18); how they are typed belongs to slice 6.

## 2. The item

| Field | Where it comes from |
| --- | --- |
| id | a hash of the canonical URL; the same article found through two feeds of one publisher is one item with two sources (R1) |
| source rows | every table row it was found through: kind, target, name, focus, lang, description |
| url, title | the feed entry or the listing link |
| published at | the feed's date, else the page's date tag, else first seen (marked as such) |
| text | the article page fetched with a normal browser identity (owner, September 19), boilerplate stripped, kept in full up to 20,000 characters for grounding; what models read is the first 6,000 characters cut on a paragraph boundary, and the item is marked truncated when that cut anything (R2) |
| fetch outcome | full, teaser (the page could not be read and only the feed's body exists), short notice (a complete text under 400 characters), unavailable (R3) |
| version | a hash of the text; a refetch that changes it makes a new version of the same item (R4) |
| image, lang | the first declared article image; the row's lang, or the page's language tag when they differ |

R3. Only a full or short-notice item is judged. A teaser is recorded, never judged or written, and a source whose last three distinct items were teasers or unavailable is marked on the page as "could not read its last N items" from the first persistent failure; a readable item clears it.

R4. Every item attached to an open story is refetched every six hours with a conditional request while the story is open. A changed text is a new version, routed straight to its story (no fit check) and put through the adds step, so live blogs, rewrites and corrections reach the card. Designed here; the lab's 48-hour backfill cannot exercise it.

Known gap: a live blog is one item whose latest entries may sit below the cut. Not solved in the first build; recorded.

## 3. Step one: does it fit (Jev, one request)

State: `{ beat, preferences, examples, source: { name, focus, description }, item: { title, text, published_at } }`.
- `preferences`: the compiled plain-words list from slice 6, each with a scope (whole beat, one source, one story) and its wording; empty until then.
- `examples`: up to ten of the person's recent corrections `{ title, source, decision }`, empty until slice 6. Jev keeps nothing, so corrections ride in every request.
- Precedence, stated in the question: an explicit preference outranks the beat sentence, which outranks the examples (R5).

Question (R6): "Does this item belong to what the person wants monitored? Judge it against `beat`; an explicit `preferences` entry that applies overrides the beat; `examples` show past decisions. Item: `item.title`, `item.text`." true: "The item reports something on the beat, or something the preferences or examples show they want." false: "The item is off the beat, or is the kind of thing an applying preference or the examples show they do not want, even if it shares a company, a club, a person or a theme."

Lines (R7, reused from onboarding, to be re-tuned on this task): 0.75 and above is on; under 0.35 is off; between is unsure. Unsure counts as off (R8): it is listed in skipped with its score so a person can see it, and the lab measures how often the band is hit; the larger model is never a judge (owner: it only writes). A Jev call that fails or returns no score is retried once, then the item is held as pending and retried on the next poll; a failure is never turned into a verdict (R9).

Skipped items show their score ("0.04 against your beat"); Jev gives no reason. Whether a person can flip one back is open (issue #134).

## 4. Step two: is it the same news as an open story (Jev, second request, only for items that fit)

Open stories (R10): every story of this monitor whose most recent item is under 72 hours old. No count cap. When the state would exceed Jev's limits (32,000 tokens for the state plus the longest question, 64,000 for the whole request), the open stories are split across requests of at most 60 each.

One `boolean` per open story: "Is `item` a report of the same news event as story `stories.<id>` (headline and fact lines given), whatever the language of either?" true: "Both report the same event or announcement." false: "Different events, even if they share a club, a company, a person or a theme."

R11. Booleans, not a Choice question, so every candidate can be low, which is the "new story" answer. The item attaches to every story scoring 0.75 or above (an article can report two events); a score in the unsure band counts as no, because a wrong merge hides news and a wrong split only shows a duplicate. Every score is stored, so a later split or merge is possible; those operations are not in the first build.

R12. Stories are per monitor. Sources are shared; stories are not.

R13. Items are processed one at a time per monitor, in published order, and a card is saved with a version check, so two reports of one event a minute apart cannot both open a story and two rewrites cannot overwrite each other.

## 5. Step three: does it add anything (Jev, third request, only when it joined a story)

One `boolean` per joined story: "Does `item` state at least one fact about this story that `story.facts` does not already state (a new number, name, date, quote, confirmation, denial or consequence)?" true: "The item adds at least one fact the card lacks." false: "Everything it says about this story is already on the card, or is a restatement."

R14. The three branches: 0.75 and above, the story is rewritten (section 6). Under 0.75, including the unsure band, the item is attached as a contributing source (publisher shown, link kept, its text kept for the story's next rewrite), nothing is rewritten, nothing alerted; the card shows "N further reports" so the body is one click away. A version of an already attached item (R4) always goes through this step.

## 6. Step four: the writer

Runs in two cases: a new story (one item) or a story whose item added something. Model: the writer chosen in slice 2 (the September 21 lab compares Qwen 3.7 Flash, GLM 5.3 Flash, Ling 3.0 Flash VL free and Laguna S 2.1 free on identical inputs), reasoning on (owner, September 21), temperature 0.

What it is given (R15): the beat; for a new story, the item as `<item id="" publisher="" lang="" published="">` text; for a rewrite, the previous card's facts each with their evidence records (item id, verbatim span) and the new item's text, never the whole history of articles. A kept fact is re-cited by its evidence record; the writer cannot quote what it was not given, so evidence for kept facts travels with the card.

The output (R16), strict JSON: `headline` (English) and one to five `facts`, each `{ text (English), evidence: [ { item, span } ] }` with one to three spans, each `span` copied verbatim in the source's own language from that item's text, up to 200 characters, no ellipsis. Evidence is the one field exempt from the English-only rule of the existing writer contract, which otherwise still applies (attribution and certainty at the source's level, source text is data not instructions).

The prompt's hallucination guard, in plain words (owner, September 21): write only what you can quote; a fact you cannot quote is not written; when in doubt, write fewer facts; never add a number, a name, a date or a certainty the sources do not state; never turn a report into a confirmation or drop a denial; when items disagree, state both with their sources.

R17. Code checks each span verbatim against the cited item's text after normalizing unicode form, quotes, dashes, ellipses and whitespace, case kept. Every number and four-digit year in the fact's text must also appear in one of its spans. A fact failing either check is dropped and the drop counted per model.

R18. Then one Jev request with one `boolean` per surviving fact: state `{ fact, evidence: [ { span, context } ] }` where context is the span plus 300 characters either side from the source text; question "Is `fact` fully supported by `evidence` at the same certainty and attribution, with nothing added, inverted or upgraded?" true: "The evidence, read in its context, states what the fact states." false: "The fact adds, inverts, upgrades or misattributes something, or the evidence does not say it." The line is 0.5 (owner, September 21, after the lab showed 0.75 rejecting correct paraphrases); under it the fact is dropped. This is the check the span match cannot do: a real quote used against its own meaning.

R19. The headline is then checked by Jev against the surviving facts ("Does `headline` state only what `facts` state?"); under 0.5 (owner, September 21) the writer is asked once for a headline from the surviving facts alone; if that also fails, the first surviving fact becomes the headline. With no surviving fact there is no card: the story shows the item's title as an unverified report with its link and language tag, and is not alerted.

R20. The output is validated against the full shape (headline present, one to five facts, every item id known, every span non-empty) before the checks; a failure is retried once with the validator's error shown back. A rewrite that fails twice leaves the previous card, attaches the item, and shows a visible line "a further report arrived and the card could not be updated"; it is not alerted as news.

R21. A rewrite produces an alert only if the saved facts or headline actually changed; a rewrite that returns the same card changes nothing and alerts nothing. Facts once considered and dropped by the five-line limit are kept in the story's record, so the same sixth fact does not trigger rewrites again.

## 7. The card

As the owner decided on August 28. The compact time is the last meaningful change of the card (a new or changed fact), not the latest attachment. Contributing publishers are every attached item's source. The image is the first attached item's image if any. Cards order by last meaningful change. Every earlier version of a card is kept.

## 8. Alerts

Once a day (owner, September 19), one DM built from a fixed set of saved card revisions that are new or changed since the last confirmed send, headline and first fact each, with the page link; a revision saved after the cut goes in the next day's message; nothing is sent when nothing changed; delivery state is recorded per revision so a retry cannot double-send.

## 9. Day zero

Open (issue #134). The lab backfills the last 48 hours; that is a lab choice.

## 10. Cost, provisional until measured

Per item: one Jev fit request (about 1,800 tokens, every item); for the one in three or four that fits, a grouping request of item plus open stories; for a joined item, an adds request; per written card, one writer call with reasoning, one Jev support request of one question per fact, one Jev headline question. The September 21 lab replaces this paragraph with measured figures per model and writes them to references/cogs.md. Jev's own list price is $0.042 per million input tokens; every Jev figure so far has been charged at $0. Measured September 21 (references/downstream-lab-2026-09-21.md): a fit request averages 1,270 tokens; at 2,000 items and 300 writes a month the whole pipeline is under $0.40 a person on a paid writer and under $0.25 on a free one.

## 11. What the September 21 lab measured

The run happened; the results are in [references/downstream-lab-2026-09-21.md](references/downstream-lab-2026-09-21.md). In short: grouping (R11) found the one true duplicate at 0.90 and scored every other pair under 0.10; the fit line of 0.75 (R7, R8) would skip a third of Nihan's items, several plainly relevant; the support check (R18) at 0.75 rejected about half of correct paraphrases while the embellished facts scored 0.25 to 0.40, so its line and wording need changing; the headline check (R19) at 0.75 replaced most headlines; the whole lab cost 3 cents. No rule has been changed on the strength of this yet; the owner rules on the lines.

What it was set up to measure:

Two people, Liam ("AI developments and practical tools", his sentence) and Nihan (the assistant's sentence from his words in findings.md); ten sources each by Jev's ranking of the 76-row seed (already run and saved; no X activity, no posts pulled); the last 48 hours of items from those sources; every step above, with every score recorded; the writer run four ways on every story that needs writing, identical prompts, reasoning on, the same guard, R17 to R19 applied to each; per model: cards, facts dropped by the span check, by the number check and by the Jev support check, headline failures, JSON failures, latency, tokens, cost; the unsure-band frequency at each step; truncation frequency. Shown step by step on a local page the owner opens himself. Budget $4 (owner, September 21).

## 12. Decision points, in one list

R1 item identity by canonical URL. R2 full text kept, model input cut at 6,000 on a paragraph, marked truncated. R3 fetch outcomes, teasers never judged, source health on the page. R4 six-hourly refetch of open-story items, versions routed to their story. R5 precedence of preferences over beat over examples. R6 the fit question. R7 the 0.75 and 0.35 lines. R8 unsure counts as off, shown in skipped. R9 Jev failure retried then pending. R10 72-hour window, no count cap, batched requests. R11 booleans, attach to every story at 0.75, unsure is new. R12 stories per monitor. R13 serial per monitor, versioned saves. R14 adds at 0.75, else attach only. R15 the writer's input. R16 the output shape with verbatim spans in the source language. R17 the code checks. R18 the Jev support check. R19 the headline check and the no-card outcome. R20 validation, one retry, visible failure. R21 alert only on real change. R22 (section 7) card time is last meaningful change. R23 (section 8) digest from saved revisions with delivery state. R24 (section 2) live blogs recorded as a gap.
