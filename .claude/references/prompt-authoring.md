# Prompt authoring — system prompts for the eve agent (ft/44)

A lean checklist for writing `agent/instructions.md` (the DeepSeek orchestrator) and the grok tool's `SYSTEM_PROMPT`. Grounded in DeepSeek-specific prompting guidance; keep it short — this is a checklist, not a course.

## The one framing that matters

`deepseek-v4-flash` is the **efficiency/chat tier**. It is reasoning-*capable* (thinking toggles on — we have it on), but it's optimized for **direct answering**, not step-by-step narration. So prompt it like a chat/instruction model, **not** like a reasoning model:

- **Do** write a real, non-empty system prompt that locks role + behavior (chat models "respond exceptionally well" to a strong system prompt).
- **Don't** bake in chain-of-thought ("think step by step"), self-consistency, or few-shot-retrieval machinery — those are reasoning-model / runtime concerns and make a flash model verbose and slower for no gain. If you want real reasoning, that's the `reasoning` setting, not prompt text.

## Checklist / template for a system prompt

Write these sections, in this order, terse:

1. **Role** — one or two lines: who the agent is and its single job.
2. **Conversational flow** — the ordered phases it should move through (beat → scan setup → drafting → frequency). Numbered, plain.
3. **Tool-use policy** — exactly which tools it may call and *when* (hard "MUST" vs soft "SHOULD"): call `grok_twitter_search` when the user wants a scan and pass `instructions`/`handles`/`fromDate`/`toDate`; use `web_fetch` for a user-given URL; do not use other tools.
4. **Output format** — the exact shape of each thing it emits (how to list found tweets, how to show a draft), **with one concrete example block**. Small models need the shape shown, not described. State: short sentences, no em-dash rambling.
5. **Foreign-language handling** — keep the **instructions monolingual (English)**; treat the user's language as *data*: detect the language of a tweet/article/beat and respond or draft in the user's language, but never code-switch the controlling instructions (mixed-language prompts make DeepSeek unpredictable).
6. **Constraints** — the few hard rules (e.g. never call the scan tool more than once per user message). Keep them minimal.
7. **Length discipline** — for result-heavy turns (pasting scan output back), use chunked sections with clear headers and recap the key constraint at the end.

## DeepSeek do's / don'ts

- **Do** structure with Markdown headers + short bullets — measurably improves instruction adherence for chat models.
- **Do** be direct and unambiguous; specify formats, units, and platform explicitly. The top failure modes are ambiguity, inconsistent formatting, and under-specification.
- **Do** recap constraints at the end of long/structured context.
- **Don't** over-constrain. Directness ≠ a wall of micro-rules; conflicting rules degrade output. Give the minimum that pins role, tool policy, and output shape; let the model fill the rest. (Especially true for a small model.)
- **Don't** mix languages inside the prompt.
- **Don't** ask the flash tier to narrate its reasoning.

## Two-prompt reminder

There are two independent system prompts. `agent/instructions.md` steers **DeepSeek** (flow, when to call the tool, how to present results). The grok tool's `SYSTEM_PROMPT` steers **grok-4.3** (how to search X, output shape). A vague DeepSeek `instructions` arg can't be rescued by a good grok prompt — fix the failure at the prompt that owns it.
