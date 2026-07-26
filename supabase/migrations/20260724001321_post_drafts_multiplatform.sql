-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 1 (T1.2): item 4 multi-platform drafting (platform + story_id) and item 9
-- draft edit-in-place.
--
-- Gap discovered applying this migration: post_drafts had NO insert policy at all — only
-- post_drafts_select_via_experiment (SELECT). AGENTS.md's Code map already documented
-- post_drafts as "owner-insertable", but that was written for this exact feature (item 9)
-- and wasn't true of the live schema until this migration. Item 9's editDraft action
-- INSERTs a new row on parent_draft_id via the owner-scoped RLS client (never service-role
-- for a browser write), so the policy is added here rather than left for a later migration
-- to discover missing.
alter table public.post_drafts
  add column platform text not null default 'x' check (platform in ('x', 'linkedin', 'bluesky')),
  add column story_id uuid null references public.stories(id) on delete set null;

create index post_drafts_story_id_idx on public.post_drafts(story_id);

create policy post_drafts_insert_via_experiment on public.post_drafts
  for insert to authenticated
  with check (exists (
    select 1 from public.experiments e
    where e.id = post_drafts.experiment_id
      and e.owner_id = (select auth.uid())
  ));
