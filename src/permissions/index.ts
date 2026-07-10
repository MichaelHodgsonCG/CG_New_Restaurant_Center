// THE permissions module — every access check in app code flows through
// can(); no ad-hoc role checks in components. RLS remains the enforcement
// layer (see the migration's restaurant_center_can_manage() helper); this
// module exists so the UI and the database agree on one vocabulary.
//
// Authority: CGOPS profiles (public.user_profiles) are the source of truth
// for identity and capability. The DATABASE decides who can manage (the
// restaurant_center_can_manage() helper — currently admin + HQ) and returns
// that decision as booleans; this module just mirrors them so the UI and RLS
// agree. No role-string matching lives in the frontend.
//
// Phase 1 truth table (MUST mirror the RLS rules in the migration):
//   * any authenticated CGOPS user: view the shell and all opening data
//   * managers (is_admin OR can_manage — i.e. admin + HQ today): create & edit
//     openings, playbooks, templates, tasks, and generate tasks
//   * admin only: delete
// Everyone else is read-only. Access is granted through CGOPS roles — never
// hardcoded emails.

import type { Profile } from '../types'

export type Action = 'view' | 'create' | 'update' | 'delete'

export type Resource =
  | 'shell'
  | 'dashboard'
  | 'sites'
  | 'playbooks'
  | 'readiness'
  | 'tasks'

export interface PermissionUser {
  isAdmin: boolean
  canManage: boolean
}

export function toPermissionUser(profile: Profile): PermissionUser {
  return { isAdmin: profile.is_admin, canManage: profile.can_manage }
}

export function can(
  user: PermissionUser | null,
  action: Action,
  _resource: Resource,
): boolean {
  if (!user) return false
  if (user.isAdmin) return true
  if (action === 'view') return true // any authenticated CGOPS user may read
  if (action === 'delete') return false // delete is admin-only
  // create / update — managers only
  return user.canManage
}
