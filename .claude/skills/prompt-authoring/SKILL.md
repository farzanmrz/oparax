---
name: prompt-authoring
description: Use when writing, editing, tuning, or reviewing the eve agent's SYSTEM PROMPTS in this project — agent/instructions.md (the DeepSeek orchestrator) or the grok scan tool's SYSTEM_PROMPT in agent/tools/grok_twitter_search.ts. Triggers include "help me write the sysprompt", "tune instructions.md", "improve the grok scan prompt", "rewrite the agent's system prompt", "the agent isn't following its instructions". Loads general prompt hygiene plus DeepSeek-flash and grok-specific do's and don'ts.
model: inherit
---

# Authoring the eve agent's system prompts

Two independent system prompts steer this agent, and a failure belongs to whichever one owns it — fixing the wrong prompt wastes a cycle:

- **`agent/instructions.md`** steers **DeepSeek** (the orchestrator): conversation flow, when to call a tool, how to present results.
- The **`SYSTEM_PROMPT`** in `agent/tools/grok_twitter_search.ts` steers **grok-4.3** (the scan tool): how it searches X and shapes results.

A vague DeepSeek `instructions` arg can't be rescued by a good grok prompt. Decide which prompt owns the behavior, then edit that one.

## General principles (both prompts)

- **Be direct and unambiguous.** The top failure modes are ambiguity, inconsistent formatting, and under-specification. Say exactly what you mean.
- **Structure with Markdown headers + short bullets.** It measurably improves instruction adherence.
- **Specify output format explicitly, WITH one concrete example block.** Show the shape, don't just describe it — small models copy an example far better than they infer from prose.
- **State the role in a line or two** up top.
- **Don't over-constrain.** Give the minimum rules that pin role, tool policy, and output shape; let the model fill the rest. A wall of conflicting micro-rules degrades output.
- **Keep the prompt in one language (English).** Mixing languages inside the prompt makes DeepSeek unpredictable.
- **Recap the key constraint at the end** of long or result-heavy context.

## DeepSeek-specific (`agent/instructions.md`)

`deepseek-v4-flash` is the efficiency/chat tier — prompt it like a chat model, not a reasoning model.

- **Don't bake in chain-of-thought** ("think step by step"), self-consistency, or few-shot machinery. The flash tier does better with direct answers; if you want real reasoning, that's the `reasoning` setting in `agent/agent.ts`, not prompt text.
- **Number the conversational flow** (e.g. beat → scan setup → drafting → frequency) so it moves through phases in order.
- **State the tool-use policy**: exactly when to call `grok_twitter_search` (and what to pass) vs `web_fetch` vs answer directly.
- **Control chat presentation**: short sentences, no em-dash rambling, and the exact structure for listing found tweets and for showing a draft (the ai-elements surface renders the model's Markdown).
- **Foreign-language handling**: tell it to detect the user's language and respond/draft in it — but keep the controlling instructions themselves in English (treat the user's language as data, not as a reason to code-switch the prompt).

## Grok-specific (the scan tool `SYSTEM_PROMPT`)

- **Nudge search strategy**: run several narrow keyword/semantic queries with different phrasings rather than one broad query; fetch a post's thread or author when it's ambiguous.
- **Define what counts as news** relative to the beat (concrete developments vs reply chatter/hype).
- **Fix the scan-results output shape** (headline / what / who / when / post URLs) with an example.
- **Reinforce the date window** is already enforced server-side — don't reason about older material.
- **Subtool nudging is best-effort only**: xAI gives no parameter to force which `x_search` subtool runs (keyword/semantic/user/thread), and prompt-steering it is undocumented — don't rely on it for correctness.

## Where to verify

Test prompt changes with the flow evals (`.claude/references/eval-notes.md`) or the eve dev TUI, and review past runs with the `eve-session-review` skill. Don't judge a prompt tweak by one manual chat.
