# RLS reference (GENERATED — do not hand-edit)

Generated from the live database via the two queries below. Regenerate after
any migration that adds, drops, or alters a policy or table; the
`supabase-runner` agent owns the regen as part of its migration duty.

```sql
-- policies
select schemaname, tablename, policyname, cmd, roles from pg_policies
where schemaname = 'public' order by tablename, cmd, policyname;
-- rls status + policy counts per table
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       count(p.policyname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public'
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity order by c.relname;
```

Last generated: 2026-08-08.

## Per-table summary

RLS is enabled on every public table. A table with zero policies is
**deny-all** for client roles: only the service role reaches it.

| Table | Policies | Shape |
| --- | --- | --- |
| `agents` | 4 (select/insert/update/delete `_own`) | owner-scoped, full CRUD |
| `beat_conflicts` | 1 (`select_via_agent`) | EXISTS-join, select-only |
| `corpus_posts` | 0 | deny-all |
| `draft_claims` | 0 | deny-all |
| `drafts` | 2 (`select_via_agent`, `insert_via_agent`) | EXISTS-join, select + insert |
| `excluded_posts` | 1 (`select_via_agent`) | EXISTS-join, select-only |
| `model_calls` | 1 (`select_own`) | owner-scoped, select-only |
| `slack_accounts` | 0 | deny-all |
| `slack_delivery_receipts` | 0 | deny-all |
| `source_configs` | 0 | deny-all |
| `source_posts` | 0 | deny-all |
| `source_seen_items` | 0 | deny-all |
| `stories` | 1 (`select_via_agent`) | EXISTS-join, select-only |
| `story_assignments` | 0 | deny-all |
| `unmatched_deliveries` | 0 | deny-all |
| `usage_events` | 1 (`select_own`) | owner-scoped, select-only |
| `voice_extraction_runs` | 0 | deny-all |
| `voice_guides` | 1 (`select_via_agent`) | EXISTS-join, select-only |
| `voice_rules` | 1 (`select_via_agent`) | EXISTS-join, select-only |
| `x_accounts` | 0 | deny-all |
| `x_handle_checks` | 0 | deny-all |

Column-level truth lives in the generated types
(`lib/supabase/database.types.ts`); policy predicates live in
`supabase/migrations/`. This file is the readable index, not the source.
