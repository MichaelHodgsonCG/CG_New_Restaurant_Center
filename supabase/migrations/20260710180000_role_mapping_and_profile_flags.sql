-- ============================================================================
-- Migration: role_mapping_and_profile_flags
-- Follow-up to create_restaurant_center_foundation (2026-07-10).
--
-- ⚠ Apply to the CGOPS Platform Supabase project.
--
-- Why: the CGOPS master profile (public.user_profiles.role) stores platform
-- role values like 'admin' and 'HQ' (alongside job-title roles such as
-- 'Executive Chef', 'Chef de Cuisine'), NOT the executive/regional_leader
-- vocabulary the first migration guessed. Two corrections:
--
--   1. restaurant_center_can_manage() now recognises the REAL management-tier
--      roles present in CGOPS: 'admin' and 'HQ'. This is the intended Phase 1
--      audience ("HQ and selected regional leadership"). It is a deliberately
--      small, documented allow-list — when CGOPS introduces a distinct
--      regional-leadership role value, add it to the array here (one line) and
--      the whole app + RLS picks it up.
--
--   2. restaurant_center_current_profile() now also returns can_manage, so the
--      DATABASE is the single authority on write rights and the frontend does
--      not need to know the CGOPS role vocabulary — it consumes is_admin /
--      can_manage booleans plus the raw role string (for display) only.
--
-- Idempotent: CREATE OR REPLACE; the RPC return type changes, so it is dropped
-- first (it is app-owned). Additive — nothing CGOPS-owned is touched.
-- ============================================================================

-- 1. Management-tier roles present in CGOPS today: admin + HQ.
create or replace function public.restaurant_center_can_manage()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.restaurant_center_current_role() in ('admin', 'HQ');
$$;

-- 2. Return can_manage from the profile RPC (return type changes → drop first).
drop function if exists public.restaurant_center_current_profile();

create function public.restaurant_center_current_profile()
returns table (
  role text,
  email text,
  display_name text,
  person_id uuid,
  is_admin boolean,
  can_manage boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return query
    select up.role::text,
           coalesce(auth.jwt() ->> 'email', ''),
           null::text,
           null::uuid,
           (up.role = 'admin'),
           (up.role in ('admin', 'HQ'))
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
    limit 1;
  if not found then
    return query
      select 'viewer'::text, coalesce(auth.jwt() ->> 'email', ''),
             null::text, null::uuid, false, false;
  end if;
exception
  when undefined_table or undefined_column then
    return query
      select 'viewer'::text, coalesce(auth.jwt() ->> 'email', ''),
             null::text, null::uuid, false, false;
end;
$$;

grant execute on function public.restaurant_center_can_manage() to authenticated;
grant execute on function public.restaurant_center_current_profile() to authenticated;
