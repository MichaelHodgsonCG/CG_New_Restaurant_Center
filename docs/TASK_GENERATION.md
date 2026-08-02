# Task generation & recalculation

How opening tasks come into existence, and what happens to their dates when a
site's anchor dates change. Implemented in `src/lib/api.ts`
(`addPlaybookToSite`, `recalculateDueDates`) and `src/lib/dates.ts`.

## The offset convention

Every template schedules against an **anchor date** with a signed **offset in
days**:

```
due_date = anchor_date + offset_days
```

- **Negative** offset = that many days **before** the anchor.
- **Positive** offset = that many days **after** the anchor.
- `0` = on the anchor date.

Anchor types: `opening_date`, `handover_date`, `soft_opening_date`,
`fixed_date`.

Examples:

| Task | Anchor | Offset | Meaning |
| --- | --- | --- | --- |
| GM in place | `opening_date` | `-30` | 30 days before opening |
| Initial food order | `handover_date` | `-5` | 5 days before handover |
| Kitchen setup begins | `handover_date` | `+2` | 2 days after handover |
| Mock service | `soft_opening_date` | `-1` | day before soft open |

## Generation

When a playbook is added to an opening (Opening Detail → *Add a playbook*):

1. An `opening_site_playbooks` row is created (or reused) — unique per
   site + playbook.
2. Each **active** template in the playbook becomes an `opening_tasks` row.
3. The due date is computed from the site's anchor date + the template offset.
4. `date_overridden` starts `false`; the owner/support default copies over —
   role text (`default_owner_role` → `assigned_role`) and, when the template
   names a person (HQ lists), the person link
   (`default_owner_person_id` → `assigned_person_id`), so named defaults land
   directly in that person's My Tasks with no Team-panel step; `priority`
   starts `high` for required templates.
5. `category` copies from the template — it becomes the task's section header
   on the board — and `sort_order` copies the template's position so sections
   render in curated order. Reordering on the board swaps `sort_order` values
   and never touches `sequence` (template lineage).

### No duplicate generation

Generation is **idempotent**. Re-adding the same playbook (or re-running after
adding new templates) only inserts tasks for templates that don't already have
a task under that assignment — existing tasks are left untouched. The UI reports
`N generated, M already existed`.

### Unscheduled tasks

If a template's anchor date is **not set yet** on the site (e.g. no
`soft_opening_date`), the task is still created but with `due_date = null`
(unscheduled). It schedules automatically on the next recalculation once the
anchor date is filled in. Templates with `anchor_type = 'fixed_date'` have no
site-level anchor and are likewise created unscheduled for a manual date.

## Recalculation when anchor dates change

Opening dates move. When a site's `opening_date` / `handover_date` /
`soft_opening_date` changes, use **Recalculate dates** on Opening Detail.

The rule, verbatim from the brief:

> **A manually overridden due date is never silently changed.**

Recalculation (`recalculateDueDates`) therefore:

- **only** touches generated tasks (`task_template_id` is set) whose
  `date_overridden` is `false`;
- recomputes `due_date = anchor_date + offset_days` for those;
- **preserves** any task whose date was set by hand (`date_overridden = true`);
- **ignores** one-off tasks entirely (they have no template/anchor);
- reports `updated`, `preserved`, and `unscheduled` counts.

### What sets `date_overridden`

- Editing a task's due date in Opening Detail flags it (`date_overridden =
  true`) and shows a small **manual date** marker on the row.
- Creating a one-off task with an explicit due date is inherently manual.

There is no automatic re-recalculation on save — it is an explicit button so a
leader stays in control of a schedule shift, and the app tells them how many
manual dates it preserved.

## One-off tasks

Tasks that don't belong to a template can be added directly on the board:
every section has an **Add task** row action, each playbook block has an
**Add section** input, and **Add one-off task** creates a task outside any
playbook (grouped under "Other tasks"). All of these carry
`task_template_id = null` and are never affected by generation or
recalculation. A per-section addition still records the `playbook_id` and
`category` it was created under so it stays in its section.

## Sections

Sections are not entities — they are the distinct `category` values on the
tasks (templates carry the canonical value; `null` renders as "General").
Renaming a section on a site's board bulk-updates the category on that site's
tasks only; renaming in the playbook library updates the templates. The two
deliberately don't sync automatically — a live opening's board is its own copy,
exactly like task titles.

## Playbook ↔ site sync (the block tools menu)

Each playbook block on Opening Detail has a tools menu (managers only),
implemented in `src/lib/playbookSync.ts` and keyed on `task_template_id`:

- **Apply playbook updates** (playbook → site): new templates become tasks
  (via the same idempotent generation), changed templates update their tasks'
  title / description / section / anchor+offset — recomputing the due date
  only when it was never hand-set — and deactivated templates mark their
  still-open tasks `not_applicable` (delete is admin-only; N/A preserves the
  record). Roles and person links are never touched here.
- **Update playbook from this opening** (site → playbook): pushes titles,
  descriptions, sections, curated order, role defaults, and offsets
  back-computed from hand-set due dates into the library, shaping future
  openings. Role-text defaults are only taken from tasks *without* a person
  link — a per-site person override never overwrites an existing template's
  default (named defaults are curated in the library). Hand-added tasks in
  the block are promoted to templates and linked, carrying their assignee
  (role or named person) with them. Additive: never deactivates or deletes
  templates.
- **Re-apply default roles** (playbook → site): copies template default
  owner/support roles onto tasks; never blanks a value, never touches
  per-task person overrides.
- **Save as new playbook…**: snapshots the block's tasks as a fresh playbook
  (offsets kept, or back-computed from the opening date for hand-dated
  tasks). Available on the one-off "Other tasks" block too. The source
  opening is not modified.

## Marking not applicable

Setting a task's status to `not_applicable` removes it from the completion
denominator (it neither counts as done nor as outstanding) while keeping a
record that it was consciously skipped.
