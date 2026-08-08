-- Applied via the Supabase MCP server
alter table public.source_posts
  add column source_config_id uuid
    references public.source_configs(id)
    on delete set null,
  add constraint source_posts_source_config_id_website_check
    check (source_config_id is null or source = 'website');

create index source_posts_source_config_id_idx
  on public.source_posts (source_config_id);
