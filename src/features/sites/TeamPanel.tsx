// Team panel — the role → person bridge for one opening. Lists every role in
// play on this site (from the tasks' owner/support role text plus existing
// assignments) with a picker per role. Assigning a person here resolves every
// task carrying that role, immediately: resolution is dynamic, nothing is
// backfilled. Per-task overrides on the board still win.
//
// "Auto-fill" pulls each role's person from People Center's location
// settings (who holds the matching position at this site's location).
// Hand-picked assignments are never overwritten by it.

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { CollapsibleCard } from '../../components/ui'
import { PersonPicker } from '../../components/PersonPicker'
import { assignSiteRole } from '../../lib/api'
import type { OpeningTask, RosterPerson, SiteRole } from '../../types'

export function TeamPanel({
  siteId,
  tasks,
  roles,
  people,
  canManage,
  busy,
  onAutofill,
  onRoleSaved,
  onError,
}: {
  siteId: string
  tasks: OpeningTask[]
  roles: SiteRole[]
  people: RosterPerson[]
  canManage: boolean
  busy: boolean
  onAutofill: () => void
  onRoleSaved: (role: SiteRole) => void
  onError: (message: string) => void
}) {
  // Distinct roles in play, keyed case-insensitively (first-seen casing wins),
  // with how many tasks each role drives. A person's name typed as free text
  // is still "a role in play" — assigning it just resolves those rows too.
  const roleRows = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    const add = (label: string | null, count: number) => {
      const key = (label ?? '').trim().toLowerCase()
      if (!key) return
      const cur = map.get(key)
      if (cur) cur.count += count
      else map.set(key, { label: label!.trim(), count })
    }
    for (const t of tasks) {
      add(t.assigned_role, 1)
      add(t.support_role, 1)
    }
    for (const r of roles) add(r.role_key, 0)
    return [...map.entries()]
      .map(([key, v]) => ({
        key,
        label: v.label,
        count: v.count,
        assignment: roles.find((r) => r.role_key.trim().toLowerCase() === key) ?? null,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [tasks, roles])

  async function assign(roleLabel: string, next: { text: string; personId: string | null }) {
    try {
      const saved = await assignSiteRole(siteId, roleLabel, {
        id: next.personId,
        name: next.text.trim() === '' ? null : next.text.trim(),
      })
      onRoleSaved(saved)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save the role assignment.')
    }
  }

  const assignedCount = roleRows.filter(
    (r) => r.assignment && (r.assignment.person_id || r.assignment.person_name),
  ).length

  return (
    <CollapsibleCard
      title="Team"
      summary={
        roleRows.length === 0
          ? 'No roles yet'
          : `${assignedCount}/${roleRows.length} role${roleRows.length === 1 ? '' : 's'} assigned`
      }
      extra={
        canManage ? (
          <button
            onClick={onAutofill}
            disabled={busy}
            title="Fill each role with the person holding that position at this location in People Center. Roles you assigned by hand are never changed."
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-cg-orange hover:underline disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> Auto-fill
          </button>
        ) : undefined
      }
    >
      <p className="text-xs text-charcoal/55">
        Assign a person to each role — every task owned by that role resolves
        to them, including in My Tasks. People are owned by People Center.
      </p>
      {roleRows.length === 0 ? (
        <p className="mt-3 text-xs text-charcoal/45">
          Roles appear once tasks are generated for this opening.
        </p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
          {roleRows.map((r) => (
            <li key={r.key} className="grid grid-cols-[1fr_9.5rem] items-center gap-2">
              <span className="min-w-0">
                <span className="block truncate text-sm text-charcoal/80">{r.label}</span>
                <span className="block text-[10px] tabular-nums text-charcoal/40">
                  {r.count} task{r.count === 1 ? '' : 's'}
                </span>
              </span>
              {canManage ? (
                <PersonPicker
                  value={r.assignment?.person_name ?? ''}
                  personId={r.assignment?.person_id ?? null}
                  people={people}
                  placeholder="Unassigned"
                  className="w-full rounded-md border border-surface-line bg-surface px-2 py-1.5 text-xs text-charcoal placeholder:text-charcoal/35 focus:outline-none focus-visible:border-cg-orange"
                  onChange={(next) => assign(r.label, next)}
                />
              ) : (
                <span className="truncate text-xs text-charcoal/60">
                  {r.assignment?.person_name ?? '—'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </CollapsibleCard>
  )
}
