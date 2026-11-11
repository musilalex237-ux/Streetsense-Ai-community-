-- Reproduce the live hardening of the role helper.
create or replace function public.has_any_role(required_roles app_role[])
returns boolean
language sql
stable
security invoker
set search_path = public
as $function$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any(required_roles)
  );
$function$;

revoke all on function public.has_any_role(app_role[]) from public, anon;
grant execute on function public.has_any_role(app_role[]) to authenticated, service_role;
