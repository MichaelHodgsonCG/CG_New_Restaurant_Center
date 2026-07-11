-- ============================================================================
-- Migration: seed_foh_playbooks
-- Populate opening playbooks + task templates from the operational Excel
-- checklists (FOH Manager Pre-Open Accountabilities, July 2026) and the BT
-- Richmond Hill opening training schedule.
--
-- Apply to the CGOPS Platform Supabase project.
--
-- Offsets are REUSABLE relative offsets (negative = before anchor, positive =
-- after); site-specific dates are not stored. Sub-items folded into the
-- description. Adds opening_task_templates.category for the source phase.
-- Idempotent: replaces templates for these six playbooks on re-run.
-- Data note: task text had ; and " characters removed for SQL-editor safety.
-- ============================================================================

alter table public.opening_task_templates add column if not exists category text;


-- ---- General Manager Playbook : 84 templates -----------------------------
insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
select 'General Manager Playbook', 'general_manager', 'management', 'Pre-opening accountabilities for the General Manager role (imported from operational checklists).', 10
where not exists (select 1 from public.opening_playbooks where name = 'General Manager Playbook');
delete from public.opening_task_templates where playbook_id = (select id from public.opening_playbooks where name = 'General Manager Playbook');
insert into public.opening_task_templates
  (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
select p.id, v.title, v.description, v.category, v.anchor_type, v.offset_days, v.owner, false, v.seq, true
from public.opening_playbooks p, (values
  ('Review hiring needs with ROL and Ops', null, 'Hiring', 'opening_date', -28, 'General Manager', 0),
  ('Meet with & confirm any potential TM Transfers', null, 'Hiring', 'opening_date', -28, 'General Manager', 1),
  ('Review job fair plan (layout, interview structure/questions)', null, 'Hiring', 'opening_date', -28, 'General Manager', 2),
  ('Final interview on all FOH TM''s', null, 'Hiring', 'opening_date', -28, 'General Manager', 3),
  ('During interviews, complete shared staffing doc to collect TM info, organize hires & make as many notes as possible', null, 'Hiring', 'opening_date', -28, 'General Manager', 4),
  ('Updated shared staffing doc is shared with with management team, ROL and ops team at the end of each day', null, 'Hiring', 'opening_date', -28, 'General Manager', 5),
  ('Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring', 'opening_date', -28, 'General Manager', 6),
  ('Identify key certifications: First Aid, JHSC', null, 'Hiring', 'opening_date', -28, 'General Manager', 7),
  ('Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring', 'opening_date', -28, 'General Manager', 8),
  ('All postions are hired by end of Job Fair Week', null, 'Hiring', 'opening_date', -28, 'General Manager', 9),
  ('Any candidates that were not informed with a yes or no during job fair must be e-mailed with final decision', null, 'Hiring', 'opening_date', -28, 'General Manager', 10),
  ('Collect & prepare TM information for TM Emailers & share with Megan (e-mail)', null, 'Hiring', 'opening_date', -28, 'General Manager', 11),
  ('Collect & prepare TM information for Push invites & share with SM (name, email, role, wage if above min)', null, 'Hiring', 'opening_date', -28, 'General Manager', 12),
  ('Follow up to verify ALL TM information is entered into Push', null, 'Hiring', 'opening_date', -28, 'General Manager', 13),
  ('Send Q&A e-mail with FAQ (see template)', null, 'Hiring', 'opening_date', -28, 'General Manager', 14),
  ('Always on the hunt for MOTs all throughout the opening', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 15),
  ('Set up spaces to receive items ie. Cupboard for marketing/beverage items, a space in the dining room for glassware etc…', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 16),
  ('Follow up with labelling and storage areas (expo, take out area, pod, behind bar etc…) for approval', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 17),
  ('Install communication boards where needed', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 18),
  ('Floor plans printed and laminated', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 19),
  ('FOH accountability checklist saved on desktop', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 20),
  ('Set up team share document with all hosts, dishwashers and line cooks (discuss tiers with chef)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 21),
  ('Set up business planning binder with ROL support (foh accoutability checklists, business plan, org chart)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 22),
  ('Follow up & assist BM, SM & GSM regarding their restaurant set up checklists', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 23),
  ('Order paper: harvey@directlinesupplies.com', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 24),
  ('Set up bookmarks on Google Chrome for all team sessions', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 25),
  ('JHSC board set up, see Axonify for required documents (green book given by HQ) (certified TMs determined @ job fair)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 26),
  ('Program lighting schedule', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 27),
  ('FOH accountabilities completed and posted, BOH accountabilities completed and posted', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 28),
  ('Follow up with binder set up (host binder, bar bible, incident report binder)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 29),
  ('Follow up on duties being completed/accurate and posted (BOH, host, server, bar)', null, 'Restaurant Set Up', 'handover_date', 2, 'General Manager', 30),
  ('Study in detail all facets of training to understand schedule and who will be leading which seminars', null, 'Training', 'opening_date', -12, 'General Manager', 31),
  ('Prepare self and managers for training & seminars', null, 'Training', 'opening_date', -12, 'General Manager', 32),
  ('GM leads orientation and needs to prepare accordingly. Ops supports in execution.', null, 'Training', 'opening_date', -12, 'General Manager', 33),
  ('Review Axonify completion for all FOH & BOH', null, 'Training', 'opening_date', -12, 'General Manager', 34),
  ('Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out', null, 'Training', 'opening_date', -12, 'General Manager', 35),
  ('Prepares relative MOTs in advance for sharing each day', null, 'Training', 'opening_date', -12, 'General Manager', 36),
  ('Prepares a value recognition piece for each day - 1 recognition/value throughout each training day', null, 'Training', 'opening_date', -12, 'General Manager', 37),
  ('Work with Ops team to prepare for dry runs (server & manager section plotting, menus, tip out, reads, duties)', null, 'Dry Runs', 'opening_date', -3, 'General Manager', 38),
  ('Work with BM/SM/GSM to schedule appropriate staffing levels', null, 'Dry Runs', 'opening_date', -3, 'General Manager', 39),
  ('Assist in filling Dry Run Services to par levels set by Ops', null, 'Dry Runs', 'opening_date', -3, 'General Manager', 40),
  ('Hold Pre & Post-Shift mtgs with all TMs & Ops for each Dry Run service period - notes prepared in advance', null, 'Dry Runs', 'opening_date', -3, 'General Manager', 41),
  ('Oversee dry run service of the host and serving teams', null, 'Dry Runs', 'opening_date', -3, 'General Manager', 42),
  ('Closely watch TMs & Managers in their roles to coach and follow up concerns as needed', null, 'Dry Runs', 'opening_date', -3, 'General Manager', 43),
  ('Make notes of strengths and weaknesses throughout services and communicate with managers and ops', null, 'Dry Runs', 'opening_date', -3, 'General Manager', 44),
  ('Plan opening FOH uniform order with Shanna', null, 'Uniforms', 'opening_date', -10, 'General Manager', 45),
  ('All uniforms are organized & stored, prepared for 1st uniform inventory', null, 'Uniforms', 'opening_date', -10, 'General Manager', 46),
  ('All uniforms handed out are accompanied by a signed deduction form', null, 'Uniforms', 'opening_date', -10, 'General Manager', 47),
  ('Support SM with employee names on each deduction form and submission to GA', null, 'Uniforms', 'opening_date', -10, 'General Manager', 48),
  ('Teach and uphold standards and coaches ''best look''', null, 'Uniforms', 'opening_date', -10, 'General Manager', 49),
  ('Keep alarm code list updated as management team changes in future and save master file', null, 'Security', 'opening_date', 0, 'General Manager', 50),
  ('Management Keys, hand out & maintain list of current key holders', null, 'Security', 'opening_date', 0, 'General Manager', 51),
  ('Ensure WSIB log in info is accessible to all Managers and knowledge of what to do in case of an an injury is understood (72-hour rule)', null, 'Manage WSIB', 'opening_date', 0, 'General Manager', 52),
  ('Set up account for window cleaners on monthly basis', null, 'Repairs & Maintenance', 'opening_date', 0, 'General Manager', 53),
  ('Print trade list provided by Director of Construction for all warranty repairs', null, 'Repairs & Maintenance', 'opening_date', 0, 'General Manager', 54),
  ('Research Night Cleaning companies, & submit costs to ROL', null, 'Repairs & Maintenance', 'opening_date', 0, 'General Manager', 55),
  ('All areas of restaurant, clean & in excellent condition pre-open', null, 'Repairs & Maintenance', 'opening_date', 0, 'General Manager', 56),
  ('All Managers attend POS training with Silverware', null, 'Silverware', 'handover_date', 3, 'General Manager', 57),
  ('Go through all menu items to ensure they are 100% correct to Silverware', null, 'Silverware', 'handover_date', 3, 'General Manager', 58),
  ('Clover', null, 'Silverware', 'handover_date', 3, 'General Manager', 59),
  ('Test all Clover devices with all payment forms before VIP Party', null, 'Silverware', 'handover_date', 3, 'General Manager', 60),
  ('One clover device that is ''fully licensed'' marked as Host terminal', null, 'Silverware', 'handover_date', 3, 'General Manager', 61),
  ('Label all Clover devices with numerical device number and note if pay station is enabled', null, 'Silverware', 'handover_date', 3, 'General Manager', 62),
  ('All Managers complete system training with Open Table', null, 'Open Table', 'opening_date', 0, 'General Manager', 63),
  ('Set overbooking code & only share w/ Mgmt', null, 'Open Table', 'opening_date', 0, 'General Manager', 64),
  ('Work with GSM to curate list of businesses to visit for Bottle Drops', null, 'LSM/Bottle Drops', 'opening_date', 0, 'General Manager', 65),
  ('Scheduling plan in place to execute Bottle Drops', null, 'LSM/Bottle Drops', 'opening_date', 0, 'General Manager', 66),
  ('Works with ROL to curate list of local NB''s to invite to VIP Party', null, 'LSM/Bottle Drops', 'opening_date', 0, 'General Manager', 67),
  ('Set up and organize office - labelling wherever possible.', null, 'Office', 'opening_date', 0, 'General Manager', 68),
  ('Acquire extra shelving & hooks where needed (consult DOC before any purchases)', null, 'Office', 'opening_date', 0, 'General Manager', 69),
  ('Assist with hanging coat hooks, bulletin boards, clipboards, invoice boxes etc.', null, 'Office', 'opening_date', 0, 'General Manager', 70),
  ('Accounting CCS set up on desktop', null, 'Accounting', 'opening_date', 0, 'General Manager', 71),
  ('Cash Requests submitted with DOC and picked up at bank *picked up or delivered*', null, 'Accounting', 'opening_date', 0, 'General Manager', 72),
  ('Tills + Petty Cash set & labelled', null, 'Accounting', 'opening_date', 0, 'General Manager', 73),
  ('Weekly check ins with all Managers. Follow up on their pre-open checklists, what they still need to do', null, 'Weekly Check Ins', 'opening_date', 0, 'General Manager', 74),
  ('Review all FOH schedules prior to posting to ensure correct amount of TMs, no overs/thrus/splits, no staggared starts', null, 'Weekly Check Ins', 'opening_date', 0, 'General Manager', 75),
  ('Teach and uphold standards', null, 'Uniforms in Action', 'opening_date', -10, 'General Manager', 76),
  ('Coaches '' best look'' & full tools', null, 'Uniforms in Action', 'opening_date', -10, 'General Manager', 77),
  ('Review support schedule', null, 'Support Team', 'opening_date', 0, 'General Manager', 78),
  ('Check-in w/ Support TMs daily setting expectations and receiving feedback', null, 'Support Team', 'opening_date', 0, 'General Manager', 79),
  ('Review support feedback cards - address notes, needs & performance concerns quickly', null, 'Support Team', 'opening_date', 0, 'General Manager', 80),
  ('Ensure support TMs time clocks match schedule plan w/ weekly payroll processes during support period', null, 'Support Team', 'opening_date', 0, 'General Manager', 81),
  ('Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Support Team', 'opening_date', 0, 'General Manager', 82),
  ('Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Support Team', 'opening_date', 0, 'General Manager', 83)
) as v(title, description, category, anchor_type, offset_days, owner, seq)
where p.name = 'General Manager Playbook';

-- ---- Beverage Manager Playbook : 61 templates ----------------------------
insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
select 'Beverage Manager Playbook', 'beverage_manager', 'bar', 'Pre-opening accountabilities for the Beverage Manager role (imported from operational checklists).', 10
where not exists (select 1 from public.opening_playbooks where name = 'Beverage Manager Playbook');
delete from public.opening_task_templates where playbook_id = (select id from public.opening_playbooks where name = 'Beverage Manager Playbook');
insert into public.opening_task_templates
  (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
select p.id, v.title, v.description, v.category, v.anchor_type, v.offset_days, v.owner, false, v.seq, true
from public.opening_playbooks p, (values
  ('Participate in Job Fairs, completing 1st (pattern) or 2nd interviews', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', 0),
  ('Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', 1),
  ('Identify key certifications: First Aid, JHSC', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', 2),
  ('Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', 3),
  ('Complete reference checks for all FOH applicants', null, 'Hiring', 'opening_date', -28, 'Beverage Manager', 4),
  ('Bar binder with recipes and specs assembled', null, 'Checklists & Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', 5),
  ('Service incident report binder assembled, current ID verification booklet obtained', null, 'Checklists & Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', 6),
  ('Complete audit of duties & checklists to ensure they are specific for your location', '• Bartender: Opening & Closing duties  • Train The Trainer (TTT) document created for all cocktails/ mocktails/ pouring techniques  • Bartender accountabilities template established for training  • FOTW bartender document assembled  • Stocking lists/pars', 'Checklists & Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', 7),
  ('Determine all local channels and post at AV cabinet', null, 'Checklists & Documents for Bartender Portfolios', 'handover_date', 2, 'Beverage Manager', 8),
  ('All invoices are entered into OC - Have you entered every type of invoice at this point? TBS? LCBO?', null, 'Beverage Inventory & Invoices', 'opening_date', -3, 'Beverage Manager', 9),
  ('Organize all orders when receiving and use photos from other restaurants to duplicate organization', null, 'Beverage Inventory & Invoices', 'opening_date', -3, 'Beverage Manager', 10),
  ('First inventory is completed day before opening to public', null, 'Beverage Inventory & Invoices', 'opening_date', -3, 'Beverage Manager', 11),
  ('Review manual calculation of COGs (opening + purchase - closing / sales)', null, 'Beverage Inventory & Invoices', 'opening_date', -3, 'Beverage Manager', 12),
  ('Review Group Totals, idenifty ideal vs actual and on hand inventory ($)', null, 'Beverage Inventory & Invoices', 'opening_date', -3, 'Beverage Manager', 13),
  ('Inventory accuracy importance before open', null, 'Beverage Inventory & Invoices', 'opening_date', -3, 'Beverage Manager', 14),
  ('Beverage Playbook is accesible via Axonify', null, 'Beverage Playbook & Specs', 'opening_date', -10, 'Beverage Manager', 15),
  ('All Bev Specs & standards are reviewed & tests passed to 100%', null, 'Beverage Playbook & Specs', 'opening_date', -10, 'Beverage Manager', 16),
  ('Untapped downloaded and store account accesible', null, 'Beverage Playbook & Specs', 'opening_date', -10, 'Beverage Manager', 17),
  ('Organize OC inventory pages >>> Costumize Sort vs. Countsheet Setup vs. Manage Locations', null, 'Storage & Organization', 'handover_date', 2, 'Beverage Manager', 18),
  ('Set up bar and storage areas to the highest standard including labelling/maps:', '• Includes all shelving, bar fridges, coolers, keg fridge and storage areas  • Spirits in back bar/ storage areas organized via category  • Beer Wall (display and behind bar) stocked alphbetaically  • Bar top & Bar expo areas.  • POD organization: Empties Return, rotational vs. static glassware, coasters, bar smallwares  • Identify ''key hires'' to assist with this  • Cocktail Cheat Sheet & Garnish chart laminated & posted by service  • Keg Fridge Cleanliness Checklist laminated & posted  • Beer Clean Glassware Laminated & posted  • How to use a Coupler laminated & posted  • Types of Couplers Laminted & posted  • Draught Beer list laminted and posted in draught beer fridge  • Proper Keg Fridge Storage laminated & posted  • Chalkboards filled out neatly behind bar and around restaurants  • Photos should be taken & shared of any area/bar top to train & re-inforce standards', 'Storage & Organization', 'handover_date', 2, 'Beverage Manager', 19),
  ('Assist in execution of beverage seminars', null, 'Beverage & Bartender Training', 'opening_date', -12, 'Beverage Manager', 20),
  ('Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out', null, 'Beverage & Bartender Training', 'opening_date', -12, 'Beverage Manager', 21),
  ('Activate utilization of TTT document for bartenders, managers, and supervisors in training', null, 'Beverage & Bartender Training', 'opening_date', -12, 'Beverage Manager', 22),
  ('Assess ongoing Axonify completion for bartenders and supervisors', null, 'Beverage & Bartender Training', 'opening_date', -12, 'Beverage Manager', 23),
  ('Organize Bar Information board with rotational pours and important information', null, 'Beverage & Bartender Training', 'opening_date', -12, 'Beverage Manager', 24),
  ('Initial orders for all Beer Suppliers, LCBO & Beer Store to hold onto until liquor license is official', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', 25),
  ('Plan triple & quadruple deck for rotational pours (minumum 60L per line)', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', 26),
  ('Rotational planning completed after on deck supplied by Ops', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', 27),
  ('Do you have 0% drink stickers?', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', 28),
  ('All VIP & Dry Run needs ordered: minerals, juices, bar condiments, garnishes (Fresh Start & Sysco)', null, 'Ordering', 'opening_date', -5, 'Beverage Manager', 29),
  ('Review bar smallwares, identify any under or over ordered items', '• Including but not limited to: jiggers, shakers, spoons, sifters, muddler, ice scoops, bar spouts, rimmers, mandalin, etc.', 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', 30),
  ('Set-up & organize all equipment - for use /storage', null, 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', 31),
  ('Stamp all 6 pack carriers & Growler tags', null, 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', 32),
  ('Growler display organized and par level curated', null, 'Bar Smallwares/Tools', 'opening_date', 0, 'Beverage Manager', 33),
  ('Create bartender schedules following GM notes', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 34),
  ('Ensure bartender availability in PUSH reflects the TM application', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 35),
  ('Ensure Silverware is programmed properly', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 36),
  ('All beverage items accounted for', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 37),
  ('Remove extra buttons or items (via Admin Silverware)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 38),
  ('All pricing correct (cross reference beer maps)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 39),
  ('All orders print to the correct area (QSR testing)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 40),
  ('All costs report to proper area on sales breakdowns', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 41),
  ('Easily navigated (i.e. Alphabetical Order & Rotational Line #)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 42),
  ('You are responsible for managing the ''Glassware'' ''line'' on the P & L', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 43),
  ('Order well in advance to ensure delivery (2 weeks)', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 44),
  ('Items are stored in a neat, clean and orderly fashion', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 45),
  ('We have appropriate levels of stock of both Glassware & Coasters for all beers', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 46),
  ('Weekly glassware & inventory sheets/ par levels are set up', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 47),
  ('You are aware of your budget', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 48),
  ('You will be 100% stocked, 100% of the time.', null, 'Schedules', 'opening_date', 0, 'Beverage Manager', 49),
  ('Order guides are printed & laminated for all bev purchasing (wine, LCBO, TBS, static bottles & cans)', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', 50),
  ('Sysco order guide assemble that is sequetial with storage areas', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', 51),
  ('Created a Favourites template on Beer4Buisness by first week open', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', 52),
  ('Create a Beverage Receiving log (includes delivery schedule)', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', 53),
  ('Login Credentials', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', 54),
  ('TBS, LCBO, Silverware, OC, Untapped', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', 55),
  ('All login credentials and invoicing should be sent to the general e-mail', null, 'Order Templates/ Guides', 'opening_date', -5, 'Beverage Manager', 56),
  ('Teach and uphold standards & coaches ''best look''', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', 57),
  ('All uniforms handed out are accompanied by a signed deduction form', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', 58),
  ('Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', 59),
  ('Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Uniforms', 'opening_date', -10, 'Beverage Manager', 60)
) as v(title, description, category, anchor_type, offset_days, owner, seq)
where p.name = 'Beverage Manager Playbook';

-- ---- Service Manager Playbook : 44 templates -----------------------------
insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
select 'Service Manager Playbook', 'service_manager', 'front_of_house', 'Pre-opening accountabilities for the Service Manager role (imported from operational checklists).', 10
where not exists (select 1 from public.opening_playbooks where name = 'Service Manager Playbook');
delete from public.opening_task_templates where playbook_id = (select id from public.opening_playbooks where name = 'Service Manager Playbook');
insert into public.opening_task_templates
  (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
select p.id, v.title, v.description, v.category, v.anchor_type, v.offset_days, v.owner, false, v.seq, true
from public.opening_playbooks p, (values
  ('Participate in Job Fairs, completing 1st or 2nd interviews', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 0),
  ('Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 1),
  ('Identify key certifications: First Aid, JHSC', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 2),
  ('Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 3),
  ('Send invites to Push for all hired TMs', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 4),
  ('Ensure TMs complete their Push profiles accurately and activate them for 2 days before their first shift', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 5),
  ('Upload TM docs to Push profiles (application, pattern interview, reference checks, onboarding checklist)', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 6),
  ('Load Insanely Great Discount Cards', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 7),
  ('Approve all FOH availabilities entered in Push (must match application!)', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 8),
  ('After orientation, all uniform deduction forms have completed employee numbers and e-mailed to GA', null, 'Hiring/Onboarding', 'opening_date', -28, 'Service Manager', 9),
  ('Compile Server & Bartender info for Silverware database list. Ensure accuracy. Send to Chelsey.', null, 'TMs in Silverware', 'handover_date', 3, 'Service Manager', 10),
  ('Should a TM be hired after the Silverware data dump, you will enter them into Silverware manually', null, 'TMs in Silverware', 'handover_date', 3, 'Service Manager', 11),
  ('Identify key TMs to help stock & set up dining room', '• Salt, pepper, vinegar, oil all filled  • Cutlery polished and rolled  • Side plates polished  • Butcher paper cut, side plates/fry cups/burger trays lined  • Sticker bill clipboards & stuff bill clipboards (postcard, comment card)  • Rubber feet on cubes', 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 12),
  ('Determine location for Push tablet and set up Push tablet', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 13),
  ('Set up side stands, determine location for dessert menus, billing supplies, create and laminate side stand map', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 14),
  ('Determine location for sani buckets and cloths (in-use and back up)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 15),
  ('Determine location for back up straws', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 16),
  ('Set up FOH documents, Determine location for section boards, side duty/running duties, FOTW, pre shift notes)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 17),
  ('Post a copy of the floor plan at the out door for food running reference', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 18),
  ('Post Allergy and Nutritional Guide in Expo', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 19),
  ('Post Red Light/Green Light at/near drink expo', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 20),
  ('Determine location for pepper mills', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 21),
  ('Determine location for paper supplies (dinner napkins, receipt rolls, wax paper, back up take out supplies)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 22),
  ('Takeout supply area organized - stamps/ink pad and stickers, boxes hole punched, takeout sauce par list posted', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 23),
  ('When all homes are established and agreed upon > label (consider taking photos also)', null, 'Restaurant Set Up', 'handover_date', 2, 'Service Manager', 24),
  ('Complete audit of duties & checklists to ensure they are specific for your location', '• Server: Opening & Closing duties  • Server: Running Duties  • Server: Cleaning Schedule: Daily/Weekly/Monthly', 'Checklists & Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', 25),
  ('Set up FOTW chart with names for all FOH', null, 'Checklists & Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', 26),
  ('Prepare FOTW for first 8 weeks (print standards, fill out charts) - have posted for orientation', null, 'Checklists & Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', 27),
  ('Pre-shift notes completed for 4 weeks and on clipboard, include beverage tasting and notes', null, 'Checklists & Documents for Server Portfolios', 'handover_date', 2, 'Service Manager', 28),
  ('Create necessary Shift Tags on Push for server schedule', null, 'Schedules', 'opening_date', 0, 'Service Manager', 29),
  ('Create necessary shift pre-sets on Push for server schedule', null, 'Schedules', 'opening_date', 0, 'Service Manager', 30),
  ('Enter server training schedules into Push', null, 'Schedules', 'opening_date', 0, 'Service Manager', 31),
  ('Create Server schedules following GM notes & par levels', null, 'Schedules', 'opening_date', 0, 'Service Manager', 32),
  ('Take the lead on the Steps of Service Seminar with support from Ops', null, 'Training', 'opening_date', -12, 'Service Manager', 33),
  ('Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out.', null, 'Training', 'opening_date', -12, 'Service Manager', 34),
  ('Review server Axonify completion', null, 'Training', 'opening_date', -12, 'Service Manager', 35),
  ('Teach and uphold uniform standards, coach best look', null, 'Training', 'opening_date', -12, 'Service Manager', 36),
  ('Identify key TMs to help stock and set up patio', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', 37),
  ('Assembly of tables (if applicable)', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', 38),
  ('Layout tables and chairs as per floorplan', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', 39),
  ('Assembly and organization of patio side stations', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', 40),
  ('Assembly of umbrellas and bases', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', 41),
  ('Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', 42),
  ('Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Set up Patio (if applicable)', 'handover_date', 2, 'Service Manager', 43)
) as v(title, description, category, anchor_type, offset_days, owner, seq)
where p.name = 'Service Manager Playbook';

-- ---- Guest Service Manager Playbook : 35 templates -----------------------
insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
select 'Guest Service Manager Playbook', 'guest_service_manager', 'front_of_house', 'Pre-opening accountabilities for the Guest Service Manager role (imported from operational checklists).', 10
where not exists (select 1 from public.opening_playbooks where name = 'Guest Service Manager Playbook');
delete from public.opening_task_templates where playbook_id = (select id from public.opening_playbooks where name = 'Guest Service Manager Playbook');
insert into public.opening_task_templates
  (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
select p.id, v.title, v.description, v.category, v.anchor_type, v.offset_days, v.owner, false, v.seq, true
from public.opening_playbooks p, (values
  ('Participate in Job Fairs, completing 1st and 2nd interviews.', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 0),
  ('Identify key roles: Day Bar, Day Host, Day Server, Bev Brigade, Supervisors, Cash Open/Cash Close', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 1),
  ('Identify key certifications: First Aid, JHSC', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 2),
  ('Utilize training schedule to verify candidates are available for ALL training dates', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 3),
  ('Complete reference checks for all FOH applicants', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 4),
  ('Assist SM: Ensure TMs complete their Push profiles accurately and activate them for 2 days before their first shift', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 5),
  ('Assist SM: Upload TM docs to Push profiles (application, pattern interview, reference checks, onboarding checklist)', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 6),
  ('Assist SM: Load Insanely Great Discount Cards', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 7),
  ('Assist SM: Approve all FOH availabilities entered in Push (must match application!)', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 8),
  ('Assist SM: Loading all Insanely Great Discount Cards', null, 'Hiring', 'opening_date', -28, 'Guest Service Manager', 9),
  ('Host binder set up', null, 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', 10),
  ('Determine location for back up crayons, high chairs, booster seats and high chair hammocks', null, 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', 11),
  ('Set up ''black box'' - laminated copies of job descriptions and uniform standards (5 of each)', null, 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', 12),
  ('Identify key TMs to help set up host stand', '• Bite Club display  • Bite Club/gift card storage  • Twine toilet paper  • Paper rolls  • Reserved signs  • Crayons and kids menus  • Set up writing utensils, stapler, scissors, tape  • Find storage area for lobby cleaning supplies, windex, sanitizer  • Assembly of dinner dinners, feature menus and dessert menus  • Business card display  • Organize menus within host stand', 'Set up Host Stand', 'handover_date', 2, 'Guest Service Manager', 13),
  ('Complete audit of duties & checklists to ensure they are specific for your location', '• Host: Opening & Closing duties  • Host: Running Duties  • Host: Cleaning Schedule: Daily/Weekly/Monthly', 'Checklists & Documents for Host Portfolios', 'handover_date', 2, 'Guest Service Manager', 14),
  ('Assemble binder with local businesses and organize bottle drop schedule (assisting GM)', null, 'Miscellaneous Set Up', 'handover_date', 2, 'Guest Service Manager', 15),
  ('Assemble crash kit with checklist provided - store in office', null, 'Miscellaneous Set Up', 'handover_date', 2, 'Guest Service Manager', 16),
  ('Assemble MSDS binder, include sheets for all chemicals in house (inventory chemicals & print sheets from Diversey online)', null, 'Miscellaneous Set Up', 'handover_date', 2, 'Guest Service Manager', 17),
  ('All TMs added to Open Table for section assignment & reservation tracking', null, 'Open Table & Silverware', 'handover_date', 3, 'Guest Service Manager', 18),
  ('Host # in Silverware for Take Out (4000) - test', null, 'Open Table & Silverware', 'handover_date', 3, 'Guest Service Manager', 19),
  ('Host # in Silverware for open counts (3000) - test', null, 'Open Table & Silverware', 'handover_date', 3, 'Guest Service Manager', 20),
  ('Designated ''Full'' Clover labelled and present at Host desk', null, 'Open Table & Silverware', 'handover_date', 3, 'Guest Service Manager', 21),
  ('Create necessary shift tags on Push for host schedule', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', 22),
  ('Create necessary shift pre-sets on Push for host schedule', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', 23),
  ('Enter host training schedules into Push', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', 24),
  ('Create host schedules following GM notes & par levels', null, 'Schedules', 'opening_date', 0, 'Guest Service Manager', 25),
  ('Take the lead on the Host seminar with support from Ops', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 26),
  ('Assist TM''s during training with coaching, learning, questions and testing. Highlight those who may stand out', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 27),
  ('Review host Axonify completion', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 28),
  ('Bite Club binder prepared and trained to hosts', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 29),
  ('Gift Card binder prepared and trained to hosts', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 30),
  ('Reservation programs - Open Table (all hosts trained and have certificate of completion)', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 31),
  ('Teach and uphold uniform standards, coach best look', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 32),
  ('Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 33),
  ('Provide your notes/thoughts/learnings to your ROL for this Opening''s Post Mortem', null, 'Training', 'opening_date', -12, 'Guest Service Manager', 34)
) as v(title, description, category, anchor_type, offset_days, owner, seq)
where p.name = 'Guest Service Manager Playbook';

-- ---- Regional Playbook : 94 templates ------------------------------------
insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
select 'Regional Playbook', 'regional_leader', 'operations', 'Pre-opening accountabilities for the Regional Operations Leader role (imported from operational checklists).', 10
where not exists (select 1 from public.opening_playbooks where name = 'Regional Playbook');
delete from public.opening_task_templates where playbook_id = (select id from public.opening_playbooks where name = 'Regional Playbook');
insert into public.opening_task_templates
  (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
select p.id, v.title, v.description, v.category, v.anchor_type, v.offset_days, v.owner, false, v.seq, true
from public.opening_playbooks p, (values
  ('Arrange pre-open bootcamp & review agenda', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 0),
  ('Management team selection, offers, overseeing & following up on their training', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 1),
  ('Review projected staffing levels & make recommendations necessary', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 2),
  ('Find site for job fair', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 3),
  ('Organize hotels for support team', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 4),
  ('Review job fair plan and assist with execution', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 5),
  ('Participation in TM hiring, onboarding & training', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 6),
  ('Flag any potential supervisors with management team', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 7),
  ('Manager schedule completed for pre-open and assist with writing first period post-open', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 8),
  ('Review TM training outline with Megan & Shanna - make tweaks/advancements as needed since last open', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 9),
  ('Prepare manager bios w/ pic for TM emailers - send to Megan', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 10),
  ('Prepare Open Tables floor plan', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 11),
  ('Prepare special day for Dry Runs & VIP Party in Open Table', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 12),
  ('Set table combinations and pacing in Open Table', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 13),
  ('Ensure all managers complete pre-open checklists', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 14),
  ('Set floor management expectations for open - 100% table checks, mgmt sections 45 second greet, complaint handling', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 15),
  ('Review and approve first 8 FOTW standards that are selected by SM', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 16),
  ('Work w/ Megan to prepare support schedule - specific people set to 5 day periods of dedicated support', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 17),
  ('Co-host support team session w/ Megan for all supporting Managers/TMs - what to expect when you''re supporting', null, 'Pre-Training', 'opening_date', -35, 'Regional Operations Leader', 18),
  ('Always on the hunt for MOTs throughout the entire opening process', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', 19),
  ('Participate in orientation & running seminars as assigned in training plan', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', 20),
  ('Review TM schedule for first few weeks (first 10 days = no splits, no overs, no ''thrus''. FOH = 10am & 4pm starts)', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', 21),
  ('Work w/ GM to complete post-open manager accountabilites', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', 22),
  ('Formulate the business planning binder w/ GM', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', 23),
  ('Manager Axonify completion', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', 24),
  ('Assist in filling Dry Run reso slots', null, 'During Training', 'opening_date', -12, 'Regional Operations Leader', 25),
  ('Follow-up with bev manager to ensure all bev product in house pre-open', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 26),
  ('Ensure all marketing materials in house (pre-dry runs)', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 27),
  ('Bite club cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 28),
  ('Bite club forms', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 29),
  ('Bite club/gift card display', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 30),
  ('Gift cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 31),
  ('Gift card sleeves', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 32),
  ('Group Scoop posters', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 33),
  ('Menus: dinner (and sleeves), features (and sleeves), dessert (and sleeves), dog menu', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 34),
  ('Post cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 35),
  ('Comment cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 36),
  ('Beer maps', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 37),
  ('Order business cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 38),
  ('Kids menus', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 39),
  ('No smoking signs', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 40),
  ('Dog sign on patio', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 41),
  ('Reserved signs', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 42),
  ('Sorry app cards (and filled out and ready for opening)', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 43),
  ('IGDC & sleeves', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 44),
  ('Silverware cards', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 45),
  ('Front door names & hours of ops', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 46),
  ('All chalkboards filled in pre-dry runs', null, 'Product', 'opening_date', 0, 'Regional Operations Leader', 47),
  ('Community outreach with local arenas, hotels etc…', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', 48),
  ('Take the lead on guest invites and guest list mgmt for VIP Party', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', 49),
  ('Verify VIP Party charity is chosen and meets CG standards', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', 50),
  ('Bottle drop menus in-house', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', 51),
  ('Letter curated for bottle drops', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', 52),
  ('Review bottle drop plan with GM & GSM', null, 'Marketing/VIP Party', 'opening_date', -2, 'Regional Operations Leader', 53),
  ('Cash order placed *for pick up or for delivery by Brinks?*', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', 54),
  ('Provide manager photo IDs to GA''s for local TD bank?', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', 55),
  ('Management keys divied up and numbers recorded', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', 56),
  ('Manager codes and special words provided to IDG for alarm system', null, 'Security', 'opening_date', 0, 'Regional Operations Leader', 57),
  ('Open Table (test chit printer)', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 58),
  ('Push & Push Tablet', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 59),
  ('Silverware', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 60),
  ('Clover', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 61),
  ('OC', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 62),
  ('iPads/tablets', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 63),
  ('Phone Voicemail', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 64),
  ('Integrity Sessions', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 65),
  ('Axonify use/buy-in heading into regular operations - keep driving it to become habit!', null, 'IT Items Functional', 'opening_date', 0, 'Regional Operations Leader', 66),
  ('A/V Equipment & Security', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', 67),
  ('Camera system and camera login', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', 68),
  ('Lighting', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', 69),
  ('Thermostats', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', 70),
  ('Reservation system & printer, phones', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', 71),
  ('POS & Clover', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', 72),
  ('Main water shut off', null, 'Management Orientation', 'opening_date', 0, 'Regional Operations Leader', 73),
  ('Set up linked Push profiles for all support TMs', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', 74),
  ('Check-in w/ support TMs daily setting expectations and receiving feedback', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', 75),
  ('Review support feedback cards - address notes, needs & performance concerns quickly', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', 76),
  ('Coach support TMs as needed to advance their skills/impact as needed', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', 77),
  ('Now Open!', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', 78),
  ('All postings on front door (hours of ops, GM & Chef names)', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', 79),
  ('Managing the buzz to standard (TVs, Lights, Music)', null, 'Support Period', 'opening_date', 0, 'Regional Operations Leader', 80),
  ('Side Stands', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 81),
  ('Expos', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 82),
  ('Bar', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 83),
  ('Patio', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 84),
  ('Host Stand', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 85),
  ('Kitchen Line/Dish/Prep', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 86),
  ('Office', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 87),
  ('Exterior', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 88),
  ('Pod/Storage', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 89),
  ('Staff Washrooms/Staff Area', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 90),
  ('Guest Washrooms', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 91),
  ('Please keep track of all items you have done in addition so we may make this list better for the next open', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 92),
  ('Provide your notes/thoughts/learnings in post mortem', null, 'Restaurant is set up for success for open', 'handover_date', 2, 'Regional Operations Leader', 93)
) as v(title, description, category, anchor_type, offset_days, owner, seq)
where p.name = 'Regional Playbook';

-- ---- Training Playbook : 23 templates ------------------------------------
insert into public.opening_playbooks (name, role_key, department_key, description, sort_order)
select 'Training Playbook', 'training', 'training', 'Pre-opening accountabilities for the Training role (imported from operational checklists).', 10
where not exists (select 1 from public.opening_playbooks where name = 'Training Playbook');
delete from public.opening_task_templates where playbook_id = (select id from public.opening_playbooks where name = 'Training Playbook');
insert into public.opening_task_templates
  (playbook_id, title, description, category, anchor_type, offset_days, default_owner_role, required, sequence, active)
select p.id, v.title, v.description, v.category, v.anchor_type, v.offset_days, v.owner, false, v.seq, true
from public.opening_playbooks p, (values
  ('Orientation', null, 'Training', 'opening_date', -13, 'Training', 0),
  ('Mission Meeting', null, 'Training', 'opening_date', -13, 'Training', 1),
  ('Day in the Life', null, 'Training', 'opening_date', -12, 'Training', 2),
  ('Responsible Service', null, 'Training', 'opening_date', -11, 'Training', 3),
  ('SOS Seminar', null, 'Training', 'opening_date', -11, 'Training', 4),
  ('Host Seminar', null, 'Training', 'opening_date', -11, 'Training', 5),
  ('Bar Extended Day in Life', null, 'Training', 'opening_date', -9, 'Training', 6),
  ('Beverage Seminar', null, 'Training', 'opening_date', -9, 'Training', 7),
  ('BarCocktail Training - 5 Parts', null, 'Training', 'opening_date', -9, 'Training', 8),
  ('Beer Academy - 2 Parts', null, 'Training', 'opening_date', -9, 'Training', 9),
  ('Food Seminar - 2 parts', null, 'Training', 'opening_date', -9, 'Training', 10),
  ('SOS Test', null, 'Training', 'opening_date', -8, 'Training', 11),
  ('Host Test', null, 'Training', 'opening_date', -8, 'Training', 12),
  ('Beverage Test', null, 'Training', 'opening_date', -8, 'Training', 13),
  ('Beer Test', null, 'Training', 'opening_date', -8, 'Training', 14),
  ('Food Test', null, 'Training', 'opening_date', -8, 'Training', 15),
  ('Mock Service', null, 'Training', 'opening_date', -8, 'Training', 16),
  ('Dry Run Day 1', null, 'Training', 'opening_date', -3, 'Training', 17),
  ('Dry Run Day 2', null, 'Training', 'opening_date', -3, 'Training', 18),
  ('Whmis Training (online)', null, 'Training', 'opening_date', -10, 'Training', 19),
  ('Accessible Guest Service (online)', null, 'Training', 'opening_date', -10, 'Training', 20),
  ('Handbook Fine Print (online)', null, 'Training', 'opening_date', -10, 'Training', 21),
  ('Takeout Training (online)', null, 'Training', 'opening_date', -10, 'Training', 22)
) as v(title, description, category, anchor_type, offset_days, owner, seq)
where p.name = 'Training Playbook';
