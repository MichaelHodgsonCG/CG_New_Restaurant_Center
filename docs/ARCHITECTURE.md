# Architecture — CG New Restaurant Center

This document records the CGOPS integration pattern this app follows and the
Phase 1 data model. It is intentionally the counterpart to People Center's
architecture notes; where a decision matched People Center, we reused it
rather than inventing a new one.

## 1. Where it sits in CGOPS

New Restaurant Center is a **native CGOPS platform application**. It shares
the **CGOPS Platform Supabase project** with People Center and every other
migrated app — it does **not** have its own Supabase project. CGOPS is the
authority for identity, roles and location/person records; this app owns only
its `opening_*` tables.

```
CGOPS Platform (front door, SSO issuer, identity/role authority)
   │  public.user_profiles  (role incl. 'admin')      ← identity master
   │  public.locations      (status incl. 'opening')  ← location master
   │
   ├── People Center      (people_center_* tables)    ← people system of record
   └── New Restaurant Center (opening_* tables)        ← this app
```

### Namespacing

The shared project means names must not collide. Following People Center's
`people_center_` convention:

- **Tables** are prefixed `opening_` (`opening_sites`, `opening_playbooks`,
  `opening_task_templates`, `opening_site_playbooks`, `opening_tasks`).
- **Functions** are prefixed `restaurant_center_`.

CGOPS-owned rows are referenced by **bare uuid soft references, never foreign
keys** (`opening_sites.location_id → public.locations.id`,
`opening_tasks.assigned_person_id → a CGOPS person`). CGOPS owns those
identities; keeping them as soft refs keeps this migration self-contained and
additive on the shared project.

## 2. Authentication & SSO (reused verbatim in behaviour)

There is **no standalone login**. The flow mirrors People Center exactly:

1. `src/lib/supabase.ts` — one browser client, **anon key + RLS only**,
   `detectSessionInUrl: false`, and an activity-tracking `fetch` wrapper feeding
   the platform inactivity timeout.
2. `src/features/auth/cgopsSso.ts` — consumes the CGOPS handoff fragment
   `#cgops_sso=1&access_token=…&refresh_token=…` via `setSession()` and strips
   the fragment from the address bar immediately.
3. `src/features/auth/useSession.ts` — consumes the handoff, reads the session,
   then resolves the profile.
4. `src/features/auth/RedirectToCgops.tsx` — anyone without a session is sent to
   `VITE_CGOPS_URL`; CGOPS relaunches this app with the handoff fragment.
5. `src/components/SessionTimeoutManager.tsx` + `src/lib/sessionActivity.ts` —
   the shared platform inactivity timeout, governed by the CGOPS
   `get_session_policy()` RPC. Copied unchanged from People Center.

### Role resolution — the single seam onto CGOPS identity

The app never stores its own role table (no duplicate People Center). It calls
**one** SECURITY DEFINER RPC, `restaurant_center_current_profile()`, which reads
the CGOPS master profile `public.user_profiles`. The function:

- returns the CGOPS `role` and an `is_admin` flag;
- takes `email` from the JWT so it works even without a profile row;
- **fails safe to `viewer`** if `public.user_profiles` is missing/not shaped as
  assumed (the same defensive assumption People Center's admin bridge makes);
- depends only on `public.user_profiles(auth_user_id, role)`.

`display_name`/`person_id` are deliberately left null in Phase 1 — the People
Center person link arrives with the readiness integration (§6).

## 3. Permissions

`src/permissions/index.ts` is the one place role → capability is decided; RLS
is the real enforcement layer and the truth table here mirrors it:

| Role | View | Create / edit | Delete |
| --- | --- | --- | --- |
| `admin` | ✓ | ✓ | ✓ |
| `executive`, `regional_leader` (**managers**) | ✓ | ✓ | — |
| `location_leader`, `viewer` | ✓ | — | — |

Any authenticated CGOPS user may **read** opening data. Initial real write
access is expected to be HQ + selected regional leadership, granted through
**CGOPS roles — never hardcoded emails**.

## 4. Data model

| Table | Purpose |
| --- | --- |
| `opening_playbooks` | Reusable playbook definitions (role/department-scoped). |
| `opening_task_templates` | Reusable task definitions within a playbook (anchor + offset). |
| `opening_sites` | A concrete opening + key site info + construction milestones. |
| `opening_site_playbooks` | Which playbooks are applied to a site (drives generation). |
| `opening_tasks` | Generated or one-off site-specific tasks. |

### Anchor & offset convention

`due_date = anchor_date + offset_days`, where **negative = before the anchor,
positive = after**. Anchor types: `opening_date`, `handover_date`,
`soft_opening_date`, `fixed_date`. The **construction handover date** is the
pivotal anchor — the building becomes operationally available and setup tasks
begin from it (~3 weeks before opening).

### Task status model (small on purpose)

`not_started · in_progress · blocked · complete · not_applicable`. Risk is kept
**separate** from status: a `priority` (`low/normal/high`) plus an `at_risk`
boolean, so status never gets overloaded. A task counts against readiness when
it is at-risk, blocked, or overdue (and not complete/N/A).

## 5. Row-Level Security

Every `opening_*` table has RLS enabled, deny-by-default, `authenticated` only:

- **SELECT** — `using (true)` (any signed-in CGOPS user reads).
- **INSERT / UPDATE** — `restaurant_center_can_manage()` (managers).
- **DELETE** — `restaurant_center_is_admin()` (admins).

The migration is **idempotent** (guards, `create or replace`,
drop-then-create) and **additive** (nothing alters CGOPS-owned objects).

## 6. Construction & staffing boundaries

- **Construction**: milestone references only — `handover_date`,
  `handover_status`, `construction_note`, `construction_link`. No construction
  task module; this does not replace Shanna's process.
- **Staffing**: People Center owns people. Opening Detail and Readiness show a
  staffing **placeholder** today; a future integration will surface the
  assigned person, required-by date, actual start date and a link to the
  People Center record — read-only visibility, never a duplicate.

## 7. Frontend structure

```
src/
  lib/            supabase client, session activity, dates, metrics, api (data access)
  types/          domain types mirroring the schema
  permissions/    the can() module
  components/     AppShell, SessionTimeoutManager, shared UI primitives
  features/
    auth/         SSO handoff, useSession, RedirectToCgops
    dashboard/    Opening Dashboard
    sites/        Sites list, site form, Opening Detail, task row
    playbooks/    Role Playbooks + task-template management
    readiness/    cross-site readiness table
```

Navigation is top-level view state in `App.tsx` (no router — house convention).

## 8. Deployment

Vercel project `cg-new-restaurant-center`, standard Vite build (`npm run
build` → `dist/`). Env vars are set for Production/Preview/Development with the
same CGOPS values as People Center. No server component; the anon key + RLS is
the entire security surface in the browser.
