-- Applied via the claude.ai Supabase connector.
-- Slice 5, Wave 2 gap fixup: item 2 (multi-source ingestion) needs source_posts to hold a
-- website-sourced post, but none of Wave 1's 7 planned migrations touched this table —
-- x_post_id and author_handle were still NOT NULL and there was nowhere to put a website
-- post's external_id/url/title. Discovered wiring T2.4b (draft-pipeline.ts's discriminated
-- ingest handling). Postgres UNIQUE treats NULL as distinct-from-every-other-NULL, so
-- x_post_id (x-sourced dedup key) and external_id (website-sourced dedup key) coexist as two
-- independent nullable-unique columns on the same table with no partial index needed.
alter table public.source_posts
  alter column x_post_id drop not null,
  alter column author_handle drop not null,
  add column source text not null default 'x' check (source in ('x', 'website')),
  add column external_id text null unique,
  add column url text null,
  add column title text null;
