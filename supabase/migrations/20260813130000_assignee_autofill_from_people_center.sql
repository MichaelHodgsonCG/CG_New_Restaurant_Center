-- ============================================================================
-- Migration: assignee_autofill_from_people_center
-- Follow-up to role_mapping_and_profile_flags (2026-07-10).
--
-- ⚠ Apply to the CGOPS Platform Supabase project.
--
-- Why (Michael, 2026-08-13): tasks keep their role label ("General Manager"),
-- but the actual person is auto-filled from People Center's location settings
-- — people_center_position_assignments holds who holds which position at
-- which location. A manual overwrite always wins (mirrors the existing
-- date_overridden pattern). Department/HQ roles (IT, Training, directors…)
-- have no per-location position and stay role-only with manual assignment.
-- Ambiguous matches (zero or several holders) are left unfilled and reported
-- for a manual pick — never guessed.
--
-- Also wires the person identity link (UTL v1 remediation):
--   * restaurant_center_current_profile() now returns the People Center
--     person_id + display_name via people_center_user_profiles.
--   * completed_by is stamped server-side when a task is completed.
--
-- Idempotent: IF NOT EXISTS guards, CREATE OR REPLACE, drop-then-create for
-- triggers/policies, guarded seeds. Additive — reads People Center tables via
-- SECURITY DEFINER but never writes to or alters anything People Center owns.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Task columns: person-name snapshot + manual-override flag + owner index
-- ---------------------------------------------------------------------------

alter table public.opening_tasks
  add column if not exists assigned_person_name text;

alter table public.opening_tasks
  add column if not exists assignee_overridden boolean not null default false;

create index if not exists opening_tasks_assigned_person_idx
  on public.opening_tasks (assigned_person_id);

-- ---------------------------------------------------------------------------
-- 2. Role → People Center position aliases. Resolution tries this table
--    first, then an exact (case-insensitive) position-name match, so roles
--    that already equal a position name ("General Manager", "Beverage
--    Manager", "Service Manager"…) need no row here. Department/HQ roles
--    (IT, Training, Marketing, Finance) are deliberately unmapped — they
--    stay role-only with manual assignment (decision, 2026-08-13).
-- ---------------------------------------------------------------------------

create table if not exists public.opening_role_mappings (
  id uuid primary key default gen_random_uuid(),
  assigned_role text not null unique, -- the task's owner-role label
  position_id uuid not null,          -- → people_center_positions.id (soft ref)
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_opening_role_mappings_updated_at on public.opening_role_mappings;
create trigger set_opening_role_mappings_updated_at
  before update on public.opening_role_mappings
  for each row execute function public.restaurant_center_set_updated_at();

alter table public.opening_role_mappings enable row level security;

drop policy if exists opening_role_mappings_select on public.opening_role_mappings;
create policy opening_role_mappings_select on public.opening_role_mappings
  for select to authenticated using (true);

drop policy if exists opening_role_mappings_insert on public.opening_role_mappings;
create policy opening_role_mappings_insert on public.opening_role_mappings
  for insert to authenticated with check (public.restaurant_center_can_manage());

drop policy if exists opening_role_mappings_update on public.opening_role_mappings;
create policy opening_role_mappings_update on public.opening_role_mappings
  for update to authenticated
  using (public.restaurant_center_can_manage())
  with check (public.restaurant_center_can_manage());

drop policy if exists opening_role_mappings_delete on public.opening_role_mappings;
create policy opening_role_mappings_delete on public.opening_role_mappings
  for delete to authenticated using (public.restaurant_center_is_admin());

-- Seeds: aliases observed in live opening_tasks whose wording differs from
-- the People Center position name. Guarded on both sides — the row is only
-- inserted when the position exists and the alias isn't mapped yet.
insert into public.opening_role_mappings (assigned_role, position_id, note)
select v.assigned_role, p.id, v.note
from (values
  ('the Chef', 'Chef de Cuisine', 'Playbook wording → per-location head-chef position'),
  ('the Director of Culinary Development', 'Director of Culinary Development', 'Org-wide position; only fills if assigned at the opening''s location'),
  ('the Director of Purchasing', 'Director of Purchasing', 'Org-wide position; only fills if assigned at the opening''s location')
) as v (assigned_role, position_name, note)
join public.people_center_positions p on p.name = v.position_name
where not exists (
  select 1 from public.opening_role_mappings m where m.assigned_role = v.assigned_role
);

-- ---------------------------------------------------------------------------
-- 3. The resolver: auto-fill assignees for one site from People Center.
--    Only touches tasks with assignee_overridden = false (a hand-picked
--    person always wins). Writes the resolved person or clears a stale
--    auto-fill; returns one row per role so the UI can report what happened.
--    Outcomes: filled | no_location | no_role_match | no_person | ambiguous.
-- ---------------------------------------------------------------------------

create or replace function public.restaurant_center_resolve_site_assignees(p_site_id uuid)
returns table (
  role_label text,
  outcome text,
  person_name text,
  tasks_updated int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location uuid;    -- CGOPS locations.id from the site
  v_pc_location uuid; -- people_center_locations.id
  rec record;
  v_position uuid;
  v_person uuid;
  v_name text;
  v_outcome text;
  v_holders int;
  v_primaries int;
  v_count int;
begin
  if not public.restaurant_center_can_manage() then
    raise exception 'Only managers may refresh assignees.';
  end if;

  select s.location_id into v_location
  from public.opening_sites s where s.id = p_site_id;

  if v_location is not null then
    select pl.id into v_pc_location
    from public.people_center_locations pl
    where pl.cgops_location_id = v_location
    limit 1;
    if v_pc_location is null then
      -- Fallback while People Center hasn't linked the location yet
      -- (cgops_location_id null on new restaurants): exact name match.
      -- The id link, once set in People Center, always wins.
      select pl.id into v_pc_location
      from public.people_center_locations pl
      join public.locations l on l.id = v_location
      where lower(pl.name) = lower(l.name)
      limit 1;
    end if;
  end if;

  for rec in
    select distinct t.assigned_role as r
    from public.opening_tasks t
    where t.opening_site_id = p_site_id
      and t.assigned_role is not null
      and t.assignee_overridden = false
    order by 1
  loop
    v_position := null; v_person := null; v_name := null;

    if v_pc_location is null then
      v_outcome := 'no_location';
    else
      -- alias table first, then exact position-name match
      select m.position_id into v_position
      from public.opening_role_mappings m
      where lower(m.assigned_role) = lower(rec.r);

      if v_position is null then
        select p.id into v_position
        from public.people_center_positions p
        where lower(p.name) = lower(rec.r)
        order by p.name
        limit 1;
      end if;

      if v_position is null then
        v_outcome := 'no_role_match';
      else
        select count(*),
               count(*) filter (where pa.is_primary)
          into v_holders, v_primaries
        from public.people_center_position_assignments pa
        join public.people_center_people pe on pe.id = pa.person_id
        where pa.position_id = v_position
          and pa.location_id = v_pc_location
          and pa.ended_on is null
          and pe.departed_on is null
          and coalesce(pe.off_roster, false) = false;

        if v_holders = 0 then
          v_outcome := 'no_person';
        elsif v_holders = 1 or v_primaries = 1 then
          select pa.person_id,
                 coalesce(nullif(pe.preferred_name, ''), pe.full_name)
            into v_person, v_name
          from public.people_center_position_assignments pa
          join public.people_center_people pe on pe.id = pa.person_id
          where pa.position_id = v_position
            and pa.location_id = v_pc_location
            and pa.ended_on is null
            and pe.departed_on is null
            and coalesce(pe.off_roster, false) = false
            and (v_holders = 1 or pa.is_primary)
          limit 1;
          v_outcome := 'filled';
        else
          v_outcome := 'ambiguous'; -- several holders, no single primary → manual pick
        end if;
      end if;
    end if;

    -- Write the resolution (person, or null to clear a stale auto-fill).
    -- Hand-picked assignees (assignee_overridden) are never touched.
    update public.opening_tasks t
    set assigned_person_id = v_person,
        assigned_person_name = v_name
    where t.opening_site_id = p_site_id
      and t.assigned_role = rec.r
      and t.assignee_overridden = false
      and (t.assigned_person_id is distinct from v_person
           or t.assigned_person_name is distinct from v_name);
    get diagnostics v_count = row_count;

    role_label := rec.r;
    outcome := v_outcome;
    person_name := v_name;
    tasks_updated := v_count;
    return next;
  end loop;
end;
$$;

grant execute on function public.restaurant_center_resolve_site_assignees(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Roster for the manual-assignment picker. Managers only (the WHERE
--    clause returns nothing to anyone else); read-only names + ids.
-- ---------------------------------------------------------------------------

create or replace function public.restaurant_center_list_people()
returns table (id uuid, full_name text)
language sql
security definer
stable
set search_path = public
as $$
  select pe.id, coalesce(nullif(pe.preferred_name, ''), pe.full_name)
  from public.people_center_people pe
  where public.restaurant_center_can_manage()
    and pe.departed_on is null
    and coalesce(pe.off_roster, false) = false
    and pe.status <> 'departed'
  order by 2;
$$;

grant execute on function public.restaurant_center_list_people() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Completion stamping (UTL: done requires completed_at + who closed it).
--    Server-side so it can't be forgotten: completing stamps completed_at
--    and resolves completed_by from the caller's People Center person link;
--    reopening clears both.
-- ---------------------------------------------------------------------------

create or replace function public.restaurant_center_stamp_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'complete' and old.status is distinct from 'complete' then
    new.completed_at := coalesce(new.completed_at, now());
    if new.completed_by is null then
      begin
        select pcup.person_id into new.completed_by
        from public.people_center_user_profiles pcup
        where pcup.auth_user_id = auth.uid()
        limit 1;
      exception when others then
        null; -- no person link yet — completed_at still records when
      end;
    end if;
  elsif old.status = 'complete' and new.status is distinct from 'complete' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_opening_tasks_completion on public.opening_tasks;
create trigger stamp_opening_tasks_completion
  before update on public.opening_tasks
  for each row execute function public.restaurant_center_stamp_completion();

-- ---------------------------------------------------------------------------
-- 6. Profile RPC now returns the People Center person link (person_id +
--    display_name) — the identity seam the resolver, completed_by and the
--    future My Day resolver all depend on. Same return shape as before.
-- ---------------------------------------------------------------------------

create or replace function public.restaurant_center_current_profile()
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
           pcup.display_name,
           pcup.person_id,
           (up.role = 'admin'),
           (up.role in ('admin', 'HQ'))
    from public.user_profiles up
    left join public.people_center_user_profiles pcup
      on pcup.auth_user_id = up.auth_user_id
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

grant execute on function public.restaurant_center_current_profile() to authenticated;
