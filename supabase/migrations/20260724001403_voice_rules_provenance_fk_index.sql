-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): advisor-driven fixup — voice_rules.sql's FK on
-- provenance_model_call_id shipped without its same-migration btree index (house rule:
-- "every FK gets a same-migration btree index"). get_advisors caught it (unindexed_foreign_keys)
-- immediately after applying the 7 planned migrations; fixed here rather than left standing.
create index voice_rules_provenance_model_call_id_idx on public.voice_rules(provenance_model_call_id);
