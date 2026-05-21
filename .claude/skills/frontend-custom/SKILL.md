---
name: frontend-custom
description: Enforces the company's standardized UI by reusing the fixed design defined for each web element (inputs, buttons, forms, cards, etc.) from its canonical source file or global style, instead of styling components ad hoc. Keeps the whole site visually consistent and removes the need to re-explain the UI format for every new component.
when_to_use: Whenever building or editing any web UI — new pages, landing pages, dashboards, form wizards, individual components/artifacts, or restyling and standardizing existing components.
---

This skill makes new and edited UI components match the company's standardized design. Do NOT invent new aesthetics, fonts, colors, or layouts. For each component type, the canonical look is already defined in this repo — reuse it.

## How to use this skill

1. Identify which component(s) the task involves (input, button, form, card, etc.).
2. Look up that component in the **Component Registry** below.
3. Open the referenced source file / class and reuse its existing styles, props, and structure. Do not redefine styling that already lives there.
4. If a component type is not yet listed in the registry, match the closest existing component's conventions and flag that it's missing so it can be added here.

## Component Registry

For each component, the registry points to the canonical source of truth. The linked file's classes/props are authoritative — compose with it, do not fork or restyle it.

### Input
- **Source of truth**: `components/ui/input.tsx`
- **Usage**: Import and use the `Input` component directly. Pass overrides via `className` only when the task explicitly requires it; never replace the base classes defined in the source file.
- **Notes**: _(fill in: when to use this vs. textarea, label pairing, error/aria-invalid handling, etc.)_

<!--
### Button
- **Source of truth**: components/ui/button.tsx
- **Usage**:
- **Notes**:

### Form
- **Source of truth**:
- **Usage**:
- **Notes**:

### Card
- **Source of truth**:
- **Usage**:
- **Notes**:

Add more component entries here following the same pattern.
-->

## Global conventions

_(fill in: theme tokens / CSS variables in app/globals.css, font choices, spacing scale, dark-mode rules, or any global class/id that applies across components.)_
