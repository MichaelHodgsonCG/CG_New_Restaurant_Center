-- Menu Center task format, Phase 2: people & roles
-- (docs/MENU_CENTER_TASK_FORMAT_PROPOSAL.md §3.3–3.4).
--
-- Templates default owners BY ROLE; each opening assigns a PERSON to the
-- role (opening_site_roles). Task rows and My Tasks resolve dynamically:
-- explicit per-task override → site role assignment → bare role text.
-- Additive and idempotent.

-- 1. Support column on tasks + support default on templates. Owner reuses
--    the existing assigned_role / assigned_person_id columns.
alter table opening_tasks
  add column if not exists support_role text,
  add column if not exists support_person_id uuid;

alter table opening_task_templates
  add column if not exists default_support_role text;

-- 2. Role → person assignment, one row per (site, role).
create table if not exists opening_site_roles (
  id uuid primary key default gen_random_uuid(),
  opening_site_id uuid not null references opening_sites(id) on delete cascade,
  role_key text not null,          -- matches default_owner_role / assigned_role text
  person_id uuid,                  -- soft ref → people_center_people (People Center owns people)
  person_name text,                -- display snapshot (survives roster changes)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opening_site_id, role_key)
);

drop trigger if exists opening_site_roles_updated_at on opening_site_roles;
create trigger opening_site_roles_updated_at
  before update on opening_site_roles
  for each row execute function public.restaurant_center_set_updated_at();

alter table opening_site_roles enable row level security;

drop policy if exists opening_site_roles_select on opening_site_roles;
create policy opening_site_roles_select on opening_site_roles
  for select to authenticated using (true);

drop policy if exists opening_site_roles_insert on opening_site_roles;
create policy opening_site_roles_insert on opening_site_roles
  for insert to authenticated
  with check (public.restaurant_center_can_manage());

drop policy if exists opening_site_roles_update on opening_site_roles;
create policy opening_site_roles_update on opening_site_roles
  for update to authenticated
  using (public.restaurant_center_can_manage())
  with check (public.restaurant_center_can_manage());

drop policy if exists opening_site_roles_delete on opening_site_roles;
create policy opening_site_roles_delete on opening_site_roles
  for delete to authenticated
  using (public.restaurant_center_is_admin());

-- 3. People picker view — the same minimal shape Menu Center proved out
--    (menu_center_launch_people), owned per-app for isolation. Deliberately
--    exposes NO sensitive HR columns; base-table RLS stays untouched.
--    Rows: active people who are on-roster leadership (manager /
--    emerging_leader) or currently assigned to the Head Office location.
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
where p.status = 'active'
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

-- 4. Resolve a real person for the signed-in user. The reliable bridge is
--    people_center_user_profiles (auth_user_id → person_id, own-row readable);
--    display name falls back to the CGOPS login profile name. Same return
--    shape as before — person_id / display_name simply stop being null when
--    the bridge row exists.
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
