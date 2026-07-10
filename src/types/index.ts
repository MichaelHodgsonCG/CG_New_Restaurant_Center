// Domain types for New Restaurant Center — mirror the Phase 1 schema
// (see supabase/migrations). Dates are stored and passed as calendar-date
// strings ('YYYY-MM-DD'); timestamps are ISO strings.

// --- Identity ------------------------------------------------------------

// Platform roles come from the CGOPS master profile (public.user_profiles).
// New Restaurant Center never stores its own copy of a person's role — it
// resolves this through restaurant_center_current_profile() (see
// src/features/auth/useSession.ts) and keeps the same five-role vocabulary
// as the rest of the platform.
export const APP_ROLES = [
  'admin',
  'executive',
  'regional_leader',
  'location_leader',
  'viewer',
] as const
export type AppRole = (typeof APP_ROLES)[number]

export interface Profile {
  role: AppRole
  email: string | null
  display_name: string | null
  person_id: string | null
  is_admin: boolean
}

// --- Anchors & offsets ---------------------------------------------------

// Anchor types a task template can schedule against. Offset convention:
//   due_date = anchor_date + offset_days
//   negative offset = BEFORE the anchor, positive = AFTER.
export const ANCHOR_TYPES = [
  'opening_date',
  'handover_date',
  'soft_opening_date',
  'fixed_date',
] as const
export type AnchorType = (typeof ANCHOR_TYPES)[number]

export const ANCHOR_LABELS: Record<AnchorType, string> = {
  opening_date: 'Opening date',
  handover_date: 'Construction handover',
  soft_opening_date: 'Soft-opening date',
  fixed_date: 'Fixed date (manual)',
}

// --- Site ----------------------------------------------------------------

export const SITE_STATUSES = [
  'planning',
  'in_progress',
  'pre_opening',
  'open',
  'on_hold',
  'cancelled',
] as const
export type SiteStatus = (typeof SITE_STATUSES)[number]

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  planning: 'Planning',
  in_progress: 'In progress',
  pre_opening: 'Pre-opening',
  open: 'Open',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
}

// Construction appears only as milestone references (the construction boundary
// — New Restaurant Center does not run Shanna's construction process).
export const HANDOVER_STATUSES = [
  'not_scheduled',
  'scheduled',
  'delayed',
  'complete',
] as const
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number]

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  not_scheduled: 'Not scheduled',
  scheduled: 'Scheduled',
  delayed: 'Delayed',
  complete: 'Complete',
}

export interface OpeningSite {
  id: string
  location_id: string | null // → CGOPS public.locations.id (soft ref); null for a not-yet-created upcoming location
  name: string
  concept: string | null
  address: string | null
  opening_date: string | null
  handover_date: string | null
  soft_opening_date: string | null
  status: SiteStatus
  handover_status: HandoverStatus
  construction_note: string | null
  construction_link: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type OpeningSiteInput = Omit<
  OpeningSite,
  'id' | 'created_by' | 'created_at' | 'updated_at'
>

// --- Playbooks & templates -----------------------------------------------

export interface Playbook {
  id: string
  name: string
  role_key: string | null
  department_key: string | null
  description: string | null
  active: boolean
  version: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TaskTemplate {
  id: string
  playbook_id: string
  title: string
  description: string | null
  anchor_type: AnchorType
  offset_days: number
  default_owner_role: string | null
  required: boolean
  sequence: number
  dependency_template_id: string | null
  active: boolean
  created_at: string
  updated_at: string
}

// --- Site ↔ playbook assignment ------------------------------------------

export const ASSIGNMENT_STATUSES = ['active', 'complete', 'removed'] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export interface SitePlaybook {
  id: string
  opening_site_id: string
  playbook_id: string
  assigned_lead_person_id: string | null // → CGOPS person (soft ref); People Center owns the person
  status: AssignmentStatus
  created_at: string
}

// --- Tasks ---------------------------------------------------------------

export const TASK_STATUSES = [
  'not_started',
  'in_progress',
  'blocked',
  'complete',
  'not_applicable',
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: 'Complete',
  not_applicable: 'N/A',
}

// Priority / risk indicator is kept SEPARATE from status (per the brief:
// don't overload status with too many states).
export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface OpeningTask {
  id: string
  opening_site_id: string
  site_playbook_id: string | null
  playbook_id: string | null
  task_template_id: string | null // null for one-off tasks added directly to a site
  title: string
  description: string | null
  anchor_type: AnchorType | null
  offset_days: number | null
  due_date: string | null
  date_overridden: boolean // true once a due date was set/changed by hand
  assigned_person_id: string | null // → CGOPS person (soft ref)
  assigned_role: string | null
  status: TaskStatus
  priority: TaskPriority
  at_risk: boolean
  sequence: number
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
