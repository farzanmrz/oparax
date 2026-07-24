-- Applied via the claude.ai Supabase connector.
-- QC fix (confirmed HIGH-severity bug, feature-qc pass on ft/69): story_assignments'
-- UNIQUE(source_post_id) was GLOBAL, not per-desk. Two desks tracking the same X handle share
-- one deduped source_posts row (dedup is global, by design — L4); the second desk's clustering
-- claim collided with the first desk's on that shared row and silently inherited its story_id,
-- orphaning the second desk's drafts out of its own feed (fetchFeedPage only lists winners
-- whose story_id belongs to the querying desk's own stories). A source post is clustered
-- independently PER DESK — each desk's stories are its own — so the claim must be scoped to
-- (source_post_id, experiment_id), not source_post_id alone.
alter table public.story_assignments
  add column experiment_id uuid null references public.experiments(id) on delete cascade;

update public.story_assignments sa
set experiment_id = s.experiment_id
from public.stories s
where sa.story_id = s.id;

alter table public.story_assignments
  alter column experiment_id set not null;

alter table public.story_assignments
  drop constraint story_assignments_source_post_id_key;

alter table public.story_assignments
  add constraint story_assignments_source_post_id_experiment_id_key
  unique (source_post_id, experiment_id);

create index story_assignments_experiment_id_idx on public.story_assignments(experiment_id);
