# Oparax Input + Label Standardization POC

## Summary
Standardize one UI element family first: normal text inputs, password inputs, labels, placeholder text, and validation/error states. The work stays iterative: tune one visual/state detail at a time on login, review visually, adjust, then only promote the settled behavior into other pages and the skill.

## Key Changes
- Use `components/ui/input.tsx` as the canonical source for input styling: normal, hover, focus/clicked, placeholder, disabled, invalid, dark mode, border, radius, height, background, font size, and text color.
- Use `FieldLabel` from `components/ui/field.tsx` as the canonical label style paired with inputs.
- Ensure `PasswordInput` continues to inherit the canonical `Input` styling; only its password-specific eye button is treated as a separate future styling concern.
- When standardizing an existing page, remove local visual overrides that fight the canonical input/label styling, unless the override is only for layout or a compound-control shape.
- Wire invalid states using `data-invalid` on `Field` and `aria-invalid` on `Input`/`PasswordInput`, so the existing invalid styling actually activates.

## Skill Changes
- Keep the new stripped-down `frontend-custom` boilerplate as the starting point.
- Add input-specific instructions only after the login input style is settled.
- The skill should tell agents to reuse `Input`, `PasswordInput`, and `FieldLabel`; remove conflicting local input/label overrides when standardizing existing UI; and wire invalid states with `data-invalid` + `aria-invalid`.
- The skill should not duplicate every Tailwind class. It should point to the canonical files and describe the required usage pattern.

## Validation Flow
- **Step 1: Login tuning loop.** Tune the input + label UI on `/login` only, one detail at a time, until approved.
- **Step 2: Forgot password global check.** Check `/forgot-password` to confirm the settled global `Input`/`FieldLabel` styling appears there without manually recreating login styles.
- **Step 3: Signup skill check.** After updating the skill, start a new skill-invoked chat and ask it to standardize signup input fields using the global defaults, including removing conflicting local overrides.
- **Step 4: AGENTS.md check later.** After the skill-invoked signup test works, manually reference the skill from `AGENTS.md`, then start a new chat and test whether create-workflow input fields follow the defaults implicitly.
- **Step 5: Password and invalid-state spot checks.** During the above page checks, confirm password fields inherit the same input styling and invalid fields display the same canonical error/invalid UI.

## Assumptions
- No broad implementation happens in one pass; every visual decision is reviewed interactively.
- Hard global selectors like raw `input { ... }` styling are out of scope for this POC.
- Buttons, links, textareas, selects, cards, and full form layouts are future passes after input + label standardization proves the workflow.
