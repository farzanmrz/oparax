-- Applied via the Supabase MCP server.
-- #73 cleanup: materializeRulesFromGuide (lib/voice/rules.ts) used to receive a guide_deploy
-- that still carried the "## Beat & Scope" section, so a row for it was inserted into
-- voice_rules on every extraction — even though flattenRulesToPrompt has always filtered any
-- rule matching BEAT_SCOPE_HEADING_RE back out of the drafting prompt (lib/voice/deploy-guide.ts).
-- Net effect on existing desks: a dead "Beat & Scope" row whose enable/disable Switch and
-- remove button in the Voice rules editor do nothing to drafting behavior. deployGuide() now
-- strips the section before materializeRulesFromGuide ever sees it, so no NEW row can be
-- created — this is a one-time cleanup of rows already materialized before that fix landed.
-- Scoped precisely to machine-written rows (provenance_model_call_id IS NOT NULL) whose text
-- begins with a Beat & Scope level-2 heading, mirroring BEAT_SCOPE_HEADING_RE's tolerance for
-- whitespace and "&" spacing, case-insensitively. A reporter's own hand-typed rule always has a
-- null provenance_model_call_id and can never match this DELETE.
delete from public.voice_rules
where provenance_model_call_id is not null
  and rule ~* '^##\s+Beat\s*&\s*Scope\M';
