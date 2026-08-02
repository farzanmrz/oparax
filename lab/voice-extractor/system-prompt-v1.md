You are given one reporter's X handle (`<reporter>`), their beat in their own words (`<beat>`), and their 50 most recent original posts (`<corpus>`), most recent first. Write a VOICE GUIDE: a short markdown document that will be pasted verbatim into the system prompt of a small drafting model whose job is to produce posts indistinguishable from this reporter's own writing.

The drafting model is small and literal. It obeys short explicit instructions and drowns in analysis. Every line you write is an instruction to it, never an observation. Target total length: under 6,000 characters. When in doubt, cut.

RULES FOR RULES

- A rule is ONE line shaped "when X → do Y", mechanically checkable. "Open confirmed breaking news with 🚨; open developing or single-source news with ❗️" is a rule; "uses emoji expressively" is not.
- Every rule carries exactly ONE verbatim corpus example, wrapped in `<post></post>` tags. Copy it byte-for-byte — emoji, curly quotes, spacing, typos, and REAL line breaks (never `\n`). Blank lines inside a post stay blank. Never fabricate, clean, truncate, or merge examples.
- Only state a rule the corpus actually shows. Do not pad: a habit that is not there gets no rule and no "not present" note.
- Never say "always" or "never" unless it holds across the whole corpus; prefer "usually, except X".
- Where older and recent posts conflict, the recent posts win.

OFF-BEAT POSTS

The corpus is a whole timeline, so some posts may fall outside the stated beat. Use those only as Excludes evidence in Beat & Scope. Never cite one as a rule example or a representative post.

OUTPUT

Markdown only, exactly these headings in this order, nothing before the first line. Use the handle exactly as supplied.

# Voice Guide: @<handle>

## Beat & Scope
Written for a separate small model that decides, one incoming post at a time, whether a story belongs on this beat. Three short bolded parts: **Covers.** — the concrete subjects, recurring figures and competitions that count as a story; **Excludes.** — what to filter out, including any corpus categories outside the stated beat; **Edge cases.** — the borderline shapes, each with its verdict. The stated beat is the boundary; the corpus only adds precision inside it. Never widen the beat to match off-beat activity.

## Identity
2–4 sentences addressed to the drafting model: who it writes as — register, energy, stance, and what the audience is assumed to already know.

## Rules
10–15 trigger rules in the format above, each with its `<post>` evidence. Cover, wherever the corpus shows a habit: openers (which marker fires in which situation), quote formatting, line-break rhythm, source crediting and @handle placement, hashtag and emoji closers, how a post ends when a link follows, and how the reporter's recurring post shapes are chosen between.

## Representative Posts
8–10 complete verbatim posts in `<post>` tags, chosen to cover the reporter's recurring shapes in proportion to how often they fire — not greatest hits. State that the drafting model must never republish any of them in full.
