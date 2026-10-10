1. **One card**
- **The band**: 44px height, `--raised` ground, 16px semibold type, holding the mark and title, with a slot at its right for actions.
- **The body**: Deck's lift (`rounded-xl`, `--line-strong` border, `--window` ground, card shadow) enclosing the content below the band.
- **The hairline rule**: Used strictly inside the card body to divide rows, never separating the band from the body.
- **Account card**: The avatar and name move into the band, leaving the email and plan details in the body.
- **Twitter DMs card**: The mark and "Twitter DMs" move into the band with the status at its right, leaving the connection button and text in the body.
- **Onboarding cards**: Each right-column card (person, brief, posts) gets the band for its title, holding the specific content in the body.

2. **The sidebar's bottom**
**Arrangement 1: Supabase Air Gap**
The scrolling middle holds Feed and its indented kinds. Separated from the scroll by a block of air is a pinned bottom section containing Settings and Notifications, followed by a hairline, the person row, and Hide sidebar at the foot. Sizes are 32px rows with a 44px profile block. This resolves the tension by using an air gap to group settings away from the feed and isolate them from the profile. Cost: It removes the pinned hairline he explicitly requested above Settings, violating a standing rule.

**Arrangement 2: Window Header Recovery**
A thin 44px global header sits above the main window holding the Oparax mark, username "@farzanmrz", and theme toggle. The sidebar, stuck to the left inside the window, holds only the scrolling Feed, with Settings, Notifications, and Hide sidebar pinned at its bottom. This resolves the tension by completely moving the user identity out of the sidebar to the header. Cost: It reintroduces the global header he removed on Oct 8 for being "mashing" and removes the word mark from the top of the sidebar, breaking two rules.

**Arrangement 3: React Bits Profile Foot**
The scrolling middle holds the Feed. Pinned at the bottom are Settings and Notifications above a hairline. Below the hairline is "Hide sidebar" followed by a taller 44px profile row containing the avatar, name, and Sign out popover. This resolves the tension by grouping the profile and hide action into a distinct, recognizable bottom block away from the settings. Cost: It changes the order of his standing rule (person, Sign out, Hide) to place the hide action above the person.

## Recommendation
**Card**: Deck's lift (`rounded-xl`, `--window`, card shadow) with a 44px `--raised` band holding a 16px semibold title/mark and right-aligned actions.
The body holds the card's specific content rows, which are divided internally by `--line-strong` hairlines.
This standardizes the account, notifications, and onboarding cards by moving their titles to the raised band.
**Sidebar**: The **React Bits Profile Foot** arrangement. It resolves the visual tension by isolating the profile and hide controls into a dedicated block at the very bottom, without reintroducing the rejected global header.