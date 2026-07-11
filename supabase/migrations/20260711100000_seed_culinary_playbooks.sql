-- ============================================================================
-- Migration: seed_culinary_playbooks (London 2 accountabilities) - DO block
-- Culinary Leadership, Chef (CDC + BOH areas), and Purchasing playbooks.
-- Apply to the CGOPS project. Reusable relative offsets; idempotent.
-- ============================================================================
do $seed$
declare pb uuid;
begin
  alter table public.opening_task_templates add column if not exists category text;


  -- Culinary Leadership Playbook : 55 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Culinary Leadership Playbook', 'culinary_leadership', 'kitchen', 'Pre-opening accountabilities for the Director of Culinary Development (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Culinary Leadership Playbook');
  select id into pb from public.opening_playbooks where name = 'Culinary Leadership Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Evaluate the kitchen space and ensure it is adequate', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 0, true),
    (pb, 'Expo clearance', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 1, true),
    (pb, 'All equipment in place', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 2, true),
    (pb, 'All storage areas included', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 3, true),
    (pb, 'Custom stainless detailed', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 4, true),
    (pb, 'Diversey specs for dishwasher', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 5, true),
    (pb, 'Hoods/Fire suppression by GC', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 6, true),
    (pb, 'AC', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 7, true),
    (pb, 'Separate shut of for prep hood', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 8, true),
    (pb, 'Itemized list organized with ktichen CAD consultant', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 9, true),
    (pb, 'Consider all elevations', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 10, true),
    (pb, 'Point of cennections organized with ktichen CAD consultant', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 11, true),
    (pb, 'Specify KDS locations', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 12, true),
    (pb, 'Tickner order organized', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 13, true),
    (pb, 'Sign offs/approvals', null, 'Kitchen Design', 'opening_date', -60, 'the Director of Culinary Development', false, 14, true),
    (pb, 'Review quotes against the previous locations actual orders', null, 'Smallwares', 'opening_date', -30, 'the Director of Culinary Development', false, 15, true),
    (pb, 'Adjust for current business needs', null, 'Smallwares', 'opening_date', -30, 'the Director of Culinary Development', false, 16, true),
    (pb, 'Sign offs/approvals', null, 'Smallwares', 'opening_date', -30, 'the Director of Culinary Development', false, 17, true),
    (pb, 'Tap Phong Order', null, 'Smallwares', 'opening_date', -30, 'the Director of Culinary Development', false, 18, true),
    (pb, 'Boards (IW Design)', null, 'Smallwares', 'opening_date', -30, 'the Director of Culinary Development', false, 19, true),
    (pb, 'POSRG Order', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 20, true),
    (pb, 'QSR Install (Install on SW2/dataset from most recent location)', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 21, true),
    (pb, 'OC5 Install', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 22, true),
    (pb, 'Export from Enterprise to new location', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 23, true),
    (pb, 'EDI Imports Set Up', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 24, true),
    (pb, 'OC Mobile Set up', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 25, true),
    (pb, 'Check Inventory Sheets', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 26, true),
    (pb, 'POS Sales utility set up', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 27, true),
    (pb, 'Set up Tablets for prep/OC mobile', null, 'IT', 'handover_date', 3, 'the Director of Culinary Development', false, 28, true),
    (pb, 'Attend construction meetings', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 29, true),
    (pb, 'Ensure all equipment is placed properly', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 30, true),
    (pb, 'Check for restraints', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 31, true),
    (pb, 'Check outlets', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 32, true),
    (pb, 'Ensure KDS is installed properly', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 33, true),
    (pb, 'Hood operation', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 34, true),
    (pb, 'Dish/Chemical install is done to spec', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 35, true),
    (pb, 'Paper towel and soap locations', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 36, true),
    (pb, 'Test online ordering', null, 'On site', 'handover_date', 2, 'the Director of Culinary Development', false, 37, true),
    (pb, 'Garnish Chart', null, 'Printed Materials (M and T)', 'opening_date', -14, 'the Director of Culinary Development', false, 38, true),
    (pb, 'Allergy Chart', null, 'Printed Materials (M and T)', 'opening_date', -14, 'the Director of Culinary Development', false, 39, true),
    (pb, 'Bottle Lids', null, 'Printed Materials (M and T)', 'opening_date', -14, 'the Director of Culinary Development', false, 40, true),
    (pb, 'Takeout jar lables are ordered (Marketing)', null, 'Printed Materials (M and T)', 'opening_date', -14, 'the Director of Culinary Development', false, 41, true),
    (pb, 'Hire Chef Team', null, 'Printed Materials (M and T)', 'opening_date', -14, 'the Director of Culinary Development', false, 42, true),
    (pb, 'Review the to do list', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 43, true),
    (pb, 'Provide resources', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 44, true),
    (pb, 'Training', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 45, true),
    (pb, 'Support job fair', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 46, true),
    (pb, 'Ensure all items on the CDC checklist are complete', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 47, true),
    (pb, 'Approve training schedules', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 48, true),
    (pb, 'Approve opening week schedules', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 49, true),
    (pb, 'Oversee Kitchen Set Up', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 50, true),
    (pb, 'Support Training', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 51, true),
    (pb, 'Dry Run Menus', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 52, true),
    (pb, 'Opening Party Menus', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 53, true),
    (pb, 'Brunch rollout plan', null, 'CDC Support', 'opening_date', -12, 'the Director of Culinary Development', false, 54, true);

  -- Chef Playbook : 61 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Chef Playbook', 'chef', 'kitchen', 'Pre-opening accountabilities for the Chef (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Chef Playbook');
  select id into pb from public.opening_playbooks where name = 'Chef Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'First Aid', null, 'Order/Shop', 'opening_date', -14, 'the Chef', false, 0, true),
    (pb, 'Plastic wrapper holder (Issac)', null, 'Order/Shop', 'opening_date', -14, 'the Chef', false, 1, true),
    (pb, 'Nella Knives/Ship Date', null, 'Order/Shop', 'opening_date', -14, 'the Chef', false, 2, true),
    (pb, 'Linen/Ship Date', null, 'Order/Shop', 'opening_date', -14, 'the Chef', false, 3, true),
    (pb, 'Cake Pans 9x12, 4ea', null, 'Order/Shop', 'opening_date', -14, 'the Chef', false, 4, true),
    (pb, 'Green Tape (Dollar Store)', null, 'Order/Shop', 'opening_date', -14, 'the Chef', false, 5, true),
    (pb, 'Determine Staff Needs', null, 'Culinary HR', 'opening_date', -28, 'the Chef', false, 6, true),
    (pb, 'Food Safety Training Set', null, 'Hiring', 'opening_date', -28, 'the Chef', false, 7, true),
    (pb, 'WHIMIS Set', null, 'Hiring', 'opening_date', -28, 'the Chef', false, 8, true),
    (pb, 'Review Setup Plans with Exec Chefs', null, 'Hiring', 'opening_date', -28, 'the Chef', false, 9, true),
    (pb, 'Receiving/Storage plan', null, 'Hiring', 'opening_date', -28, 'the Chef', false, 10, true),
    (pb, 'Memo Boards/Postings/Clipboards', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 11, true),
    (pb, 'Push Set Up', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 12, true),
    (pb, 'Schedule Template', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 13, true),
    (pb, 'Training Schedule', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 14, true),
    (pb, 'Week 1 Opening Schedule', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 15, true),
    (pb, 'Journal', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 16, true),
    (pb, 'Office Supplies Setup', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 17, true),
    (pb, 'Tablets Set Up', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 18, true),
    (pb, 'Whiteboards Made', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 19, true),
    (pb, 'Roster', null, 'Staff/Support', 'opening_date', -21, 'the Chef', false, 20, true),
    (pb, 'Cork board', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 21, true),
    (pb, 'Clip boards x 15', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 22, true),
    (pb, 'Clip boards Labeled / Content Printed', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 23, true),
    (pb, 'All Line Stations x 6', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 24, true),
    (pb, '(Station and cleaning lists)', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 25, true),
    (pb, 'Closing List', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 26, true),
    (pb, 'Ordering', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 27, true),
    (pb, 'Temp Log', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 28, true),
    (pb, 'Labour Tool', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 29, true),
    (pb, 'Line Checks', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 30, true),
    (pb, 'Transfer', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 31, true),
    (pb, 'Waste Sheets', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 32, true),
    (pb, 'Chef Shift Sheet', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 33, true),
    (pb, 'Print other office resources', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 34, true),
    (pb, 'Chef''s List of Accountabilities', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 35, true),
    (pb, 'R and M Contacts', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 36, true),
    (pb, 'Phone lists (staff/suppliers)', null, 'Food Cost', 'opening_date', -10, 'the Chef', false, 37, true),
    (pb, 'Prep Recipe Book', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 38, true),
    (pb, 'Line Prep Book', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 39, true),
    (pb, 'Menu Specs', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 40, true),
    (pb, 'Portion chart', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 41, true),
    (pb, 'Bowl Diagrams', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 42, true),
    (pb, 'Cheat Sheets', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 43, true),
    (pb, 'Laminated Materials Posted', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 44, true),
    (pb, 'Receiving Procedures', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 45, true),
    (pb, 'Uniform Specs', null, 'Menu Materials', 'opening_date', -14, 'the Chef', false, 46, true),
    (pb, 'Diversey', null, 'Obtain from Suppliers', 'opening_date', -14, 'the Chef', false, 47, true),
    (pb, 'Handwash', null, 'Obtain from Suppliers', 'opening_date', -14, 'the Chef', false, 48, true),
    (pb, 'Dish washing', null, 'Obtain from Suppliers', 'opening_date', -14, 'the Chef', false, 49, true),
    (pb, 'Fresh Start/Sysco', null, 'Obtain from Suppliers', 'opening_date', -14, 'the Chef', false, 50, true),
    (pb, 'Fridge Storage', null, 'Obtain from Suppliers', 'opening_date', -14, 'the Chef', false, 51, true),
    (pb, 'Produce Guide', null, 'Obtain from Suppliers', 'opening_date', -14, 'the Chef', false, 52, true),
    (pb, 'All Boards, Signs, Clipboards Installed', null, 'Pre-training Kitchen Set-up', 'handover_date', 2, 'the Chef', false, 53, true),
    (pb, 'Storage Areas Labelled', null, 'Pre-training Kitchen Set-up', 'handover_date', 2, 'the Chef', false, 54, true),
    (pb, 'Office Set Up', null, 'Pre-training Kitchen Set-up', 'handover_date', 2, 'the Chef', false, 55, true),
    (pb, 'Food Orders', null, 'Pre-training Kitchen Set-up', 'handover_date', 2, 'the Chef', false, 56, true),
    (pb, 'Opening Non-food/dry goods', null, 'Pre-training Kitchen Set-up', 'handover_date', 2, 'the Chef', false, 57, true),
    (pb, 'Training orders', null, 'Pre-training Kitchen Set-up', 'handover_date', 2, 'the Chef', false, 58, true),
    (pb, 'Dry-run/opening orders', null, 'Pre-training Kitchen Set-up', 'handover_date', 2, 'the Chef', false, 59, true),
    (pb, 'Set up and label all BOH areas', '- Staff Area  - Mop Closets  - Dry food Storage  - Chemical Storage  - Paper Storage  - Bar Storage  - Dish Area  - Prep Area  - Line  - Expo  - Take Out  - Coffee Station', 'Restaurant Set Up', 'handover_date', 2, 'the Chef', false, 60, true);

  -- Purchasing Playbook : 5 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Purchasing Playbook', 'purchasing', 'purchasing', 'Pre-opening accountabilities for the Director of Purchasing (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Purchasing Playbook');
  select id into pb from public.opening_playbooks where name = 'Purchasing Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Plastic Wrap Holders x 3', null, 'Purchasing', 'opening_date', -20, 'the Director of Purchasing', false, 0, true),
    (pb, 'Knife Service - (Chef to place 1st order)', null, 'Purchasing', 'opening_date', -20, 'the Director of Purchasing', false, 1, true),
    (pb, 'Canadian Linen - (Chef to place 1st order)', null, 'Purchasing', 'opening_date', -20, 'the Director of Purchasing', false, 2, true),
    (pb, 'Fresh Start - EDI', null, 'Purchasing', 'opening_date', -20, 'the Director of Purchasing', false, 3, true),
    (pb, 'Sysco - EDI', null, 'Purchasing', 'opening_date', -20, 'the Director of Purchasing', false, 4, true);

end
$seed$;
