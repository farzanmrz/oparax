-- Applied via the Supabase MCP server

alter table public.model_calls
  add column cost_checked_at timestamptz;

create index model_calls_cost_pending_idx
  on public.model_calls (created_at desc)
  where generation_id is not null
    and (cost_usd is null or cost_usd = 0)
    and cost_checked_at is null;
