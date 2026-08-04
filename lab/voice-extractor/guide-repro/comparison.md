# Sonnet high: newest 100 versus newest 50

Run date: 2026-08-02 PDT

## Arms

| Arm | Accepted run | Source slice | Media | Binding corpus after scope tool | Finish |
| --- | --- | --- | ---: | ---: | --- |
| Sonnet 100 | `sonnet100-high-02` | Frozen posts 1–100 | 47 | 99 | `stop` |
| Sonnet 50 | `sonnet50-high-01` | Frozen posts 1–50 | 9 | 49 | `stop` |

Both used `anthropic/claude-sonnet-5`, adaptive high thinking, and the same frozen system prompt.
Posts are ordered newest first. The 50 slice runs from 2026-07-26 19:11 UTC through 2026-07-20
22:10 UTC. Both arms independently excluded only post `2080760513689215216`, a captionless
Fortnite/gaming GIF with no football content. This makes the valid comparison 99 versus 49, not
100 versus 50.

`sonnet100-high-01` is not accepted: its upstream stream ended before a terminal chunk and its
metadata correctly records `finishReason: error`.

## Proportional comparison

Raw occurrences are not compared directly. Rates below use each arm's post-exclusion denominator.

| Observable signal | 99 posts | Newest 49 | Change |
| --- | ---: | ---: | ---: |
| Contains emoji | 62.6% | 77.6% | +15.0 pp |
| Contains hashtag | 36.4% | 55.1% | +18.7 pp |
| Contains source mention | 27.3% | 46.9% | +19.6 pp |
| Contains URL | 42.4% | 28.6% | -13.8 pp |
| Contains ALL-CAPS word | 38.4% | 44.9% | +6.5 pp |
| Uses 2+ line breaks | 21.2% | 22.4% | +1.2 pp |

These shifts are coherent with the source distribution. The newest half is dominated by
structured transfer and club-news bulletins. Much of the older half is a dense July 19–20 live
World Cup reaction burst with many photo/video URLs, short emotional captions, and fewer source
handles or hashtags.

## Guide comparison

Both outputs contain all 11 required top-level sections. They are effectively the same total size:
20,153 versus 20,152 Unicode characters. The 50 arm therefore did not produce half a guide.

Stable mechanisms retained by the 50 arm:

- alert hierarchy (`🚨 JUST IN:`, `BREAKING:`, softer `❗️` updates);
- claim → source handle → hashtag → closing emoji order;
- terse unsourced one-liners;
- nationality flags and semantic emoji selection;
- blank-line paragraph grammar and numbered breakdowns;
- curly quotes, asterisk caveats, `+`, ellipsis, currency and link conventions;
- quote leads, fan questions, reflective explainers, humor/GIF captions and sighting posts;
- ongoing-saga updates that add only the new delta without recapping;
- media-aware drafting constraints and the same off-beat exclusion.

Patterns absent from the 50 guide, with direct evidence only in the removed older half:

- live-match shout fragments and rapid reaction bursts;
- Messi/World Cup emotional tribute mode;
- emoji-only and two-word photo captions for trophy/match moments;
- decorative bold/italic Unicode celebration text;
- `#WorldCup` and `#ESP` usage;
- World Cup stat-bullet blocks and related event-list subunits.

The 100 guide explicitly recovers these as a conditional `Live-Event Reaction & Tribute` mode and
warns that it is absent from the newest week, so it should not be used as the default register. The
50 guide instead spends its mode budget on finer distinctions within current news: reflective
explainer, meme reaction, sighting/photo update, and the rare match-report document format.

## Relation to the historical Opus guide

The historical Opus guide has 4,844 words. Sonnet 100 has 3,170 words (-34.6%) and Sonnet 50 has
3,153 (-34.9%). This is principally a model-output change: reducing the corpus did not cause a
second collapse in guide length.

The historical guide contains nine named modes. Sonnet 100 preserves its full breadth but combines
some modes, especially live reaction and tribute. Sonnet 50 strongly preserves the current
transfer/news modes but cannot infer the older live-event and tribute modes from evidence it never
receives. The original Opus run kept all 100 posts; both new Sonnet runs made the same defensible
choice to exclude the gaming-only post.

Example selection is stochastic and should not be mistaken for semantic loss. Sonnet 100 and
Sonnet 50 each use 26 full examples found verbatim in their allowed corpus. Other `<post>` blocks
are verbatim excerpts of longer corpus posts, not invented prose. Only six full examples happen to
be shared across the two guides, while the rules they support substantially overlap.

## Efficiency

| Metric | Sonnet 100 | Sonnet 50 | Reduction |
| --- | ---: | ---: | ---: |
| Input tokens | 153,400 | 46,299 | 69.8% |
| Output tokens | 35,441 | 32,775 | 7.5% |
| Reasoning tokens | 26,908 | 24,371 | 9.4% |
| Total tokens | 188,841 | 79,074 | 58.1% |

The gateway reported zero inference cost for both accepted runs, so this record compares tokens,
not an inferred dollar price.

## Verdict

Newest 50 is sufficient for the currently dominant transfer/news drafting task and is a much more
efficient extractor input. It retains the operational voice rules while weighting them toward
Reshad's newest behavior.

Newest 50 is not semantically interchangeable with 100 for arbitrary future stories. If the system
must draft live-match reactions, Messi tributes, trophy-photo captions, or other event-driven fan
posts, the 50 guide lacks those demonstrated modes. That is legitimate evidence loss, not poor
proportional extraction.

Guide comparison alone cannot prove that readers perceive the drafts as equally Reshad-like. The
next causal test is a blind, same-story drafter evaluation with three fixed guides: historical Opus,
Sonnet 100, and Sonnet 50. It should include both current transfer stories and held-out live-event or
tribute stories so the expected boundary is measured rather than assumed.
