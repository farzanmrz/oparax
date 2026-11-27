create schema outreach;
revoke all on schema outreach from public, anon, authenticated;
create table outreach.workspace (
  id boolean primary key default true check(id),
  rev bigint not null default 0,
  data jsonb not null check(jsonb_typeof(data)='object')
);
alter table outreach.workspace enable row level security;
insert into outreach.workspace(data) values ('{"bots":[],"leads":[],"messages":[],"events":[],"suppressed":[],"mailbox":null}');
create function public.outreach_read() returns jsonb
language sql security definer stable set search_path='' as $$
 select jsonb_build_object('rev',rev,'data',data) from outreach.workspace where id
$$;
create function public.outreach_save(expected bigint, next_data jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update outreach.workspace set data=next_data, rev=rev+1 where id and rev=expected;
 return found;
end $$;
revoke all on function public.outreach_read(), public.outreach_save(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.outreach_read(), public.outreach_save(bigint,jsonb) to service_role;
notify pgrst,'reload schema';
