# CLAUDE.md — CG New Restaurant Center

Guidance for Claude Code sessions working in this repository.

This app is part of the **CGOPS platform** (Charcoal Group). See `README.md`
for scope and tech stack. Every session must follow the protocols below.

## TASK FEATURE PROTOCOL (CG Universal Task List Standard)

Before designing or building ANY task/checklist/action/assignment feature,
read the "CG Universal Task List Standard" from the CG bus
(cc_project_artifacts where metadata->>'kind'='standard', newest active
version) and conform to its §6 checklist — deviations require Michael's
explicit sign-off, filed as a decision.

(As of 2026-08-13 the newest active version is "CG Universal Task List
Standard (UTL v1)"; §6 is its "Conformance checklist — BEFORE building any
task feature". Always re-query the bus for the newest active version rather
than relying on this note.)

## SESSION LOG + FILING PROTOCOL (v2, CG)

YOUR PROJECT NAME is the one this chat serves (e.g. "Menu Center").

YOUR BUS: Charcoal Group projects file to the CG bus — Supabase project
qzzhifdwoixqjgugbevq (cgops-platform), table cc_project_artifacts. Do not
file to, request access to, or accept a connector for any Supabase
organization outside Charcoal Group. Connectors are organization-scoped;
crossing organizations exposes unrelated systems. If your bus is
unreachable, use the fallback below — never substitute a different bus.

LOCAL LOG: maintain PROJECT-LOG.md at the repo root. At the end of every
working session (or when a meaningful unit ships), PREPEND one entry:

[YYYY-MM-DD] <short session title>
Shipped:   <what now works / what changed>
Roadmap:   <phase or item> -> <planned | in progress | complete>
Decisions: <decision + one-line rationale>   (or "none")
Blockers:  <blocker or risk>                 (or "none")
Next:      <the next concrete step>

Factual and terse. Never put secrets, credentials, or customer data in it.

BUS FILING, SAME TURN: file the same entry to your bus. Set
artifact_type='note', metadata.kind='session_log',
metadata.project=<your project name>, metadata.filed_by=<your chat name>.
Same turn, not later. After writing, RE-READ the row by its returned id and
only then say it is filed — never claim a write you have not read back.

FILE EVEN WHEN NOTHING HAPPENED: a session that built nothing still files
one authoritative line saying so, with what you checked. Silence reads as a
missing session; "no change, here's what I verified" is a result.

IF YOU CANNOT REACH YOUR BUS: say so plainly instead of skipping. Still
write the local PROJECT-LOG.md entry, then output "portfolio sync" — the
last N entries as one copy-paste block, no commentary, for Michael to carry.

ASKS ARE FOR MICHAEL: anything needing his action goes in a plain-language
open_asks list — no bare ticket numbers, row ids, or jargon.

CONTENT BOUNDARY: CG filings and logs contain CG material only. If you
encounter material belonging to another organization or portfolio, do not
file it, quote it, or carry it — say you set it aside.

ONLY YOUR OWN WORK: report what this chat did and verified. Never restate
another chat's claims as your own findings.

PERSIST THIS: if this repo has a CLAUDE.md, record this protocol there now
(verbatim, including the bus ref) so every future session inherits it
without a paste. Confirm in this session's log entry that it is persisted.
