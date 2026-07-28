-- Applied via the Supabase MCP server.
create table public.corpus_posts (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments (id) on delete cascade,
  x_post_id text not null,
  text text not null,
  posted_at timestamptz not null,
  like_count integer not null default 0,
  repost_count integer not null default 0,
  is_long boolean not null default false,
  media jsonb not null default '[]'::jsonb,
  excluded_off_beat boolean not null default false,
  exclude_reason text,
  created_at timestamptz not null default now(),
  unique (experiment_id, x_post_id)
);

create index corpus_posts_experiment_idx on public.corpus_posts (experiment_id);

alter table public.corpus_posts enable row level security;
-- No policies: written and read only by the service-role extraction path.
