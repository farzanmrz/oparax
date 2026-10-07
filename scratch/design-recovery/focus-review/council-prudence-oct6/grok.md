<!-- host note: taken from grok.out's result field; the runner found no RESULT marker -->

I'll read the brief and the guidance index first, then only the skill files that review actually needs.The brief is a product-advice council, not a visual review. I'll read the named ground-truth files and the Jev, prompt, and data-shape guidance that those questions depend on.Fix the build bug, then let one test person finish a real build. Do not open a feature for the rest of tonight's list.

The repeating move is the one you named on September 27: something is unclear, so a new stage gets added before anyone has used the last version. You cut that ("overcomplicated for no damn reason", a from-scratch rebuild was "just not prudent"), and on September 28 the product was built in a day. From October 2 to 5 the same move went into the look: sixteen passes, five councils, your own "not being able to ship for the past 1 week." That part is over. Pass 16 is on beta, and sign-in was verified tonight. The algorithm is the three-step loop you already kept. It has never finished in the product since September 28, because of a size cap, not because the design or the prompts are unfinished.

## 1. Twenty sites and feeds, ten X accounts

Twenty sites and feeds, as a ceiling, is sound. Ten X accounts, as a bigger minimum, is not.

Sites and feeds are already "up to 10, fewer is fine," and the code throws away anything past 10. Feeds already win a tie against a website, and a clearly better website still wins. That rule sits in the picker, not in Jev and not in Qwen. Raising the ceiling to 20 does not touch either judge. Jev still keeps a source only at 0.35 or above, and the picker still takes the best of those. On the September 27 run, 107 of 150 passed, so 20 is still inside the passed set.

Sites and feeds are not the metered thing. Fetching them is free. Judging is about $0.000116 an item and writing about $0.00025, roughly under $1 a month for a light monitor and about $2 when the pool is full. Twice as many sources can push a busy beat toward that $2. Hobby still clears that. Watched X posts do not move.

X accounts are the opposite shape. The prompt says "at least 5," and the code does not cut them off at 5. "Up to 10" only happens if you change that "at least" into "up to" and cut the list at 10. Leaving it as a floor of 10 forces weaker accounts in, and it runs the search more often. The search is X's own API, one call, `tweets/search/all`, 10 posts, last 30 days, using terms the picker names, and only when fewer than 5 accounts already fit. It is not Grok. A busier account can post like a sports desk, about 117 of its own posts a day. Hobby allows 100 watched posts a month, and the free week allows 300. Five accounts is already enough to empty that. Ten makes it normal.

What would change my mind: you see one finished build whose best 10 sites are obviously too thin, or you see the pool warning and still want a ceiling of 10 accounts, worded as "up to," not "at least."

## 2. "This is only the starting set"

Put that sentence where the chosen sources first appear, at the end of the build, and repeat it in Settings next to Add source.

It is not true today. Add source works only after the monitor is paid, so the free week, which is what your five test people get, cannot add one. X accounts have Watch only. There is no way to add a handle. "As many sources as you want" is also the wrong promise for X accounts, because those posts are the thing the plan limits. Sites and feeds are the unlimited part.

The sentence that matches the product: "This is a starting set. You can add more sites and feeds. X accounts stay inside the watched posts on your plan." For the sites half to be true on day one, adding and removing a site has to work during the free week, not only after payment.

What would change my mind: you want test people adding sources only after they pay. Then say that, and do not imply the free week can.

## 3. Notifications as a category

Leave the data shape until a second channel is real.

X DMs already work: one alert per story, a delivery row per story, the bot's DM events beside it, and the on/off switch in Settings. A channel table with only "X DM" in it would rewrite that path and still reach nobody in a new way. That is the PDF move: introduced for a future slot, causing complications now.

When email or text is something a person will actually receive, add a channel (kind and address) per person, and let a story have one delivery per channel. The current delivery row cannot grow a second channel without that key change. Do it then, not tonight.

What would change my mind: you name email or text as the next thing a test person will get, this week.

## 4. Reading the prompts

Do not dive in. Trust the September 27 run until a live build shows a bad source or a bad card.

You were hazy on October 4, and you asked the building page to show the steps. It does. The judgments are short:

- Jev, at setup, asks one question per source: is this a useful ongoing source for the beat? The beat alone can justify it. A quote or a mention does not. Kept at 0.35 or above.
- The picker (one model call, not a tool loop) sees only those. It chooses up to 10 sites and feeds, at least 5 X accounts, and writes the brief. Code drops any handle Jev did not pass.
- Each new item: Jev asks whether it is on the beat (0.5), whether it is the same event as a story (0.75), and whether it adds a fact. Qwen writes the English card from the full article, and every fact must quote the source. Jev then checks support, who said it, and the headline. One DM per story, ever.

That run cost $0.278 and took 24 seconds. Rewriting these questions before anyone has a feed is how the last six weeks went.

What would change my mind: the first finished build recommends a source you would not watch, or a card says something the article does not. Then open that one question, with that one input and output.

## 5. Embeddings before Jev

No. That is a new loop.

Jev already is the meaning match, on about 156 sources, under a cent, about 14 seconds. An embedding step on a table that size saves nothing you would notice, and it can drop a source whose wording is far from the sentence while its coverage is on the beat. Jev's question is written so the beat alone can keep it. You have taken Jev out twice and put it back twice. A third scorer in front of it is the nine-tool agent again.

What would change my mind: the shared table grows past what a batched Jev call can hold after the bug fix, or a real run shows Jev keeping noise that a cheap cutoff would have removed without losing sources you want.

## 6. The bug

Yes. Fix it before anything else.

It is in the product, not in the scratch lab. Setup scores every candidate in one state. The call splits the questions into batches of 60, but every batch still carries all of the rows. The guard estimates two characters per token and stops at 32,000. The table alone estimates about 41,000, so every real build dies at `state_too_large`. The September 27 lab passed because that cap did not exist yet. No product build has passed this step since September 28.

The fix is the split the feed grouping already uses: each request carries only its own rows, plus the beat, the person, and the posts. A few lines. If one batch is still over the cap, split those rows smaller. Do not raise the cap, and do not add embeddings to get around it.

What would change my mind: nothing about the order. A failed build blocks the test people, the walk, and every opinion about 20 sources.

## 7. Do not trigger /feature for this bundle

One next action: fix that Jev batch on beta and run one real Build through to a ready agent.

Then, in order:

1. That fix, and one test account reaches a ready agent.
2. You walk that live monitor on beta: feed and settings. Notes only. No council, no prompt edit, no embeddings.
3. One small follow-up for what that walk still wants. A ceiling of 20 sites and feeds. Accounts stay "up to 5" until you have seen the pool. The starting-set sentence, once adding a site works during the free week.

Waiting on the design argues from October 2 to 5: you rejected the look until pass 16, and on October 4 you said the design was not done. Against waiting: pass 16 is already on beta, auth is verified, and another lab pass does not make a build succeed. Waiting on the algorithm argues only if you treat "I want to understand it" as unfinished work. You already settled it on September 27, measured it the same day, and refused a rebuild. A /feature whose job is limits, copy, channels, prompts, and embeddings is the five-issue plan you replaced with "I am done planning."

What would change my mind: the finished build's sources are wrong in a way two constants cannot fix, or you commit to email as a channel a test person will use. Then one feature, one scope. Not this list.