---
name: prompt-grade
description: >-
  Grade a voice-extractor Workbench prompt against Anthropic's live prompting
  docs (best practices + Sonnet 5). Use ONLY when the user invokes
  /prompt-grade with a prompt pasted or a file path. Not for skill files
  (use /skill-style). Never auto-invoke during prompt iteration.
argument-hint: <path to prompt file, or paste the prompt after the command>
user-invocable: true
disable-model-invocation: true
---

# Prompt grade: rubric audit for the extraction prompt

Grades ONE prompt artifact against the live Anthropic docs. The rubric is
exactly the fetched sections in phase 2, nothing inherited from house skill
style: skill-style governs SKILL.md files, this rubric governs API prompts,
and neither contract applies to the other's artifact.

## Operating context (fixed, do not relitigate)

* **Target model:** Sonnet 5 via API/Workbench. If the target model ever
  changes, swap the model-specific URL in phase 1 for the matching page
  (`prompting-claude-opus-5`, `prompting-claude-fable-5`).
* **Call shape:** single shot, no tools, user message = reporter handle +
  beat + corpus of 50 XML-tagged posts (~3K tokens), guide as output.
* **Thinking:** adaptive thinking on (the Sonnet 5 default; manual thinking
  budgets do not exist on this model).
* **Effort:** operating band medium to high. Higher tiers are permitted but
  are never the fix for a prompt problem at this task size.
* **max_tokens:** set high as headroom only (thinking and response share
  the budget).
* **Lean target:** guide output of identity paragraph + trigger rules with
  examples + code-appended measured-facts + representative posts, roughly
  4-6K chars. All grading is judged within this budget.
* **User preference:** no em dashes anywhere, including the prompt under
  review and the guides it produces. Flag any.

## 1. Fetch

* WebFetch both pages. Read ONLY the sections named in phase 2.

```
https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices.md
```

```
https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5.md
```

* **Precedence:** where the two pages differ, the Sonnet 5 page wins
  (model-specific overrides general).

## 2. Grade

* **Rubric, best-practices page:** Be clear and direct · Add context to
  improve performance · Use examples effectively · Structure prompts with
  XML tags · Give Claude a role · Communication style and verbosity ·
  Control the format of responses.
* **Rubric, Sonnet 5 page:** More literal instruction following · Response
  length and verbosity · Calibrating effort and thinking depth.
* **Tools conditional:** only if the prompt under review defines tools,
  also read and apply the Tool use sections of both pages. Otherwise skip
  them entirely.
* **Removals are first-class findings:** a prompt section that adds no
  measurable behavior is a finding ("cut this"), equal in rank to a missing
  technique. Never recommend an addition that pushes the output past the
  lean target; the failure this prevents is the rubric ratcheting the
  prompt back toward the 202-line forensic version.

## 3. Report

* One finding per bullet, cuts first, then fixes, then additions:

<finding-format>
**[Structure prompts with XML tags] cut:** the `<analysis_steps>` block
restates what the corpus tags already convey. Quote: "First, examine..."
</finding-format>

* Quote the offending prompt text in every finding.
* End with a one-line overall verdict: ship, iterate, or rework.
