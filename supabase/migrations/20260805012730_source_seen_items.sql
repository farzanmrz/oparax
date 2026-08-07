alter table public.source_configs
  add column last_matched_at timestamptz;

create table public.source_seen_items (
  id uuid primary key default gen_random_uuid(),
  source_config_id uuid not null references public.source_configs(id) on delete cascade,
  item_key text not null,
  first_seen_at timestamptz not null default now()
);
create unique index source_seen_items_config_key_idx
  on public.source_seen_items (source_config_id, item_key);
alter table public.source_seen_items enable row level security;
-- deny-all: no policies. Service-role (poller's admin client) only, same
-- pattern as source_configs.

create or replace function public.record_seen_item(
  p_source_config_id uuid,
  p_item_key text
) returns boolean
language plpgsql
as $$
declare
  v_inserted boolean;
begin
  insert into public.source_seen_items (source_config_id, item_key)
  values (p_source_config_id, p_item_key)
  on conflict (source_config_id, item_key) do nothing;
  get diagnostics v_inserted = row_count;
  v_inserted := v_inserted > 0;

  if v_inserted then
    update public.source_configs
    set last_matched_at = now()
    where id = p_source_config_id;
  end if;

  return v_inserted; -- true = genuinely new item, caller should deliver it
end;
$$;
