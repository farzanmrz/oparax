-- Optional reporter-chosen desk name. Display falls back to deriveDeskLabel(beat) when null,
-- so existing desks keep working. Applied via the claude.ai Supabase connector (project
-- oparax-chirp / pcgvpypzfwuchyfwdlwe), mirrored here.
alter table public.experiments add column name text;
comment on column public.experiments.name is 'Optional reporter-chosen desk name; display falls back to deriveDeskLabel(beat) when null.';
