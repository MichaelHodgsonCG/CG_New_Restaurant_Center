-- Named default owners on templates.
--
-- HQ playbooks (Regional, Culinary Leadership, …) are owned by the same
-- people on every opening, so the template Owner/Support fields become the
-- same hybrid as task rows: free-text role OR a linked person. Generation
-- copies the person link onto the task (assigned_person_id /
-- support_person_id), which beats role resolution — no per-site Team panel
-- step needed for HQ names. Site-specific roles (GM, Beverage Manager)
-- keep resolving through opening_site_roles. Additive and idempotent.

alter table opening_task_templates
  add column if not exists default_owner_person_id uuid,   -- soft ref → people_center_people
  add column if not exists default_support_person_id uuid;
