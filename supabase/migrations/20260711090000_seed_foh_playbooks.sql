-- ============================================================================
-- Migration: seed_foh_playbooks  (single DO block - Supabase SQL-editor safe)
-- Populate opening playbooks + task templates from the operational Excel
-- checklists + BT Richmond Hill training schedule. Apply to the CGOPS project.
-- Wrapped in one DO $seed$ ... $seed$ block so the SQL editor treats it as a
-- single opaque statement (its client-side rewriter mangles (VALUES) AS v).
-- Reusable relative offsets (negative=before anchor, positive=after). Sub-items
-- folded into description. Idempotent: replaces templates for these playbooks.
-- ============================================================================
do $seed$
declare pb uuid;
begin
  alter table public.opening_task_templates add column if not exists category text;


  -- General Manager Playbook : 84 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'General Manager Playbook', 'general_manager', 'management', 'Pre-opening accountabilities for the General Manager role (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'General Manager Playbook');
  select id into pb from public.opening_playbooks where name = 'General Manager Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Review hiring needs with ROL and Ops', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 0, true),
    (pb, 'Meet with and confirm any potential TM Transfers', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 1, true),
    (pb, 'Review job fair plan (layout, interview structure/questions)', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 2, true),
    (pb, 'Final interview on all FOH TM''s', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 3, true),
    (pb, 'During interviews, complete shared staffing doc to collect TM info, organize hires and make as many notes as possible', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 4, true),
    (pb, 'Updated shared staffing doc is shared with with management team, ROL and ops team at the end of each day', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 5, true),
    (pb, 'Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 6, true),
    (pb, 'Identify key certifications: First Aid, JHSC', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 7, true),
    (pb, 'Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 8, true),
    (pb, 'All postions are hired by end of Job Fair Week', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 9, true),
    (pb, 'Any candidates that were not informed with a yes or no during job fair must be e-mailed with final decision', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 10, true),
    (pb, 'Collect and prepare TM information for TM Emailers and share with Megan (e-mail)', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 11, true),
    (pb, 'Collect and prepare TM information for Push invites and share with SM (name, email, role, wage if above min)', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 12, true),
    (pb, 'Follow up to verify ALL TM information is entered into Push', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 13, true),
    (pb, 'Send Q and A e-mail with FAQ (see template)', null, 'Hiring', 'opening_date', -28, 'General Manager', false, 14, true),
    (pb, 'Always on the hunt for MOTs all throughout the opening', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 15, true),
    (pb, 'Set up spaces to receive items ie. Cupboard for marketing/beverage items, a space in the dining room for glassware etc...', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 16, true),
    (pb, 'Follow up with labelling and storage areas (expo, take out area, pod, behind bar etc...) for approval', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 17, true),
    (pb, 'Install communication boards where needed', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 18, true),
    (pb, 'Floor plans printed and laminated', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 19, true),
    (pb, 'FOH accountability checklist saved on desktop', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 20, true),
    (pb, 'Set up team share document with all hosts, dishwashers and line cooks (discuss tiers with chef)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 21, true),
    (pb, 'Set up business planning binder with ROL support (foh accoutability checklists, business plan, org chart)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 22, true),
    (pb, 'Follow up and assist BM, SM and GSM regarding their restaurant set up checklists', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 23, true),
    (pb, 'Order paper: harvey at directlinesupplies.com', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 24, true),
    (pb, 'Set up bookmarks on Google Chrome for all team sessions', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 25, true),
    (pb, 'JHSC board set up, see Axonify for required documents (green book given by HQ) (certified TMs determined at job fair)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 26, true),
    (pb, 'Program lighting schedule', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 27, true),
    (pb, 'FOH accountabilities completed and posted, BOH accountabilities completed and posted', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 28, true),
    (pb, 'Follow up with binder set up (host binder, bar bible, incident report binder)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 29, true),
    (pb, 'Follow up on duties being completed/accurate and posted (BOH, host, server, bar)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', false, 30, true),
    (pb, 'Study in detail all facets of training to understand schedule and who will be leading which seminars', null, 'Training', 'opening_date', -12, 'General Manager', false, 31, true),
    (pb, 'Prepare self and managers for training and seminars', null, 'Training', 'opening_date', -12, 'General Manager', false, 32, true),
    (pb, 'GM leads orientation and needs to prepare accordingly. Ops supports in execution.', null, 'Training', 'opening_date', -12, 'General Manager', false, 33, true),
    (pb, 'Review Axonify completion for all FOH and BOH', null, 'Training', 'opening_date', -12, 'General Manager', false, 34, true),
    (pb, 'Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out', null, 'Training', 'opening_date', -12, 'General Manager', false, 35, true),
    (pb, 'Prepares relative MOTs in advance for sharing each day', null, 'Training', 'opening_date', -12, 'General Manager', false, 36, true),
    (pb, 'Prepares a value recognition piece for each day - 1 recognition/value throughout each training day', null, 'Training', 'opening_date', -12, 'General Manager', false, 37, true),
    (pb, 'Work with Ops team to prepare for dry runs (server and manager section plotting, menus, tip out, reads, duties)', null, 'Dry Runs', 'opening_date', -3, 'General Manager', false, 38, true),
    (pb, 'Work with BM/SM/GSM to schedule appropriate staffing levels', null, 'Dry Runs', 'opening_date', -3, 'General Manager', false, 39, true),
    (pb, 'Assist in filling Dry Run Services to par levels set by Ops', null, 'Dry Runs', 'opening_date', -3, 'General Manager', false, 40, true),
    (pb, 'Hold Pre and Post-Shift mtgs with all TMs and Ops for each Dry Run service period - notes prepared in advance', null, 'Dry Runs', 'opening_date', -3, 'General Manager', false, 41, true),
    (pb, 'Oversee dry run service of the host and serving teams', null, 'Dry Runs', 'opening_date', -3, 'General Manager', false, 42, true),
    (pb, 'Closely watch TMs and Managers in their roles to coach and follow up concerns as needed', null, 'Dry Runs', 'opening_date', -3, 'General Manager', false, 43, true),
    (pb, 'Make notes of strengths and weaknesses throughout services and communicate with managers and ops', null, 'Dry Runs', 'opening_date', -3, 'General Manager', false, 44, true),
    (pb, 'Plan opening FOH uniform order with Shanna', null, 'Uniforms', 'opening_date', -10, 'General Manager', false, 45, true),
    (pb, 'All uniforms are organized and stored, prepared for 1st uniform inventory', null, 'Uniforms', 'opening_date', -10, 'General Manager', false, 46, true),
    (pb, 'All uniforms handed out are accompanied by a signed deduction form', null, 'Uniforms', 'opening_date', -10, 'General Manager', false, 47, true),
    (pb, 'Support SM with employee names on each deduction form and submission to GA', null, 'Uniforms', 'opening_date', -10, 'General Manager', false, 48, true),
    (pb, 'Teach and uphold standards and coaches ''best look''', null, 'Uniforms', 'opening_date', -10, 'General Manager', false, 49, true),
    (pb, 'Keep alarm code list updated as management team changes in future and save master file', null, 'Security', 'opening_date', 0, 'General Manager', false, 50, true),
    (pb, 'Management Keys, hand out and maintain list of current key holders', null, 'Security', 'opening_date', 0, 'General Manager', false, 51, true),
    (pb, 'Ensure WSIB log in info is accessible to all Managers and knowledge of what to do in case of an an injury is understood (72-hour rule)', null, 'Manage WSIB', 'opening_date', 0, 'General Manager', false, 52, true),
    (pb, 'Set up account for window cleaners on monthly basis', null, 'Repairs and Maintenance', 'opening_date', 0, 'General Manager', false, 53, true),
    (pb, 'Print trade list provided by Director of Construction for all warranty repairs', null, 'Repairs and Maintenance', 'opening_date', 0, 'General Manager', false, 54, true),
    (pb, 'Research Night Cleaning companies, and submit costs to ROL', null, 'Repairs and Maintenance', 'opening_date', 0, 'General Manager', false, 55, true),
    (pb, 'All areas of restaurant, clean and in excellent condition pre-open', null, 'Repairs and Maintenance', 'opening_date', 0, 'General Manager', false, 56, true),
    (pb, 'All Managers attend POS training with Silverware', null, 'Silverware', 'handover_date', 3, 'General Manager', false, 57, true),
    (pb, 'Go through all menu items to ensure they are 100 percent correct to Silverware', null, 'Silverware', 'handover_date', 3, 'General Manager', false, 58, true),
    (pb, 'Clover', null, 'Silverware', 'handover_date', 3, 'General Manager', false, 59, true),
    (pb, 'Test all Clover devices with all payment forms before VIP Party', null, 'Silverware', 'handover_date', 3, 'General Manager', false, 60, true),
    (pb, 'One clover device that is ''fully licensed'' marked as Host terminal', null, 'Silverware', 'handover_date', 3, 'General Manager', false, 61, true),
    (pb, 'Label all Clover devices with numerical device number and note if pay station is enabled', null, 'Silverware', 'handover_date', 3, 'General Manager', false, 62, true),
    (pb, 'All Managers complete system training with Open Table', null, 'Open Table', 'opening_date', 0, 'General Manager', false, 63, true),
    (pb, 'Set overbooking code and only share w/ Mgmt', null, 'Open Table', 'opening_date', 0, 'General Manager', false, 64, true),
    (pb, 'Work with GSM to curate list of businesses to visit for Bottle Drops', null, 'LSM/Bottle Drops', 'opening_date', 0, 'General Manager', false, 65, true),
    (pb, 'Scheduling plan in place to execute Bottle Drops', null, 'LSM/Bottle Drops', 'opening_date', 0, 'General Manager', false, 66, true),
    (pb, 'Works with ROL to curate list of local NB''s to invite to VIP Party', null, 'LSM/Bottle Drops', 'opening_date', 0, 'General Manager', false, 67, true),
    (pb, 'Set up and organize office - labelling wherever possible.', null, 'Office', 'opening_date', 0, 'General Manager', false, 68, true),
    (pb, 'Acquire extra shelving and hooks where needed (consult DOC before any purchases)', null, 'Office', 'opening_date', 0, 'General Manager', false, 69, true),
    (pb, 'Assist with hanging coat hooks, bulletin boards, clipboards, invoice boxes etc.', null, 'Office', 'opening_date', 0, 'General Manager', false, 70, true),
    (pb, 'Accounting CCS set up on desktop', null, 'Accounting', 'opening_date', 0, 'General Manager', false, 71, true),
    (pb, 'Cash Requests submitted with DOC and picked up at bank picked up or delivered', null, 'Accounting', 'opening_date', 0, 'General Manager', false, 72, true),
    (pb, 'Tills + Petty Cash set and labelled', null, 'Accounting', 'opening_date', 0, 'General Manager', false, 73, true),
    (pb, 'Weekly check ins with all Managers. Follow up on their pre-open checklists, what they still need to do', null, 'Weekly Check Ins', 'opening_date', 0, 'General Manager', false, 74, true),
    (pb, 'Review all FOH schedules prior to posting to ensure correct amount of TMs, no overs/thrus/splits, no staggared starts', null, 'Weekly Check Ins', 'opening_date', 0, 'General Manager', false, 75, true),
    (pb, 'Teach and uphold standards', null, 'Uniforms in Action', 'opening_date', -10, 'General Manager', false, 76, true),
    (pb, 'Coaches '' best look'' and full tools', null, 'Uniforms in Action', 'opening_date', -10, 'General Manager', false, 77, true),
    (pb, 'Review support schedule', null, 'Support Team', 'opening_date', 0, 'General Manager', false, 78, true),
    (pb, 'Check-in w/ Support TMs daily setting expectations and receiving feedback', null, 'Support Team', 'opening_date', 0, 'General Manager', false, 79, true),
    (pb, 'Review support feedback cards - address notes, needs and performance concerns quickly', null, 'Support Team', 'opening_date', 0, 'General Manager', false, 80, true),
    (pb, 'Ensure support TMs time clocks match schedule plan w/ weekly payroll processes during support period', null, 'Support Team', 'opening_date', 0, 'General Manager', false, 81, true),
    (pb, 'Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Support Team', 'opening_date', 0, 'General Manager', false, 82, true),
    (pb, 'Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Support Team', 'opening_date', 0, 'General Manager', false, 83, true);

  -- Beverage Manager Playbook : 61 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Beverage Manager Playbook', 'beverage_manager', 'bar', 'Pre-opening accountabilities for the Beverage Manager role (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Beverage Manager Playbook');
  select id into pb from public.opening_playbooks where name = 'Beverage Manager Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Participate in Job Fairs, completing 1st (pattern) or 2nd interviews', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', false, 0, true),
    (pb, 'Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', false, 1, true),
    (pb, 'Identify key certifications: First Aid, JHSC', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', false, 2, true),
    (pb, 'Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', false, 3, true),
    (pb, 'Complete reference checks for all FOH applicants', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', false, 4, true),
    (pb, 'Bar binder with recipes and specs assembled', null, 'Checklists and Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', false, 5, true),
    (pb, 'Service incident report binder assembled, current ID verification booklet obtained', null, 'Checklists and Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', false, 6, true),
    (pb, 'Complete audit of duties and checklists to ensure they are specific for your location', '- Bartender: Opening and Closing duties  - Train The Trainer (TTT) document created for all cocktails/ mocktails/ pouring techniques  - Bartender accountabilities template established for training  - FOTW bartender document assembled  - Stocking lists/pars', 'Checklists and Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', false, 7, true),
    (pb, 'Determine all local channels and post at AV cabinet', null, 'Checklists and Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', false, 8, true),
    (pb, 'All invoices are entered into OC - Have you entered every type of invoice at this point TBS LCBO', null, 'Beverage Inventory and Invoices', 'opening_date', -3, 'Beverage Manager', false, 9, true),
    (pb, 'Organize all orders when receiving and use photos from other restaurants to duplicate organization', null, 'Beverage Inventory and Invoices', 'opening_date', -3, 'Beverage Manager', false, 10, true),
    (pb, 'First inventory is completed day before opening to public', null, 'Beverage Inventory and Invoices', 'opening_date', -3, 'Beverage Manager', false, 11, true),
    (pb, 'Review manual calculation of COGs (opening + purchase - closing / sales)', null, 'Beverage Inventory and Invoices', 'opening_date', -3, 'Beverage Manager', false, 12, true),
    (pb, 'Review Group Totals, idenifty ideal vs actual and on hand inventory ( )', null, 'Beverage Inventory and Invoices', 'opening_date', -3, 'Beverage Manager', false, 13, true),
    (pb, 'Inventory accuracy importance before open', null, 'Beverage Inventory and Invoices', 'opening_date', -3, 'Beverage Manager', false, 14, true),
    (pb, 'Beverage Playbook is accesible via Axonify', null, 'Beverage Playbook and Specs', 'opening_date', -10, 'Beverage Manager', false, 15, true),
    (pb, 'All Bev Specs and standards are reviewed and tests passed to 100 percent', null, 'Beverage Playbook and Specs', 'opening_date', -10, 'Beverage Manager', false, 16, true),
    (pb, 'Untapped downloaded and store account accesible', null, 'Beverage Playbook and Specs', 'opening_date', -10, 'Beverage Manager', false, 17, true),
    (pb, 'Organize OC inventory pages Costumize Sort vs. Countsheet Setup vs. Manage Locations', null, 'Storage and Organization', 'handover_date', 2, 'Beverage Manager', false, 18, true),
    (pb, 'Set up bar and storage areas to the highest standard including labelling/maps:', '- Includes all shelving, bar fridges, coolers, keg fridge and storage areas  - Spirits in back bar/ storage areas organized via category  - Beer Wall (display and behind bar) stocked alphbetaically  - Bar top and Bar expo areas.  - POD organization: Empties Return, rotational vs. static glassware, coasters, bar smallwares  - Identify ''key hires'' to assist with this  - Cocktail Cheat Sheet and Garnish chart laminated and posted by service  - Keg Fridge Cleanliness Checklist laminated and posted  - Beer Clean Glassware Laminated and posted  - How to use a Coupler laminated and posted  - Types of Couplers Laminted and posted  - Draught Beer list laminted and posted in draught beer fridge  - Proper Keg Fridge Storage laminated and posted  - Chalkboards filled out neatly behind bar and around restaurants  - Photos should be taken and shared of any area/bar top to train and re-inforce standards', 'Storage and Organization', 'handover_date', 2, 'Beverage Manager', false, 19, true),
    (pb, 'Assist in execution of beverage seminars', null, 'Beverage and Bartender Training', 'opening_date', -12, 'Beverage Manager', false, 20, true),
    (pb, 'Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out', null, 'Beverage and Bartender Training', 'opening_date', -12, 'Beverage Manager', false, 21, true),
    (pb, 'Activate utilization of TTT document for bartenders, managers, and supervisors in training', null, 'Beverage and Bartender Training', 'opening_date', -12, 'Beverage Manager', false, 22, true),
    (pb, 'Assess ongoing Axonify completion for bartenders and supervisors', null, 'Beverage and Bartender Training', 'opening_date', -12, 'Beverage Manager', false, 23, true),
    (pb, 'Organize Bar Information board with rotational pours and important information', null, 'Beverage and Bartender Training', 'opening_date', -12, 'Beverage Manager', false, 24, true),
    (pb, 'Initial orders for all Beer Suppliers, LCBO and Beer Store to hold onto until liquor license is official', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', false, 25, true),
    (pb, 'Plan triple and quadruple deck for rotational pours (minumum 60L per line)', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', false, 26, true),
    (pb, 'Rotational planning completed after on deck supplied by Ops', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', false, 27, true),
    (pb, 'Do you have 0 percent drink stickers', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', false, 28, true),
    (pb, 'All VIP and Dry Run needs ordered: minerals, juices, bar condiments, garnishes (Fresh Start and Sysco)', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', false, 29, true),
    (pb, 'Review bar smallwares, identify any under or over ordered items', '- Including but not limited to: jiggers, shakers, spoons, sifters, muddler, ice scoops, bar spouts, rimmers, mandalin, etc.', 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', false, 30, true),
    (pb, 'Set-up and organize all equipment - for use /storage', null, 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', false, 31, true),
    (pb, 'Stamp all 6 pack carriers and Growler tags', null, 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', false, 32, true),
    (pb, 'Growler display organized and par level curated', null, 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', false, 33, true),
    (pb, 'Create bartender schedules following GM notes', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 34, true),
    (pb, 'Ensure bartender availability in PUSH reflects the TM application', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 35, true),
    (pb, 'Ensure Silverware is programmed properly', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 36, true),
    (pb, 'All beverage items accounted for', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 37, true),
    (pb, 'Remove extra buttons or items (via Admin Silverware)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 38, true),
    (pb, 'All pricing correct (cross reference beer maps)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 39, true),
    (pb, 'All orders print to the correct area (QSR testing)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 40, true),
    (pb, 'All costs report to proper area on sales breakdowns', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 41, true),
    (pb, 'Easily navigated (i.e. Alphabetical Order and Rotational Line )', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 42, true),
    (pb, 'You are responsible for managing the ''Glassware'' ''line'' on the P and L', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 43, true),
    (pb, 'Order well in advance to ensure delivery (2 weeks)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 44, true),
    (pb, 'Items are stored in a neat, clean and orderly fashion', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 45, true),
    (pb, 'We have appropriate levels of stock of both Glassware and Coasters for all beers', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 46, true),
    (pb, 'Weekly glassware and inventory sheets/ par levels are set up', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 47, true),
    (pb, 'You are aware of your budget', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 48, true),
    (pb, 'You will be 100 percent stocked, 100 percent of the time.', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', false, 49, true),
    (pb, 'Order guides are printed and laminated for all bev purchasing (wine, LCBO, TBS, static bottles and cans)', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', false, 50, true),
    (pb, 'Sysco order guide assemble that is sequetial with storage areas', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', false, 51, true),
    (pb, 'Created a Favourites template on Beer4Buisness by first week open', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', false, 52, true),
    (pb, 'Create a Beverage Receiving log (includes delivery schedule)', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', false, 53, true),
    (pb, 'Login Credentials', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', false, 54, true),
    (pb, 'TBS, LCBO, Silverware, OC, Untapped', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', false, 55, true),
    (pb, 'All login credentials and invoicing should be sent to the general e-mail', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', false, 56, true),
    (pb, 'Teach and uphold standards and coaches ''best look''', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', false, 57, true),
    (pb, 'All uniforms handed out are accompanied by a signed deduction form', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', false, 58, true),
    (pb, 'Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', false, 59, true),
    (pb, 'Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', false, 60, true);

  -- Service Manager Playbook : 44 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Service Manager Playbook', 'service_manager', 'front_of_house', 'Pre-opening accountabilities for the Service Manager role (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Service Manager Playbook');
  select id into pb from public.opening_playbooks where name = 'Service Manager Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Participate in Job Fairs, completing 1st or 2nd interviews', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 0, true),
    (pb, 'Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 1, true),
    (pb, 'Identify key certifications: First Aid, JHSC', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 2, true),
    (pb, 'Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 3, true),
    (pb, 'Send invites to Push for all hired TMs', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 4, true),
    (pb, 'Ensure TMs complete their Push profiles accurately and activate them for 2 days before their first shift', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 5, true),
    (pb, 'Upload TM docs to Push profiles (application, pattern interview, reference checks, onboarding checklist)', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 6, true),
    (pb, 'Load Insanely Great Discount Cards', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 7, true),
    (pb, 'Approve all FOH availabilities entered in Push (must match application )', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 8, true),
    (pb, 'After orientation, all uniform deduction forms have completed employee numbers and e-mailed to GA', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', false, 9, true),
    (pb, 'Compile Server and Bartender info for Silverware database list. Ensure accuracy. Send to Chelsey.', null, 'TMs in Silverware', 'handover_date', 3, 'Service Manager', false, 10, true),
    (pb, 'Should a TM be hired after the Silverware data dump, you will enter them into Silverware manually', null, 'TMs in Silverware', 'handover_date', 3, 'Service Manager', false, 11, true),
    (pb, 'Identify key TMs to help stock and set up dining room', '- Salt, pepper, vinegar, oil all filled  - Cutlery polished and rolled  - Side plates polished  - Butcher paper cut, side plates/fry cups/burger trays lined  - Sticker bill clipboards and stuff bill clipboards (postcard, comment card)  - Rubber feet on cubes', 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 12, true),
    (pb, 'Determine location for Push tablet and set up Push tablet', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 13, true),
    (pb, 'Set up side stands, determine location for dessert menus, billing supplies, create and laminate side stand map', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 14, true),
    (pb, 'Determine location for sani buckets and cloths (in-use and back up)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 15, true),
    (pb, 'Determine location for back up straws', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 16, true),
    (pb, 'Set up FOH documents, Determine location for section boards, side duty/running duties, FOTW, pre shift notes)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 17, true),
    (pb, 'Post a copy of the floor plan at the out door for food running reference', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 18, true),
    (pb, 'Post Allergy and Nutritional Guide in Expo', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 19, true),
    (pb, 'Post Red Light/Green Light at/near drink expo', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 20, true),
    (pb, 'Determine location for pepper mills', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 21, true),
    (pb, 'Determine location for paper supplies (dinner napkins, receipt rolls, wax paper, back up take out supplies)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 22, true),
    (pb, 'Takeout supply area organized - stamps/ink pad and stickers, boxes hole punched, takeout sauce par list posted', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 23, true),
    (pb, 'When all homes are established and agreed upon label (consider taking photos also)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', false, 24, true),
    (pb, 'Complete audit of duties and checklists to ensure they are specific for your location', '- Server: Opening and Closing duties  - Server: Running Duties  - Server: Cleaning Schedule: Daily/Weekly/Monthly', 'Checklists and Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', false, 25, true),
    (pb, 'Set up FOTW chart with names for all FOH', null, 'Checklists and Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', false, 26, true),
    (pb, 'Prepare FOTW for first 8 weeks (print standards, fill out charts) - have posted for orientation', null, 'Checklists and Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', false, 27, true),
    (pb, 'Pre-shift notes completed for 4 weeks and on clipboard, include beverage tasting and notes', null, 'Checklists and Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', false, 28, true),
    (pb, 'Create necessary Shift Tags on Push for server schedule', null, 'Schedules', 'opening_date', 0, 'Service Manager', false, 29, true),
    (pb, 'Create necessary shift pre-sets on Push for server schedule', null, 'Schedules', 'opening_date', 0, 'Service Manager', false, 30, true),
    (pb, 'Enter server training schedules into Push', null, 'Schedules', 'opening_date', 0, 'Service Manager', false, 31, true),
    (pb, 'Create Server schedules following GM notes and par levels', null, 'Schedules', 'opening_date', 0, 'Service Manager', false, 32, true),
    (pb, 'Take the lead on the Steps of Service Seminar with support from Ops', null, 'Training', 'opening_date', -12, 'Service Manager', false, 33, true),
    (pb, 'Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out.', null, 'Training', 'opening_date', -12, 'Service Manager', false, 34, true),
    (pb, 'Review server Axonify completion', null, 'Training', 'opening_date', -12, 'Service Manager', false, 35, true),
    (pb, 'Teach and uphold uniform standards, coach best look', null, 'Training', 'opening_date', -12, 'Service Manager', false, 36, true),
    (pb, 'Identify key TMs to help stock and set up patio', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', false, 37, true),
    (pb, 'Assembly of tables (if applicable)', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', false, 38, true),
    (pb, 'Layout tables and chairs as per floorplan', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', false, 39, true),
    (pb, 'Assembly and organization of patio side stations', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', false, 40, true),
    (pb, 'Assembly of umbrellas and bases', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', false, 41, true),
    (pb, 'Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', false, 42, true),
    (pb, 'Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', false, 43, true);

  -- Guest Service Manager Playbook : 35 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Guest Service Manager Playbook', 'guest_service_manager', 'front_of_house', 'Pre-opening accountabilities for the Guest Service Manager role (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Guest Service Manager Playbook');
  select id into pb from public.opening_playbooks where name = 'Guest Service Manager Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Participate in Job Fairs, completing 1st and 2nd interviews.', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 0, true),
    (pb, 'Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 1, true),
    (pb, 'Identify key certifications: First Aid, JHSC', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 2, true),
    (pb, 'Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 3, true),
    (pb, 'Complete reference checks for all FOH applicants', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 4, true),
    (pb, 'Assist SM: Ensure TMs complete their Push profiles accurately and activate them for 2 days before their first shift', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 5, true),
    (pb, 'Assist SM: Upload TM docs to Push profiles (application, pattern interview, reference checks, onboarding checklist)', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 6, true),
    (pb, 'Assist SM: Load Insanely Great Discount Cards', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 7, true),
    (pb, 'Assist SM: Approve all FOH availabilities entered in Push (must match application )', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 8, true),
    (pb, 'Assist SM: Loading all Insanely Great Discount Cards', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', false, 9, true),
    (pb, 'Host binder set up', null, 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', false, 10, true),
    (pb, 'Determine location for back up crayons, high chairs, booster seats and high chair hammocks', null, 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', false, 11, true),
    (pb, 'Set up ''black box'' - laminated copies of job descriptions and uniform standards (5 of each)', null, 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', false, 12, true),
    (pb, 'Identify key TMs to help set up host stand', '- Bite Club display  - Bite Club/gift card storage  - Twine toilet paper  - Paper rolls  - Reserved signs  - Crayons and kids menus  - Set up writing utensils, stapler, scissors, tape  - Find storage area for lobby cleaning supplies, windex, sanitizer  - Assembly of dinner dinners, feature menus and dessert menus  - Business card display  - Organize menus within host stand', 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', false, 13, true),
    (pb, 'Complete audit of duties and checklists to ensure they are specific for your location', '- Host: Opening and Closing duties  - Host: Running Duties  - Host: Cleaning Schedule: Daily/Weekly/Monthly', 'Checklists and Documents for Host Portfolios', 'handover_date', 2, 'Guest Service Manager', false, 14, true),
    (pb, 'Assemble binder with local businesses and organize bottle drop schedule (assisting GM)', null, 'Miscellaneous Set Up', 'handover_date', 2, 'Guest Service Manager', false, 15, true),
    (pb, 'Assemble crash kit with checklist provided - store in office', null, 'Miscellaneous Set Up', 'handover_date', 2, 'Guest Service Manager', false, 16, true),
    (pb, 'Assemble MSDS binder, include sheets for all chemicals in house (inventory chemicals and print sheets from Diversey online)', null, 'Miscellaneous Set Up', 'handover_date', 2, 'Guest Service Manager', false, 17, true),
    (pb, 'All TMs added to Open Table for section assignment and reservation tracking', null, 'Open Table and Silverware', 'handover_date', 3, 'Guest Service Manager', false, 18, true),
    (pb, 'Host in Silverware for Take Out (4000) - test', null, 'Open Table and Silverware', 'handover_date', 3, 'Guest Service Manager', false, 19, true),
    (pb, 'Host in Silverware for open counts (3000) - test', null, 'Open Table and Silverware', 'handover_date', 3, 'Guest Service Manager', false, 20, true),
    (pb, 'Designated ''Full'' Clover labelled and present at Host desk', null, 'Open Table and Silverware', 'handover_date', 3, 'Guest Service Manager', false, 21, true),
    (pb, 'Create necessary shift tags on Push for host schedule', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', false, 22, true),
    (pb, 'Create necessary shift pre-sets on Push for host schedule', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', false, 23, true),
    (pb, 'Enter host training schedules into Push', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', false, 24, true),
    (pb, 'Create host schedules following GM notes and par levels', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', false, 25, true),
    (pb, 'Take the lead on the Host seminar with support from Ops', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 26, true),
    (pb, 'Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 27, true),
    (pb, 'Review host Axonify completion', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 28, true),
    (pb, 'Bite Club binder prepared and trained to hosts', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 29, true),
    (pb, 'Gift Card binder prepared and trained to hosts', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 30, true),
    (pb, 'Reservation programs - Open Table (all hosts trained and have certificate of completion)', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 31, true),
    (pb, 'Teach and uphold uniform standards, coach best look', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 32, true),
    (pb, 'Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 33, true),
    (pb, 'Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Training', 'opening_date', -12, 'Guest Service Manager', false, 34, true);

  -- Regional Playbook : 94 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Regional Playbook', 'regional_leader', 'operations', 'Pre-opening accountabilities for the Regional Operations Leader role (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Regional Playbook');
  select id into pb from public.opening_playbooks where name = 'Regional Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Arrange pre-open bootcamp and review agenda', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 0, true),
    (pb, 'Management team selection, offers, overseeing and following up on their training', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 1, true),
    (pb, 'Review projected staffing levels and make recommendations necessary', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 2, true),
    (pb, 'Find site for job fair', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 3, true),
    (pb, 'Organize hotels for support team', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 4, true),
    (pb, 'Review job fair plan and assist with execution', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 5, true),
    (pb, 'Participation in TM hiring, onboarding and training', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 6, true),
    (pb, 'Flag any potential supervisors with management team', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 7, true),
    (pb, 'Manager schedule completed for pre-open and assist with writing first period post-open', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 8, true),
    (pb, 'Review TM training outline with Megan and Shanna - make tweaks/advancements as needed since last open', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 9, true),
    (pb, 'Prepare manager bios w/ pic for TM emailers - send to Megan', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 10, true),
    (pb, 'Prepare Open Tables floor plan', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 11, true),
    (pb, 'Prepare special day for Dry Runs and VIP Party in Open Table', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 12, true),
    (pb, 'Set table combinations and pacing in Open Table', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 13, true),
    (pb, 'Ensure all managers complete pre-open checklists', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 14, true),
    (pb, 'Set floor management expectations for open - 100 percent table checks, mgmt sections 45 second greet, complaint handling', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 15, true),
    (pb, 'Review and approve first 8 FOTW standards that are selected by SM', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 16, true),
    (pb, 'Work w/ Megan to prepare support schedule - specific people set to 5 day periods of dedicated support', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 17, true),
    (pb, 'Co-host support team session w/ Megan for all supporting Managers/TMs - what to expect when you''re supporting', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', false, 18, true),
    (pb, 'Always on the hunt for MOTs throughout the entire opening process', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', false, 19, true),
    (pb, 'Participate in orientation and running seminars as assigned in training plan', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', false, 20, true),
    (pb, 'Review TM schedule for first few weeks (first 10 days no splits, no overs, no ''thrus''. FOH 10am and 4pm starts)', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', false, 21, true),
    (pb, 'Work w/ GM to complete post-open manager accountabilites', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', false, 22, true),
    (pb, 'Formulate the business planning binder w/ GM', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', false, 23, true),
    (pb, 'Manager Axonify completion', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', false, 24, true),
    (pb, 'Assist in filling Dry Run reso slots', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', false, 25, true),
    (pb, 'Follow-up with bev manager to ensure all bev product in house pre-open', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 26, true),
    (pb, 'Ensure all marketing materials in house (pre-dry runs)', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 27, true),
    (pb, 'Bite club cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 28, true),
    (pb, 'Bite club forms', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 29, true),
    (pb, 'Bite club/gift card display', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 30, true),
    (pb, 'Gift cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 31, true),
    (pb, 'Gift card sleeves', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 32, true),
    (pb, 'Group Scoop posters', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 33, true),
    (pb, 'Menus: dinner (and sleeves), features (and sleeves), dessert (and sleeves), dog menu', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 34, true),
    (pb, 'Post cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 35, true),
    (pb, 'Comment cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 36, true),
    (pb, 'Beer maps', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 37, true),
    (pb, 'Order business cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 38, true),
    (pb, 'Kids menus', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 39, true),
    (pb, 'No smoking signs', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 40, true),
    (pb, 'Dog sign on patio', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 41, true),
    (pb, 'Reserved signs', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 42, true),
    (pb, 'Sorry app cards (and filled out and ready for opening)', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 43, true),
    (pb, 'IGDC and sleeves', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 44, true),
    (pb, 'Silverware cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 45, true),
    (pb, 'Front door names and hours of ops', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 46, true),
    (pb, 'All chalkboards filled in pre-dry runs', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', false, 47, true),
    (pb, 'Community outreach with local arenas, hotels etc...', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', false, 48, true),
    (pb, 'Take the lead on guest invites and guest list mgmt for VIP Party', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', false, 49, true),
    (pb, 'Verify VIP Party charity is chosen and meets CG standards', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', false, 50, true),
    (pb, 'Bottle drop menus in-house', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', false, 51, true),
    (pb, 'Letter curated for bottle drops', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', false, 52, true),
    (pb, 'Review bottle drop plan with GM and GSM', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', false, 53, true),
    (pb, 'Cash order placed for pick up or for delivery by Brinks', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', false, 54, true),
    (pb, 'Provide manager photo IDs to GA''s for local TD bank', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', false, 55, true),
    (pb, 'Management keys divied up and numbers recorded', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', false, 56, true),
    (pb, 'Manager codes and special words provided to IDG for alarm system', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', false, 57, true),
    (pb, 'Open Table (test chit printer)', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 58, true),
    (pb, 'Push and Push Tablet', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 59, true),
    (pb, 'Silverware', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 60, true),
    (pb, 'Clover', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 61, true),
    (pb, 'OC', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 62, true),
    (pb, 'iPads/tablets', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 63, true),
    (pb, 'Phone Voicemail', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 64, true),
    (pb, 'Integrity Sessions', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 65, true),
    (pb, 'Axonify use/buy-in heading into regular operations - keep driving it to become habit', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', false, 66, true),
    (pb, 'A/V Equipment and Security', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', false, 67, true),
    (pb, 'Camera system and camera login', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', false, 68, true),
    (pb, 'Lighting', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', false, 69, true),
    (pb, 'Thermostats', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', false, 70, true),
    (pb, 'Reservation system and printer, phones', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', false, 71, true),
    (pb, 'POS and Clover', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', false, 72, true),
    (pb, 'Main water shut off', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', false, 73, true),
    (pb, 'Set up linked Push profiles for all support TMs', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', false, 74, true),
    (pb, 'Check-in w/ support TMs daily setting expectations and receiving feedback', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', false, 75, true),
    (pb, 'Review support feedback cards - address notes, needs and performance concerns quickly', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', false, 76, true),
    (pb, 'Coach support TMs as needed to advance their skills/impact as needed', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', false, 77, true),
    (pb, 'Now Open', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', false, 78, true),
    (pb, 'All postings on front door (hours of ops, GM and Chef names)', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', false, 79, true),
    (pb, 'Managing the buzz to standard (TVs, Lights, Music)', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', false, 80, true),
    (pb, 'Side Stands', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 81, true),
    (pb, 'Expos', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 82, true),
    (pb, 'Bar', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 83, true),
    (pb, 'Patio', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 84, true),
    (pb, 'Host Stand', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 85, true),
    (pb, 'Kitchen Line/Dish/Prep', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 86, true),
    (pb, 'Office', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 87, true),
    (pb, 'Exterior', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 88, true),
    (pb, 'Pod/Storage', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 89, true),
    (pb, 'Staff Washrooms/Staff Area', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 90, true),
    (pb, 'Guest Washrooms', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 91, true),
    (pb, 'Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 92, true),
    (pb, 'Provide your notes/thoughts/learnings in post mortem', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', false, 93, true);

  -- Training Playbook : 23 templates
  insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
  select 'Training Playbook', 'training', 'training', 'Pre-opening accountabilities for the Training role (imported from operational checklists).', 10
  where not exists (select 1 from public.opening_playbooks where name = 'Training Playbook');
  select id into pb from public.opening_playbooks where name = 'Training Playbook';
  delete from public.opening_task_templates where playbook_id = pb;
  insert into public.opening_task_templates
    (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
  values
    (pb, 'Orientation', null, 'Training', 'opening_date', -13, 'Training', false, 0, true),
    (pb, 'Mission Meeting', null, 'Training', 'opening_date', -13, 'Training', false, 1, true),
    (pb, 'Day in the Life', null, 'Training', 'opening_date', -12, 'Training', false, 2, true),
    (pb, 'Responsible Service', null, 'Training', 'opening_date', -11, 'Training', false, 3, true),
    (pb, 'SOS Seminar', null, 'Training', 'opening_date', -11, 'Training', false, 4, true),
    (pb, 'Host Seminar', null, 'Training', 'opening_date', -11, 'Training', false, 5, true),
    (pb, 'Bar Extended Day in Life', null, 'Training', 'opening_date', -9, 'Training', false, 6, true),
    (pb, 'Beverage Seminar', null, 'Training', 'opening_date', -9, 'Training', false, 7, true),
    (pb, 'BarCocktail Training - 5 Parts', null, 'Training', 'opening_date', -9, 'Training', false, 8, true),
    (pb, 'Beer Academy - 2 Parts', null, 'Training', 'opening_date', -9, 'Training', false, 9, true),
    (pb, 'Food Seminar - 2 parts', null, 'Training', 'opening_date', -9, 'Training', false, 10, true),
    (pb, 'SOS Test', null, 'Training', 'opening_date', -8, 'Training', false, 11, true),
    (pb, 'Host Test', null, 'Training', 'opening_date', -8, 'Training', false, 12, true),
    (pb, 'Beverage Test', null, 'Training', 'opening_date', -8, 'Training', false, 13, true),
    (pb, 'Beer Test', null, 'Training', 'opening_date', -8, 'Training', false, 14, true),
    (pb, 'Food Test', null, 'Training', 'opening_date', -8, 'Training', false, 15, true),
    (pb, 'Mock Service', null, 'Training', 'opening_date', -8, 'Training', false, 16, true),
    (pb, 'Dry Run Day 1', null, 'Training', 'opening_date', -3, 'Training', false, 17, true),
    (pb, 'Dry Run Day 2', null, 'Training', 'opening_date', -3, 'Training', false, 18, true),
    (pb, 'Whmis Training (online)', null, 'Training', 'opening_date', -10, 'Training', false, 19, true),
    (pb, 'Accessible Guest Service (online)', null, 'Training', 'opening_date', -10, 'Training', false, 20, true),
    (pb, 'Handbook Fine Print (online)', null, 'Training', 'opening_date', -10, 'Training', false, 21, true),
    (pb, 'Takeout Training (online)', null, 'Training', 'opening_date', -10, 'Training', false, 22, true);

end
$seed$;
