# Product decisions

This file is the single record of Oparax's standing product decisions. Each entry states what something was, what it is now, and why. It deliberately omits metrics and implementation detail. Statuses are Built (verifiable in the product today), Removed (built, then deleted), Rejected (decided against, never built), plus a Direction section for committed plans not yet started.

## Direction
- **Monitoring pivot:** Oparax is being stripped down to a monitoring and alert service. Started with issue #131: drafting and voice are deleted, X ingestion moves to push, every pilot person gets a public feed page, alerts arrive as X DMs with a free trial and a three-door payment ask, and an onboarding agent builds a desk from a typed handle on the landing page.
- **Business development pipeline:** An upcoming pipeline will package each current product iteration into explicit experiments. Not created yet.

## Built
- **Cheap filter first:** Every incoming post used to flow toward expensive model work. Now a cheap fast model decides on-beat or off-beat first, a cheap model synthesizes only what passes, and expensive drafting happens only on demand. Expensive reasoning belongs only where a person asked for output, while filtering runs on everything and must stay cheap.
- **Manual drafting:** Drafting used to run automatically on every accepted story. Now a reporter presses a Draft button and gets exactly one draft per story. Posting is the reporter's own act, so the product prepares material only when asked.
- **Streaming X ingestion:** X sources are watched through one always-on worker holding a single persistent connection to X's real-time filtered stream. This is the only real-time push channel accessible on the current tier, and only one connection is permitted, so the worker is deliberately a single instance.
- **Polling website ingestion:** Websites are watched by a separate always-on polling worker that checks each configured site on a short cycle, asking the database about many links in one batched question and remembering recent answers in memory. Websites offer no push channel so polling is required, and unbatched database checks proved ruinously chatty.
- **Real-pipeline onboarding:** Onboarding a new user runs the actual production pipeline, a top-tier model reads the person's real posting history to write their voice guide and vets each added website against the desk's beat. Onboarding speed, quality, and cost are exactly what the product must prove, and faking any of it would hide real failures.

## Removed
- **Automatic drafting:** The product used to write a draft for every accepted story without being asked. Removed in favor of the manual Draft button, because reporters treat posting as their own act and unused drafts are pure cost.
- **Slack integration:** Slack was built as the notification channel and then completely purged. It demanded heavy authentication and interface work before the value of notifications had been validated at all, today the in-app feed is the only delivery surface.
- **Scheduled scanning:** A scheduler used to drive scan-and-draft runs on a fixed cycle. Deleted, the product is now purely reactive to what its two source workers deliver, because the scheduling machinery added complexity no user behavior justified.
- **Speculative capabilities:** Story clustering, multi-platform drafting, automatic posting, and email delivery were each built ahead of any demand, carried as complexity, and then deleted rather than disabled once it was clear no user behavior justified them.

## Rejected
- **Embedding-based filtering:** There is no need to use embedding models or vector similarity for the filtering and synthesis stages for now. The current cheap-model judgment with plain database checks covers the need.
- **Paid acquisition:** No advertising infrastructure, tracking pixels, or conversion pages. Acquisition stays manual and concierge-driven until unprompted retention exists to justify spend.
