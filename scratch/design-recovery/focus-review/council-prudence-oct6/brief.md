# Council: what Oparax's owner should do next, given six weeks without shipping (October 6, 2026, late night)

Repo: /Users/farzanm4/Desktop/repos/oparax (branch beta; read-only for you). You are an ADVISER. Answer the owner's questions at the end, plainly, in product terms, with a recommendation and its reason. He wants your honest read of his own pattern, not flattery.

## Who he is and how this evolved (read these files, they are the ground truth)

- docs/roadmap.md: the product. Oparax monitors sources and alerts one person on X. A person signs up, types an X handle and one sentence (the beat), the engine builds their agent (recommends sites, feeds and X accounts from a shared table of 150 sources), then the agent watches those sources daily, judges new items against the beat (Jev), groups reports of one event into one story card (Qwen 3.7 Flash writes it), and alerts through X DMs from the bot @oparax_ai. Three paid tiers gate by watched X posts; sites and feeds are unlimited.
- docs/references/decisions.md: every rejection and reversal, dated. Read it whole: it shows the shape of his decisions (reversed twice on Jev, dropped web search, dropped PDFs "introduced for no damn reason", cut onboarding to three steps on September 27 saying "I've overcomplicated for no damn reason", rejected a from-scratch rebuild as "not prudent").
- docs/references/engineering.md: the engineering principles and the stage flow (/feature, build, qc, ship, promote).
- docs/references/cogs.md: measured costs (onboarding $0.278, 24 seconds, September 27; Jev $0.042 per million tokens).
- scratch/design-recovery/focus-review/history/owner-history.md: every design message October 2 to 4 verbatim, with loves, hates, reversals, themes. This is the design saga: sixteen passes of one UI, five council rounds, the owner saying he has not shipped for a week because of it.
- scratch/design-recovery/focus-review/PAGE-NOTES.md: his verbatim page notes.
- scratch/design-recovery/focus-review/RUN-STATE.md: the top RESUME section and the newest bullets at the bottom: the design (pass 16) is now ported into the product and live on beta.oparax.ai; auth was verified tonight.
- lib/onboarding/engine.ts and lib/onboarding/prompts.ts: the real onboarding algorithm and the model's prompt. lib/ai/jev.ts and lib/guards/ledger.ts: the Jev call and its size cap. lib/feed/prompts.ts: the feed judge questions (FIT, GROUP, ADDS) and the writer prompt.

## The timeline, in short (host's summary; the files above are authoritative)

- August: an earlier loop that cost $23 a day. September 14: narrowed to monitoring only. September 18 to 21: onboarding on Grok, then a nine-tool Luna agent. September 27: cut to three steps ("overcomplicated for no damn reason"). September 28: the whole product built in one day (sign-up, feed, free week, Stripe, DMs). October 2 to 5: sixteen design passes of the "One" UI with five councils; he said "me not being able to ship for the past 1 week because of this". October 5: the design ported into the product and live on beta; auth flows verified. October 6 (tonight): the first real build attempt on beta FAILED at the Jev scoring step with `state_too_large` (lib/ai/jev.ts: each batch of 60 questions carries all 156 candidates; the cap estimates 2 chars per token; the table alone estimates at 41k against a 32k cap). So no build in the product has ever passed that step since September 28; the September 27 lab run (same table) passed because the cap did not exist yet.
- He has test people waiting (five accounts named in cogs.md) and nobody has used the product yet.

## His own words tonight (verbatim, dictated, may contain mishearings)

"Right since our product now gates by posts I think it logically follows we can recommend upto 20 feeds/sites with feeds preferred over sites of course without biasing the algorithm at Jev or qwen, and X accounts can bump Up to 10. That just looks better. The search is run through what API, Grok? How does it run? The onboarding page needs to say, "Look, this is only the starting thing we are providing. You can add as many sources as you want."

Alerts and notifications by themselves are a category. I think that's what I wasn't clear on before. In there, multiple things can come. Whatever the data architecture in the background is, be it the database structure or the notifications that can have email, text message, X DM, or any other modality, it needs to be constructed in a manner that anything can be slotted in there. Right now, X DM is set up, okay?

You were discussing the full flow with me over here. I understand in theory, but should I dive deeper into this because I don't understand what the exact system prompts say? What exactly is said to make the judgment? What Jev judges? What Qwen judges? I've been getting down into this for 4 weeks, 6 weeks, and haven't shipped anything.

Finally, coming back to Jev scoring and stuff, I'm increasingly wondering if we should not simply incorporate an embedding model and match embeddings first, then Jev, then Qwen. I don't understand the bug and coming in all together that is related to the build locally. We were just doing scratch work, right?

Do you think it's prudent to trigger a /feature flow to maybe set up all of this, or do you think it's not until we finalize the design and I've finalized the algorithm? Remember, this all spun out from me wanting to understand the algorithm first, and we create pages for me understanding the algorithm, then design and blah blah blah.

Given my history, advise accordingly, please."

Facts for his questions (host, from the code): the X search is X's own API, `tweets/search/recent`, one call, 10 results, last 30 days, terms the model names, only when fewer than 5 accounts fit; no Grok. The limits are constants in engine.ts: SITES = 10, ACCOUNTS = 5, POSSIBLE = 0.35. Notifications today: one channel, X DMs via the bot, with dm_events in the database; no email or SMS. The bug is in the product code, not scratch work: it stops every real build.

## What we need from you

Answer each, with the reason and what would change your mind:
1. His limits: up to 20 sites and feeds (feeds preferred) and up to 10 X accounts. Sound? Any cost or quality effect (the model picks from what Jev passed; watched X posts are the metered thing)?
2. The onboarding line "this is only the starting set, add as many sources as you want". Where it belongs and whether anything in the product must change for it to be true (today sources are added in settings; X accounts have Watch only, no add).
3. Notifications as a category with pluggable channels (email, SMS, X DM, others). Is the right move now a small data shape (a channel per person with kind and address, deliveries keyed by channel) that X DM slots into, or leave it until a second channel is real? Keep it to what ships.
4. Should he dive into the exact prompts (Jev questions, the Luna prompt, the Qwen writer) now, or trust the measured runs and ship? Given his pattern.
5. Embeddings before Jev: worth it, or a new loop? Jev scoring 156 candidates costs under a cent and takes about 14 seconds; the owner has rejected and reversed Jev twice before.
6. The bug: fix it now (batch only its own candidates per request, a few lines) before anything else?
7. The big one: should he trigger /feature now (what scope, one feature or several), or finalize the design and the algorithm first? Name the single next action and the order of the next three. Say plainly what in his history argues for and against each path.

Be direct. Fewer words, concrete. No em dashes.
