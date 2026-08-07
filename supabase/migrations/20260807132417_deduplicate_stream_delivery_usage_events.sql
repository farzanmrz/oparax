-- Applied via the Supabase MCP server
with ranked_stream_deliveries as (
  select
    id,
    row_number() over (
      partition by owner_id, ref_id
      order by created_at asc, id asc
    ) as row_number
  from public.usage_events
  where kind = 'stream_delivery'
    and ref_id is not null
)
delete from public.usage_events usage_event
using ranked_stream_deliveries ranked
where usage_event.id = ranked.id
  and ranked.row_number > 1;

create unique index usage_events_stream_delivery_owner_ref_uidx
  on public.usage_events (owner_id, ref_id)
  where kind = 'stream_delivery' and ref_id is not null;
