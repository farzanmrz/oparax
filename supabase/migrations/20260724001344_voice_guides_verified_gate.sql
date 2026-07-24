-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): D14 verification gate. Extends voice_guides's SELECT EXISTS-join
-- to also require experiments.reporter_verified_at IS NOT NULL. Safe to run after
-- experiments_slice5_flags.sql, which already backfilled reporter_verified_at = now() for
-- every existing experiments row — no currently-working desk loses guide access.
drop policy voice_guides_select_via_experiment on public.voice_guides;

create policy voice_guides_select_via_experiment on public.voice_guides
  for select to authenticated
  using (exists (
    select 1 from public.experiments e
    where e.reporter_handle = voice_guides.reporter_handle
      and e.owner_id = (select auth.uid())
      and e.reporter_verified_at is not null
  ));
