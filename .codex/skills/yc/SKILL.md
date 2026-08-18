---
name: yc
description: "Research, shortlist, and invite potential cofounders on Y Combinator Startup School through the signed-in in-app Browser. Use only when the user explicitly invokes $yc for either a LinkedIn-audited save-only batch or a LinkedIn-audited analyze-and-invite batch, including removing rejected saved profiles, keeping decision context in chat, drafting personalized outreach, and sending approved messages. Never invoke this skill automatically during development work or another workflow."
---

# YC Cofounder Matching

## 1. Scope and Invocation

Use this skill only for Farzan's cofounder-matching work on `startupschool.org` from his signed-in account.

- **Allowed:** Analyze profiles, run a LinkedIn-audited save-only batch, run a LinkedIn-audited analyze-and-invite batch, skip non-qualifying profiles, audit saved profiles, retain decisions in the active chat, draft personalized DMs, send approved DMs, and verify each remote action. Unsave a named profile only after Farzan authorizes removal and confirms at action time.
- **Excluded:** Edit Farzan's profile, change account settings or matching filters, contact people outside Startup School, or perform unrelated Startup School actions unless Farzan explicitly expands the task.
- **Invocation:** Treat an explicit `$yc` invocation as permission to use the in-app Browser only for the requested YC workflow. Do not activate this skill implicitly or from a development command, automation, subagent, or another skill.
- **Action scope:** Analysis alone does not authorize saving, skipping, unsaving, or messaging. A direct instruction to shortlist a number of profiles authorizes saving and skipping profiles under the criteria below until the requested number of new saves is verified. Before unsaving profiles or sending invitations, show the exact names and exact messages and obtain one grouped action-time confirmation.

## 2. Choose the Explicit Workflow

Use only the workflow Farzan explicitly requests.

- **Save-only:** Read the complete YC profile and the candidate-supplied LinkedIn before saving. Save verified passes, retain reject reasons in the active chat, and stop when the requested number of new saves is verified. Do not draft or send invitations.
- **Analyze-and-invite:** Read the complete YC profile and candidate-supplied LinkedIn, classify the candidate as `Reject`, `Normal invite`, or `Screening invite`, save a passing profile when needed, and prepare a personalized message immediately. Accumulate the exact recipients and messages, obtain one grouped action-time confirmation, then send and verify each approved invitation.
- **Saved-list cleanup and outreach:** Audit the exact visible saved set, prepare an exact removal list and exact invitation messages, obtain one grouped action-time confirmation, then unsave the removals and message the approved recipients.

Never interpret “automate,” “in real time,” or a target count as permission to bypass the final confirmation required for remote deletions and representational messages.

## 3. Keep All Tracking in Chat

Do not create, edit, append, or delete any repository or workspace file while running a YC browser workflow. This includes shortlist logs, outreach audits, candidate notes, draft files, temporary markdown, and progress files.

Keep names, profile URLs, LinkedIn URLs, decision reasons, uncertainties, exact drafts, send results, and counters only in the active conversation state. Present requested summaries directly in chat. If conversation state is unavailable, reconstruct what is safe from the live YC interface and ask Farzan about any material gap rather than creating a tracking file or guessing.

## 4. Browser Requirements

Use the Browser plugin's `browser:control-in-app-browser` skill and follow its instructions completely before taking browser actions.

- **Browser surface:** Use only `[@Browser](plugin://browser@openai-bundled)`, the in-app Browser. Never substitute Chrome, an external browser, standalone Playwright, web search, or general Computer Use.
- **Signed-in profile:** Work through the existing Startup School session in the in-app Browser. Prefer claiming an existing `startupschool.org` tab. Otherwise, navigate in the same in-app Browser profile.
- **Authentication:** Never inspect cookies, local storage, passwords, profiles, or session files. If signed out, ask Farzan to sign in inside the in-app Browser and resume only after he confirms.
- **Viewport:** Use the in-app Browser as it is. Do not set a responsive viewport or override its dimensions unless Farzan explicitly asks.
- **Navigation:** Keep normal workflow navigation on `startupschool.org`. Before saving or inviting, inspect the LinkedIn profile directly supplied by the candidate when accessible. For a borderline decision, open at most two other directly supplied personal-site, GitHub, product, demo, research, or portfolio links for read-only evidence. Do not follow unrelated links, submit information, or contact anyone outside Startup School. Stop if a popup or redirect points somewhere unexpected.

## 5. Read the Whole Profile

Read all visible profile sections before deciding, including activity, introduction, accomplishments, education, employment, current startup, potential ideas, cofounder preferences, and interests.

- **Evidence:** Use only facts visible in the profile or supplied directly by Farzan. Never invent experience, motivation, traction, availability, location, gender, nationality, or interests.
- **Gender requirement:** Farzan wants a male cofounder. Treat a user-confirmed identity or an authoritative platform filter as sufficient. Do not infer gender from a name or photograph when it is not otherwise established.
- **India preference:** Use explicit India-linked evidence such as stated identity, location, education, employment, or Farzan's confirmation. Do not infer ethnicity from a name or photograph.
- **Protected traits:** Do not infer, classify, rank, or reject candidates by race or ethnicity. Use only explicit, relevant compatibility evidence such as India-linked background, location, timezone, language, or cultural familiarity as a positive preference when stated.
- **Location evidence:** Do not trust the YC card location by itself. Compare it with the profile introduction, employment, current startup, and LinkedIn location. YC asks for current city and cofounder location preferences, but it does not provide a willingness-to-relocate field. Prefer an explicit current-location statement over a platform header.
- **Live facts:** Prefer the live profile over facts remembered from an earlier task.

## 6. Shortlisting Gate

Require every saved profile to pass these gates unless Farzan explicitly overrides one for a named person.

- **Activity:** Last seen within 30 days. Day 30 passes; day 31 fails.
- **Engineering orientation:** Require credible hands-on engineering, AI, ML, software, systems, data-engineering, technical-founder, or similarly strong building evidence.
- **Pure business exclusion:** Skip profiles centered on sales, marketing, finance, consulting, operations, management, strategy, or product management without substantial hands-on technical evidence. Business experience does not hurt someone who clearly meets the engineering gate.
- **Startup intent:** Require a stated desire to found, build, join, or seriously explore a startup. A profile that reads like a hiring résumé can still pass when the person is technically strong and genuinely wants to build.
- **Robotics commitment:** Skip someone explicitly committed to pursuing robotics as the next company. A robotics interest tag or past project alone is not enough to reject them.
- **Current exclusions:** Apply any additional niche or profile exclusions Farzan states in the current task, but do not silently generalize one excluded niche into unrelated fields.
- **Platform misuse:** Skip clear service selling, employee recruiting, agency promotion, or other use inconsistent with seeking a cofounder.
- **Duplicates:** Do not save someone already saved, invited, or contacted unless Farzan explicitly asks.

## 7. Require Technical-Founder Substance

Require at least one strong anchor showing more than generic web implementation, IT work, agency work, a developer title, or enthusiasm for startups.

- **Shipped product:** A non-trivial product with users, revenue, adoption, a credible working demo, or specific evidence of repeated shipping.
- **Technical ownership:** Clear responsibility for a difficult production system, AI or ML system, infrastructure, research implementation, or similarly demanding technical work.
- **Strong technical foundation:** Serious CS, engineering, AI, or research credentials supported by concrete projects, competitions, publications, or building evidence.
- **Founder execution:** A startup attempt with a named product, concrete work completed, traction, funding, accelerator experience, or specific outcomes.
- **Exceptional proof:** Recognized research, difficult competitions, substantial open-source work, advanced AI projects, patents, or another externally credible technical accomplishment.

Treat these as supporting evidence only, not sufficient anchors by themselves: years claimed as a full-stack developer, long technology lists, generic portfolio sites, motivational founder language, agency or marketing-site work, broad idea lists, and competitions described without a result or technical detail.

For a borderline profile, inspect at most two directly supplied external links. Look for a working product, code, users, metrics, technical depth, specific ownership, or independent validation. Do not reward visual polish, confident language, or the number of projects. Retain in the active conversation whether the links strengthened the case, added no substance, or contradicted the profile.

When evidence remains ambiguous, skip the profile and retain the reason for the chat summary. Limited invitations justify requiring affirmative evidence rather than saving on potential alone.

## 8. Ordered Preferences

After the gates pass, apply these preferences in order. Do not force a numeric score when the evidence is clearer as a judgment.

1. **Indian or India-linked background:** Treat this as the strongest preference.
2. **Startup drive:** Prefer people already building, people with founder experience, and people who clearly want to make the startup leap.
3. **Technical strength:** Prefer substantial AI, engineering, shipped-product, research, competition, or technical ownership evidence.
4. **Direct Oparax adjacency:** Give major weight to experience or an idea close to Oparax, especially AI news, media, deep research, agents for knowledge work, information monitoring, or adjacent B2B AI workflows.
5. **Founder execution:** Prefer revenue, users, launched products, credible teams, funding, accelerator experience, or repeated evidence of shipping.

Do not score complementarity. Farzan has selected every functional responsibility on his profile, so overlap in Product, Engineering, Design, Operations, or Sales and marketing is not a negative signal.

## 9. Interpret Domains Correctly

Separate what someone has done from what they insist on doing next.

- **Past industry:** Engineering experience in healthcare, finance, education, retail, government, or another domain is technical evidence, not a reason to reject the person.
- **Interest tags:** A long list containing Robotics, Healthcare, or another niche does not establish commitment.
- **Repeated robotics signals:** Treat multiple robotics or hard-tech signals across projects, ideas, and stated interests as a meaningful negative indicator, but not a hard rejection without committed direction.
- **Possible ideas:** A broad or tentative potential idea does not establish commitment when the person is open to other ideas.
- **Committed direction:** Treat a niche as disqualifying only when the person explicitly says they are building it, committed to it, or seeking a cofounder specifically for it, and that niche conflicts with Farzan's stated exclusions.
- **Technical balance:** A founder with business education or business experience can pass when strong technical evidence outweighs it. A successful pure-business founder still fails the engineering gate.

## 10. Calibration Examples

Use these examples to preserve Farzan's judgments without overfitting to names.

- **Rafael Lopez, save:** Non-Indian exception. Strong AI startup execution, A16Z hackathon win, M.S. in AI, technical product evidence, and meaningful business experience. This is the technical-founder and business combination at its best.
- **Adish Shah, save:** India-linked IIT Bombay CS engineer with C++, Python, Go, ML, RAG, and startup-internship experience. Lack of founder traction is not fatal because the engineering evidence and stated desire to build are strong.
- **Mohith Kanthamneni, save:** Applied-AI engineer with RAG, LLM, VLM, agentic AI, hackathon, and CS evidence. Healthcare work is past engineering experience, not a committed healthcare-startup direction. A résumé-like profile is not an automatic rejection.
- **Andrew Bury, screening invite:** Non-Indian direct-fit exception. Active today, technically credible, and building an AI deep-research news product closely aligned with Oparax. LinkedIn may be stale, so direct product adjacency justifies a short diagnostic message asking whether he is currently in or moving to San Francisco and whether the news direction is current.
- **Abenezer Nuro, skip:** Six-plus years of full-stack titles and an active founder narrative do not overcome weak technical-founder substance. His background is concentrated in marketing, web-services, and IT-style implementation; his profile and supplied links did not establish a difficult product, technical ownership, users, traction, or independently credible output. Robotics and hard-tech signals reinforce the skip but are not the controlling reason.
- **Sudipta Dey, remove before outreach:** Strongly passes the technical and founder bar, but his YC introduction and LinkedIn establish Hyderabad rather than San Francisco. When current Bay Area presence is required, do not spend an invitation on him despite excellent qualifications.
- **Benjamin Belay, remove before outreach:** Technically strong with real traction, but his profile and LinkedIn place him in London while the YC header says San Francisco. He seeks a narrowly scoped backend developer for an existing two-founder team with minority equity, so location mismatch and employee-like framing together make him a reject.

When a new profile resembles more than one example, explain which evidence is controlling. Update the current judgment when Farzan corrects it, and preserve the general principle rather than memorizing only the name.

## 11. Run a Save-Only Batch

When Farzan authorizes a target number of new saves, continue until that exact number is verified or the available pool is exhausted.

1. Record the requested number of additional saves and initialize a verified-save counter at zero.
2. Before acting on each profile, capture the visible name and direct YC candidate URL.
3. Read the full YC profile, then inspect the candidate-supplied LinkedIn before making the decision. Apply the shortlisting gate, substance gate, preferences, domain interpretation, and calibration examples. Investigate at most two other supplied links only when the evidence remains borderline.
4. Classify the candidate using the reliability and outreach rules below. In save-only mode, save `Normal invite` and `Screening invite` candidates, but do not draft or send a message.
5. For a save, click the favorite control once and verify the profile visibly changes to `Saved!` before incrementing the counter.
6. For a skip, retain the name, direct URL, exact reason, and any condition that could reverse the decision in the active conversation before clicking `Skip for now`.
7. Never invent or guess a missing candidate URL. Write `Not captured` when it is genuinely unavailable.
8. Navigate to the next profile only after the save or skip state is confirmed.
9. Stop immediately when the verified-save counter reaches the authorized target.

Keep a compact saved list in the active conversation with the strongest reason each person qualified. Do not persist that list to a local file.

## 12. Establish DM Recipients

Before reading profiles or preparing a messaging batch, identify the exact people Farzan wants to contact.

1. Record each recipient's visible name and profile URL or stable page identity.
2. If Farzan refers to visible profiles as a group, capture that exact visible set before opening them.
3. Ignore profiles added, reordered, or surfaced after the set was captured unless Farzan explicitly adds them.
4. Stop and ask if two profiles have the same name or a recipient cannot be identified unambiguously.
5. Check the inbox or conversation state before drafting. Do not send duplicate outreach unless Farzan explicitly requests a follow-up.

## 13. Cross-Check Reliability and Outreach Fit

Treat saving as a preliminary shortlist, not approval to spend an invitation.

1. Capture the exact saved recipients and their YC candidate URLs before research.
2. Re-read each complete YC profile and inspect the LinkedIn profile directly supplied by that candidate when accessible.
3. Compare current city or country, current employment, startup status, dates, education, accomplishments, and role expectations across both sources. Retain contradictions and stale or missing evidence in the active conversation.
4. Treat the LinkedIn check as corroboration, not a mechanical truth source. A single mismatch can mean either profile is stale. Multiple contradictions in central claims, an explicit current location elsewhere with no move evidence, or a misleading present-tense founder or employment story make the profile unreliable.
5. Do not treat a future move, Delaware incorporation, a preferred cofounder location, or the YC header as proof of current Bay Area presence. When location is unresolved, use a `Screening invite` only if the candidate's direct fit or technical-founder evidence is strong enough to justify spending an invitation.
6. Distinguish a genuine equal-cofounder search from employee-like recruiting. Treat narrow stack requirements, fixed task ownership, low equity, an existing multi-founder team, or language such as `backend dev` as a strong negative even when the candidate is technical.
7. Classify every candidate as one of these outcomes and retain the decisive evidence in the active conversation:
   - **Reject:** Fails a hard gate, has unreliable central claims, is clearly elsewhere with no relocation evidence and only generic fit, or seeks an employee-like relationship. Skip or propose unsaving. Do not invite.
   - **Normal invite:** Strong fit with sufficiently coherent current location, work, availability, and founder intent. Draft a direct personalized invitation.
   - **Screening invite:** Strong or unusually direct fit, but one material fact such as location, current startup, employment, or availability is plausibly stale or unresolved. Draft a short message that names the uncertainty and asks the candidate to resolve it.
8. Never position Farzan as a narrow employee or claim he identifies as a backend or frontend specialist. Describe him as a technical AI builder who can own full products and infrastructure. If a candidate's role framing is narrow but still worth screening, ask whether they are open to a broader equal-cofounder fit.
9. Unsave a rejected profile only after Farzan approves the exact name and confirms the imminent browser action. Research or classification alone does not authorize clicking the star.

## 14. Draft in Farzan's Voice

Write a natural, direct message that sounds personally typed, not generated from a template.

- **Opening format:** Start exactly with `Hey [First name],` followed by a blank line.
- **Length:** Keep the body to one or two short paragraphs. Prioritize the strongest hook and remove anything that does not help earn a reply.
- **First paragraph:** Say that their interests or skill sets seem like a potential cofounder fit, then mention one concrete thing from their profile that stood out. Vary the wording naturally between recipients.
- **Oparax context:** Briefly explain that Farzan is building Oparax, an AI news desk for reporters, and currently has a few early users. Say he is open to figuring out how they might work together and is not rigidly attached to his current idea, but only when that context helps the message.
- **Location check:** If current Bay Area presence is unresolved but Farzan approves outreach, ask directly whether they are currently based in the Bay Area before proposing an in-person path.
- **Role framing:** When a candidate describes a narrow technical or growth role, address the mismatch plainly and briefly. Ask whether they are open to a broader equal-cofounder relationship instead of presenting Farzan as that specialist.
- **Call to action:** Ask whether they would be open to a quick chat. Include Farzan's calendar link when appropriate: `https://calendar.app.google/bVnBxB3YxXXTqn9Q8`.
- **Sign-off:** End with `Best,` on one line and `Farzan` on the next.
- **Tone:** Keep it confident, warm, slightly informal, and specific. Avoid corporate phrasing, excessive praise, startup clichés, long lists of similarities, and generic lines that could be sent to anyone.
- **Claims:** Do not mention funding, equity, commitment, relocation, or joining either startup unless Farzan explicitly asks for that point in the current message.

## 15. Run an Analyze-and-Invite Batch

1. Record the requested number of invitations or the exact visible saved set.
2. For each candidate, capture the name and direct YC URL, read the complete YC profile, inspect the candidate-supplied LinkedIn, and investigate at most two other supplied links only when needed.
3. Classify the candidate as `Reject`, `Normal invite`, or `Screening invite`. Keep the reason and URLs in the active conversation before moving on.
4. If the candidate passes and is not already saved, save once and verify `Saved!`. Saving is not sending.
5. Draft the exact one-to-two-paragraph message immediately. For a screening invite, use the second paragraph to resolve the material uncertainty plainly.
6. Continue through the authorized batch without pausing for ordinary judgment calls. Collect the exact removal names, recipients, and final message text.
7. Present one grouped action-time confirmation that clearly separates profiles to unsave from invitations to send. Do not click an unsave control or a send control before that confirmation.
8. After confirmation, execute only the displayed removals and messages. Ignore profiles added to the saved list after the captured set unless Farzan explicitly adds them.

## 16. Approval Before Sending

Sending a DM is an external action. Approval must cover both the exact recipient and exact final text.

1. Present every draft under the recipient's exact name before sending.
2. Wait for Farzan to approve the displayed drafts or request edits.
3. Treat a clear instruction such as `send these` after the exact drafts are displayed as approval for those drafts and recipients.
4. If any text or recipient changes after approval, show the changed version and obtain fresh approval for that item.
5. A grouped confirmation applies only to the exact displayed recipients, removal names, and message texts. Never extend it to a newly surfaced profile.

## 17. Send and Verify

After approval, send messages one recipient at a time.

1. Reopen or focus the approved recipient's profile or conversation.
2. Confirm the visible name matches the approved recipient.
3. Confirm there is no newly visible prior outreach that would make the message a duplicate.
4. Enter the exact approved text without rewriting it in the composer.
5. Send once.
6. Verify the message appears in the conversation as sent from Farzan before continuing.
7. Mark the recipient as sent in the active conversation only after verification.

If the site reports an error, the action state is uncertain, a CAPTCHA appears, or the profile no longer matches, stop. Report the affected person and do not retry in a way that could create a duplicate.

8. After the batch, read the invitation count directly from Startup School. Do not report only a calculated remainder.

## 18. Completion Report

Report all results directly in chat. For shortlisting, include the verified saved names, the count saved, the number still needed, and a compact skipped-profile summary when requested. For messaging, include sent, not sent, removed, any uncertain states, and the invitation count visibly remaining on Startup School. Never create or update a local report for completion.
