-- Agents become inactive when the user disconnects X, disabling posting until
-- they reconnect.
alter type public.agent_status add value if not exists 'inactive';
