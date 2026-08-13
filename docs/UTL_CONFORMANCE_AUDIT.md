# UTL v1 Conformance Audit — Opening Tasks / Playbooks

**Date:** 2026-08-13 · **Standard:** CG Universal Task List Standard (UTL v1),
read from the CG bus (newest active `kind='standard'`). Audited against its
§6 checklist. Evidence: this repo's schema/code plus the live shared project
(1,149 `opening_tasks` rows at audit time).

Per the standard these are **conformance debts, not blockers** — apply on the
next touch of the task surface. Anything built new must conform from day one.

## §6 checklist results

| # | §6 item | Result |
|---|---------|--------|
| 1 | Canonical fields (§1) | **Partial.** Typed `due_date` ✅ (null = unscheduled ✅). `status` non-null with default ✅ but the vocabulary is app-local (`not_started`/`complete` vs canonical `open`/`done`; no `dropped`) — must be mapped at the resolver boundary. `assigned_person_id` exists but there is **no name-snapshot column and no support-assignee pair**. `completed_at` ✅; `completed_by` column exists but is **never written** (0 of 1,149 rows; TaskRow stamps `completed_at` only). |
| 2 | Owner index · stable ids · edits never reset status | **Partial.** No index on `assigned_person_id` (verified live). Stable ids ✅ — updates are patches, generation is idempotent and skips existing rows. Edits never reset status ✅ — `updateTask` patches only changed fields; due-date recalculation touches `due_date` only. |
| 3 | Resolver RPC (`resolve_my_restaurant_tasks`) | **Missing** (verified live: none). §7 registry lists `restaurant` as "not yet contributing (role-routed)". |
| 4 | Deep-link intent (query-string, one-shot) | **Missing.** The app has no URL routing at all (house no-router convention, top-level view state) — no `?view=…` intent, so a My Day task could not land on its site/task. |
| 5 | Source chip registered in CGOPS `SOURCE_META` | **Done** — `restaurant` is registered (marked not yet contributing). |
| 6 | RLS: assignee can read own row; writes per platform model | **Read ✅** (any authenticated CGOPS user reads all opening data). **Write gap:** all task writes require a manager role (admin/executive/regional_leader), so a non-manager assignee — e.g. a GM working their own playbook — **cannot close their own task**. Intersects with item 7. |
| 7 | Closure path in home UI | **Present with a gap.** TaskRow's checkmark/status select closes tasks, stamps `completed_at`, clears it on reopen ✅ (live data confirms: 0 complete rows missing `completed_at`). But `completed_by` is never stamped, and closure is manager-only (see item 6). |

## Root blocker

The person identity link is not wired: tasks carry role strings only
(`assigned_role`) — allowed under §1 as a *pre-assignment* state, but **none of
the 1,149 tasks has a person id**, so no task can ever reach anyone's My Day
list. `restaurant_center_current_profile()` also returns `person_id = null`
(the People Center link was deferred to the readiness integration), which
blocks `completed_by` stamping and the resolver alike.

## Additional findings

- **"Required" badge keys off priority** (confirms the §8 survey): template
  `required` is mapped to `priority='high'` at generation and the badge renders
  from priority — so editing priority silently changes what displays as
  "Required", and the template's required flag is lost on the task row.
- **"Today" clock is viewer-local** (`src/lib/dates.ts` `todayIso()`), not
  `America/Toronto`. §5 makes the consumer compute urgency so this only
  affects in-app overdue/at-risk flags; converge when touched.
- No `dropped` status: abandoning a task currently means deleting it
  (admin-only) rather than a terminal status.

## Remediation list (next touch of the task surface)

1. Wire the People Center person link in `restaurant_center_current_profile()`
   (auth → `people_center_user_profiles` → `person_id`).
2. Person assignment: write `assigned_person_id` + add a name-snapshot column;
   person picker in TaskRow; keep `assigned_role` as the pre-assignment state.
3. Stamp `completed_by` on closure; add `dropped` to the status set.
4. Index `assigned_person_id`.
5. `resolve_my_restaurant_tasks()` RPC mapping statuses to the canonical
   vocabulary (`not_started→open`, `complete→done`), outstanding only,
   owner + support, empty-not-error.
6. A minimal one-shot `?view=` launch intent (SSO-safe, query-string) despite
   the no-router convention.
7. Stop overloading priority: carry `required` on the task row (or join to the
   template) and let priority be its own axis.
8. Allow an assignee to update status on their own task (policy or RPC),
   keeping broader edits manager-only.
