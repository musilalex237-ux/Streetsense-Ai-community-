-- StreetSense AI: READ-ONLY Supabase schema/security audit
-- Run in Supabase SQL Editor against the project before applying migrations.
-- This file intentionally contains SELECT statements only. It changes no data or policies.

-- 1) Public tables, columns, types, defaults and nullability.
select
  table_schema, table_name, ordinal_position, column_name,
  data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 2) Primary keys, unique constraints, foreign keys and check constraints.
select
  tc.table_name, tc.constraint_name, tc.constraint_type,
  kcu.column_name, ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name, chk.check_clause
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_catalog = kcu.constraint_catalog
 and tc.constraint_schema = kcu.constraint_schema
 and tc.constraint_name = kcu.constraint_name
left join information_schema.constraint_column_usage ccu
  on tc.constraint_catalog = ccu.constraint_catalog
 and tc.constraint_schema = ccu.constraint_schema
 and tc.constraint_name = ccu.constraint_name
left join information_schema.check_constraints chk
  on tc.constraint_catalog = chk.constraint_catalog
 and tc.constraint_schema = chk.constraint_schema
 and tc.constraint_name = chk.constraint_name
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- 3) Row-level security status.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p')
order by c.relname;

-- 4) Policies: roles, commands, predicates and checks.
select schemaname, tablename, policyname, permissive,
       roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 5) Enum types and their allowed labels (important for report category/status mapping).
select n.nspname as schema_name, t.typname as enum_name,
       e.enumsortorder, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
order by t.typname, e.enumsortorder;

-- 6) Public functions and signatures (review security definer/search_path settings).
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

-- 7) Triggers on public tables.
select event_object_table as table_name, trigger_name,
       event_manipulation, action_timing, action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;

-- 8) Storage buckets and object policies (if evidence uploads are configured).
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

select schemaname, tablename, policyname, permissive,
       roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
