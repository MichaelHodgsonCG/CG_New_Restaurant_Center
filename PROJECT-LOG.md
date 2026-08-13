# PROJECT-LOG — CG New Restaurant Center

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
