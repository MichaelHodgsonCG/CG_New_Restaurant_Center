-- ============================================================================
-- Migration: include_incoming_people
--
-- ⚠ Apply to the CGOPS Platform Supabase project.
--
-- The people staffing a NEW restaurant are People Center status 'incoming' —
-- hired for the opening, not started yet. Both the roster view backing the
-- pickers (restaurant_center_people) and the Team auto-fill RPC filtered to
-- status = 'active' only, so opening hires (e.g. an incoming Beverage
-- Manager) could be neither auto-filled nor hand-picked. For an app whose
-- whole subject is openings, incoming people are the population that
-- matters: include 'incoming' alongside 'active'. Departed, on-leave and
-- off-roster people stay excluded.
-- ============================================================================

-- 1. Roster view — same shape as task-format phase 2, plus incoming people.
create or replace view restaurant_center_people as
select
  p.id,
  p.full_name,
  p.preferred_name,
  p.person_kind,
  p.photo_url,
  exists (
    select 1
    from people_center_position_assignments pa
    join people_center_locations l on l.id = pa.location_id
    where pa.person_id = p.id
      and pa.ended_on is null
      and l.name ilike '%head office%'
  ) as is_head_office
from people_center_people p
where p.status in ('active', 'incoming')
  and (
    (p.off_roster = false and p.person_kind in ('manager', 'emerging_leader'))
    or exists (
      select 1
      from people_center_position_assignments pa
      join people_center_locations l on l.id = pa.location_id
      where pa.person_id = p.id
        and pa.ended_on is null
        and l.name ilike '%head office%'
    )
  );

grant select on restaurant_center_people to authenticated;

-- 2. Auto-fill RPC: widen the same filter in both holder queries.
--    (Full function body restated — CREATE OR REPLACE; only the two
--    pe.status predicates changed from 20260813170000_autofill_site_roles.)
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
  v_location uuid;
  v_pc_location uuid;
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
          and pe.status in ('active', 'incoming')
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
            and pe.status in ('active', 'incoming')
            and coalesce(pe.off_roster, false) = false
            and (v_holders = 1 or pa.is_primary)
          limit 1;
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
