# CG New Restaurant Center

Coordinates the **operational** work required to open new restaurants for the
Charcoal Group — putting every opening task in one place where leadership can
manage the people and teams responsible for completing them.

It is part of the **CGOPS platform** and runs against the shared CGOPS
Supabase project, using the same authentication, SSO, permission, layout and
deployment patterns as [People Center](https://github.com/MichaelHodgsonCG/cgops-people-center).

> **Scope boundary.** This app does **not** replace construction management.
> Contractors, permits, deficiencies, budgets and construction schedules are
> out of scope — construction appears only as milestone references (handover
> date + status + an optional note/link). People management stays in People
> Center; New Restaurant Center will *display* staffing readiness but never
> becomes the system of record for people.

## What it does (Phase 1)

- **Opening Dashboard** — scannable cards per opening: dates, days-to-open,
  task completion, overdue/at-risk counts, staffing placeholder, status.
- **Opening Sites** — the master list, plus create/edit an opening with its
  key site information.
- **Opening Detail** — one opening end to end: key dates, construction
  milestones, readiness metrics, playbook assignment, and the task list.
- **Role Playbooks** — reusable groups of task templates for a role or
  department (GM, Chef, Beverage, IT, Marketing, Finance, Training, Regional).
- **Opening Tasks** — generated from playbooks against a site's anchor dates,
  with status, priority/at-risk, owner role, due date, notes and completion.
- **Readiness** — a cross-site at-a-glance table.

## Tech stack

Identical to the other CGOPS apps: **Vite 5 + React 18 + TypeScript (strict) +
Tailwind 3 + `@supabase/supabase-js` + `lucide-react`**. No router (top-level
view state, house convention). Brand assets imported as modules (`publicDir`
disabled).

## Getting started

```bash
npm install
cp .env.example .env    # fill in the CGOPS project values
npm run dev
```

### Environment variables

Configured in Vercel for Production / Preview / Development (same CGOPS
platform values as People Center):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | CGOPS project **base URL only** — must **not** include `/rest/v1/`. |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for the browser. RLS is the enforcement layer. |
| `VITE_CGOPS_URL` | CGOPS platform URL — the front door for SSO. |

The service-role key is **never** used in the frontend and never committed.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run typecheck` | Type-check only |
| `npm run lint` | ESLint (zero-warning gate) |
| `npm run preview` | Preview the production build |

## Database

One additive, idempotent migration lives in
[`supabase/migrations/`](./supabase/migrations). Apply it to the **CGOPS
Platform Supabase project** (not a new project). It creates the `opening_*`
tables, the `restaurant_center_*` role helpers, RLS policies, and a starter
library of role playbooks. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — CGOPS integration, schema, RLS, permissions.
- [`docs/TASK_GENERATION.md`](./docs/TASK_GENERATION.md) — how tasks are generated and recalculated.
- [`docs/EXCEL_IMPORT_SPEC.md`](./docs/EXCEL_IMPORT_SPEC.md) — the future spreadsheet-import format.
