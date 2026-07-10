// THE permissions module — every access check in app code flows through
// can(); no ad-hoc role checks in components. RLS remains the enforcement
// layer (see the migration's restaurant_center_can_manage() helper); this
// module exists so the UI and the database agree on one vocabulary.
//
// Authority: CGOPS profiles (public.user_profiles) are the source of truth
// for identity and role. New Restaurant Center reads that role and maps it
// here — it never stores its own copy (no duplicate People Center).
//
// Phase 1 truth table (deliberately small, and it MUST mirror the RLS rules
// in the migration):
//   * any authenticated CGOPS user: view the shell and all opening data
//   * admin / executive / regional_leader ("managers"): create & edit
//     openings, playbooks, templates, tasks, and generate tasks
//   * admin only: delete
// location_leader and viewer are read-only in Phase 1. Initial real access
// is expected to be HQ + selected regional leadership, granted through CGOPS
// roles — never hardcoded emails.

import type { AppRole, Profile } from '../types'

export type Action = 'view' | 'create' | 'update' | 'delete'

export type Resource =
  | 'shell'
  | 'dashboard'
  | 'sites'
  | 'playbooks'
  | 'readiness'
  | 'tasks'

const MANAGER_ROLES: AppRole[] = ['admin', 'executive', 'regional_leader']

export interface PermissionUser {
  role: AppRole
  isAdmin: boolean
}

export function toPermissionUser(profile: Profile): PermissionUser {
  return { role: profile.role, isAdmin: profile.is_admin }
}

export function isManager(user: PermissionUser | null): boolean {
  return !!user && MANAGER_ROLES.includes(user.role)
}

export function can(
  user: PermissionUser | null,
  action: Action,
  _resource: Resource,
): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  if (action === 'view') return true // any authenticated CGOPS user may read
  if (action === 'delete') return false // delete is admin-only
  // create / update — managers only
  return isManager(user)
}
