1. **Where the blue and functional color went**
Compared to the accepted feeds, the One's feed hollows out the functional color, turning solid weights into thin lines and trapping them inside dark boxes:
- **Tiles:** Accepted feeds used compact, distinct status tiles. The One dilutes them inside large, dark "band cards", drowning the color in empty space.
- **Kind chips:** Accepted feeds used soft-fill backgrounds (e.g., `--kind-article-soft`). The One uses hollow outlines with transparent backgrounds.
- **The live row:** Accepted feeds integrated the "checking" state natively into the reading list. The One traps it in a hollow, amber-outlined box.
- **The meter:** Accepted feeds displayed the solid blue free-week meter prominently on the surface or rail. The One hides it inside a dark card.
- **The selection:** Accepted feeds used a solid or soft blue fill for the active sidebar item. The One uses a thin, faint blue outline.
- **The links:** The accepted feeds used the brand color. The One uses flat grey text (`--t3` or `--t4`) for interactive card links.
- **The marks:** Accepted feeds made StatusMarks prominent. The One shrinks them into a monochrome-feeling list.

2. **Directions to bring life back**

**Direction A: Fills, Links, and Selection (Color Mass)**
Restore physical color weight by replacing the hollow outlines on all kind chips and the "New" badge with their fixed soft-fill tokens (`--kind-article-soft`, `--kind-post-soft`, `--brand-soft` in dark; matching light equivalents in light mode) on the feed cards. Change the selected sidebar item from an outline to a `--brand` soft fill, and color interactive source links with the solid `--brand` token in both modes. *What it adds:* Cures the blandness by giving functional colors physical surface area and reviving the "life in the colors" he loved, all without moving any locked layouts. *What it risks:* It relies purely on internal component coloring; if the page's flatness stems from the dominating large top cards, internal fills might not be enough to break up the gray.

**Direction B: Status Tiles, Live Row, and Tinted Bands (Structural Color)**
Replace the four large top cards with a compact status tiles row above the feed in both modes, giving the blue free week meter and live agent marks (`--ok`, `--caution`, `--error`) a natively colored home on the `--page` ground. Strip the amber outline from the "Checking" box to create a borderless live row using `--caution`. Apply a subtle 2px tinted band (`--kind-article` or `--kind-post`) to the top edge of each feed card in both modes. *What it adds:* Frees the functional marks from their boxes and injects color directly into the structural reading flow. *What it risks:* A tinted top band comes dangerously close to the rejected "left-border cards" near-miss, violating his rule against adding colored lines purely for decoration rather than as distinct objects.

## Directions
- **Direction A:** Soft-fill kind chips and badges, a soft `--brand` sidebar selection, and solid `--brand` interactive links.
- **Direction B:** A compact status tiles row above the feed, a borderless `--caution` live row, and a tinted `--kind` top band on feed cards.