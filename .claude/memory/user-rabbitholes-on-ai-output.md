---
name: user-rabbitholes-on-ai-output
description: User over-refines AI/prompt output (unfalsifiable work); redirect to falsifiable plumbing + real-user feedback
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2b51e249-6660-4459-9bb9-6f74313aa303
---

The user's self-identified failure mode: they sink unbounded time **over-refining AI/prompt/model output** (scan quality, draft voice) on their own. They named this their "worst tendency" and explicitly asked to be kept on track and stopped from rabbit-holing.

**Why:** self-refining AI output is _unfalsifiable_ — no test can fail, so the effort is infinite and there's no ground truth until a real user (the football reporter) actually uses it. Plumbing is _falsifiable_ (OAuth connects or it doesn't; a tweet posts or it doesn't) and is the fastest path to that real-user feedback, which is the only signal that counts. "Move fast and do things that don't scale."

**How to apply:** when the user drifts toward "let me improve the prompt/output" before a real user has touched it, redirect to falsifiable, plumbing-first work and shipping. Treat a spec's boundary/parked list (e.g. SPEC §9) as their precommitment device — when they feel the pull to perfect or clean up something out of scope, point back to it instead of re-litigating. Also watch for schema-perfection spirals (wrong types / unnecessary cols) — they tend to self-catch these but appreciate the tripwire.
