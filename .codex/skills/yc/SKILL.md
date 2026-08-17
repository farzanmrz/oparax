---
name: yc
description: "DM potential cofounders on Y Combinator Startup School through the signed-in in-app Browser. Use only when the user explicitly invokes $yc to review named YC profiles, draft personalized outreach, or send approved messages. Do not use for saving, shortlisting, or unsaving profiles, and never invoke this skill automatically during development work or another workflow."
---

# YC Cofounder DMs

## 1. Scope

Use this skill only for personalized cofounder outreach on `startupschool.org` from Farzan's signed-in account.

- **Allowed:** Read an approved recipient's profile, identify genuine hooks, draft a short DM, enter an approved DM, send it, and verify that it appears in the conversation.
- **Excluded:** Browse for candidates, evaluate or shortlist candidates, save profiles, unsave profiles, edit Farzan's profile, change account settings, or perform unrelated Startup School actions.
- **Invocation:** Treat an explicit `$yc` invocation as permission to use the in-app Browser for this workflow. Do not activate this skill implicitly or from a development command, automation, subagent, or another skill.

## 2. Browser Requirements

Use the Browser plugin's `browser:control-in-app-browser` skill and follow its instructions completely before taking browser actions.

- **Browser surface:** Use only `[@Browser](plugin://browser@openai-bundled)`, the in-app Browser. Never substitute Chrome, an external browser, standalone Playwright, web search, or general Computer Use.
- **Signed-in profile:** Work through the existing Startup School session in the in-app Browser. Prefer claiming the existing `startupschool.org` tab when one is open. Otherwise, navigate in the same in-app Browser profile.
- **Authentication:** Never inspect cookies, local storage, passwords, profiles, or session files. If the session is signed out, ask Farzan to sign in inside the in-app Browser and resume only after he confirms.
- **Viewport:** Use the in-app Browser as it is. Do not set a responsive viewport or override its dimensions unless Farzan explicitly asks.
- **Target site:** Keep navigation on `startupschool.org` and the calendar link already included in approved message text. Stop if a link, popup, or redirect points somewhere unexpected.

## 3. Establish the Recipient Set

Before reading profiles or preparing a batch, identify the exact people Farzan wants to contact.

1. Record each recipient's visible name and profile URL or stable page identity.
2. If Farzan refers to visible profiles as a group, capture that exact visible set before opening them.
3. Ignore profiles added, reordered, or surfaced after the set was captured unless Farzan explicitly adds them.
4. Stop and ask if two profiles have the same name or a recipient cannot be identified unambiguously.
5. Check the inbox or conversation state before drafting. Do not send duplicate outreach to someone Farzan has already contacted unless he explicitly requests a follow-up.

## 4. Read Each Profile

Open each approved profile and extract only facts that are actually visible.

- **Primary hook:** Choose one specific detail that genuinely connects the person to Farzan, such as their startup experience, ambition, domain interest, GTM strength, sales experience, technical depth, customer insight, or stated cofounder preference.
- **Fit:** Explain the plausible cofounder fit in simple language. Use complementary skills when supported by the profile, but do not force a connection.
- **Accuracy:** Never invent experience, motivation, traction, availability, location, or interests. If the profile has no useful hook, say so and use a restrained general opener.
- **Grounding:** Use Farzan's current Startup School profile when needed to confirm his background. Do not rely on stale facts from an earlier task when the live profile or Farzan's current instruction says otherwise.

## 5. Draft in Farzan's Voice

Write a natural, direct message that sounds personally typed, not generated from a template.

- **Opening format:** Start exactly with `Hey [First name],` followed by a blank line.
- **Length:** Keep the body to one or two short paragraphs. Prioritize the strongest hook and remove anything that does not help earn a reply.
- **First paragraph:** Say that their interests or skill sets seem like a potential cofounder fit, then mention one concrete thing from their profile that stood out. Vary the wording naturally between recipients.
- **Oparax context:** Briefly explain that Farzan is building Oparax, an AI news desk for reporters, and currently has a few early users. Say he is open to figuring out how they might work together and is not rigidly attached to his current idea, but only when that context helps the message.
- **Call to action:** Ask whether they would be open to a quick chat. Include Farzan's calendar link when appropriate: `https://calendar.app.google/bVnBxB3YxXXTqn9Q8`.
- **Sign-off:** End with `Best,` on one line and `Farzan` on the next.
- **Tone:** Keep it confident, warm, slightly informal, and specific. Avoid corporate phrasing, excessive praise, startup clichés, long lists of similarities, and generic lines that could be sent to anyone.
- **Claims:** Do not mention funding, equity, commitment, relocation, or joining either startup unless Farzan explicitly asks for that point in the current message.

## 6. Approval Before Sending

Sending a DM is an external action. Approval must cover both the exact recipient and the exact final text.

1. Present every draft under the recipient's exact name before sending.
2. Wait for Farzan to approve the displayed drafts or request edits.
3. Treat a clear instruction such as `send these` after the exact drafts are displayed as approval for those drafts and recipients.
4. If any text or recipient changes after approval, show the changed version and obtain fresh approval for that item.
5. Never interpret approval for one recipient as approval for the rest of a batch.

## 7. Send and Verify

After approval, send messages one recipient at a time.

1. Reopen or focus the approved recipient's profile or conversation.
2. Confirm the visible name matches the approved recipient.
3. Confirm there is no newly visible prior outreach that would make the message a duplicate.
4. Enter the exact approved text without rewriting it in the composer.
5. Send once.
6. Verify the message appears in the conversation as sent from Farzan before continuing.
7. Record the recipient as sent only after verification.

If the site reports an error, the message state is uncertain, a CAPTCHA appears, or the profile no longer matches, stop. Report the affected recipient and do not retry in a way that could create a duplicate.

## 8. Completion Report

Report three compact lists when the batch finishes:

- **Sent:** Names whose messages were visibly verified as sent.
- **Not sent:** Names skipped or blocked, with the reason.
- **Remaining:** Approved names not yet processed, if the workflow stopped early.
