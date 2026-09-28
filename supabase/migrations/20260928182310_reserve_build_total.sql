-- Applied via the Supabase MCP server
create or replace function public.reserve_build(p_monitor uuid, p_usd numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget numeric;
begin
  if p_monitor is null or p_usd is null or p_usd < 0 or p_usd = 'NaN'::numeric then
    return false;
  end if;
  select (value #>> '{}')::numeric into v_budget
  from public.config where key = 'anon_budget_usd' for update;
  if not found then
    return false;
  end if;
  -- A retried build keeps its original allocation, including across UTC midnight.
  if exists (
    select 1 from public.cost_ledger
    where service = 'reservation' and external_id = p_monitor::text
  ) then
    return true;
  end if;
  insert into public.cost_ledger
    (service, kind, monitor_id, external_id, usd, usd_reserved, settled)
  select 'reservation', 'build', p_monitor, p_monitor::text, p_usd, p_usd, true
  where (
    select coalesce(sum(usd), 0) from public.cost_ledger
    where service = 'reservation'
  ) + p_usd <= v_budget;
  return found;
end;
$$;
