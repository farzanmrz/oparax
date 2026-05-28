# `.tsx` comment & import conventions

Oparax's comment and import rules for React components, each rule followed by a worked `Incorrect`/`Correct` example. The rules match plain TypeScript (see [ts-examples.md](ts-examples.md)); the examples here use components, hooks, and the `'use client'` directive. Change **only** comments and import structure — never logic, types, runtime behavior, or string contents.

## Comments go on their own line

Put a comment on its own line directly above the code it describes — never inline/trailing on the same line as code.

```tsx
// Incorrect

const [prompt, setPrompt] = useState(''); // current draft prompt

// Correct

// Holds the current draft prompt the user is editing.
const [prompt, setPrompt] = useState('');
```

## Blank line above a comment when code sits directly above it

Leave a blank line above a comment whenever there is code on the line directly above it — including the opening `{` of a block — so the comment reads as a separate unit. This applies inside hook callbacks and component bodies too.

```tsx
// Incorrect

useEffect(() => {
  // Re-run the scan whenever the prompt changes.
  void runScan(prompt);
}, [prompt]);

// Correct

useEffect(() => {

  // Re-run the scan whenever the prompt changes.
  void runScan(prompt);
}, [prompt]);
```

## No comment without code, and no decorative dividers

Every comment must sit directly above the code it describes. Never leave a comment with no code beneath it, and never use decorative divider or section-banner comments.

```tsx
// Incorrect

// ─── Component state ───────────────────────────────
const [prompt, setPrompt] = useState('');

// Correct

const [prompt, setPrompt] = useState('');
```

## One `//` line per comment — never block form (except docstrings)

Write every comment as a single `//` line. Never stack two or more `//` lines, and never use the `/** */` block form — the single exception is a function docstring (see the last rule).

```tsx
// Incorrect

/**
 * Tracks whether a scan request is currently in flight.
 */
const [isScanning, setIsScanning] = useState(false);

// Correct

// Tracks whether a scan request is currently in flight.
const [isScanning, setIsScanning] = useState(false);
```

## Keep comments brief (~100 chars)

Keep every comment brief — roughly 100 characters or fewer. If a note would run longer, trim the detail; never wrap or split it across lines. For a group of related declarations, one comment above the whole group.

```tsx
// Incorrect

// holds the draft prompt text, the in-flight flag, and the streamed scan output rendered below the form as it arrives
const [prompt, setPrompt] = useState('');
const [isScanning, setIsScanning] = useState(false);
const [output, setOutput] = useState('');

// Correct

// draft prompt, in-flight flag, streamed scan output
const [prompt, setPrompt] = useState('');
const [isScanning, setIsScanning] = useState(false);
const [output, setOutput] = useState('');
```

## A `//` above every `for`, `switch`, `let`, and `const`

Put a single `//` line directly above every `for` loop, `switch` statement, `let` declaration, and `const` declaration, briefly describing it. Never leave a `const` — or a run of related `const`s — bare; unlabelled declarations clash together with no logical separation. For a group of related declarations on consecutive lines, put one comment above the whole group rather than one per line.

```tsx
// Incorrect

let label = 'Idle';

for (const item of items) rows.push(renderRow(item));

// Correct

// Human-readable label shown on the status badge.
let label = 'Idle';

// Render each item into a table row.
for (const item of items) rows.push(renderRow(item));
```

```tsx
// Incorrect

const MAX_HANDLES = 20;
const PLACEHOLDER = 'Add an X account…';

const isValid = handles.length > 0 && prompt.trim().length > 0;

// Correct

// Form limits and placeholder copy for the workflow builder.
const MAX_HANDLES = 20;
const PLACEHOLDER = 'Add an X account…';

// The form can submit only with handles and a non-empty prompt.
const isValid = handles.length > 0 && prompt.trim().length > 0;
```

## Describe a `switch` once — not per-case

Describe a `switch` with the single comment above it — do not comment individual `case`s. If you ever do comment cases, comment every case, never just some.

```tsx
// Incorrect

switch (status) {
  case 'scanning':
    return 'Scanning…';

  // when the scan finished cleanly
  case 'done':
    return 'Done';
  default:
    return 'Idle';
}

// Correct

// Map the scan status to its badge label.
switch (status) {
  case 'scanning':
    return 'Scanning…';
  case 'done':
    return 'Done';
  default:
    return 'Idle';
}
```

## Document every function (including components) with a `/** */` docstring

Document every function with a `/** */` docstring using the basic TSDoc tags (`@param`, `@returns`). Components and event handlers count. This block form is allowed only here — never for ordinary comments.

```tsx
// Incorrect

export default function NewTestWorkflowPage() {
  return <div>...</div>;
}

// Correct

/**
 * Page for creating a new test workflow.
 * @returns the create-test-workflow screen with header and form
 */
export default function NewTestWorkflowPage() {
  return <div>...</div>;
}
```

## Imports under a single `// Imports` comment

Start the file with its imports under a single-line `// Imports` comment — the same whether there is one import or many. Never open a file with a large multi-line comment dumping the file's purpose. The only thing that may sit above `// Imports` is a required `'use client'` / `'use server'` directive, which Next.js requires on the first line.

```tsx
// Incorrect

/**
 * TestWorkflowForm — renders the prompt-testing form and streams a scan.
 * Client component because it uses hooks and event handlers.
 */
'use client';

import { useState } from 'react';

// Correct

'use client';

// Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';
```
