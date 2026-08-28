# Experiments

One file per experiment: `exp1.md`, `exp2.md`, lowercase. The filename is the experiment's ID; the ID appears nowhere else. This file holds the experiment template: each part shown exactly as it appears in an experiment file, explained below it. `design.md` in this folder is the owner's guide for filling the template and reading results. Paragraphs are never hard-wrapped; one paragraph is one line in the file.

Sections settled so far: header and opening, Learn. The remaining sections (Measure, Cohort, Build, Results, Analysis, Verdict) are added here as each is settled with the owner.

## Header and opening

```
# exp1 ([Mmm DD] - [Mmm DD])

**Name:** Oparax DM alerts

One free-form paragraph plainly describing what this experiment is, written as a single unwrapped line.
```

- The level 1 header repeats the filename exactly. The parentheses hold the start and end dates, each as three-letter month plus day number, e.g. `(Aug 28 - Sep 6)`.
- **Name:** is one line, the experiment's general name.
- The paragraph is unlabeled free text: what this experiment is. What it decides belongs in Learn.

## Learn

```
## Learn

### Leap-of-faith assumptions

1. **Short name:** the belief in one sentence, written at the level this one run can decide.

### Hypothesis

#### Value

Who will do what, one sentence. The level 4 header names the bet's kind: Value or Growth.

**Disproved:** the result that kills it.
```

- Assumptions are an enumerated list, each a bold short name, a colon, then the sentence.
- Keep two assumptions separate only when they fail in different directions; merged when they fail the same way (see design.md).
