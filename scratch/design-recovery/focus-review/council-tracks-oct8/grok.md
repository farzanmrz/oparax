I'll read the brief and the guidance index first, then only the skill files that apply to this review.The brief is a process council on the two tracks, the design-system step, and a from-scratch rebuild. I'll read the October 6 rounds and the named ground-truth files next.The two tracks can run now, in this session, on localhost, with no real build. A from-scratch rip of the whole product is the loop again. The plan stage decides repair or rewrite per area, and only his yeses go into the brief.

## 1. The two tracks

Same session. He looks at one page while the algorithm for that page is explained. Nothing is written until he says yes to that exact text.

**Design walk.** One page at a time: login, setup, onboarding, feed, sources, notifications. Example data stays labeled as example data. He says yes or no to the page. A no stays on that page until the correction gets a yes. A ruling is his sentence while looking, plus the yes or no, plus the screenshot. The host reads it back. On his "write that," it goes into the page notes as his words. It does not go into `DESIGN.md`. That file is the theme (colors, type, depth, width). A token changes only when he authorizes that exact edit. No design council unless he asks for one on that page.

**Algorithm.** One step at a time, from the code: what the step decides, the number, and the rejection that already binds it. He corrects it or says that is it. The spec he owns is those yeses, about one screen: onboarding first (score the table, pick the set, write the brief), then feed and alert only if he pulls them in. The prompts stay in the code as the reference. A prompt change is a yes or no on that one question. Two lines are already his, from October 6, and belong on that screen: adding and removing sites and feeds needs sign-up, not payment, and a notification is one channel per person (kind and address), one delivery per story per channel, with X DM as the only channel built. The 20-site and 10-account idea is not on the spec until he rules it in this chat.

On his "write this," the spec becomes the feature brief. It does not go into `decisions.md` (rejections and reversals only) or `DESIGN.md`.

What would change this: he says one file should hold the page yeses. Then that file, and only the sentences he approved.

## 2. The design-system step

Smallest set a builder needs. It is already mostly written.

* `DESIGN.md` as it is: ground, lines, one job per hue, depth, radius, Open Sans, the centred column, light mode in its own right.
* The design skill's bar: the six accepted feeds, the near misses, the rejections, and the philosophy. The philosophy changes only when he says "change this principle."
* One accepted screenshot per page he said yes to, with his sentence. Tokens cannot reproduce the bubble menu or those pages. The builder opens that screenshot before writing the page.

He has not said which part of the skill failed. Do not guess, and do not rewrite the skill in advance. The step is one edit he authorizes after he names the part, or points at the page the skill got wrong. The likely part, given sixteen passes: the skill still sends a builder to invent directions from the October 2 feeds. Once he has said yes to a page, the job is to reproduce that page. A settled page is not a brief for another direction. Per-page quotes stay under the philosophy, and only while a page is still open. A yes closes that list.

What would change this: he names a different part. That part is the edit.

## 3. The feature brief, and the three homes

"From scratch" is the wrong word for the whole product. He rejected a from-scratch onboarding rebuild on September 27. The plan stage (`/feature`) marks each area repair or rewrite against the accepted pages, the spec, and the bug lines. An area is a rewrite only when he has named a structure a small change cannot carry. The September 28 code stays on beta until the replacement passes his walk. Scratch and the docs stay until he orders the cleanup. He already refused to delete them.

The host's three homes, corrected:

* **Code on beta, until his walk passes.** Right. This is the reference, including the nuances in the current onboarding, feed, and notification code.
* **Rulings in `decisions.md` and `DESIGN.md`.** Wrong homes for this. `decisions.md` records rejections and reversals, and he decides each line. `DESIGN.md` is the theme. Positive rulings live in the spec he said yes to.
* **A bug ledger.** Right content, wrong as a new standing file. Each confirmed bug is one line in the feature brief: what broke, the cause, the rule that stops it. He confirms the line. Four lines are already earned:
  * Jev cap, fixed October 8 (`ddcaf857`): each request carries only its own candidates. Do not raise the cap, and do not send the whole table in every batch.
  * Auth email buttons use the requesting site's return address, not the Site URL (fixed in the live setup October 5). A rewrite must not point them back at the Site URL.
  * The paid-only source gate was the September 28 build's default. He ruled sign-up only.
  * A council lane has 14 minutes and is stopped at 15. A brief that needs the whole archive produces a missing answer. The lane brief is the yeses, not the sixteen passes.

Measured costs stay in `docs/references/cogs.md`. The brief cites that file and the date. Copying the numbers makes a second, drifting copy.

Parked ideas stay off the brief. One list, first line "Not a requirement," and only when he says "park this." Nothing on it is built until he says "build this." The per-account daily cap and "search infiltration" stay unrecorded until then.

What would change the repair-or-rewrite call: he looks at one area and says this structure cannot carry the ruling. That area is rewritten. The rest is not.

## 4. The gates

* **Track 1 is done** when he has said yes to each page he is walking, or named the page he is dropping, and no page is sitting on an open no.
* **Track 2 is done** when he has said yes to the one-screen algorithm spec, including the sign-up source gate and the single channel row.
* **The design-system step may start** when both of those are true and he has named the skill part that failed, or pointed at the page it got wrong.
* **The feature flow may start** when that one authorized skill edit is in, the brief is only the yeses, the spec, the cost citation, and the confirmed bug lines, and he says "trigger the feature flow."

A real build is not the gate. He ruled that localhost is enough for now. If a later real run shows a source he would not watch, or a card the article does not support, the flow stops and that one step reopens.

## 5. The loop

The thing that restarts it is a brief, or a skill edit, assembled from the whole archive and the chat. Unsettled remarks become principles, the builder starts pass 17, and the rewrite puts back the whole-table Jev request, the Site URL email links, and the paid-only source gate.

The rule: if the host cannot point to his yes on that page, that spec line, or that bug line, it is out. An example is out. A council suggestion is out. A sentence in scratch is out. A lane that ran out of time is not a reason for another round.