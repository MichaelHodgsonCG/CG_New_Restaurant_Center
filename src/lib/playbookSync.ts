// Playbook ↔ site sync — the two-way link Menu Center proved out, keyed on
// task_template_id (robust against renames, unlike Menu Center's
// section‖title string match).
//
//   applyPlaybookUpdates   playbook → site   (pull library changes in)
//   updatePlaybookFromSite site → playbook   (push what this opening learned)
//   reapplyDefaultRoles    playbook → site   (roles only, never blanks)
//   savePlaybookFromSite   site → NEW playbook (snapshot / concept variant)
//
// Rules honoured throughout: a manually overridden due date is never
// silently changed; per-task person overrides are never touched; templates
// stay role-only (a task whose role text was replaced by a picked person is
// not pushed back as a "role").

import { supabase } from './supabase'
import {
  addPlaybookToSite,
  createPlaybook,
  createTemplate,
  listPlaybooks,
  listTasks,
  listTemplates,
  updateTask,
  updateTemplate,
} from './api'
import { computeDueDate, anchorDateFor, daysUntil } from './dates'
import type { OpeningSite, OpeningTask, Playbook, TaskTemplate } from '../types'

function taskPosition(t: OpeningTask): number {
  return t.sort_order ?? t.sequence
}

async function playbookTasks(siteId: string, playbookId: string | null): Promise<OpeningTask[]> {
  const tasks = await listTasks(siteId)
  return tasks
    .filter((t) => (t.playbook_id ?? null) === playbookId)
    .sort((a, b) => taskPosition(a) - taskPosition(b) || a.sequence - b.sequence)
}

// --- Playbook → site -------------------------------------------------------

export interface ApplyResult {
  added: number
  updated: number
  retired: number // template deactivated → open task marked N/A (delete is admin-only)
}

/** Diff-sync a site's generated tasks against the playbook's current
 *  templates: insert tasks for new templates, update changed content
 *  (title / description / category / anchor+offset — recomputing the due date
 *  only when it was never hand-set), and retire open tasks whose template was
 *  deactivated. Roles and person links are deliberately untouched — that's
 *  reapplyDefaultRoles' job. */
export async function applyPlaybookUpdates(
  site: OpeningSite,
  playbookId: string,
): Promise<ApplyResult> {
  // Generation is idempotent and already covers "templates added since".
  const gen = await addPlaybookToSite(site, playbookId)

  const templates = await listTemplates(playbookId)
  const activeById = new Map(templates.filter((t) => t.active).map((t) => [t.id, t]))
  const tasks = (await playbookTasks(site.id, playbookId)).filter(
    (t) => t.task_template_id != null,
  )

  let updated = 0
  let retired = 0
  for (const task of tasks) {
    const tpl = activeById.get(task.task_template_id!)
    if (!tpl) {
      if (task.status !== 'complete' && task.status !== 'not_applicable') {
        await updateTask(task.id, { status: 'not_applicable', completed_at: null })
        retired++
      }
      continue
    }
    const patch: Partial<OpeningTask> = {}
    if (task.title !== tpl.title) patch.title = tpl.title
    if ((task.description ?? null) !== (tpl.description ?? null))
      patch.description = tpl.description
    if ((task.category ?? null) !== (tpl.category ?? null)) patch.category = tpl.category
    if (task.anchor_type !== tpl.anchor_type) patch.anchor_type = tpl.anchor_type
    if (task.offset_days !== tpl.offset_days) patch.offset_days = tpl.offset_days
    if (!task.date_overridden) {
      const due = computeDueDate(site, tpl.anchor_type, tpl.offset_days)
      if (due !== task.due_date) patch.due_date = due
    }
    if (Object.keys(patch).length > 0) {
      await updateTask(task.id, patch)
      updated++
    }
  }
  return { added: gen.created, updated, retired }
}

export interface ReapplyRolesResult {
  updated: number
}

/** Copy template default owner/support roles back onto this site's generated
 *  tasks. Never blanks a value (templates without a default leave the task
 *  alone) and never touches per-task person links. */
export async function reapplyDefaultRoles(
  site: OpeningSite,
  playbookId: string,
): Promise<ReapplyRolesResult> {
  const templates = await listTemplates(playbookId)
  const byId = new Map(templates.map((t) => [t.id, t]))
  const tasks = (await playbookTasks(site.id, playbookId)).filter(
    (t) => t.task_template_id != null,
  )
  let updated = 0
  for (const task of tasks) {
    const tpl = byId.get(task.task_template_id!)
    if (!tpl) continue
    const patch: Partial<OpeningTask> = {}
    if (tpl.default_owner_role && task.assigned_role !== tpl.default_owner_role)
      patch.assigned_role = tpl.default_owner_role
    if (tpl.default_support_role && task.support_role !== tpl.default_support_role)
      patch.support_role = tpl.default_support_role
    if (Object.keys(patch).length > 0) {
      await updateTask(task.id, patch)
      updated++
    }
  }
  return { updated }
}

// --- Site → playbook -------------------------------------------------------

export interface PushResult {
  templatesUpdated: number
  templatesAdded: number // hand-added board tasks promoted to templates (and linked)
}

/** Push what this opening learned back to the source playbook: titles,
 *  descriptions, categories, curated order, role defaults (only from tasks
 *  without a person link — a picked person's name is not a role), and offsets
 *  back-computed from hand-set due dates. Hand-added tasks in this playbook's
 *  block become new templates and are linked, so future syncs recognise them.
 *  Additive: templates are never deactivated or deleted from here. */
export async function updatePlaybookFromSite(
  site: OpeningSite,
  playbookId: string,
): Promise<PushResult> {
  const templates = await listTemplates(playbookId)
  const byId = new Map(templates.map((t) => [t.id, t]))
  const tasks = await playbookTasks(site.id, playbookId)

  let templatesUpdated = 0
  let templatesAdded = 0
  let nextSequence = templates.length

  for (const task of tasks) {
    if (task.title.trim() === '') continue // unfinished inline rows stay local

    const tpl = task.task_template_id ? byId.get(task.task_template_id) : undefined
    if (tpl) {
      const patch: Partial<Omit<TaskTemplate, 'id' | 'playbook_id' | 'created_at' | 'updated_at'>> =
        {}
      if (tpl.title !== task.title) patch.title = task.title
      if ((tpl.description ?? null) !== (task.description ?? null))
        patch.description = task.description
      if ((tpl.category ?? null) !== (task.category ?? null)) patch.category = task.category
      if (
        !task.assigned_person_id &&
        task.assigned_role &&
        tpl.default_owner_role !== task.assigned_role
      )
        patch.default_owner_role = task.assigned_role
      if (
        !task.support_person_id &&
        task.support_role &&
        tpl.default_support_role !== task.support_role
      )
        patch.default_support_role = task.support_role
      if (task.date_overridden && task.due_date && task.anchor_type) {
        const anchor = anchorDateFor(site, task.anchor_type)
        if (anchor) {
          const offset = daysUntil(task.due_date, anchor)
          if (offset !== null && offset !== tpl.offset_days) patch.offset_days = offset
        }
      }
      const position = taskPosition(task)
      if ((tpl.sort_order ?? tpl.sequence) !== position) patch.sort_order = position
      if (Object.keys(patch).length > 0) {
        await updateTemplate(tpl.id, patch)
        templatesUpdated++
      }
    } else {
      // Hand-added on the board → promote to a template, then link the task.
      const fromOpening =
        task.due_date && site.opening_date ? daysUntil(task.due_date, site.opening_date) : null
      const created = await createTemplate({
        playbook_id: playbookId,
        title: task.title,
        description: task.description,
        category: task.category,
        anchor_type: fromOpening !== null ? 'opening_date' : 'fixed_date',
        offset_days: fromOpening ?? 0,
        default_owner_role: task.assigned_person_id ? null : task.assigned_role,
        default_support_role: task.support_person_id ? null : task.support_role,
        required: task.priority === 'high',
        sequence: nextSequence++,
        sort_order: taskPosition(task),
      })
      await updateTask(task.id, { task_template_id: created.id })
      templatesAdded++
    }
  }
  return { templatesUpdated, templatesAdded }
}

/** Snapshot a block's tasks as a brand-new playbook (e.g. a concept-specific
 *  GM variant). Works for a real playbook block or the one-off "Other tasks"
 *  block (playbookId null). The source site is not modified. */
export async function savePlaybookFromSite(
  site: OpeningSite,
  playbookId: string | null,
  name: string,
): Promise<{ playbook: Playbook; templates: number }> {
  const tasks = (await playbookTasks(site.id, playbookId)).filter((t) => t.title.trim() !== '')
  const all = await listPlaybooks(true)
  const playbook = await createPlaybook({ name, sort_order: all.length })

  const rows = tasks.map((task, idx) => {
    const fromOpening =
      task.due_date && site.opening_date ? daysUntil(task.due_date, site.opening_date) : null
    const anchor =
      task.anchor_type && task.offset_days != null
        ? { anchor_type: task.anchor_type, offset_days: task.offset_days }
        : fromOpening !== null
          ? { anchor_type: 'opening_date' as const, offset_days: fromOpening }
          : { anchor_type: 'fixed_date' as const, offset_days: 0 }
    return {
      playbook_id: playbook.id,
      title: task.title,
      description: task.description,
      category: task.category,
      ...anchor,
      default_owner_role: task.assigned_person_id ? null : task.assigned_role,
      default_support_role: task.support_person_id ? null : task.support_role,
      required: task.priority === 'high',
      sequence: idx,
      sort_order: taskPosition(task),
    }
  })
  if (rows.length > 0) {
    const { error } = await supabase.from('opening_task_templates').insert(rows)
    if (error) throw error
  }
  return { playbook, templates: rows.length }
}
