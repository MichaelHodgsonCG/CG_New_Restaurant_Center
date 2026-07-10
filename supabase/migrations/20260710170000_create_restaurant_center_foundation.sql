-- ============================================================================
-- Migration: create_restaurant_center_foundation
-- Phase 1 (Foundation) — New Restaurant Center coordination schema.
--
-- ⚠ Apply to the CGOPS Platform Supabase project (the same project as People
--   Center and every other CGOPS application). This app does NOT create a new
--   Supabase project.
--
-- Design principles (follow the established CGOPS patterns — see
-- cgops-people-center migrations):
--   * Namespacing: every owned object is prefixed. Tables use `opening_`;
--     functions use `restaurant_center_`. This avoids collisions with CGOPS
--     core (public.user_profiles, public.locations) and with People Center's
--     people_center_* objects in the shared project.
--   * CGOPS is the identity/role authority. Role/admin is resolved from the
--     CGOPS master profile (public.user_profiles.role) through SECURITY
--     DEFINER helpers — this app never stores its own role table and never
--     duplicates People Center.
--   * Soft references to CGOPS-owned rows (locations, people) are stored as
--     bare uuids, NOT foreign keys: CGOPS owns those identities and this
--     migration must stay self-contained and additive on the shared project.
--   * RLS everywhere, deny-by-default, `authenticated` only. Any signed-in
--     CGOPS user may READ opening data; writes require a manager role
--     (admin / executive / regional_leader); deletes are admin-only.
--
-- Offset convention (documented once, used everywhere):
--   due_date = anchor_date + offset_days
--   NEGATIVE offset = BEFORE the anchor date, POSITIVE = AFTER.
--   e.g. "GM in place 14 days before opening" → anchor opening_date, offset -14.
--
-- Idempotent: IF NOT EXISTS guards, CREATE OR REPLACE, drop-then-create for
-- triggers and policies, guarded seeds. Safe to run twice. Additive and
-- reversible (a companion down-migration would DROP the opening_* tables and
-- restaurant_center_* functions; nothing here alters CGOPS-owned objects).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers — identity resolved from the CGOPS master profile
-- ---------------------------------------------------------------------------

-- Touch trigger for the audit columns house style (prefixed to avoid
-- colliding with other apps' set_updated_at in the shared project).
create or replace function public.restaurant_center_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The current user's CGOPS role, or 'viewer' if it cannot be read. Depends
-- ONLY on public.user_profiles(auth_user_id, role) — the same assumption the
-- People Center admin bridge makes — and fails safe if that table/column is
-- not shaped as expected (throwaway test databases, future CGOPS changes).
create or replace function public.restaurant_center_current_role()
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  r text;
begin
  select up.role into r
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1;
  return coalesce(r, 'viewer');
exception
  when undefined_table or undefined_column then
    return 'viewer';
end;
$$;

create or replace function public.restaurant_center_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.restaurant_center_current_role() = 'admin';
$$;

-- Managers may create/edit openings, playbooks, templates and tasks. Initial
-- real access is expected to be HQ + selected regional leadership, granted
-- through CGOPS roles — never hardcoded emails.
create or replace function public.restaurant_center_can_manage()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.restaurant_center_current_role()
         in ('admin', 'executive', 'regional_leader');
$$;

-- Single seam the frontend calls to resolve the signed-in user's profile.
-- Returns role + is_admin from CGOPS; email comes from the JWT so it works
-- even if the CGOPS profile row is missing. display_name/person_id are left
-- null in Phase 1 (the People Center person link arrives with the readiness
-- integration) — this keeps the column dependency to role only.
create or replace function public.restaurant_center_current_profile()
returns table (
  role text,
  email text,
  display_name text,
  person_id uuid,
  is_admin boolean
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
           (up.role = 'admin')
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
    limit 1;
  if not found then
    return query
      select 'viewer'::text, coalesce(auth.jwt() ->> 'email', ''),
             null::text, null::uuid, false;
  end if;
exception
  when undefined_table or undefined_column then
    return query
      select 'viewer'::text, coalesce(auth.jwt() ->> 'email', ''),
             null::text, null::uuid, false;
end;
$$;

grant execute on function public.restaurant_center_current_role() to authenticated;
grant execute on function public.restaurant_center_is_admin() to authenticated;
grant execute on function public.restaurant_center_can_manage() to authenticated;
grant execute on function public.restaurant_center_current_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Reusable playbook definitions ("Role Playbooks" in the UI).
create table if not exists public.opening_playbooks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role_key text,        -- e.g. 'general_manager' (nullable; role- OR dept-scoped)
  department_key text,  -- e.g. 'it', 'marketing'
  description text,
  active boolean not null default true,
  version int not null default 1,
  sort_order int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reusable task definitions within a playbook.
create table if not exists public.opening_task_templates (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.opening_playbooks (id) on delete cascade,
  title text not null,
  description text,
  anchor_type text not null default 'opening_date'
    check (anchor_type in ('opening_date', 'handover_date', 'soft_opening_date', 'fixed_date')),
  offset_days int not null default 0, -- negative = before anchor, positive = after
  default_owner_role text,
  required boolean not null default false,
  sequence int not null default 0,
  dependency_template_id uuid references public.opening_task_templates (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opening_task_templates_playbook_idx
  on public.opening_task_templates (playbook_id);

-- A concrete restaurant opening + its key site information and construction
-- milestone references (construction boundary: milestones only, never a
-- construction task module).
create table if not exists public.opening_sites (
  id uuid primary key default gen_random_uuid(),
  location_id uuid, -- → CGOPS public.locations.id (soft ref); null if the upcoming location doesn't exist yet
  name text not null,
  concept text,
  address text,
  opening_date date,
  handover_date date, -- construction handover: building becomes operationally available
  soft_opening_date date,
  status text not null default 'planning'
    check (status in ('planning', 'in_progress', 'pre_opening', 'open', 'on_hold', 'cancelled')),
  handover_status text not null default 'not_scheduled'
    check (handover_status in ('not_scheduled', 'scheduled', 'delayed', 'complete')),
  construction_note text,
  construction_link text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opening_sites_status_idx on public.opening_sites (status);

-- Which playbooks are applied to a site (drives generation; one row per
-- site+playbook).
create table if not exists public.opening_site_playbooks (
  id uuid primary key default gen_random_uuid(),
  opening_site_id uuid not null references public.opening_sites (id) on delete cascade,
  playbook_id uuid not null references public.opening_playbooks (id) on delete cascade,
  assigned_lead_person_id uuid, -- → CGOPS person (soft ref); People Center owns the person
  status text not null default 'active'
    check (status in ('active', 'complete', 'removed')),
  created_at timestamptz not null default now(),
  unique (opening_site_id, playbook_id)
);

create index if not exists opening_site_playbooks_site_idx
  on public.opening_site_playbooks (opening_site_id);

-- Generated (or one-off) site-specific tasks.
create table if not exists public.opening_tasks (
  id uuid primary key default gen_random_uuid(),
  opening_site_id uuid not null references public.opening_sites (id) on delete cascade,
  site_playbook_id uuid references public.opening_site_playbooks (id) on delete set null,
  playbook_id uuid references public.opening_playbooks (id) on delete set null,
  task_template_id uuid references public.opening_task_templates (id) on delete set null,
  title text not null,
  description text,
  anchor_type text
    check (anchor_type is null or anchor_type in ('opening_date', 'handover_date', 'soft_opening_date', 'fixed_date')),
  offset_days int,
  due_date date,
  date_overridden boolean not null default false, -- true once the due date is hand-set; recalculation leaves it alone
  assigned_person_id uuid, -- → CGOPS person (soft ref)
  assigned_role text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'blocked', 'complete', 'not_applicable')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  at_risk boolean not null default false,
  sequence int not null default 0,
  completed_at timestamptz,
  completed_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opening_tasks_site_idx on public.opening_tasks (opening_site_id);
create index if not exists opening_tasks_site_playbook_idx on public.opening_tasks (site_playbook_id);
create index if not exists opening_tasks_due_idx on public.opening_tasks (due_date);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'opening_playbooks',
    'opening_task_templates',
    'opening_sites',
    'opening_tasks'
  ]
  loop
    execute format('drop trigger if exists set_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%s_updated_at before update on public.%I
         for each row execute function public.restaurant_center_set_updated_at()',
      t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS — deny-by-default; read for any authenticated CGOPS user; writes for
--        managers; deletes admin-only.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'opening_playbooks',
    'opening_task_templates',
    'opening_sites',
    'opening_site_playbooks',
    'opening_tasks'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %s_select on public.%I', t, t);
    execute format(
      'create policy %s_select on public.%I for select to authenticated using (true)', t, t);

    execute format('drop policy if exists %s_insert on public.%I', t, t);
    execute format(
      'create policy %s_insert on public.%I for insert to authenticated
         with check (public.restaurant_center_can_manage())', t, t);

    execute format('drop policy if exists %s_update on public.%I', t, t);
    execute format(
      'create policy %s_update on public.%I for update to authenticated
         using (public.restaurant_center_can_manage())
         with check (public.restaurant_center_can_manage())', t, t);

    execute format('drop policy if exists %s_delete on public.%I', t, t);
    execute format(
      'create policy %s_delete on public.%I for delete to authenticated
         using (public.restaurant_center_is_admin())', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seeds (guarded) — a starter library of role playbooks so the app is usable
-- on day one. Names double as the uniqueness guard, so re-running is a no-op.
-- These are examples for HQ to refine, not an authoritative checklist; the
-- future Excel import (docs/EXCEL_IMPORT_SPEC.md) will supply the real ones.
-- ---------------------------------------------------------------------------

insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
select v.name, v.role_key, v.department_key, v.description, v.sort_order
from (values
  ('Regional Playbook',          'regional_leader',  'operations', 'Regional leadership oversight for the opening.', 1),
  ('General Manager Playbook',   'general_manager',  'management', 'GM readiness, hiring hand-offs, and floor setup.', 2),
  ('Chef Playbook',              'chef',             'kitchen',    'Culinary leadership, kitchen build-out and menu readiness.', 3),
  ('Beverage Manager Playbook',  'beverage_manager', 'bar',        'Bar program, ordering, and licensing readiness.', 4),
  ('IT Playbook',                null,               'it',         'POS, networking, and systems provisioning.', 5),
  ('Marketing Playbook',         null,               'marketing',  'Launch marketing, signage, and community.', 6),
  ('Finance Playbook',           null,               'finance',    'Banking, cash handling, and financial setup.', 7),
  ('Training Playbook',          null,               'training',   'Staff training, mock service, and certification.', 8)
) as v (name, role_key, department_key, description, sort_order)
where not exists (
  select 1 from public.opening_playbooks p where p.name = v.name
);

-- A few illustrative templates so generation produces something meaningful.
insert into public.opening_task_templates
  (playbook_id, title, description, anchor_type, offset_days, default_owner_role, required, sequence)
select pb.id, v.title, v.description, v.anchor_type, v.offset_days, v.owner, v.required, v.sequence
from (values
  -- General Manager Playbook
  ('General Manager Playbook', 'GM confirmed and in place', 'General Manager hired and on site.', 'opening_date', -30, 'General Manager', true, 0),
  ('General Manager Playbook', 'Management team hired', 'Assistant managers and key leads confirmed.', 'opening_date', -21, 'General Manager', true, 1),
  ('General Manager Playbook', 'Front-of-house setup begins', 'Dining room setup starts after handover.', 'handover_date', 1, 'General Manager', false, 2),
  ('General Manager Playbook', 'Final walkthrough', 'GM operational walkthrough before opening.', 'opening_date', -2, 'General Manager', true, 3),
  -- Chef Playbook
  ('Chef Playbook', 'Chef confirmed and in place', 'Head chef hired and on site.', 'opening_date', -30, 'Head Chef', true, 0),
  ('Chef Playbook', 'Initial food order placed', 'First inventory order placed ahead of handover.', 'handover_date', -5, 'Head Chef', true, 1),
  ('Chef Playbook', 'Kitchen setup and calibration', 'Equipment tested and stations set after handover.', 'handover_date', 2, 'Head Chef', false, 2),
  ('Chef Playbook', 'Menu tasting and sign-off', 'Final menu execution reviewed.', 'soft_opening_date', -3, 'Head Chef', true, 3),
  -- IT Playbook
  ('IT Playbook', 'Network and internet provisioned', 'Connectivity live at the site.', 'handover_date', 0, 'IT', true, 0),
  ('IT Playbook', 'POS installed and configured', 'Point-of-sale terminals installed and tested.', 'handover_date', 3, 'IT', true, 1),
  ('IT Playbook', 'Systems go-live check', 'End-to-end systems verification.', 'opening_date', -5, 'IT', true, 2),
  -- Training Playbook
  ('Training Playbook', 'Training schedule published', 'Staff training calendar shared.', 'opening_date', -21, 'Training', true, 0),
  ('Training Playbook', 'Staff training complete', 'All staff trained on service standards.', 'opening_date', -7, 'Training', true, 1),
  ('Training Playbook', 'Mock service', 'Full mock-service run before opening.', 'soft_opening_date', -1, 'Training', true, 2)
) as v (playbook, title, description, anchor_type, offset_days, owner, required, sequence)
join public.opening_playbooks pb on pb.name = v.playbook
where not exists (
  select 1 from public.opening_task_templates tt
  where tt.playbook_id = pb.id and tt.title = v.title
);
