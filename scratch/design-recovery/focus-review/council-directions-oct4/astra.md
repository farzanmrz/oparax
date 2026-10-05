RESULT: FINDINGS

The missing shell is the main failure, but coherence also breaks inside objects: [finished onboarding](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/renders/p13-onboarding-done.png) separates the person from their About text; [Settings](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/renders/p13-settings.png) leaves most of the screen unused. The originals give related information a clear home.

Two code choices compound this: the feed allocates stories by estimated column height, scrambling its visual reading order; the onboarding replay lasts **4.6 seconds**, with post reading given 0.6 seconds and relevance checking 1.4 seconds.

I propose **two directions**: Deck’s open composition and Window’s continuous frame. These offer a meaningful choice without another variation of the same page.

Both retain the fixed dark/light theme, Deck cards, visible facts and existing boundaries. The lab’s page/style switcher stays visible outside the product chrome, with space reserved so it covers no controls. Timings below are proposed replay durations, with no additional model calls or artificial delay imposed on real runs.

**1. Open Deck: distinct objects on one lit surface**

- **Name and feel:** Take [Deck’s](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/renders/deck-feed.png) open ground, integrated pictures and lifted surfaces; give every page the same bounded width and alignment.
- **Shell:** Running header, left to right: Oparax mark/wordmark; Feed, Onboarding, Settings; this-week count/chart; free-week counter/meter; account menu with Sign out; bordered theme button. The two summaries belong to the line without separate tile containers. Login uses the same header alignment with mark and theme.
- **Sidebar:** One bottom-left Sources button, feed only, opens an overlay with logos, aligned counts and three entries per group before Show more. The same button, Escape or outside click closes it completely. Navigation lives in the header. The timeline and profile are page content; remove the competing app bubble.
- **Pages:** Feed, Onboarding, Settings and Login remain. Setup, building and ready become onboarding states; sources and notifications become Settings sections; sign-up swaps inside Login. Settings uses wide grouped source lists beside a narrower account, plan and X DMs column. Source rows show logo, name and handle/address together, reason on click, Add and visible Remove; no per-source counts there.
- **Feed grid:** Three columns on a wide desktop, two on a narrower laptop; newest-first across rows. Each row grows to its longest card and cards stretch equally. Pictures retain the existing 172px height; imageless cards begin with their source row, with no substitute picture or wash. Marks and time cannot shrink; names wrap between them instead of clipping. Source controls open the report reader; all facts remain visible.
- **Header life:** “Feed”, Clustered/Direct and actual run status occupy one aligned page line. The shared chart and meter provide context; pictures and source marks supply colour. New arrivals settle at the top when the reader is there; otherwise a text notice preserves their reading position. Any DM invitation is a dismissible text line.
- **Onboarding:** Fields sit in one line beneath the running header, Build at the right. Timeline left, candidates centre, personal material right. Use one profile object containing avatar, name, handle, About and posts; the entered brief sits at its top from choosing onward. Selected sources use compact rows with name and handle together. Ready preserves this composition.
- **Pacing:** 48 seconds: profile 4, posts 8, gathering 6, relevance 12, choosing 6, skipped search 2, brief 7, saving 3. Show profile resolution; posts arriving; candidate counts and chips; checked counts and three match groups; selected-source reasons; the skip explanation; brief text; saved confirmation. Keep completed summaries readable. Pause and Replay remain available.
- **Login:** Restore Deck’s separate lifted form on the left. On the right, Center Flow converges into the existing “Next.js 15 is released as stable” story: GitHub upper-left, Product Hunt middle-left, web lower-left, RSS upper-right, X lower-right. Five stationary nodes, inward motion, no orbit. Email/password first, neutral provider buttons below, blue primary action.
- **Gives up:** Some space inside shorter cards; nearest risk is the empty-page near miss, prevented by composing Settings and onboarding as complete working surfaces.

**2. Full Window: one continuous application**

- **Name and feel:** Take [Window’s](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/renders/window-feed.png) joined compartments: the page itself is the window, with no outer stage rim or second header behind it.
- **Shell:** Running header inside the application, left to right: Oparax mark/wordmark; Feed, Onboarding, Settings; account menu with Sign out; theme button. Every page begins directly underneath. Login sits outside the application compartments but retains this header line.
- **Sidebar:** Feed-only source overlay, opened by one bottom-left Sources button; logos/counts, three per group, then Show more. Button, Escape and outside click close it fully without moving content. No app bubble or reduced rail. Right-hand objects are contextual page content.
- **Pages:** The same four routes as Open Deck; standalone setup, building, ready, sources, notifications and sign-up disappear. Settings becomes one broad working surface: account and plan across its top, grouped source rows beneath, X DMs alongside the plan. Rows retain logo, name/handle, reason on click, Add and Remove.
- **Feed grid:** Two columns of Deck cards beside a narrow right compartment containing the full this-week chart and free-week meter. Rows follow chronological order and share natural height. Images remain 172px; imageless cards use the identical neutral surface. The top row reserves marks and time, allowing source names to wrap. No hidden facts.
- **Header life:** Feed and Clustered/Direct sit on the window’s internal heading line with actual activity status. The adjacent right compartment grounds the chart and meter instead of leaving two tiles floating above stories. Arrival handling preserves reading position.
- **Onboarding:** The window divides into timeline left, candidate work centre and personal material right. The setup fields span the top in one line. Profile, About and posts form one continuous personal object; the brief occupies its top when choosing starts. Candidate groups become selected-source rows in place; completion changes the action to Open your feed.
- **Pacing:** The same 48-second sequence: 4/8/6/12/6/2/7/3 seconds. Profile, posts, gathered chips/counts, checked counts/match groups, chosen reasons, skipped-search explanation, brief and save each receive their own readable interval. Pause and Replay stay beside the timeline.
- **Login:** Deck form left, Center Flow right, centred on the same Next.js story; GitHub, Product Hunt and web on its left, RSS and X on its right. Preserve the form’s independent outline and space between it and the story. Label the source-type illustration once; do not invent five citations.
- **Gives up:** Some of Deck’s openness and feed width; nearest risk is the selected-reader near miss, prevented by keeping every story’s facts open.

Build **Open Deck first**: it preserves the feed he already considers close while making the rest of the app belong to it.

The host must build and judge each direction as one connected journey, with the accepted renders beside it, before treating any individual page as fixed.

For both, reasoning lines must use available selection explanations, never invented Jev reasoning; reduced motion removes movement without skipping readable steps.