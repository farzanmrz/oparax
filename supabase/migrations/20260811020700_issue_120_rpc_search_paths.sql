-- The shared project received the Issue 120 RPC replacement before its post-migration advisor
-- pass. Pin both new functions to an empty search path; every referenced relation is schema-qualified.

alter function public.insert_claimed_winner(
  uuid, uuid, uuid, uuid, text, uuid, text, text, text, jsonb, text
) set search_path = '';

alter function public.complete_claimed_no_artifact(uuid, uuid, uuid)
  set search_path = '';
