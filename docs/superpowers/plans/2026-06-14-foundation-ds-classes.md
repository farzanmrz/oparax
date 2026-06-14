# Foundation: Design-System Component Classes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the new sidebar/settings/connection component classes from the Claude Design export into `app/globals.css` so the later sprint issues (#23–#26) can consume them. No page wiring in this issue.

**Architecture:** Add the classes verbatim into the existing `@layer components { … }` block in `app/globals.css` (where `.btn`, `.field`, `.wbadge` already live). Tokens are identical between the export and the repo, so the CSS ports unchanged; `.pblink` reuses the existing `@keyframes dot-blink`. Verify with build + lint + a throwaway preview route (no unit tests — this repo has none per AGENTS.md).

**Tech Stack:** Tailwind v4 + plain CSS in `app/globals.css`; Next.js App Router; pnpm.

**Issue:** [#22](https://github.com/farzanmrz/oparax-chirp/issues/22) · **Branch:** `ft/22-ds-classes` off `dev`

---

### Task 0: Branch

- [ ] **Step 1: Create the branch off dev**

```bash
git checkout dev && git pull --ff-only && git checkout -b ft/22-ds-classes
```

---

### Task 1: Sidebar nav + footer classes

**Files:** Modify `app/globals.css` — inside the `@layer components { … }` block, immediately **after the `.loadbar { … }` rule and before the layer's closing `}`**, add the block below.

- [ ] **Step 1: Add the sidebar classes**

```css
  /* ------------------------------------------------ app sidebar (nav + footer) */
  .nav-main {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 44px;
    padding: 0 10px;
    border-radius: var(--radius);
    border: 1px solid transparent;
    color: var(--muted);
    font: 600 0.9375rem/1 var(--font-sans);
    text-decoration: none;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .nav-main:hover { background: oklch(1 0 0 / 0.07); color: var(--fg); }
  .nav-main[data-active="true"] {
    background: var(--accent-soft);
    border-color: var(--accent-line);
    color: var(--accent);
    font-weight: 650;
  }
  .nav-main.nav-soon { opacity: 0.38; cursor: not-allowed; }
  .nav-main.nav-soon:hover { background: transparent; color: var(--muted); }

  /* settings sub-nav — shallow indent, neutral (not accent) active highlight */
  .snav { display: flex; flex-direction: column; gap: 1px; padding: 3px 0 6px; }
  .snav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    height: 32px;
    padding: 0 10px;
    margin-left: 14px;
    border-radius: 7px;
    color: var(--faint);
    font: 500 0.84375rem/1 var(--font-sans);
    text-decoration: none;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .snav-item:hover { background: oklch(1 0 0 / 0.05); color: var(--fg); }
  .snav-item[data-active="true"] { background: oklch(1 0 0 / 0.09); color: var(--fg); font-weight: 650; }

  /* footer profile line (avatar + name) + icon-only sign out */
  .you-line {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    border-radius: 9px;
    background: transparent;
    border: 0;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s;
  }
  .you-line:hover { background: oklch(1 0 0 / 0.06); }
  .foot-signout {
    width: 32px;
    height: 32px;
    flex: none;
    display: grid;
    place-items: center;
    background: transparent;
    border: 0;
    border-radius: 7px;
    color: var(--faint);
    cursor: pointer;
    padding: 0;
    transition: background 0.12s, color 0.12s;
  }
  .foot-signout:hover { background: oklch(0.7 0.185 25 / 0.13); color: var(--err); }
```

- [ ] **Step 2: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: build completes, lint prints no errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css && git commit -m "feat(ds): add sidebar nav + footer classes (#22)"
```

---

### Task 2: Settings section + field classes

**Files:** Modify `app/globals.css` — append directly after the Task 1 block, still inside `@layer components`.

- [ ] **Step 1: Add the settings classes**

```css
  /* ------------------------------------------------ settings page (section cards + fields) */
  .card-sec {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 22px 24px;
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.4);
  }
  .sec-title { margin: 0 0 16px; font: 700 1.25rem/1.15 var(--font-sans); letter-spacing: -0.01em; color: var(--fg); }

  /* stacked, labelled settings field (label above input) */
  .fld { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .fld label { font: 650 0.8125rem/1 var(--font-sans); color: var(--muted); }
  .set-input {
    width: 100%;
    height: var(--ctl-h);
    background: var(--field-bg);
    border: 1px solid var(--field-line);
    border-radius: var(--radius);
    padding: 0 12px;
    font: 500 0.875rem/1.45 var(--font-sans);
    color: var(--fg);
    outline: none;
    transition: border-color 120ms ease, background 120ms ease;
  }
  .set-input:focus { border-color: var(--accent-line); background: var(--field-focus); }
  .set-input::placeholder { color: var(--faint); font-weight: 400; }

  /* large click-to-upload avatar (hover reveals camera overlay) */
  .avatar-up {
    position: relative;
    width: 88px;
    height: 88px;
    border-radius: 50%;
    flex: none;
    cursor: pointer;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px oklch(1 0 0 / 0.22);
  }
  .avatar-up .ov {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: oklch(0 0 0 / 0.5);
    color: #fff;
    opacity: 0;
    transition: opacity 0.16s ease;
  }
  .avatar-up:hover .ov { opacity: 1; }

  /* inset settings list row (password, notification, delete, etc.) */
  .arow {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 15px;
    background: var(--inset);
    border: 1px solid var(--line);
    border-radius: 10px;
  }
  .arow .grow { flex: 1; min-width: 0; }
  .arow .rt { font: 650 0.9375rem/1.2 var(--font-sans); color: var(--fg); }
  .arow .rs { font: 400 0.8125rem/1.3 var(--font-sans); color: var(--faint); margin-top: 3px; }

  /* neutral outline button (settings actions) */
  .ghost-btn { background: transparent; border: 1px solid var(--field-line); color: var(--muted); }
  .ghost-btn:hover { border-color: var(--line-strong); color: var(--fg); transform: none; box-shadow: none; }
```

- [ ] **Step 2: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: build completes, lint prints no errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css && git commit -m "feat(ds): add settings section + field classes (#22)"
```

---

### Task 3: Connection pill + toggle classes

**Files:** Modify `app/globals.css` — append directly after the Task 2 block, still inside `@layer components`. NOTE: `.pblink` reuses the existing `@keyframes dot-blink` (already defined in this file's animation section) — do not add a new keyframe.

- [ ] **Step 1: Add the pill + toggle classes**

```css
  /* ------------------------------------------------ connection pill (logo fills left square, body flush right) */
  .pill {
    display: inline-flex;
    align-items: stretch;
    border: 1px solid var(--field-line);
    border-radius: 3px;
    overflow: hidden;
    background: var(--chrome);
    cursor: pointer;
    padding: 0;
    font: inherit;
    transition: border-color 0.12s;
  }
  .pill:hover { border-color: var(--line-strong); }
  .pill[data-soon="true"] { opacity: 0.45; cursor: default; }
  .pill[data-soon="true"]:hover { border-color: var(--field-line); }
  .pill-logo {
    width: 34px;
    height: 34px;
    flex: none;
    display: grid;
    place-items: center;
    overflow: hidden;
    font: 800 1.05rem/1 var(--font-sans);
  }
  .pill-logo svg { display: block; width: 34px; height: 34px; }
  .pill-body {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 13px;
    color: var(--fg);
    font: 650 0.84375rem/1 var(--font-sans);
    white-space: nowrap;
  }
  .pblink { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .pblink.on  { background: var(--live); box-shadow: 0 0 6px var(--live); animation: dot-blink 1.4s ease-in-out infinite; }
  .pblink.off { background: var(--err);  box-shadow: 0 0 6px var(--err);  animation: dot-blink 1.4s ease-in-out infinite; }
  /* letter logo tile (brand marks shipped as a glyph, e.g. G / O) */
  .lt { width: 34px; height: 34px; display: grid; place-items: center; font: 800 1.05rem/1 var(--font-sans); }

  /* ------------------------------------------------ toggle switch (instant-save settings) */
  .switch {
    width: 42px;
    height: 24px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 3px;
    flex: none;
    cursor: pointer;
    background: var(--field-bg);
    border: 1px solid var(--field-line);
    transition: background 0.15s ease;
  }
  .switch[data-on="true"] { justify-content: flex-end; background: var(--accent-soft); border-color: var(--accent-line); }
  .switch .knob { width: 17px; height: 17px; border-radius: 50%; background: var(--fg); flex: none; box-shadow: 0 1px 2px oklch(0 0 0 / 0.4); }
```

- [ ] **Step 2: Add the reduced-motion guard for `.pblink`**

In `app/globals.css`, find the existing `@media (prefers-reduced-motion: reduce) { … }` block (in the animation section, alongside `.dot.blink` / `.caret`) and add `.pblink` to it:

```css
@media (prefers-reduced-motion: reduce) {
  .dot.blink { animation: none; }
  .caret { animation: none; }
  .pblink.on, .pblink.off { animation: none; }
}
```

- [ ] **Step 3: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: build completes, lint prints no errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css && git commit -m "feat(ds): add connection pill + toggle classes (#22)"
```

---

### Task 4: Visual verification (throwaway preview), then clean up

**Files:** Create `app/dashboard/zzpreview-ds/page.tsx` (temporary, deleted at the end).

- [ ] **Step 1: Create a temporary preview route exercising the new classes**

```tsx
// THROWAWAY — visual check for the ported DS classes (#22). DELETE after verifying.
export default function DsPreview() {
  return (
    <div style={{ background: "#000", minHeight: "100vh", padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
      <a className="nav-main" data-active="true"><span>Agents</span></a>
      <a className="nav-main nav-soon"><span>Insights</span></a>
      <div className="snav">
        <a className="snav-item" data-active="true">Profile</a>
        <a className="snav-item">Connections</a>
      </div>
      <div className="card-sec">
        <h2 className="sec-title">Profile</h2>
        <div className="fld"><label>Display name</label><input className="set-input" defaultValue="testuser" /></div>
        <div className="arow" style={{ marginTop: 12 }}>
          <div className="grow"><div className="rt">Email notifications</div><div className="rs">Agent drafted a post</div></div>
          <span className="switch" data-on="true"><span className="knob" /></span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="pill"><span className="pill-logo"><span className="lt" style={{ background: "#000", color: "#fff" }}>X</span></span><span className="pill-body">@you <span className="pblink on" /></span></button>
        <button className="pill"><span className="pill-logo"><span className="lt" style={{ background: "#0A66C2", color: "#fff" }}>in</span></span><span className="pill-body">Connect <span className="pblink off" /></span></button>
        <button className="pill" data-soon="true"><span className="pill-logo"><span className="lt" style={{ background: "#5B7083", color: "#fff" }}>R</span></span><span className="pill-body">Soon</span></button>
      </div>
      <button className="btn ghost-btn" style={{ alignSelf: "flex-start" }}>Change password</button>
    </div>
  )
}
```

- [ ] **Step 2: Start the dev server (if not already running)**

Run: `pnpm dev` (note the port; reuse an existing server on :3000 if present).

- [ ] **Step 3: Visually verify the classes render**

Open `/dashboard/zzpreview-ds` (this route is under the auth-guarded dashboard layout, so sign in as `testuser@oparax.com` / `hello123` if redirected). Confirm: active nav row (accent highlight), "soon" row dimmed, sub-nav items, a graphite section card with a titled header + field + an inset row with an ON toggle, three pills (connected w/ green pulse, "Connect" w/ red pulse, greyed "Soon"), and a ghost button. Capture a screenshot with the `browser-agent` subagent. (Per AGENTS.md, do not auto-drive the browser beyond this verification.)

- [ ] **Step 4: Delete the throwaway preview route**

```bash
rm -rf app/dashboard/zzpreview-ds
```

- [ ] **Step 5: Final build + lint, then commit the cleanup**

Run: `pnpm build && pnpm lint`
Expected: green (the preview route is gone; only the `globals.css` additions remain).

```bash
git add -A && git commit -m "chore(ds): remove throwaway DS preview route (#22)"
```

- [ ] **Step 6: Open the PR into dev**

```bash
git push -u origin ft/22-ds-classes
gh pr create --base dev --title "Sprint 1 · Foundation — DS component classes (#22)" --body "Closes #22. Ports the sidebar/settings/connection-pill/toggle classes into app/globals.css @layer components. No page wiring. Verified via build + lint + throwaway preview."
```

(Opening the PR triggers the existing `claude-code-review.yml` CI auto-review.)

---

## Self-Review

- **Spec coverage:** Issue #22 = "port the new component classes into globals.css." Tasks 1–3 cover every class named in the spec/issue (`.nav-main`/`.nav-soon`, `.snav`/`.snav-item`, `.you-line`/`.foot-signout`, `.card-sec`/`.sec-title`, `.fld`/`.set-input`, `.avatar-up`/`.ov`, `.arow`/`.grow`/`.rt`/`.rs`, `.ghost-btn`, `.pill`/`.pill-logo`/`.pill-body`, `.pblink`, `.lt`, `.switch`/`.knob`). Task 4 verifies. Covered.
- **Placeholders:** none — every CSS block is the real, final content extracted from the export; commands and expected output are concrete.
- **Type/name consistency:** class names match the export and the consuming issues (#23 sidebar uses `.nav-main`/`.snav`/`.you-line`/`.foot-signout`; #24 uses `.card-sec`/`.fld`/`.set-input`/`.avatar-up`/`.arow`/`.switch`; #25 uses `.pill`/`.pblink`/`.lt`). `.pblink` reuses the existing `dot-blink` keyframe (verified present).
- **Note:** `.fld`/`.set-input` overlap conceptually with the repo's `.field`/`.ws-input`; dedup is deferred to #24 (which decides whether to use `.fld` or reuse `.field`). For #22 we port them as-is so the classes are available.

## Open question
- Insertion is into `app/globals.css` `@layer components` (matching `.btn`/`.field`/`.wbadge`), not `app/workspace.css` — these are reusable component classes, not `.workspace`-scoped page layout. Confirm if you'd rather scope them.
