-- ============================================================================
-- Migration: resolve_my_nrc_counts
-- UTL v3 §5.3 count resolver — New Restaurant Center's cross-center contract.
--
-- ⚠ Apply to the CGOPS Platform Supabase project.
--
-- Per Michael's 2026-08-24 ruling (UTL v3 §5): NRC exposes a NUMBER and a
-- LINK to CGOPS, never task rows. CGOPS shows "New Restaurant Center · N due"
-- and the click lands on NRC's own My Tasks view via ?view=my-tasks
-- (query string — the #cgops_sso handoff owns the fragment).
--
-- What the number counts (the My Day tier per UTL v3 §4, not everything
-- outstanding): MY outstanding opening tasks on active openings that are
-- at_risk, blocked, or overdue on the Toronto calendar. This is exactly the
-- app's own exception definition (src/lib/dates.ts isAtRisk) — one
-- definition shared by the board, the readiness metrics, and this count.
--
-- "Mine" mirrors the app's resolution chain (src/lib/assignment.ts):
--   owner slot:  per-task assigned_person_id, else the site's Team-panel
--                role assignment (person id or name snapshot), else the
--                role text naming me verbatim (free-text person names in
--                role fields exist in live data).
--   support slot: same chain over support_person_id / support_role.
--
-- Status vocabulary maps at this boundary per UTL v3 §2: outstanding =
-- not_started|in_progress|blocked (= open|in_progress|blocked). The table
-- is not rewritten to match a word.
--
-- Identity: auth.uid() → people_center_user_profiles.person_id →
-- people_center_people. NRC assignee ids ARE people_center_people ids
-- (restaurant_center_people is a filtered view over that table), so the
-- join lands. Empty-not-error: an unlinked login gets zero rows.
-- ============================================================================

create or replace function public.resolve_my_nrc_counts()
returns table (
  due_count int,
  next_due_date date,
  deep_link text
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select pcup.person_id,
      array_remove(array[
        nullif(lower(trim(coalesce(pe.full_name, ''))), ''),
        nullif(lower(trim(coalesce(pe.preferred_name, ''))), ''),
        nullif(lower(trim(coalesce(pcup.display_name, ''))), '')
      ], null) as names
    from public.people_center_user_profiles pcup
    left join public.people_center_people pe on pe.id = pcup.person_id
    where pcup.auth_user_id = auth.uid()
      and pcup.person_id is not null
  ),
  mine as (
    select t.due_date, t.at_risk, t.status
    from public.opening_tasks t
    join public.opening_sites s on s.id = t.opening_site_id
    cross join me
    where s.status in ('planning', 'in_progress', 'pre_opening', 'on_hold')
      and t.status in ('not_started', 'in_progress', 'blocked')
      and (
        -- owner slot
        t.assigned_person_id = me.person_id
        or (t.assigned_person_id is null and exists (
          select 1 from public.opening_site_roles r
          where r.opening_site_id = t.opening_site_id
            and lower(trim(r.role_key)) = lower(trim(coalesce(t.assigned_role, '')))
            and (r.person_id = me.person_id
                 or lower(trim(coalesce(r.person_name, ''))) = any (me.names))
        ))
        or lower(trim(coalesce(t.assigned_role, ''))) = any (me.names)
        -- support slot
        or t.support_person_id = me.person_id
        or (t.support_person_id is null and exists (
          select 1 from public.opening_site_roles r
          where r.opening_site_id = t.opening_site_id
            and lower(trim(r.role_key)) = lower(trim(coalesce(t.support_role, '')))
            and (r.person_id = me.person_id
                 or lower(trim(coalesce(r.person_name, ''))) = any (me.names))
        ))
        or lower(trim(coalesce(t.support_role, ''))) = any (me.names)
      )
  ),
  exceptions as (
    select * from mine
    where at_risk
       or status = 'blocked'
       or (due_date is not null
           and due_date < (now() at time zone 'America/Toronto')::date)
  )
  select count(*)::int as due_count,
         min(due_date) as next_due_date,
         '?view=my-tasks'::text as deep_link
  from exceptions
  having exists (select 1 from me);
$$;

grant execute on function public.resolve_my_nrc_counts() to authenticated;
