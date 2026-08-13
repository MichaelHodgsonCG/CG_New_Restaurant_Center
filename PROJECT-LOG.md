# PROJECT-LOG — CG New Restaurant Center

[2026-08-13] Merged to main; auto-fill re-targeted at the Team panel
Shipped:   Merged main's Menu Center task format line (Team panel, dynamic owner/support resolution, My Tasks, playbook sync) into this branch and reconciled today's auto-fill with it: the People Center auto-fill now fills opening_site_roles (an Auto-fill action on the Team panel) instead of backfilling task rows. Hand-picked Team assignments carry autofilled=false and are never overwritten; unresolvable roles are reported, never guessed; a person who leaves a position is cleared, not left stale. Migration 20260813170000 applied live: drops the superseded task-row objects (columns verified empty first), restores the phase-2 profile RPC that this afternoon's migration had overwritten (display-name fallback regression — caught and fixed live), keeps the alias table, owner index, and completed_by stamping. Verified the 3 existing manual Team picks at Beertown Peterborough are protected. Build passes. Merged to main and pushed.
Roadmap:   UTL remediation — person assignment -> complete (task-format model + PC auto-fill); My Day resolver + deep links + required-badge fix -> planned
Decisions: Auto-fill lives on opening_site_roles because the task-format model resolves people dynamically — the Team panel is the overwrite surface Michael asked for; per-task overrides still win above it.
Blockers:  none
Next:      Build the CGOPS My Day resolver mirroring the dynamic resolution chain; Michael links the five new locations in People Center (name fallback covers them meanwhile).

[2026-08-13] Assignee auto-fill from People Center location roles
Shipped:   Tasks keep their role label and now auto-fill the actual person from People Center's location settings (position assignments per location), with a hand-pick override that always wins (assignee_overridden, mirroring date_overridden) and a roster picker on the task row. Migration applied to the shared project: assigned_person_name + assignee_overridden columns, owner index, opening_role_mappings alias table (seeded: "the Chef" → Chef de Cuisine + 2 directors), resolve RPC (never guesses — zero/ambiguous holders reported for manual pick), roster RPC, server-side completed_at/completed_by stamping, and the profile RPC now returns the People Center person link. Auto-fill runs after playbook generation and via a new "Refresh assignees" button. Location matching falls back to exact name while People Center's cgops_location_id link is unset on new restaurants. Dry-run verified: Beertown Peterborough resolves Beverage Manager and Service Manager today; other roles fill as hires land in People Center. Build passes. UTL audit items 1, 2, 4, completed_by, and 8 closed.
Roadmap:   UTL remediation — person assignment -> complete; My Day resolver + deep links + required-badge fix -> planned
Decisions: Department/HQ roles (IT, Training, Marketing, Finance, directors) stay role-only with manual assignment (Michael). Ambiguous or empty matches are left unfilled and flagged, never guessed (Michael). Name-match location fallback until People Center links new locations; the id link wins once set.
Blockers:  none
Next:      Michael links the five new locations to their CGOPS locations in People Center (fallback covers them meanwhile); then the My Day resolver RPC is unblocked and ready to build.

[2026-08-13] Design check: auto-fill task assignees from People Center location roles
Shipped:   Assessment only, no code. Verified Michael's proposed design is feasible: people_center_position_assignments holds per-location role→person (GM 17 active across 16 locations, Beverage Manager 17/16, Chef de Cuisine 18/15), people_center_position_mappings exists as the role-string→position seam, and people_center_locations.cgops_location_id links to the CGOPS locations that opening_sites reference. Design (tasks stay role-labelled; person auto-filled from location + position with a manual overwrite that always wins, mirroring the existing date_overridden pattern) conforms to UTL v1 — role routing as pre-assignment, person id + name snapshot on resolution.
Roadmap:   UTL remediation — person assignment via location-role auto-fill -> planned
Decisions: (1) Manager-only task writes stand — Michael: only managers use our apps; closes audit item 8 (assignee self-closure not needed). (2) Direction accepted: assignees auto-fill from People Center location settings with an overwrite option, pending Michael's go-ahead on the open mapping questions.
Blockers:  Open design questions for Michael: who receives department playbooks (IT/Marketing/Finance/Training) that have no per-location position; behavior when a location has zero or multiple people in a position.
Next:      On go-ahead, implement: role→position mappings, assignee auto-fill + overwrite flag + name snapshot, refresh on People Center changes.

[2026-08-13] UTL v1 conformance audit of existing task features
Shipped:   Audited Opening Tasks/Playbooks against UTL v1 §6 (standard read from the bus; code + live data checked — 1,149 opening_tasks rows). Findings filed in docs/UTL_CONFORMANCE_AUDIT.md. Confirmed the §8 survey items independently: assigned_person_id never written (0 rows), completed_by never stamped, "Required" badge keys off priority. Also found: no resolver RPC, no owner index, no deep-link intent, non-manager assignees cannot close their own tasks, profile person_id is null (root blocker). Positives: stable ids, idempotent generation, edits never reset status, completed_at hygiene clean, source chip registered. No code changed — audit only.
Roadmap:   Process — UTL conformance audit -> complete; UTL remediation -> planned (next touch of the task surface)
Decisions: Per the standard, findings are conformance debts to fix on next touch, not immediate blockers — an 8-item remediation list is in the audit doc.
Blockers:  Person identity link (People Center person_id) is unwired — blocks person assignment, completed_by, and the resolver.
Next:      When the task surface is next touched, work the remediation list top-down (person link first).

[2026-08-13] Adopted task feature protocol (UTL standard)
Shipped:   New protocol persisted to CLAUDE.md: before designing/building any task/checklist/action/assignment feature, read the CG Universal Task List Standard from the bus and conform to its §6 checklist; deviations need Michael's sign-off filed as a decision. Verified the standard is readable on the bus (UTL v1, active, §6 = "Conformance checklist — BEFORE building any task feature"). No application code changed.
Roadmap:   Process — UTL conformance protocol -> complete
Decisions: Protocol recorded in CLAUDE.md (with a dated pointer note) so future sessions inherit it; existing task/playbook features were not audited this session — conformance applies from the next task-feature touch.
Blockers:  none
Next:      On the next task/checklist feature change, read UTL v1 in full and run the §6 checklist before designing.

[2026-08-13] Adopted session log + filing protocol
Shipped:   Session log + filing protocol (v2, CG) persisted verbatim to CLAUDE.md, including the CG bus ref; PROJECT-LOG.md created with this first entry; entry filed to the CG bus. Verified the bus (cgops-platform / cc_project_artifacts) is reachable from this session. No application code changed.
Roadmap:   Process — session logging & bus filing -> complete
Decisions: Protocol recorded in CLAUDE.md so every future session inherits it without a paste (per protocol instruction).
Blockers:  none
Next:      Continue Phase 1 build (see claude/restaurant-center-foundation branch); log every session here and file to the bus same-turn.
