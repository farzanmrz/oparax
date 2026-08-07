alter table public.drafts rename column synthesis to news_synthesis;
alter table public.drafts add column news_title text;
alter table public.source_posts add column lang text;
