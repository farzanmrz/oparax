# Customer discovery outreach

Plain tracking files for manual, inline X outreach. This is not a skill or an automation.

- `outreach.tsv` is the source of truth for who was sent a DM, who cannot receive one, and who remains to contact.
- Update only the `status` and `note` fields after each attempt.
- Valid statuses are `sent`, `to-dm`, and `dm-unavailable`.
- A failed X send caused by a platform error remains `to-dm`; it is not `dm-unavailable`.
- Hard stop: if X shows `Failed to send message` or `Failed, Try Again`, stop immediately, leave that person as `to-dm`, do not attempt another recipient, and alert Farzan.

## Templates

### Football transfers

```text
Hey [name], I've been watching how transfer reporters work and I'm building something for exactly your situation. Quick question over DM: when you step away from X, what's your current setup for not missing a break? Building before I pitch.
```

### NBA and NFL

```text
Hey [name], I'm building a monitoring tool for beat reporters who can't afford to look away during trade season. One question: what does your current setup look like for catching breaks when you're not watching? No pitch, just learning.
```

### Politics

```text
Hey [name], I'm building something for reporters whose whole value is being first. Quick question: how do you currently make sure you don't miss a break when you step away? Genuinely just learning before I build more.
```

Replace only `[name]` with `first_name` from the TSV. Do not change any other wording or punctuation.

## Reconciliation

Last reconciled on 2026-07-18 from the removed `.grok` backup and this chat's verified outcomes.

- Mario Cortegana was manually sent after the backup was created.
- Rob Dawson and Liam Twomey were successfully sent on 2026-07-18.
- Tom Haberstroh remains `to-dm` because X returned a platform send failure; his inbox was not classified as closed.
