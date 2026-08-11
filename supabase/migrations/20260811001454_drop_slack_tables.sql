-- Drops the Slack integration tables. The in-repo Slack code (per-desk app linking, the
-- legacy workspace webhook, the interactions route) was a dev-era simulation of a reporter's
-- feed on a Slack #drafts channel — never the shipped product, which surfaces drafts in the
-- app. Owner decision: remove the code AND the data; no migration path back, no replacement
-- Slack surface. Any future Slack integration (see open issues #74/#75, an unrelated future
-- surface) starts from a clean schema.
drop table if exists public.slack_delivery_receipts;
drop table if exists public.slack_accounts;
