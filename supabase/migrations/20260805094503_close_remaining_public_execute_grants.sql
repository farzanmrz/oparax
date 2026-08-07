-- QC round 1's fix for add_source_config's PUBLIC-executable overload found that
-- `revoke ... from public` alone does not close the hole: Supabase grants `anon` and
-- `authenticated` their own explicit EXECUTE entries on newly-created functions, separate
-- from the PUBLIC role membership a bare `from public` revoke strips. Confirmed live: both
-- of these two functions (revoked "from public" in earlier sessions tonight, #100's and
-- #101's own QC rounds) still carry live anon=X/authenticated=X grants right now — the same
-- authenticated-caller exposure add_source_config just had, unfixed, already on beta.
revoke all on function public.remove_source_config(uuid, text)
  from public, anon, authenticated;

revoke all on function public.record_seen_item(uuid, text, boolean)
  from public, anon, authenticated;
