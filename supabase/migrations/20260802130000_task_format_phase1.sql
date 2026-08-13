-- Menu Center task format, Phase 1 (docs/MENU_CENTER_TASK_FORMAT_PROPOSAL.md).
--
-- Surfaces category sections on the task board and introduces fractional
-- ordering so tasks can be reordered within a section without renumbering
-- their neighbours. Additive and idempotent, like every migration here.

alter table opening_tasks
  add column if not exists category text,
  add column if not exists sort_order double precision;

alter table opening_task_templates
  add column if not exists sort_order double precision;

-- Existing rows order exactly as before: seed sort_order from sequence.
update opening_task_templates set sort_order = sequence where sort_order is null;
update opening_tasks set sort_order = sequence where sort_order is null;

-- Already-generated tasks inherit their template's category so live sites
-- get sections immediately, not just newly generated ones.
update opening_tasks t
set category = tt.category
from opening_task_templates tt
where t.task_template_id = tt.id
  and t.category is null
  and tt.category is not null;

create index if not exists opening_tasks_site_sort_idx
  on opening_tasks (opening_site_id, sort_order);
