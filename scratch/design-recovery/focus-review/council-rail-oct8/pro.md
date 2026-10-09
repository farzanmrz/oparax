### 1. Judging shell-feed.png
In `shell-feed.png`, the design is busy and incoherent because three distinct visual systems compete: a horizontal tab bar for top navigation ("Feed", "Settings", "Notifications"), vertical list items for sources with right-aligned data, and a massive stacked layout of separate blocks in the footer. Handles (`@nextjs`, `vercel.com`) pointlessly repeat information beside the source names. The footer elements are the wrong size and weight: "FREE WEEK" demands a huge block with segmented progress bars, the Light/Dark toggle is an oversized full-width segmented control, and "Sign out" and "Hide" are heavy, full-bordered buttons. The entire rail is wrongly detached by a page margin. What already works are the section headings ("Twitter accounts", "RSS feeds") which are distinct and group the sources cleanly.

### 2. Proposing the coherent rail
The rail must be ONE coherent object, top to bottom:
* **Brand line**: Holds the Oparax wordmark and acts as a fixed header. It differs from the rest by having no hover background or interactive row style.
* **Navigation rows**: "Feed", "Settings", and "Notifications" become three vertical rows. Each has an icon on the left, the name, and an active state background.
* **Sources**: Distinct headings group the sources. Source rows show names only (no handles or URLs) and their text is indented to align exactly with the heading's text x. There are no counts on the rows to remove clutter.
* **Foot**: The heavy blocks merge and appear differently from the list rows, acting quietly. "FREE WEEK" gets smaller, becoming a single quiet text line. The theme toggle and "Sign out" become small icon controls that merge onto the same row as the user's avatar. "Hide" lives as a subtle collapse icon control next to them in the foot.
* **Row styles**: The navigation rows and source rows must share the exact same row style (height, hover state). The brand line and the foot must not.
* **Position**: The rail sits exactly at the viewport's left edge (x=0). The content column is centred in the remaining viewport width under the fixed Width rule.
* **Nearest near miss**: A settings-app sidebar or the "hunk" (reduced icon rail). It is not a settings-app sidebar because it holds live, changing data (free week, dynamic sources, onboarding steps) rather than static configuration menus. It is not the hunk because the owner explicitly wants it readable and expandable, not reduced to icons.

### 3. Keep
Keep the group headings' distinctness he praised, the filter chip, the seven steps in the rail during onboarding, Hide removing the whole rail, no All sources, and no header on signed-in pages.

### 4. I accept

## I accept
1. Rail position and content column: Rail stuck to the viewport's left edge; content column centred in the remaining width under the Width rule.
2. Brand line: Holds the Oparax brand as a fixed header, differing from lists with no hover state.
3. Navigation rows: Three vertical rows with icons and active states, sharing the exact same row style as source rows.
4. Section headings: Distinct typography as praised, cleanly separating groups.
5. Source rows: Names only (no handles), sharing the navigation row style, text indented perfectly to the heading's text x.
6. Counts: No counts on source rows to subtract visual clutter.
7. Foot: Free week as small text; Theme and Sign Out merge into quiet icon controls on the profile row, differing from the hoverable list style.
8. Hide and Menu: Hide lives as an icon control in the foot, cleanly removing the whole rail.