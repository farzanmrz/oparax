RESULT: FINDINGS.

He is right: “one consistent alignment across the different pages of one view” should be a design contract. Each style needs a shared frame, with explicit exceptions for different tasks. Identical internal layouts are unnecessary.

Verified: the [comparison sheets](/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/focus-review/v2/compare-flow-b-light.png) show the drift. Deck’s source independently specifies maximum widths of 1280px for setup, 1360px for building/ready, and 1400px for feed. Newsroom’s feed adds a 244px rail beside the entire main region, shifting its heading. The skill fixes visual treatment but leaves page geometry unspecified.

These are my proposed dimensions, not approved rules. Coordinates describe layout boxes at 1440px, excluding shadows.

Window: one lifted app surface from x=20 to 1420, starting at y=20. Put its 48px top bar inside that surface. Use 32px internal gutters, giving heading and first-content edges x=52 to 1388. Heading starts at y=96; first content row at y=168. Setup, building, ready and feed share these anchors. The window contains the application, including its title.

The grey stage supplies contrast for the window’s shadow and top light. It already exists in the [accepted Window](/Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-window-light.png), so it is not an accidental invention. Keep its tokens as a narrow surrounding light treatment on app pages. Put “Your Feed” and “Building Your Agent” inside the window. A spacious stage remains appropriate around a marketing demonstration, where the window represents the product being shown.

Newsroom: full-width ground and a 48px top bar; content x=28 to 1412, width 1384px. Heading begins at (28,80), first content row at y=160. Place feed sources within that row: 244px rail, 24px gap, remaining reading area. This keeps the page heading stable without reserving an empty sidebar on setup. Lift the table and supporting objects, as in the [accepted Newsroom](/Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-newsroom-dark.png).

Deck: centered 1280px content, x=80 to 1360; 48px top bar with its contents on those same edges. Heading starts at (80,84), first tiles/cards at y=160. Preserve the [accepted Deck’s](/Users/farzanm4/.agents/skills/reference-led-design/examples/accepted/accepted-deck-light.png) separate lifted stacks.

Narrower: Window keeps 20px outer gutters until 700px, then 12px; internal padding becomes 16px. Newsroom uses 28px gutters, then 16px below 700px. Deck uses `min(1280px, viewport minus 48px)`, with 16px gutters below 700px. At 1024px and below, move rails into compact source controls and stack supporting columns. Wrapped headings push content downward naturally.

Landing may have a taller hero; signup may center a form capped at 440px inside the shared frame. Both retain its header alignment and horizontal boundaries. Form headings align with fields; setup retains the app heading position.

Proposed skill wording: “Choose and approve one frame per style before composing pages. Reuse its header, gutters, heading anchor and content-start spacing. Declare task-specific exceptions. Different bodies share stable outer geometry.”

Proposed DESIGN.md wording: “Frame geometry is part of the approved design. Maintain one shared frame implementation per style, using the approved dimensions and responsive rules. Page-local overrides require explicit approval.”

The strongest objection is that rigid coordinates can flatten composition or waste space. Highest risks are losing Window’s depth, squeezing readable stories, and approving desktop screenshots that conceal narrow-screen failures.

First, the host should obtain approval for the frame proposal, then have one builder apply it across all six pages and show matching dark/light and narrow renders. Reuse that implementation in production. Existing screenshots cannot establish final responsive behavior.