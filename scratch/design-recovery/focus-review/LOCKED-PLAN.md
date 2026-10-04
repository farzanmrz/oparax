> SUPERSEDED IN PART (October 2, 2026): the "Fixed inputs" palette lines below (navy/blue; no green, red, plum, pink or lavender) and the structure-then-visual stages no longer bind. The owner's October 1 to 2 rulings in `docs/references/decisions.md` (section "October 1 to 2 design system restart") and the global `reference-led-design` skill outrank this file. The later sections from "Owner rejection and new direction" onward remain the evidence.

# Oparax design: locked plan and judging criteria

Locked by the owner on October 1, 2026 ("Besides that, it's good."), after Astra, Grok and the host returned AGREED PLAN (`confirm/astra.md`, `confirm/grok.md`). Read this before any design step, after any compaction, and include it in every design council brief. Evidence behind it: this folder (`raw/`, `taste-*.md`, `product-*.md`, `working-patterns.md`).

## Purpose Do the design once, then freeze it, then ship and get users. The owner asked to be held to this: when he drifts, say "Farzan, you're deviating from these criteria" and show where; when judging, say "as per these criteria, this is how it fits".

## Fixed inputs (do not reopen)
- Open Sans; dark default; navy/blue (reference palette "number 1, or between 1 and 2"); blue accent; gradients inside that family; no green, red, plum, pink or lavender; light mode equally real with visible borders, separators and buttons.
- Oparax logo and wordmark only in the header, one link home; the white circular mark (also the X bot avatar, white on black). Official platform logos keep their real colors; everything else may be restyled.
- Compact header and footer, edge-to-edge dividers, 90% width up to 1800px, Title Case short nav, footer only Privacy, Terms, Contact.
- Card (owner, October 1): plain story title; bullet facts; each bullet ends with a parenthesized citation that opens its supporting quote in a quiet "Used N sources" area at the card bottom (AI Elements Sources or a React Bits equivalent); nothing else; a subtle way to tell Direct from Clustered; works without an image.
- Inspiration stays inspiration (Magic Transform, Circles, Center Flow, Bento 1 and 7, Features 10, social proof, comparison blocks): never copy a component just because he praised it.
- Product truth wins over taste: optional images; plain-text DM; no implying unbuilt integrations work; no invented data, counts or durations.

## Scope of the single pass
- Rendered in the locked look with real components (no grayscale wireframes).
- First: setup (handle and one sentence), building (running and failed, real log lines), first feed (populated, empty, checking) with alert activation, story within the feed.
- Then the same composition extends to: sign-up and log-in (with email confirmation and recovery), landing, free-week-ended and allowance-exhausted states, checkout return. Settings, contact and legal inherit the frame with a consistency check only.
- Feed arrangement: one comparison with identical cards, app shell (Direct/Clustered in the sidebar, no invented sidebar blocks) versus simple page (Direct/Clustered beside the feed title). The owner chooses once.
- Landing: hero; How It Works; roadmap (one composition: works today plus planned platforms clearly labeled planned, not a grid); pricing. No About, blog or timeline.
- How It Works (owner, October 1): 1 write one sentence; 2 the agent builds; 3 dictated as "Press the onboarding flow", interpreted (host, unconfirmed) as seeing what the agent chose during onboarding; 4 the feed; 5 the DM, shown neatly. Sign Up is not a step. No unmeasured duration claims.
- Hero inputs: X post and article; GitHub as a third input follows the owner's product intent ("GitHub product hunt, web, Twitter. It comes into Oparax. Oparax produces the card"). Flag to him that today's code keeps GitHub and Product Hunt as a separate digest (issue 136 tabled); he decides when the hero is built.
- Content: verified public sources reshaped to the feed contract (Next.js 15 from the X post and blog post as one clustered story; Bank of England X post alone and CNBC article alone as Direct items), marked as preview once. The owner's own real agent run (through onboarding) replaces them before acceptance and must also prove useful relevance and delivery.

## Stages and gates
1. Structure stage: one render; one council review shown to the owner in the same stage; one consolidated change list; owner lock.
2. Visual stage: refine the same composition; one council review alongside the owner; one change list; owner lock. Then design is frozen through launch.
3. Implement in feature 151, owner walks it, ship, first known cohort. No extra rounds. Nothing is built, run or sent to council without the owner's request for that step.

## How to judge each stage Structure stage (ignore polish):
1. Does each screen show what it needs, and nothing it does not?
2. Can I get from sign-up to my first story without getting stuck?
3. Is anything missing, repeated or in the wrong order? Visual stage (structure is locked):
1. Does this feel like Oparax: alive, not noisy?
2. Is light mode as good as dark?
3. Does the news hold the eye? Rules for both: a rejection names the broken decision (for example "the setup screen does not say what happens next"), which becomes one fix, not a new round. A weak real story is a product problem, not a reason for a new visual round. Reopening a fixed input is a yes or no question to the owner, never a silent change.

## Owner additions, October 1 (later the same day)
- Onboarding is part of the design: show "different components where judgment is happening, where selection is happening, for each and every individual stage", not only reasoning. Use AI SDK generative UI patterns, AI Elements and the React Bits Pro AI and agent blocks where they fit.
- Scope he named: "Do the onboarding, set it up, and set up the feed." "Set up the landing page roughly."
- Council lanes: Astra, Grok and Kimi, with the screenshots passed to them. They comment; the host and lanes decide among themselves and make the changes; "discuss each and every section, component, and line of text"; litigate the entire design so there is "a justification for each section". The owner reviews after the council has converged ("whenever I come back and look, everything's generated, you guys have all agreed with each other"). This replaces "shown to the owner in the same stage" for the structure stage.
- Host guardrails accepted with the owner's agreement: at most 3 exchange rounds per stage; anything still disputed goes to the owner as a short list with each side's reason. The council judges screenshots and source; the host tests interactions.
- No paid runs from the preview: recorded data shaped exactly like real runs; reloading never calls a model.
- Use the installed design skills where useful.

- Sign-up and log-in (owner, October 1): "shouldnt take up urs or councils time"; use stock React Bits or shadcn authentication components as they are, no design work and no council review for them.

- Real-time message on the landing (owner, October 1, after the run started): the main page must communicate that Oparax watches the whole internet around the beat continuously (sites, RSS, X) and brings news quickly, and that it decides what to watch for the person ("not just OpenAI's Twitter handle... TechCrunch, OpenAI's personal blog website"), through words and animation. Wording (owner decision, October 1): the headline and hero copy say news arrives instantly ("1 minute is the minimum cron. That's instant"); the check frequency appears once lower on the page as detail; DM alert cadence by plan stays accurate in pricing.

- Roadmap correction (owner, October 1, after seeing the render): Instagram, Threads, LinkedIn and Snapchat are also planned DM destinations; planned items need no per-item "Planned" label, the visual treatment shows it (replaces "planned items labeled" above); the big "Your agent" circle in the middle looks bad. Owner rejected the hero flow ("the Publish section") and How It Works as rendered; color reaction "extremely blue" pending his yes or no on amount of blue versus the navy base.
- How It Works (owner, October 1): shows screenshots of the actual onboarding and the actual feed; rough UI frames until those screens are fixed. Order rule, which the owner asked to be held to: "we must first fix the onboarding and the feed UI. Only then will we fix this." If he tweaks How It Works before that, say so.

## Owner rejection and new direction (October 1, evening)
- Owner rejected the whole structure render: "neither the sections their components nor the design hits. Nothing lands." Host-named broken decision: structure was judged without the look, and arrangement was not treated as structure. Council briefs from now on lead with "as a human looking at this, does it land, is it aligned, does it use components imaginatively".
- Even the September 30 dark renders he once praised are now "too blue and too just monotone... at max 2 colours".
- Palette fixed input REPLACED (owner): a black, gray and blue range with his blue accent, built like Supabase or Vercel ("there is harmony yet elements are cleanly separated"), derived logically from their published design systems and mapped to each component role, including React Bits animations, in dark and light. Process he ordered: a workflow of Sonnet research agents on the design-system logic, then council (Astra, Grok, Kimi) on that research to reach consensus on 4 themes, then generate and show him.
- October 1, later: owner rejected the 4 quick base palettes ("not enough variation", "no life"). He attached Supabase dashboard and landing and Linear landing and intake screenshots (theme-research/refs/owner-1..6.webp) as what he is drawn to: dark on dark that still separates, complexity shown neatly, color coming from functional elements "in the relevant location, not as something random". Tentative (his words): the hero showing everything stretched out "might be a bit overrated"; Linear shows one thing then scrolls. Decision: the FEED is the screen themes are generated on. Process he ordered: Opus workflow agents review those sites page by page and determine what he is picking up on; host verbalizes it to him and renders it; council only after that.
- Reopened fixed input, pending his explicit yes: "no green, red, plum, pink or lavender" versus his new words that Linear's "yellow, blue, green, and red elements, but in the relevant location" give life. Host reading: allow semantic status colors only where they carry meaning (status dots, label chips, errors), never as decoration.
- Owner, October 1 (confirmed): functional color is allowed ("Color for functional stuff is fine"). Themes are generated on the feed; the landing follows from it. His naive read on Linear: subtle shadows and gentle, non-aggressive gradients give the polish; to be measured. He asked for a search of last week's Codex and Claude Code sessions for every design complaint, to find the pattern (`theme-research/owner-pattern.md`).
- October 2, early: owner rejected all 4 feed palettes ("I despise all four... still no life... this is just the same as before") and ordered the council be given all research and decide with the host what to develop.
- October 2 (owner): "a lot of this is just briefs." Agents capture real screenshots of many Linear and Supabase pages into ONE board folder (`focus-review/board/`, served as a gallery) that the host, the council and every builder look at, so the work stays aligned to images rather than text summaries. Host admitted 10 missed points from his October 1 evening messages (variation between directions, a visible accent like Supabase's green, several functional hues, soft shadows and gradients, the live product card lit against the background, complexity shown neatly with shell and charts, React Bits animations, imaginative distinct directions, a promised tint and hue per source kind, and "quick" meaning light wiring, not a minimal page); these are a checklist every direction must meet.

## Owner verdict, October 2 (verbatim in `council-skill/owner-verdict.md`)
- All three council directions (Window, Newsroom, Deck) land, in dark and light: "This is so beautiful... all three of them... I can't even decide which one's better." Small issues remain, which he will clear up. He did not pick one yet.
- What he says worked: "you finally understood exactly what I'm saying and explored the correct directions while keeping the foundations of what I wanted, yet bringing it imaginative flair and using the components creatively"; "There's one dark color theme, but there's also so much life, and it's not just component variation. There's life in the colors, but those are not attacking me."
- Order: first create a GLOBAL skill (for all his models and council lanes) that captures the process and logic that produced this, not this specific UI; council advises on how to set it up.
- Sources are all equal inputs (owner, product intent): X accounts, RSS feeds, websites, GitHub and Product Hunt are each a source; GitHub is not a separate digest. Several repositories that inform a beat are synthesized into story cards so the user need not open the repository ("GitHub by itself is not a separate thing from the sources. It is also a source"). This is a product change against today's code (separate daily digest, issue 136); flag it at implementation.
- Name websites and RSS feeds separately (small caps headers, like "X accounts"); do not merge them as "Sites and feeds".
- Images: yes, a story shows its image when one exists, balanced so cards with and without images sit well together.
- Functional color: yes to green, amber and red for healthy, warning and failure, and more generally to the color life in these renders.
- Pending his answers after explanation: what "report" versus "story" means (question 1), what the counts and chart are for (question 3); the "right side as status tiles" question (5) goes to the council.
