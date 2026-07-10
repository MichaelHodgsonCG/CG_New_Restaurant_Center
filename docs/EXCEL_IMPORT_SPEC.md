# Future Excel-import specification

We already keep operational opening checklists in Excel. Phase 1 does **not**
build a full import workflow — but the schema and template model are shaped so
Claude (or an admin tool) can later ingest a spreadsheet and convert rows into
playbooks, task templates, anchor dates, offsets, owners and dependencies with
no schema change.

This document defines the **preferred spreadsheet format** so those future
sheets are import-ready today.

## Recommended layout

One row per **task template**. Playbooks are derived from the `playbook`
column (grouping), so a single sheet can define many playbooks.

### Columns

| Column | Required | Maps to | Notes |
| --- | --- | --- | --- |
| `playbook` | ✓ | `opening_playbooks.name` | Groups rows into a playbook. New names create a playbook. |
| `playbook_role_key` | | `opening_playbooks.role_key` | e.g. `general_manager`. Same value may repeat on every row of the playbook. |
| `playbook_department_key` | | `opening_playbooks.department_key` | e.g. `it`, `marketing`. |
| `task_title` | ✓ | `opening_task_templates.title` | The task. |
| `task_description` | | `opening_task_templates.description` | |
| `anchor_type` | ✓ | `opening_task_templates.anchor_type` | One of `opening_date`, `handover_date`, `soft_opening_date`, `fixed_date`. |
| `offset_days` | ✓ | `opening_task_templates.offset_days` | Integer. **Negative = before anchor, positive = after.** |
| `owner_role` | | `opening_task_templates.default_owner_role` | Free text, e.g. `General Manager`. |
| `required` | | `opening_task_templates.required` | `TRUE`/`FALSE` (or `yes`/`no`, `1`/`0`). |
| `sequence` | | `opening_task_templates.sequence` | Integer order within the playbook. Defaults to row order. |
| `depends_on` | | `opening_task_templates.dependency_template_id` | The `task_title` of another task in the **same playbook** it depends on. Resolved to an id at import. |

### Conventions

- **Offsets** follow the same rule as the app: negative days are *before* the
  anchor, positive are *after*. Write `-14`, not `14 before`.
- **Anchor phrases** in existing sheets should be normalised to the four
  `anchor_type` values. Suggested mapping for the importer:
  - "before opening" / "opening" → `opening_date`
  - "after handover" / "handover" / "possession" → `handover_date`
  - "soft open" / "friends & family" → `soft_opening_date`
  - a literal calendar date with no anchor → `fixed_date` (the date is entered
    per-site later; templates stay reusable).
- **One playbook per role or department.** Suggested starter set (already
  seeded): Regional, General Manager, Chef, Beverage Manager, IT, Marketing,
  Finance, Training.
- **Dependencies** stay within a playbook in this format. Cross-playbook
  dependencies are out of scope for the first import.

### Example rows

| playbook | task_title | anchor_type | offset_days | owner_role | required | depends_on |
| --- | --- | --- | --- | --- | --- | --- |
| General Manager Playbook | GM confirmed and in place | opening_date | -30 | General Manager | TRUE | |
| General Manager Playbook | Management team hired | opening_date | -21 | General Manager | TRUE | GM confirmed and in place |
| Chef Playbook | Initial food order placed | handover_date | -5 | Head Chef | TRUE | |
| IT Playbook | POS installed and configured | handover_date | 3 | IT | TRUE | Network and internet provisioned |

## Import behaviour (when built)

1. Parse rows; group by `playbook`.
2. Upsert playbooks by name; upsert templates by (`playbook`, `task_title`) so
   re-importing an updated sheet is safe and idempotent.
3. Resolve `depends_on` titles to template ids within each playbook.
4. Report created/updated/skipped counts and any unresolved anchors or
   dependencies for review — never silently drop a row.

Import writes only to `opening_playbooks` and `opening_task_templates` (the
reusable library). It never touches a specific site's generated tasks; those
still come from adding a playbook to an opening (see `TASK_GENERATION.md`).

## What the importer must NOT do

- Do not import **people** — assignment to a specific employee stays with
  People Center; sheets carry an `owner_role`, not a named person.
- Do not import **construction** tasks — those are out of scope.
- Do not create per-site dates in templates — templates are reusable; site
  dates come from each opening's anchor dates.
