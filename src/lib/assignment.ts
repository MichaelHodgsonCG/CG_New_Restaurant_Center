// The role → person resolution chain (one definition for task rows, the Team
// panel, the My Tasks toggle and the My Tasks view):
//
//   1. explicit per-task person override (assigned_person_id / support_person_id)
//   2. the site's role assignment matching the task's role text
//   3. nobody — the row shows the bare role text
//
// Resolution is dynamic, never backfilled: swap the GM on a site and every
// GM task follows immediately.

import type { OpeningTask, Profile, RosterPerson, SiteRole } from '../types'

export type AssigneeKind = 'owner' | 'support'

export interface Assignee {
  personId: string | null
  /** Display-name snapshot from the role assignment (resolution step 2). An
   *  explicit override (step 1) carries only an id — callers resolve the name
   *  from the roster. */
  personName: string | null
  /** The task's raw role / free-text label. */
  roleKey: string | null
  /** True when the person came from the site role assignment, not a per-task
   *  override. */
  viaRole: boolean
}

function normalize(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

export function resolveAssignee(
  task: OpeningTask,
  kind: AssigneeKind,
  roles: SiteRole[],
): Assignee {
  const roleKey = kind === 'owner' ? task.assigned_role : task.support_role
  const explicit = kind === 'owner' ? task.assigned_person_id : task.support_person_id
  if (explicit) return { personId: explicit, personName: null, roleKey, viaRole: false }
  if (roleKey) {
    const r = roles.find((x) => normalize(x.role_key) === normalize(roleKey))
    if (r && (r.person_id || r.person_name)) {
      return { personId: r.person_id, personName: r.person_name, roleKey, viaRole: true }
    }
  }
  return { personId: null, personName: null, roleKey, viaRole: false }
}

// --- "My tasks" matching ---------------------------------------------------

export interface CurrentUser {
  personId: string | null
  names: string[] // lowercased display names to match against snapshots/free text
}

/** Build the matchable identity for the signed-in user. person_id comes from
 *  the profile RPC (people_center_user_profiles bridge); when it is missing,
 *  an exact display-name match against the roster auto-links. */
export function buildCurrentUser(
  profile: Profile | null,
  people: RosterPerson[],
): CurrentUser | null {
  if (!profile) return null
  const names = new Set<string>()
  const add = (s: string | null | undefined) => {
    const v = normalize(s)
    if (v) names.add(v)
  }
  add(profile.display_name)
  let personId = profile.person_id
  if (personId) {
    add(people.find((p) => p.id === personId)?.name)
  } else {
    const dn = normalize(profile.display_name)
    const match = dn ? people.find((p) => normalize(p.name) === dn) : undefined
    if (match) {
      personId = match.id
      add(match.name)
    }
  }
  return { personId, names: [...names] }
}

/** True when the user has no way to be matched to any task. */
export function userIsUnresolvable(me: CurrentUser | null): boolean {
  return !me || (!me.personId && me.names.length === 0)
}

/** A task is mine when its resolved owner OR support is me — via person id,
 *  the role assignment's name snapshot, or free-text naming me in the role
 *  field (exact match; no first-name fuzziness). */
export function taskMatchesUser(
  task: OpeningTask,
  roles: SiteRole[],
  me: CurrentUser | null,
): boolean {
  if (!me) return false
  for (const kind of ['owner', 'support'] as const) {
    const a = resolveAssignee(task, kind, roles)
    if (me.personId && a.personId === me.personId) return true
    if (a.personName && me.names.includes(normalize(a.personName))) return true
    if (a.roleKey && me.names.includes(normalize(a.roleKey))) return true
  }
  return false
}
