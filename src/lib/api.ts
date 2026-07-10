// Data-access layer. Every table read/write goes through here so the views
// stay declarative and the query shapes live in one place. RLS on the CGOPS
// project is the real gate; these helpers assume the caller already passed
// the can() check for a calm UX (the database still rejects anything it
// shouldn't allow).

import { supabase } from './supabase'
import { computeDueDate } from './dates'
import type {
  OpeningSite,
  OpeningSiteInput,
  OpeningTask,
  Playbook,
  SitePlaybook,
  TaskTemplate,
} from '../types'

// --- Sites ---------------------------------------------------------------

export async function listSites(): Promise<OpeningSite[]> {
  const { data, error } = await supabase
    .from('opening_sites')
    .select('*')
    .order('opening_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as OpeningSite[]
}

export async function getSite(id: string): Promise<OpeningSite | null> {
  const { data, error } = await supabase
    .from('opening_sites')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as OpeningSite) ?? null
}

export async function createSite(input: OpeningSiteInput): Promise<OpeningSite> {
  const { data, error } = await supabase
    .from('opening_sites')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data as OpeningSite
}

export async function updateSite(
  id: string,
  patch: Partial<OpeningSiteInput>,
): Promise<OpeningSite> {
  const { data, error } = await supabase
    .from('opening_sites')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as OpeningSite
}

// --- Playbooks & templates -----------------------------------------------

export async function listPlaybooks(includeInactive = false): Promise<Playbook[]> {
  let q = supabase.from('opening_playbooks').select('*').order('sort_order')
  if (!includeInactive) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Playbook[]
}

export async function createPlaybook(
  input: Pick<Playbook, 'name'> &
    Partial<Pick<Playbook, 'role_key' | 'department_key' | 'description' | 'sort_order'>>,
): Promise<Playbook> {
  const { data, error } = await supabase
    .from('opening_playbooks')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data as Playbook
}

export async function updatePlaybook(
  id: string,
  patch: Partial<Omit<Playbook, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Playbook> {
  const { data, error } = await supabase
    .from('opening_playbooks')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Playbook
}

export async function listTemplates(playbookId: string): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from('opening_task_templates')
    .select('*')
    .eq('playbook_id', playbookId)
    .order('sequence')
  if (error) throw error
  return (data ?? []) as TaskTemplate[]
}

export async function createTemplate(
  input: Pick<TaskTemplate, 'playbook_id' | 'title' | 'anchor_type' | 'offset_days'> &
    Partial<
      Pick<
        TaskTemplate,
        'description' | 'default_owner_role' | 'required' | 'sequence'
      >
    >,
): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('opening_task_templates')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data as TaskTemplate
}

export async function updateTemplate(
  id: string,
  patch: Partial<Omit<TaskTemplate, 'id' | 'playbook_id' | 'created_at' | 'updated_at'>>,
): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('opening_task_templates')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as TaskTemplate
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('opening_task_templates').delete().eq('id', id)
  if (error) throw error
}

// --- Site ↔ playbook assignments -----------------------------------------

export async function listSitePlaybooks(siteId: string): Promise<SitePlaybook[]> {
  const { data, error } = await supabase
    .from('opening_site_playbooks')
    .select('*')
    .eq('opening_site_id', siteId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as SitePlaybook[]
}

// --- Tasks ---------------------------------------------------------------

export async function listTasks(siteId: string): Promise<OpeningTask[]> {
  const { data, error } = await supabase
    .from('opening_tasks')
    .select('*')
    .eq('opening_site_id', siteId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('sequence')
  if (error) throw error
  return (data ?? []) as OpeningTask[]
}

/** All tasks across every site — for the dashboard and readiness roll-ups. */
export async function listAllTasks(): Promise<OpeningTask[]> {
  const { data, error } = await supabase
    .from('opening_tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as OpeningTask[]
}

export async function updateTask(
  id: string,
  patch: Partial<Omit<OpeningTask, 'id' | 'opening_site_id' | 'created_at' | 'updated_at'>>,
): Promise<OpeningTask> {
  const { data, error } = await supabase
    .from('opening_tasks')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as OpeningTask
}

export async function createOneOffTask(
  input: Pick<OpeningTask, 'opening_site_id' | 'title'> &
    Partial<
      Pick<
        OpeningTask,
        | 'description'
        | 'anchor_type'
        | 'offset_days'
        | 'due_date'
        | 'assigned_role'
        | 'priority'
        | 'sequence'
      >
    >,
): Promise<OpeningTask> {
  // A one-off task with an explicit due date is, by definition, hand-set.
  const payload = {
    ...input,
    task_template_id: null,
    date_overridden: input.due_date != null,
  }
  const { data, error } = await supabase
    .from('opening_tasks')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as OpeningTask
}

// --- Template generation -------------------------------------------------

export interface GenerateResult {
  assignmentId: string
  created: number
  skipped: number // templates that already had a task for this assignment
}

/**
 * Add a playbook to a site and generate its tasks.
 *
 * Idempotent by design (prevents duplicate generation): re-running for the
 * same site + playbook reuses the existing assignment and only inserts tasks
 * for templates that don't already have one. Due dates are computed from the
 * site's anchor dates + template offsets; a template whose anchor date isn't
 * set yet produces an unscheduled task (due_date = null) to be dated later.
 */
export async function addPlaybookToSite(
  site: OpeningSite,
  playbookId: string,
): Promise<GenerateResult> {
  // 1. Find or create the assignment (unique per site+playbook).
  const existing = await supabase
    .from('opening_site_playbooks')
    .select('*')
    .eq('opening_site_id', site.id)
    .eq('playbook_id', playbookId)
    .maybeSingle()
  if (existing.error) throw existing.error

  let assignment = existing.data as SitePlaybook | null
  if (!assignment) {
    const inserted = await supabase
      .from('opening_site_playbooks')
      .insert({ opening_site_id: site.id, playbook_id: playbookId })
      .select('*')
      .single()
    if (inserted.error) throw inserted.error
    assignment = inserted.data as SitePlaybook
  }

  // 2. Load templates + the tasks already generated for this assignment.
  const templates = await listTemplates(playbookId)
  const activeTemplates = templates.filter((t) => t.active)
  const already = await supabase
    .from('opening_tasks')
    .select('task_template_id')
    .eq('site_playbook_id', assignment.id)
  if (already.error) throw already.error
  const seen = new Set(
    (already.data ?? []).map((r) => (r as { task_template_id: string | null }).task_template_id),
  )

  // 3. Insert tasks for templates not yet generated.
  const rows = activeTemplates
    .filter((t) => !seen.has(t.id))
    .map((t) => ({
      opening_site_id: site.id,
      site_playbook_id: assignment!.id,
      playbook_id: playbookId,
      task_template_id: t.id,
      title: t.title,
      description: t.description,
      anchor_type: t.anchor_type,
      offset_days: t.offset_days,
      due_date: computeDueDate(site, t.anchor_type, t.offset_days),
      date_overridden: false,
      assigned_role: t.default_owner_role,
      priority: t.required ? 'high' : 'normal',
      sequence: t.sequence,
    }))

  if (rows.length > 0) {
    const { error } = await supabase.from('opening_tasks').insert(rows)
    if (error) throw error
  }

  return {
    assignmentId: assignment.id,
    created: rows.length,
    skipped: activeTemplates.length - rows.length,
  }
}

export interface RecalcResult {
  updated: number
  preserved: number // tasks left untouched because their date was overridden
  unscheduled: number // still no anchor date
}

/**
 * Recalculate due dates after a site's anchor dates change.
 *
 * The rule (from the brief): a manually overridden due date is NEVER silently
 * changed. Only generated tasks (task_template_id set) with
 * date_overridden = false are recomputed from anchor_type + offset_days.
 */
export async function recalculateDueDates(site: OpeningSite): Promise<RecalcResult> {
  const tasks = await listTasks(site.id)
  let updated = 0
  let preserved = 0
  let unscheduled = 0

  for (const task of tasks) {
    if (task.task_template_id == null) continue // one-off — leave alone
    if (task.date_overridden) {
      preserved++
      continue
    }
    if (task.anchor_type == null || task.offset_days == null) continue
    const next = computeDueDate(site, task.anchor_type, task.offset_days)
    if (next == null) unscheduled++
    if (next !== task.due_date) {
      const { error } = await supabase
        .from('opening_tasks')
        .update({ due_date: next })
        .eq('id', task.id)
      if (error) throw error
      updated++
    }
  }
  return { updated, preserved, unscheduled }
}
