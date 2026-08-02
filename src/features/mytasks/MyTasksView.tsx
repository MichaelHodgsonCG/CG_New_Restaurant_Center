// My Tasks — the signed-in user's open tasks across every active opening,
// soonest first (the Menu Center roll-up). "Mine" is decided by the §3.4
// resolution chain: explicit per-task link, the site's role assignment
// naming me, or free text naming me exactly.

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react'
import { listAllSiteRoles, listAllTasks, listPeople, listSites, updateTask } from '../../lib/api'
import {
  buildCurrentUser,
  taskMatchesUser,
  userIsUnresolvable,
} from '../../lib/assignment'
import { bucketForTask, formatDate, type DueBucket } from '../../lib/dates'
import { Card, EmptyState, PageHeader } from '../../components/ui'
import type { OpeningSite, OpeningTask, Profile, SiteRole } from '../../types'

// Openings still in flight — tasks on opened/cancelled sites are history.
const ACTIVE_STATUSES = new Set(['planning', 'in_progress', 'pre_opening', 'on_hold'])

const BUCKET_TILES: {
  key: DueBucket
  label: string
  icon: typeof AlertCircle
  className: string
}[] = [
  { key: 'overdue', label: 'Overdue', icon: AlertCircle, className: 'border-danger/25 bg-danger/5 text-danger' },
  { key: 'week', label: 'Due in 7 days', icon: Clock, className: 'border-warning/25 bg-warning/5 text-warning' },
  { key: 'fortnight', label: 'Due in 8–14 days', icon: CalendarClock, className: 'border-info/25 bg-info/5 text-info' },
  { key: 'later', label: 'Later / on track', icon: CheckCircle2, className: 'border-success/25 bg-success/5 text-success' },
]

export function MyTasksView({
  profile,
  canManage,
  onOpenSite,
}: {
  profile: Profile | null
  canManage: boolean
  onOpenSite: (siteId: string) => void
}) {
  const [sites, setSites] = useState<OpeningSite[]>([])
  const [tasks, setTasks] = useState<OpeningTask[]>([])
  const [roles, setRoles] = useState<SiteRole[]>([])
  const [me, setMe] = useState<ReturnType<typeof buildCurrentUser>>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [s, t, r, ppl] = await Promise.all([
          listSites(),
          listAllTasks(),
          listAllSiteRoles(),
          listPeople(),
        ])
        setSites(s)
        setTasks(t)
        setRoles(r)
        setMe(buildCurrentUser(profile, ppl))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load your tasks.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile])

  const rolesBySite = useMemo(() => {
    const map = new Map<string, SiteRole[]>()
    for (const r of roles) {
      const arr = map.get(r.opening_site_id) ?? []
      arr.push(r)
      map.set(r.opening_site_id, arr)
    }
    return map
  }, [roles])

  const siteById = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites])

  const mine = useMemo(() => {
    return tasks
      .filter((t) => {
        const site = siteById.get(t.opening_site_id)
        if (!site || !ACTIVE_STATUSES.has(site.status)) return false
        if (t.status === 'complete' || t.status === 'not_applicable') return false
        return taskMatchesUser(t, rolesBySite.get(t.opening_site_id) ?? [], me)
      })
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
  }, [tasks, siteById, rolesBySite, me])

  const counts = useMemo(() => {
    const c: Record<DueBucket, number> = { overdue: 0, week: 0, fortnight: 0, later: 0 }
    for (const t of mine) {
      const b = bucketForTask(t)
      if (b) c[b]++
    }
    return c
  }, [mine])

  const grouped = BUCKET_TILES.map((b) => ({
    ...b,
    rows: mine.filter((t) => bucketForTask(t) === b.key),
  })).filter((g) => g.rows.length > 0)

  async function complete(task: OpeningTask) {
    setTasks((ts) =>
      ts.map((t) =>
        t.id === task.id
          ? { ...t, status: 'complete' as const, completed_at: new Date().toISOString() }
          : t,
      ),
    )
    try {
      await updateTask(task.id, {
        status: 'complete',
        completed_at: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete the task.')
      setTasks((ts) =>
        ts.map((t) =>
          t.id === task.id ? { ...t, status: task.status, completed_at: task.completed_at } : t,
        ),
      )
    }
  }

  return (
    <div>
      <PageHeader
        title="My Tasks"
        subtitle="Your open tasks across all active openings, soonest first."
      />
      <div className="space-y-6 p-4 sm:p-6">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-charcoal/50">Loading…</p>
        ) : userIsUnresolvable(me) ? (
          <EmptyState
            title="We couldn't match your login to a person."
            hint="Once your CGOPS profile is linked to a People Center person (or a role on an opening names you), your tasks appear here."
          />
        ) : mine.length === 0 ? (
          <EmptyState
            title="You're all clear — no open tasks assigned to you."
            hint="Tasks reach you through a role assignment on an opening's Team panel, or a direct assignment on a task."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BUCKET_TILES.map((b) => {
                const Icon = b.icon
                return (
                  <div
                    key={b.key}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${b.className}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-xl font-semibold leading-tight tabular-nums">
                        {counts[b.key]}
                      </p>
                      <p className="text-xs opacity-80">{b.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {grouped.map((g) => (
              <div key={g.key}>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-charcoal/50">
                  {g.label} · {g.rows.length}
                </h2>
                <Card>
                  {g.rows.map((t) => {
                    const site = siteById.get(t.opening_site_id)
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 border-b border-surface-line px-3 py-2.5 last:border-0"
                      >
                        {canManage && (
                          <button
                            onClick={() => complete(t)}
                            title="Mark complete"
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-surface-line bg-surface transition-colors hover:border-success hover:bg-success/10"
                          >
                            <Check className="h-3 w-3 text-transparent hover:text-success" />
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-charcoal">
                            {t.title || 'Untitled task'}
                          </p>
                          <button
                            onClick={() => onOpenSite(t.opening_site_id)}
                            className="mt-0.5 flex items-center gap-1.5 text-xs text-charcoal/50 transition-colors hover:text-charcoal"
                          >
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{site?.name ?? 'Opening'}</span>
                            {t.category && (
                              <>
                                <span className="text-charcoal/25">·</span>
                                <span className="text-charcoal/40">{t.category}</span>
                              </>
                            )}
                          </button>
                        </div>
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-charcoal/55">
                          <Calendar className="h-3 w-3 text-charcoal/35" />
                          {t.due_date ? formatDate(t.due_date) : 'No date'}
                        </span>
                      </div>
                    )
                  })}
                </Card>
              </div>
            ))}

            <p className="flex items-center gap-1.5 text-xs text-charcoal/40">
              <UserCheck className="h-3.5 w-3.5" />
              Matched via your person link, role assignments naming you, and
              exact name matches.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
