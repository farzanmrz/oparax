-- Apply after workspace.sql. The old singleton belonged to the original owner only.
create table outreach.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rev bigint not null default 0,
  data jsonb not null default '{"bots":[],"leads":[],"messages":[],"events":[],"suppressed":[],"mailbox":null}'::jsonb check(jsonb_typeof(data)='object'),
  last_scheduled timestamptz not null default '-infinity'
);
alter table outreach.user_workspaces enable row level security;
insert into outreach.user_workspaces(user_id,rev,data)
select u.id,w.rev,w.data from outreach.workspace w join auth.users u on lower(u.email)='farzan@oparax.ai';

create function public.outreach_user_read(uid uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('rev',w.rev,'data',w.data) into result from outreach.user_workspaces w where w.user_id=uid;
 if result is null then
  insert into outreach.user_workspaces(user_id) values(uid) on conflict do nothing;
  select jsonb_build_object('rev',w.rev,'data',w.data) into strict result from outreach.user_workspaces w where w.user_id=uid;
 end if;
 return result;
end $$;

create function public.outreach_user_save(uid uuid,expected bigint,next_data jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update outreach.user_workspaces set data=next_data,rev=rev+1 where user_id=uid and rev=expected;
 return found;
end $$;

create function public.outreach_worker_batch(batch_size integer) returns setof uuid
language sql security definer set search_path='' as $$
 with due as (
   select user_id from outreach.user_workspaces
   where last_scheduled < now()-interval '5 minutes'
    and (data->'mailbox' <> 'null'::jsonb or data->'bots' @> '[{"active":true}]'::jsonb)
   order by last_scheduled,user_id limit greatest(1,least(batch_size,20)) for update skip locked
 )
 update outreach.user_workspaces w set last_scheduled=now() from due
 where w.user_id=due.user_id returning w.user_id;
$$;

create function public.outreach_ready() returns boolean
language sql security definer set search_path='' as $$select count(*)>=0 from (select 1 from outreach.user_workspaces limit 1) probe$$;

-- Use a single email claim per minute across Vercel instances.
create table outreach.signin_requests (
  address_hash text primary key, claimed_at timestamptz not null, accepted boolean not null default false
);
alter table outreach.signin_requests enable row level security;
create function public.outreach_signin_claim(digest text) returns text
language plpgsql security definer set search_path='' as $$
declare sent boolean;
begin
 delete from outreach.signin_requests where claimed_at < now()-interval '1 day';
 insert into outreach.signin_requests as s(address_hash,claimed_at) values(digest,now())
 on conflict(address_hash) do update set claimed_at=excluded.claimed_at,accepted=false
 where s.claimed_at < now()-interval '60 seconds';
 if found then return 'claimed';end if;
 select accepted into sent from outreach.signin_requests where address_hash=digest;
 return case when sent then 'accepted' else 'pending' end;
end $$;
create function public.outreach_signin_finish(digest text,ok boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if ok then update outreach.signin_requests set accepted=true where address_hash=digest;
 else delete from outreach.signin_requests where address_hash=digest; end if;
end $$;
revoke all on function public.outreach_user_read(uuid),public.outreach_user_save(uuid,bigint,jsonb),public.outreach_worker_batch(integer),public.outreach_ready(),public.outreach_signin_claim(text),public.outreach_signin_finish(text,boolean) from public,anon,authenticated;
grant execute on function public.outreach_user_read(uuid),public.outreach_user_save(uuid,bigint,jsonb),public.outreach_worker_batch(integer),public.outreach_ready(),public.outreach_signin_claim(text),public.outreach_signin_finish(text,boolean) to service_role;
notify pgrst,'reload schema';
