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
  RosterPerson,
  SitePlaybook,
  SiteRole,
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
    .order('sort_order', { nullsFirst: false })
    .order('sequence')
  if (error) throw error
  return (data ?? []) as TaskTemplate[]
}

export async function createTemplate(
  input: Pick<TaskTemplate, 'playbook_id' | 'title' | 'anchor_type' | 'offset_days'> &
    Partial<
      Pick<
        TaskTemplate,
        | 'description'
        | 'category'
        | 'default_owner_role'
        | 'default_owner_person_id'
        | 'default_support_role'
        | 'default_support_person_id'
        | 'required'
        | 'sequence'
        | 'sort_order'
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
  // Board order: manual position within a section, not due date — the board
  // groups by playbook → category and each section keeps its curated order.
  const { data, error } = await supabase
    .from('opening_tasks')
    .select('*')
    .eq('opening_site_id', siteId)
    .order('sort_order', { nullsFirst: false })
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
        | 'category'
        | 'playbook_id'
        | 'site_playbook_id'
        | 'anchor_type'
        | 'offset_days'
        | 'due_date'
        | 'assigned_role'
        | 'priority'
        | 'sequence'
        | 'sort_order'
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

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('opening_tasks').delete().eq('id', id)
  if (error) throw error
}

/** Rename a section on a site's board: every task in the (playbook, category)
 *  pair moves to the new name. Sections have no table of their own — they are
 *  the distinct category values, so a rename is a bulk update. */
export async function renameTaskCategory(
  siteId: string,
  playbookId: string | null,
  from: string,
  to: string,
): Promise<void> {
  let q = supabase
    .from('opening_tasks')
    .update({ category: to })
    .eq('opening_site_id', siteId)
    .eq('category', from)
  q = playbookId === null ? q.is('playbook_id', null) : q.eq('playbook_id', playbookId)
  const { error } = await q
  if (error) throw error
}

/** Same rename for the template library, scoped to one playbook. */
export async function renameTemplateCategory(
  playbookId: string,
  from: string,
  to: string,
): Promise<void> {
  const { error } = await supabase
    .from('opening_task_templates')
    .update({ category: to })
    .eq('playbook_id', playbookId)
    .eq('category', from)
  if (error) throw error
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
      category: t.category,
      anchor_type: t.anchor_type,
      offset_days: t.offset_days,
      due_date: computeDueDate(site, t.anchor_type, t.offset_days),
      date_overridden: false,
      assigned_role: t.default_owner_role,
      assigned_person_id: t.default_owner_person_id,
      support_role: t.default_support_role,
      support_person_id: t.default_support_person_id,
      priority: t.required ? 'high' : 'normal',
      sequence: t.sequence,
      sort_order: t.sort_order ?? t.sequence,
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

// --- People & role assignments -------------------------------------------

interface PeopleViewRow {
  id: string
  full_name: string | null
  preferred_name: string | null
  person_kind: string | null
  is_head_office: boolean | null
  photo_url: string | null
}

/** Picker display name: keep the preferred first name but include the surname
 *  so people stay distinguishable ("Mike" + "Michael Hodgson" → "Mike
 *  Hodgson"). Falls back to whichever name is present. */
function personDisplayName(preferred: string, full: string): string {
  const p = preferred.trim()
  const f = full.trim()
  if (!p) return f
  if (!f) return p
  const lastName = f.split(/\s+/).slice(-1)[0]
  return p.toLowerCase().includes(lastName.toLowerCase()) ? p : `${p} ${lastName}`
}

/** People available in the owner/support/role pickers, from the
 *  restaurant_center_people view (readable by every authenticated user;
 *  exposes only picker fields). Sorted by display name. */
export async function listPeople(): Promise<RosterPerson[]> {
  const { data, error } = await supabase
    .from('restaurant_center_people')
    .select('id, full_name, preferred_name, person_kind, is_head_office, photo_url')
  if (error) throw error
  return ((data ?? []) as PeopleViewRow[])
    .map((p) => ({
      id: p.id,
      name: personDisplayName(p.preferred_name ?? '', p.full_name ?? ''),
      role: p.is_head_office
        ? 'Head Office'
        : p.person_kind === 'emerging_leader'
          ? 'Emerging Leader'
          : 'Manager',
      photo_url: p.photo_url,
    }))
    .filter((p) => p.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listSiteRoles(siteId: string): Promise<SiteRole[]> {
  const { data, error } = await supabase
    .from('opening_site_roles')
    .select('*')
    .eq('opening_site_id', siteId)
    .order('role_key')
  if (error) throw error
  return (data ?? []) as SiteRole[]
}

/** Role assignments across every site — for the cross-site My Tasks view. */
export async function listAllSiteRoles(): Promise<SiteRole[]> {
  const { data, error } = await supabase.from('opening_site_roles').select('*')
  if (error) throw error
  return (data ?? []) as SiteRole[]
}

/** Assign (or clear) the person holding a role on a site. Upserts on the
 *  (site, role) unique key so the Team panel is a single-action write.
 *  A hand-pick clears the autofilled flag, which locks the row against the
 *  People Center auto-fill. */
export async function assignSiteRole(
  siteId: string,
  roleKey: string,
  person: { id: string | null; name: string | null },
): Promise<SiteRole> {
  const { data, error } = await supabase
    .from('opening_site_roles')
    .upsert(
      {
        opening_site_id: siteId,
        role_key: roleKey,
        person_id: person.id,
        person_name: person.name,
        autofilled: false,
      },
      { onConflict: 'opening_site_id,role_key' },
    )
    .select('*')
    .single()
  if (error) throw error
  return data as SiteRole
}

export interface RoleAutofillResult {
  role_label: string
  outcome: 'filled' | 'manual' | 'no_location' | 'no_role_match' | 'no_person' | 'ambiguous'
  person_name: string | null
}

/**
 * Auto-fill the Team panel from People Center's location settings: each role
 * in play resolves to the person holding the matching position at the site's
 * location (people_center_position_assignments). Hand-assigned roles are
 * never touched; zero or ambiguous holders are reported for a manual pick,
 * never guessed. Department/HQ roles resolve only when the position is
 * actually assigned at the location.
 */
export async function autofillSiteRoles(siteId: string): Promise<RoleAutofillResult[]> {
  const { data, error } = await supabase.rpc('restaurant_center_autofill_site_roles', {
    p_site_id: siteId,
  })
  if (error) throw error
  return (data ?? []) as RoleAutofillResult[]
}

// --- Platform feedback ---------------------------------------------------

export interface PlatformFeedbackInput {
  app_module: string
  screen: string
  device: string
  user_agent: string
  message: string
  type: 'bug' | 'idea' | 'question' | null
}

// Inserts into the CGOPS-owned platform_feedback table. Identity columns
// (auth_user_id, display_name, person_id) are stamped by a DB trigger on
// insert — the app only attaches context.
export async function submitPlatformFeedback(input: PlatformFeedbackInput): Promise<void> {
  const { error } = await supabase.from('platform_feedback').insert(input)
  if (error) throw error
}
