-- ============================================================================
-- Migration: autofill_site_roles
-- Reconciles 20260813130000_assignee_autofill_from_people_center with the
-- Menu Center task format (phases 1–3, merged from main).
--
-- ⚠ Apply to the CGOPS Platform Supabase project.
--
-- The 130000 migration was written against the pre-task-format model and
-- backfilled people onto task rows. The task-format model resolves people
-- DYNAMICALLY: templates default owners by role, each opening assigns a
-- person per role in the Team panel (opening_site_roles), and per-task
-- overrides win. So Michael's auto-fill ("align the General Manager with the
-- actual person from People Center's location settings, with an overwrite
-- option", 2026-08-13) belongs on opening_site_roles — the Team panel IS the
-- overwrite surface.
--
-- This migration:
--   1. Drops the superseded task-row objects from 130000 (both columns were
--      verified empty; the RPCs never shipped in any UI).
--   2. Restores restaurant_center_current_profile() to the task-format
--      phase-2 version verbatim (130000 had overwritten it and lost the
--      display-name fallback to the CGOPS profile name).
--   3. Adds opening_site_roles.autofilled and the auto-fill RPC: fills each
--      role in play from People Center's position assignments at the site's
--      location. Rows a manager assigned by hand (autofilled = false) are
--      NEVER touched; zero/ambiguous holders are reported, never guessed
--      (decisions, Michael 2026-08-13). Department/HQ roles resolve only if
--      the position is actually assigned at the location — otherwise manual.
--
-- Kept from 130000 (still correct in the new model): opening_role_mappings
-- alias table + seeds, the opening_tasks.assigned_person_id index, and the
-- completion-stamping trigger (completed_at / completed_by server-side).
--
-- Idempotent and additive apart from the documented drops.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the superseded task-row backfill objects.
-- ---------------------------------------------------------------------------

drop function if exists public.restaurant_center_resolve_site_assignees(uuid);
drop function if exists public.restaurant_center_list_people();

alter table public.opening_tasks drop column if exists assigned_person_name;
alter table public.opening_tasks drop column if exists assignee_overridden;

-- ---------------------------------------------------------------------------
-- 2. Restore the task-format profile RPC (verbatim from
--    20260802160000_task_format_phase2.sql).
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
           coalesce(pcup.display_name, up.name),
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

-- ---------------------------------------------------------------------------
-- 3. Auto-fill provenance on role assignments. Manual Team-panel picks carry
--    autofilled = false and are never overwritten by the auto-fill; rows the
--    auto-fill wrote stay refreshable (a GM change in People Center flows
--    through on the next run).
-- ---------------------------------------------------------------------------

alter table public.opening_site_roles
  add column if not exists autofilled boolean not null default false;

-- ---------------------------------------------------------------------------
-- 4. The auto-fill RPC. For each role in play on the site (owner + support
--    role text on tasks, plus existing auto-filled assignments), resolve the
--    person holding the matching People Center position at the site's
--    location and upsert the Team-panel row.
--
--    Role → position: opening_role_mappings alias first, then exact
--    (case-insensitive) position-name match.
--    Location: people_center_locations.cgops_location_id link first, exact
--    name match as fallback until People Center links new locations.
--    Outcomes per role: filled | manual (hand-assigned, untouched) |
--    no_location | no_role_match | no_person | ambiguous.
-- ---------------------------------------------------------------------------

create or replace function public.restaurant_center_autofill_site_roles(p_site_id uuid)
returns table (
  role_label text,
  outcome text,
  person_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location uuid;    -- CGOPS locations.id from the site
  v_pc_location uuid; -- people_center_locations.id
  rec record;
  v_existing public.opening_site_roles%rowtype;
  v_position uuid;
  v_person uuid;
  v_name text;
  v_pref text;
  v_full text;
  v_last text;
  v_outcome text;
  v_holders int;
  v_primaries int;
begin
  if not public.restaurant_center_can_manage() then
    raise exception 'Only managers may auto-fill the team.';
  end if;

  select s.location_id into v_location
  from public.opening_sites s where s.id = p_site_id;

  if v_location is not null then
    select pl.id into v_pc_location
    from public.people_center_locations pl
    where pl.cgops_location_id = v_location
    limit 1;
    if v_pc_location is null then
      select pl.id into v_pc_location
      from public.people_center_locations pl
      join public.locations l on l.id = v_location
      where lower(pl.name) = lower(l.name)
      limit 1;
    end if;
  end if;

  for rec in
    select min(x.label) as label
    from (
      select trim(t.assigned_role) as label
      from public.opening_tasks t
      where t.opening_site_id = p_site_id and nullif(trim(t.assigned_role), '') is not null
      union all
      select trim(t.support_role)
      from public.opening_tasks t
      where t.opening_site_id = p_site_id and nullif(trim(t.support_role), '') is not null
      union all
      select trim(r.role_key)
      from public.opening_site_roles r
      where r.opening_site_id = p_site_id and r.autofilled
    ) x
    group by lower(x.label)
    order by 1
  loop
    -- A row a manager assigned by hand always wins — skip untouched.
    select * into v_existing
    from public.opening_site_roles r
    where r.opening_site_id = p_site_id
      and lower(trim(r.role_key)) = lower(rec.label)
    limit 1;

    if v_existing.id is not null
       and not v_existing.autofilled
       and (v_existing.person_id is not null or v_existing.person_name is not null) then
      role_label := rec.label;
      outcome := 'manual';
      person_name := v_existing.person_name;
      return next;
      continue;
    end if;

    v_position := null; v_person := null; v_name := null;

    if v_pc_location is null then
      v_outcome := 'no_location';
    else
      select m.position_id into v_position
      from public.opening_role_mappings m
      where lower(m.assigned_role) = lower(rec.label);

      if v_position is null then
        select p.id into v_position
        from public.people_center_positions p
        where lower(p.name) = lower(rec.label)
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
          and pe.status = 'active'
          and coalesce(pe.off_roster, false) = false;

        if v_holders = 0 then
          v_outcome := 'no_person';
        elsif v_holders = 1 or v_primaries = 1 then
          select pa.person_id, pe.preferred_name, pe.full_name
            into v_person, v_pref, v_full
          from public.people_center_position_assignments pa
          join public.people_center_people pe on pe.id = pa.person_id
          where pa.position_id = v_position
            and pa.location_id = v_pc_location
            and pa.ended_on is null
            and pe.status = 'active'
            and coalesce(pe.off_roster, false) = false
            and (v_holders = 1 or pa.is_primary)
          limit 1;
          -- Display-name snapshot in the picker style: preferred first name
          -- plus the surname when the preferred name doesn't already carry it.
          v_pref := trim(coalesce(v_pref, ''));
          v_full := trim(coalesce(v_full, ''));
          v_last := regexp_replace(v_full, '^.*\s', '');
          v_name := case
            when v_pref = '' then v_full
            when v_full = '' then v_pref
            when position(lower(v_last) in lower(v_pref)) > 0 then v_pref
            else v_pref || ' ' || v_last
          end;
          v_outcome := 'filled';
        else
          v_outcome := 'ambiguous';
        end if;
      end if;
    end if;

    if v_outcome = 'filled' then
      if v_existing.id is not null then
        update public.opening_site_roles r
        set person_id = v_person, person_name = v_name, autofilled = true
        where r.id = v_existing.id
          and (r.person_id is distinct from v_person
               or r.person_name is distinct from v_name
               or not r.autofilled);
      else
        insert into public.opening_site_roles
          (opening_site_id, role_key, person_id, person_name, autofilled)
        values (p_site_id, rec.label, v_person, v_name, true);
      end if;
    elsif v_existing.id is not null and v_existing.autofilled
          and (v_existing.person_id is not null or v_existing.person_name is not null) then
      -- Previously auto-filled but no longer resolvable (person left the
      -- position): clear it so the board doesn't show a stale name.
      update public.opening_site_roles r
      set person_id = null, person_name = null
      where r.id = v_existing.id;
    end if;

    role_label := rec.label;
    outcome := v_outcome;
    person_name := v_name;
    return next;
  end loop;
end;
$$;

grant execute on function public.restaurant_center_autofill_site_roles(uuid) to authenticated;
