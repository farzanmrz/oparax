-- Applied via the Supabase MCP server (remote version 20260809064318).
alter table public.corpus_posts add column x_user_id text;

create index corpus_posts_x_user_id_created_at_idx
  on public.corpus_posts (x_user_id, created_at desc)
  where x_user_id is not null;
