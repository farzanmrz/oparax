create table public.excluded_posts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  source_post_id uuid not null references public.source_posts(id) on delete cascade,
  on_beat_reason text not null,
  excluded_at timestamptz not null default now()
);
create unique index excluded_posts_agent_post_idx
  on public.excluded_posts (agent_id, source_post_id);
alter table public.excluded_posts enable row level security;

-- Reporter-readable (unlike most of this pipeline's tables) — this table's
-- entire purpose is letting the owner query their own desk's exclusions.
-- No insert policy: writes are service-role (admin client) only, from
-- draft-pipeline.ts, exactly like beat_conflicts today — never a client-
-- facing write path, so there is nothing to revoke-from-public here (no
-- RPC is introduced by this migration).
create policy excluded_posts_select_via_agent on public.excluded_posts
  for select to authenticated
  using (exists (
    select 1 from public.agents a
    where a.id = excluded_posts.agent_id
      and a.owner_id = (select auth.uid())
  ));
