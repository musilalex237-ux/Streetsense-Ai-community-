-- Atomic per-user AI request limiter: 12 requests per UTC/database minute.
create table if not exists public.streetsense_ai_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 1),
  primary key (user_id, window_start)
);
create index if not exists streetsense_ai_rate_limits_window_idx
  on public.streetsense_ai_rate_limits (window_start);
alter table public.streetsense_ai_rate_limits enable row level security;
revoke all on table public.streetsense_ai_rate_limits from public, anon, authenticated;
grant all on table public.streetsense_ai_rate_limits to service_role;

create or replace function public.consume_streetsense_ai_rate_limit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_window_start timestamptz := date_trunc('minute', now());
  v_request_count integer;
begin
  if p_user_id is null then return false; end if;
  insert into public.streetsense_ai_rate_limits (user_id, window_start, request_count)
  values (p_user_id, v_window_start, 1)
  on conflict (user_id, window_start)
  do update set request_count = public.streetsense_ai_rate_limits.request_count + 1
  returning request_count into v_request_count;
  delete from public.streetsense_ai_rate_limits
  where window_start < now() - interval '24 hours';
  return v_request_count <= 12;
end;
$function$;
revoke all on function public.consume_streetsense_ai_rate_limit(uuid) from public, anon, authenticated;
grant execute on function public.consume_streetsense_ai_rate_limit(uuid) to service_role;
