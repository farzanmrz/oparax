# `.ts` comment & import conventions

Oparax's comment and import rules for plain TypeScript (no JSX), each rule followed by a worked `Incorrect`/`Correct` example. For React components, read [tsx-examples.md](tsx-examples.md) instead. Change **only** comments and import structure — never logic, types, runtime behavior, or string contents.

## Comments go on their own line

Put a comment on its own line directly above the code it describes — never inline/trailing on the same line as code.

```typescript
// Incorrect

const REASONING_EFFORT = 'low'; // how hard the model thinks

// Correct

// How hard the model thinks
const REASONING_EFFORT = 'low';
```

## Blank line above a comment when code sits directly above it

Leave a blank line above a comment whenever there is code on the line directly above it — including the opening `{` of a block — so the comment reads as a separate unit. This applies inside loop and function bodies too.

```typescript
// Incorrect

const stream = await getEvents();
// Handle each streamed event in order.
for (const event of stream) handle(event);

// Correct

const stream = await getEvents();

// Handle each streamed event in order.
for (const event of stream) handle(event);
```

```typescript
// Incorrect

for await (const event of stream) {
  // Route each event type to its handler.
  switch (event.type) { ... }
}

// Correct

for await (const event of stream) {

  // Route each event type to its handler.
  switch (event.type) { ... }
}
```

## No comment without code, and no decorative dividers

Every comment must sit directly above the code it describes. Never leave a comment with no code beneath it, and never use decorative divider or section-banner comments.

```typescript
// Incorrect

// ─── Knobs: edit these to experiment ──────────────────────
const MODEL = 'grok-4.3';

// ───────────────────────────────────────────────────────────

// Correct

const MODEL = 'grok-4.3';
```

## One `//` line per comment — never block form (except docstrings)

Write every comment as a single `//` line. Never stack two or more `//` lines, and never use the `/** */` block form — the single exception is a function docstring (see the last rule).

```typescript
// Incorrect

/**
 * Load .env.local into process.env — the in-code version of Node's `--env-file` flag.
 * This is why the plain `node ...` command and the VSCode Run button can find the key.
 */
process.loadEnvFile('.env.local');

// Correct

// Load .env.local so plain `node ...` and the VSCode Run button can find the key
process.loadEnvFile('.env.local');
```

## Keep comments brief (~100 chars)

Keep every comment brief — roughly 100 characters or fewer (applies to `//` lines and docstring lines alike). If a note would run longer, trim the detail; never wrap or split it across lines.

```typescript
// Incorrect

// model, reasoning effort ('low' | 'medium' | 'high'), max output token cap, server-side tools (x_search reads X), debug tracing
const MODEL = 'grok-4.3';
const REASONING_EFFORT = 'low';
const MAX_OUTPUT_TOKENS = 1_000_000;
const TOOLS = [{ type: 'x_search' }];
const DEBUG = true;

// Correct

// model, reasoning effort, output cap, server-side tools, debug tracing
const MODEL = 'grok-4.3';
const REASONING_EFFORT = 'low';
const MAX_OUTPUT_TOKENS = 1_000_000;
const TOOLS = [{ type: 'x_search' }];
const DEBUG = true;
```

## A `//` above every `for`, `switch`, `let`, and `const`

Put a single `//` line directly above every `for` loop, `switch` statement, `let` declaration, and `const` declaration, briefly describing it. Never leave a `const` — or a run of related `const`s — bare; unlabelled declarations clash together with no logical separation. For a group of related declarations on consecutive lines, put one comment above the whole group rather than one per line.

```typescript
// Incorrect

let finalResponse: OpenAI.Responses.Response | undefined;

for await (const event of stream) {
  switch (event.type) { ... }
}

// Correct

// Accumulate the final response once the stream closes.
let finalResponse: OpenAI.Responses.Response | undefined;

// Walk each stream event and dispatch on its type.
for await (const event of stream) {

  // Route each event type to its handler.
  switch (event.type) { ... }
}
```

```typescript
// Incorrect

const client = createClient();

const MODEL = 'grok-4.3';
const REASONING_EFFORT = 'low';
const TEMPERATURE = 0;
const MAX_OUTPUT_TOKENS = 1_000_000;

// Correct

// Supabase client for this request.
const client = createClient();

// Grok model + sampling knobs for the scan.
const MODEL = 'grok-4.3';
const REASONING_EFFORT = 'low';
const TEMPERATURE = 0;
const MAX_OUTPUT_TOKENS = 1_000_000;
```

## Describe a `switch` once — not per-case

Describe a `switch` with the single comment above it — do not comment individual `case`s. If you ever do comment cases, comment every case, never just some.

```typescript
// Incorrect

switch (itemType) {
  case 'reasoning':
    return '💭 REASONING';

  // how x_search surfaces in the output stream
  case 'custom_tool_call':
    return '🔧 TOOL CALL';
  default:
    return itemType.toUpperCase();
}

// Correct

// Map each raw item type to its display header.
switch (itemType) {
  case 'reasoning':
    return '💭 REASONING';
  case 'custom_tool_call':
    return '🔧 TOOL CALL';
  default:
    return itemType.toUpperCase();
}
```

## Document every function with a `/** */` docstring

Document every function with a `/** */` docstring using the basic TSDoc tags (`@param`, `@returns`). This block form is allowed only here — never for ordinary comments.

```typescript
// Incorrect

/** Turns an item type into a readable section header. */
function itemLabel(itemType: string): string {
  // ...
}

// Correct

/**
 * Turns the raw `item.type` into a readable section header.
 * @param itemType - the `item.type` from a response.output_item.added event
 * @returns a labelled header string for that step
 */
function itemLabel(itemType: string): string {
  // ...
}
```

## Imports under a single `// Imports` comment

Start the file with its imports under a single-line `// Imports` comment — the same whether there is one import or many. Never open a file with a large multi-line comment dumping the file's purpose, usage, or caveats. (The only thing that may sit above `// Imports` is a required `'use client'` / `'use server'` directive, which Next.js requires on the first line.)

```typescript
// Incorrect

/**
 * grok-min.ts — a minimal xAI scan that mirrors the web dashboard's request.
 * Streams one x_search-backed news scan, printing the reply as it arrives.
 * Run it with: node scripts/grok-min.ts
 */

import OpenAI from 'openai';

// Correct

// Imports
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';
```
