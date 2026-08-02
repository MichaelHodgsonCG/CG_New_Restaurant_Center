# Proposal: Adopt the Menu Center Task Format for Playbooks

**Status:** Proposal — awaiting review
**Reference implementation:** `cgops-menu-center` launch checklists
(`src/components/MenuLaunchChecklists.tsx`, `PersonPicker.tsx`, `MyTasks.tsx`,
`TemplateManager.tsx`, `src/lib/launchTemplateStore.ts`)

Menu Center's launch-checklist process has been flushed out in real use, and its
task format is the one we want new-restaurant Playbooks to feel like. This
document compares the two systems, identifies what to adopt, what to keep from
Restaurant Center's existing backbone, and lays out the changes in three
deliverable phases.

---

## 1. Side-by-side today

| Aspect | Menu Center (target format) | Restaurant Center (current) |
|---|---|---|
| Grouping | Sections (free-text, e.g. "Data Collection"), rename inline, add section | Per-playbook cards; `category` exists in DB on templates but is never shown |
| Task row | Single grid row: reorder arrows · checkbox · inline-edit title (strikethrough when done) · date input · Owner picker · Support picker · note popover · delete X | Stacked block: check icon, title, badges, description, then a second row of controls (status select, priority select, at-risk checkbox, date, owner-role text, note toggle) |
| Completion | Boolean checkbox, green row tint + strikethrough | 5-state status (`not_started / in_progress / blocked / complete / not_applicable`) |
| People | Owner **and** Support per task; `PersonPicker` with avatars/initials backed by a People Center view, free-text fallback, optional `person_id` link | Free-text `assigned_role` only; `assigned_person_id` column exists but is never read or written; no picker, no avatars |
| Filters | Pills: All / Overdue / Due this week / Due in 14 days / Later, with live counts; My Tasks toggle | None |
| Progress | Header bar "21/66 complete" + per-section `3/3` counts | `ProgressBar` + metrics exist (site header and per-playbook card strip) |
| Ordering | Up/down arrows, `sort_order double precision` midpoint inserts | `sequence integer` from template; no reorder UI |
| Scheduling | Single `launch_date` + `days_before_launch` offset; "Auto-fill Dates" tool | **Stronger:** 4 anchor types (`opening / handover / soft_opening / fixed`) + signed `offset_days`; `date_overridden` lock; explicit "Recalculate dates" |
| Templates | Named templates per concept; launch "tracks" its source template; Tools menu: Update template / Apply Template / Apply Owners / Save As / Auto-fill Dates | Playbooks are the template library; generation is idempotent (diff on `task_template_id`); **no edit UI** for playbooks/templates (create + delete only); no sync-back |
| Cross-launch view | My Tasks page with bucket tiles and inline complete | Readiness table (site-level only, no task list) |
| Permissions | Anon full CRUD (legacy) | **Stronger:** RLS with `can_manage` / `is_admin`, threaded through UI |

**Conclusion:** adopt Menu Center's *presentation and interaction* model
wholesale, but keep Restaurant Center's *scheduling, generation, and
permission* backbone — it is strictly better than what Menu Center has
underneath.

---

## 2. What we deliberately keep from Restaurant Center

These are not up for replacement; the Menu Center format layers on top of them.

1. **Anchor + offset scheduling** (`anchor_type`, `offset_days`,
   `computeDueDate`). Multiple anchors (handover vs. opening vs. soft opening)
   are essential for openings and Menu Center has no equivalent. Menu Center's
   "Auto-fill Dates" becomes our existing "Recalculate dates".
2. **`date_overridden` protection** — a hand-set due date is never silently
   recalculated. Menu Center lacks this and it has been a stated rule here
   (docs/TASK_GENERATION.md).
3. **Idempotent generation** — re-adding a playbook only creates missing tasks.
4. **RLS / `can_manage`** — read-only users see the same board without
   controls.
5. **Richer status where it earns its keep** — `blocked` and `not_applicable`
   carry real information a boolean can't. See §4.2 for how they coexist with
   the checkbox.
6. **One-off tasks** (`task_template_id = null`) — they map cleanly onto Menu
   Center's per-section "Add task".

---

## 3. Schema changes (Supabase migrations)

All changes are additive and idempotent, consistent with existing migrations.
Same shared CGOPS project, `opening_` prefix.

### 3.1 `opening_tasks`

```sql
alter table opening_tasks
  add column if not exists category text,                -- section header, copied from template at generation
  add column if not exists support_role text,            -- display text, mirrors assigned_role
  add column if not exists support_person_id uuid,       -- soft ref → People Center person
  add column if not exists sort_order double precision;  -- midpoint reordering within a section
```

- `category` is copied from `opening_task_templates.category` when tasks are
  generated; editable per task afterwards (renaming a section = bulk update of
  `category` within the site, exactly like Menu Center's `renameSection`).
- `assigned_role` / `assigned_person_id` become the **Owner** column
  (text snapshot + optional person link — Menu Center's hybrid model).
  `support_role` / `support_person_id` are the new **Support** column.
- `sort_order` backfill: `update opening_tasks set sort_order = sequence where
  sort_order is null`. `sequence` stays for template lineage; ordering reads
  `sort_order`.

### 3.2 `opening_task_templates`

```sql
alter table opening_task_templates
  add column if not exists default_support_role text,
  add column if not exists default_owner_person_id uuid,
  add column if not exists default_support_person_id uuid,
  add column if not exists sort_order double precision;
```

`category` already exists (added by the seed migration) — it just needs to be
surfaced in `TaskTemplate`, `api.ts`, and the UI. The 341 seeded FOH templates
already carry a full category taxonomy, so sectioned rendering lights up with
real content on day one.

### 3.3 People view

Mirror Menu Center's `menu_center_launch_people` view (same database), scoped
for this app:

```sql
create or replace view restaurant_center_people as ...  -- same shape:
-- id, full_name, preferred_name, person_kind, photo_url, is_head_office
grant select on restaurant_center_people to authenticated;
```

Same sourcing rules (active on-roster managers / emerging leaders + Head
Office), same rationale: exposes zero HR fields, keeps People Center as the
system of record, and satisfies the ARCHITECTURE.md staffing boundary — we
reference people, we don't manage them.

### 3.4 Explicitly not copied

- No `menu_center`-style separate checklist table — `opening_sites` +
  `opening_site_playbooks` already play that role.
- No `days_before_launch` — superseded by `anchor_type`/`offset_days`.
- No anon-CRUD RLS — existing policies stay.

---

## 4. UI changes

### 4.1 New shared primitives (`src/components/ui.tsx` + new files)

| Primitive | Source of truth in Menu Center | Notes |
|---|---|---|
| `PersonPicker` | `PersonPicker.tsx` (135 lines) | Port nearly as-is: avatar/initials chip, searchable dropdown, free-text fallback, exact-name auto-link on blur. Restyle to CG tokens (`cg-orange` reserved for primary/active). |
| `NotePopover` | `NoteButton` in `MenuLaunchChecklists.tsx` | Replaces the current inline notes toggle. |
| `FilterPills` | `DUE_FILTERS` block | Generic pill row with counts + active tone. |
| `SectionHeader` | Section render block | Uppercase tracked label, inline rename (managers), right-aligned `x/y` count. |
| `Modal` | — | We hand-roll overlays twice already (`PlaybooksView`, `SiteFormModal`); worth extracting while we're in here. |

### 4.2 `TaskRow` — rebuilt in the Menu Center grid format

`grid-cols-[auto_1fr_150px_105px_105px_auto]`:

```
[↑↓ | ☑] [Title (inline edit, strikethrough)] [Due date] [Owner] [Support] [note | ✕]
```

- **Checkbox is the primary interaction**: toggles `complete ↔ not_started`,
  stamping/clearing `completed_at` (existing logic).
- **Status doesn't disappear** — it collapses into the row: a small status chip
  between checkbox and title, cycling or opening a mini-menu for
  `in_progress / blocked / not_applicable`. `not_applicable` rows render
  muted and stay excluded from progress counts (existing `taskMetrics`
  `counted` logic). `blocked` shows the danger tone. This keeps Menu Center's
  clean look without losing information the openings process needs.
- **Due date**: bare `<input type="date">` styled like Menu Center's ghost
  input. Editing sets `date_overridden = true` (existing rule); the lock
  indicator moves into the date cell's `title`/icon.
- **Owner / Support**: `PersonPicker` writing
  `{assigned_role, assigned_person_id}` / `{support_role, support_person_id}`.
  Free text keeps working — seeded role strings like "General Manager" remain
  valid until a real person is picked, which is exactly the pre-hiring state of
  an opening.
- **Priority / at-risk**: fold into the note/flag cluster on the right — an
  `at_risk` flag toggle stays (it feeds Readiness); the priority select drops
  from the row (seeded `high` = "Required" badge stays as a chip on the title,
  like today).
- Reorder arrows and delete follow Menu Center exactly (managers only; hidden
  while filtering, like Menu Center).

### 4.3 `SiteDetailView` — the launch-board layout

Adopt the Menu Center detail-page chrome:

1. **Header**: site name + status pill, concept • opening date, and a
   "Tracking: GM Playbook, Beverage Manager Playbook, …" line (the playbooks
   generated into this site — the analogue of "Tracking the '…' template").
2. **Progress bar** `done/counted complete` (components already exist).
3. **Filter pills**: All / Overdue / Due this week / Due in 14 days / Later
   with live counts, plus a **My Tasks** toggle. Port `bucketForTask` verbatim
   (completed → excluded; no date → Later; `< today` → Overdue; `≤ +7d` →
   week; `≤ +14d` → fortnight; else Later). Implement once in `lib/dates.ts`
   next to `isOverdue` — Menu Center duplicated it in two files; we shouldn't.
4. **Sections**: group by **playbook → category** — each playbook renders as a
   block whose categories are Menu-Center-style section headers with `x/y`
   counts. Flattening to categories alone doesn't work here: GM, Beverage, and
   Service playbooks all contain "Hiring", "Uniforms", "Schedules", "Training"
   sections, so playbook context must stay visible. Collapsible playbook
   blocks keep a 300-task site navigable. One-off tasks group under "Other
   tasks" (existing behaviour), sectioned by their own `category` if set.
5. **Per-section Add task** (managers, not filtering): inline-creates a
   one-off task pre-filled with that playbook/category — replaces the separate
   `OneOffTaskForm`. "Add section" appears within a playbook block.
6. **Tools dropdown** replaces the loose header buttons: Recalculate dates,
   Edit details, and the Phase-3 template operations (§6).

### 4.4 `PlaybooksView` — template library catches up

- Group the template table by `category` with the same section headers, and
  show/edit category on each template. (Schema already has the data; the view
  currently hides it.)
- Add **edit** for playbooks and templates — `updatePlaybook` /
  `updateTemplate` already exist in `api.ts` and are simply never called.
  Menu Center's `TemplateEditor` is the model: inline-editable rows in
  section groups.
- Reordering within a category via the same up/down arrows + `sort_order`.

### 4.5 My Tasks (cross-site)

Port `MyTasks.tsx`: a view listing the signed-in user's tasks across all
active sites, bucket tiles (Overdue / This week / 8–14 days / Later), inline
complete, grouped by site. Data comes from existing `listAllTasks()`.
User→person resolution: port `launchTaskOwner.ts`'s approach —
`profile.person_id` when People Center wiring lands (it's `null` today), with
fallback to display-name/email token matching against `assigned_role` /
`support_role`, and the honest "we couldn't match your profile" empty state.

---

## 5. Data-layer changes (`src/lib/api.ts`, `src/types/index.ts`)

- `TaskTemplate`: add `category`, `default_support_role`,
  `default_owner_person_id`, `default_support_person_id`, `sort_order`.
- `OpeningTask`: add `category`, `support_role`, `support_person_id`,
  `sort_order`.
- `addPlaybookToSite`: copy `category` and support defaults onto generated
  tasks; seed `sort_order` from template order.
- New: `listPeople()` (reads `restaurant_center_people`),
  `moveTask(id, dir)` (midpoint `sort_order` swap, optimistic),
  `renameCategory(siteId, playbookId, from, to)` (bulk update),
  `bucketForTask` in `lib/dates.ts`.
- Keep the existing optimistic-patch-then-reload-on-error pattern from
  `SiteDetailView.patchTask` — it's the same idea as Menu Center's optimistic
  writes but with error recovery, which Menu Center lacks (its failed writes
  drift silently). Ours is the better version; use it everywhere.

---

## 6. Template-sync tools (the part Menu Center proved out)

Menu Center's biggest process win is the two-way link between a live checklist
and its named template (`launchTemplateStore.ts`). The equivalents here, in the
site-detail Tools menu — all manager-gated:

| Menu Center tool | Restaurant Center equivalent | Behaviour |
|---|---|---|
| Apply Template | **Apply playbook updates** | Diff-sync a site's generated tasks against current templates: insert added, update changed (title/description/category/offsets — skipping `date_overridden` dates), remove template-deleted tasks that are still incomplete. Report `{added, updated, removed}`. Match on `task_template_id` — more robust than Menu Center's normalized `section‖title` string match. |
| Update "template" | **Update playbook from site** | Push a site's current tasks (titles, categories, owners, offsets back-computed from due dates where not overridden) back to the source playbook's templates. This is how the process itself improves with each opening — the core of what worked in Menu Center. |
| Apply Owners | **Apply default owners** | Copy template default owner/support onto tasks, never blanking an existing assignment. |
| Save As… | **Save as new playbook** | Snapshot a site's task set as a fresh playbook (e.g. a concept-specific GM variant). Bump `version` on the source semantics we already have. |
| Auto-fill Dates | **Recalculate dates** | Already built. |

---

## 7. Phasing

**Phase 1 — the format (biggest visible win, no people dependencies)**
Migration 3.1 (category/sort_order only) + types/api plumbing; rebuilt
`TaskRow`; sectioned `SiteDetailView` with progress, per-section counts,
filter pills, add-task/add-section, reorder; `PlaybooksView` category grouping
+ edit UI. *Everything renders real content immediately thanks to the seeded
categories.*

**Phase 2 — people**
People view (3.3) + owner/support columns (rest of 3.1/3.2); `PersonPicker`
on Owner/Support; My Tasks toggle + cross-site My Tasks view; user→person
resolution.

**Phase 3 — template sync**
The §6 Tools operations, modeled on `launchTemplateStore.ts` but keyed on
`task_template_id`.

Each phase is independently shippable and additive; nothing breaks existing
data. Gates as usual: `npm run typecheck`, `npm run lint`.

---

## 8. Open decisions for review

1. **Status chip vs. pure checkbox** (§4.2): recommended is checkbox-primary
   with a compact chip for `in_progress/blocked/not_applicable`. The
   alternative — dropping to Menu Center's pure boolean — loses `blocked`
   and `not_applicable`, which Readiness and the metrics already use.
   *Recommendation: keep the chip.*
2. **Grouping** (§4.3): playbook → category (recommended) vs. a flat
   category list with playbook badges. Flat matches the screenshot exactly but
   collides on duplicate section names across playbooks.
3. **Priority select**: proposal drops it from the row (Required badge stays,
   `at_risk` flag stays). If priority is being actively triaged today, it can
   live in the note popover instead.
4. **Shared vs. per-app people view** (3.3): a per-app view is proposed for
   isolation; a single shared `cgops_launch_people` view serving both apps is
   the leaner option if we're comfortable coupling them.
