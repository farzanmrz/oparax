# Behavior examples: modal vs example inputs

Worked derivations for step 2 (attack the ask). Each entry shows how the conversation's example diverged — or would diverge — from what users actually do. The pattern to internalize: the miss is almost never an exotic corner; it is the MOST COMMON real behavior, displaced by the example the conversation happened to use.

## The shipped failure this file exists because of (websites, #112)

- **Conversation's example:** `cadenaser.com/deportes/futbol/` — a section page, article-link-dense, ideal for listing extraction.
- **Modal input:** the bare domain `cadenaser.com`. Users paste what they know — the site's name — not a curated deep link.
- **Laziest input:** `cadenaser.com` typed without scheme, with a trailing space from a mobile keyboard.
- **What happened:** the spec named only the section page; the listing mechanism was built and QC-verified for it; the bare apex (bot-blocked homepage, no sitemap, no feed) hard-failed `No articles found to watch` in production on first real use. Five critique lanes verified the wrong frame because nothing asked them to attack it.
- **What the stub should have carried:** both journeys — section page onboards via listing (`QC-LIVE`), bare apex either resolves intelligently or fails with stated recovery copy (`QC-LIVE`).

## X handle tracking

- **Example a conversation uses:** `@FabrizioRomano`, typed clean.
- **Modal:** the handle without `@`; or a full profile URL (`x.com/FabrizioRomano`, `twitter.com/...`) pasted from the browser bar.
- **Laziest:** a comma/newline blob of several handles pasted from a notes app; mixed casing; trailing whitespace from mobile autocomplete.
- **Also real:** a nonexistent or suspended handle — needs honest failure copy, not a silently dead source.

## Slack draft delivery + reply actions

- **Example:** reporter replies "approve".
- **Modal:** the reply arrives with Slack's auto-quoted `>` context lines above it, or in-thread vs in-channel depending on the reporter's habit.
- **Laziest:** an emoji reaction (👍) instead of any reply; an edited reply; two rapid replies where the second contradicts the first.
- **Also real:** a reply that arrives after the draft was already approved in the app — double-action must be idempotent.

## Create-form chip inputs (the other half of #112 — this one WAS caught, by the owner)

- **Example:** type one handle, press Enter.
- **Modal on mobile:** the keyboard's autocomplete inserts "word " with a trailing space — which the old code treated as a commit separator.
- **Laziest:** paste a multi-line list, then hit Create without committing the last fragment.
- **Lesson:** the mobile-keyboard behavior was invisible in every desktop conversation; only the owner using a real phone surfaced it. That is exactly the class this step must surface at plan time instead.

## Voice measurement from the posting corpus

- **Example:** a beat reporter with thousands of clean posts.
- **Modal:** a mid-size account whose timeline is heavy with retweets, quote posts, and bare links — the measurable prose is a fraction of the post count.
- **Laziest/newest:** a nearly-empty account (a handful of posts) — the pipeline needs a floor and honest copy, not a voice profile built from noise.
- **Also real for this market:** non-English or mixed-language corpora (a Spanish football reporter is a core persona, not an edge case).

## Beat description (free text at desk creation)

- **Example:** a well-formed sentence about FC Barcelona transfers.
- **Modal:** two words ("Barça transfers").
- **Laziest:** one word, an emoji, or a paragraph pasted from a bio.

## Planned: apex → section narrowing (the cadenaser successor)

- **Modal:** bare domain + the desk's beat; the system must pick the beat-relevant section itself.
- **Real divergence to carry:** the beat matches nothing on the site (sports beat, cooking site) → honest "no relevant section found" copy, never a silent hard-fail; multiple plausible sections → a deterministic pick the chip surfaces (the narrowed path must be visible to the user, not hidden behind the typed URL).

## Planned/dormant reactivations

- **Email reply-to-correct:** the modal reply carries the full quoted thread below the correction — parsing must strip quotes before treating text as the edit.
- **Story clustering:** the modal duplicate is the same story from two sources in different languages and different headline framing — not the near-identical-text case demos use.
- **LinkedIn/Bluesky drafting:** the modal user connects one platform, not all; every per-platform surface must degrade to the connected subset.
