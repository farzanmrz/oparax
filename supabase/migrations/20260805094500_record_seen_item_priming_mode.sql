-- record_seen_item's last_matched_at bump doubles as the poller's "am I priming?"
-- predicate, so the priming loop must be able to seed items WITHOUT setting it —
-- otherwise a crash mid-priming leaves the remaining historical items to be delivered
-- as breaking news on the next tick. markPrimed stays the single terminal signal.
-- Dropped and recreated (rather than create-or-replace) because the new argument
-- changes the function's signature.
drop function if exists public.record_seen_item(uuid, text);

create function public.record_seen_item(
  p_source_config_id uuid,
  p_item_key text,
  p_bump_last_matched boolean default true
) returns boolean
language plpgsql
as $$
declare
  v_rowcount integer;
  v_inserted boolean;
begin
  insert into public.source_seen_items (source_config_id, item_key)
  values (p_source_config_id, p_item_key)
  on conflict (source_config_id, item_key) do nothing;
  get diagnostics v_rowcount = row_count;
  v_inserted := v_rowcount > 0;

  if v_inserted and p_bump_last_matched then
    update public.source_configs
    set last_matched_at = now()
    where id = p_source_config_id;
  end if;

  return v_inserted; -- true = this call is what marked the item seen
end;
$$;

revoke execute on function public.record_seen_item(uuid, text, boolean) from public;
