// Opening Dashboard — a calm, scannable roll-up of every opening site.
// Intentionally simple (no deep analytics yet): each card shows the dates,
// countdown, completion, and risk signals leadership needs at a glance.

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Plus } from 'lucide-react'
import { listAllTasks, listSites } from '../../lib/api'
import { taskMetrics } from '../../lib/metrics'
import { daysUntil, formatDate, relativeDays } from '../../lib/dates'
import {
  Button,
  Card,
  EmptyState,
  Metric,
  PageHeader,
  ProgressBar,
  SiteStatusBadge,
} from '../../components/ui'
import type { OpeningSite, OpeningTask } from '../../types'

export function DashboardView({
  canManage,
  onOpenSite,
  onNewSite,
}: {
  canManage: boolean
  onOpenSite: (id: string) => void
  onNewSite: () => void
}) {
  const [sites, setSites] = useState<OpeningSite[]>([])
  const [tasks, setTasks] = useState<OpeningTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listSites(), listAllTasks()])
      .then(([s, t]) => {
        if (cancelled) return
        setSites(s)
        setTasks(t)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const tasksBySite = useMemo(() => {
    const map = new Map<string, OpeningTask[]>()
    for (const t of tasks) {
      const arr = map.get(t.opening_site_id) ?? []
      arr.push(t)
      map.set(t.opening_site_id, arr)
    }
    return map
  }, [tasks])

  const active = useMemo(
    () => sites.filter((s) => s.status !== 'cancelled' && s.status !== 'open'),
    [sites],
  )
  const totals = useMemo(() => taskMetrics(tasks), [tasks])

  return (
    <div>
      <PageHeader
        title="Opening Dashboard"
        subtitle="Operational readiness across every restaurant in flight."
        actions={
          canManage ? (
            <Button variant="primary" onClick={onNewSite}>
              <Plus className="h-4 w-4" /> New opening
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Active openings" value={active.length} />
          <Metric label="Overall completion" value={`${Math.round(totals.completionPct)}%`} />
          <Metric
            label="Overdue tasks"
            value={totals.overdue}
            tone={totals.overdue > 0 ? 'danger' : 'default'}
          />
          <Metric
            label="At-risk tasks"
            value={totals.atRisk}
            tone={totals.atRisk > 0 ? 'warning' : 'default'}
          />
        </div>

        {loading ? (
          <p className="text-sm text-charcoal/50">Loading…</p>
        ) : sites.length === 0 ? (
          <EmptyState
            title="No openings yet"
            hint={
              canManage
                ? 'Create the first opening to start coordinating its operational tasks.'
                : 'Openings will appear here once leadership creates them.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                tasks={tasksBySite.get(site.id) ?? []}
                onOpen={() => onOpenSite(site.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SiteCard({
  site,
  tasks,
  onOpen,
}: {
  site: OpeningSite
  tasks: OpeningTask[]
  onOpen: () => void
}) {
  const m = taskMetrics(tasks)
  const dUntilOpen = daysUntil(site.opening_date)

  return (
    <Card className="flex flex-col p-4 text-left transition-shadow hover:shadow-md">
      <button onClick={onOpen} className="text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-charcoal">{site.name}</h3>
            <p className="truncate text-sm text-charcoal/55">{site.concept ?? 'Concept TBD'}</p>
          </div>
          <SiteStatusBadge status={site.status} />
        </div>
      </button>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-charcoal/45">Opening</dt>
          <dd className="font-medium">{formatDate(site.opening_date)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-charcoal/45">Handover</dt>
          <dd className="font-medium">{formatDate(site.handover_date)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-1.5 text-sm text-charcoal/70">
        <CalendarClock className="h-4 w-4 text-charcoal/40" />
        {dUntilOpen === null ? (
          <span>Opening date not set</span>
        ) : dUntilOpen >= 0 ? (
          <span>
            Opens <span className="font-medium text-charcoal">{relativeDays(site.opening_date)}</span>
          </span>
        ) : (
          <span>Opened {relativeDays(site.opening_date)}</span>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-charcoal/55">
          <span>Task completion</span>
          <span className="tabular-nums">
            {m.complete}/{m.counted} · {Math.round(m.completionPct)}%
          </span>
        </div>
        <ProgressBar pct={m.completionPct} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className={m.overdue > 0 ? 'font-medium text-danger' : 'text-charcoal/45'}>
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          {m.overdue} overdue
        </span>
        <span className={m.atRisk > 0 ? 'font-medium text-warning' : 'text-charcoal/45'}>
          {m.atRisk} at risk
        </span>
        {/* Staffing readiness is owned by People Center — placeholder until the
            readiness link lands (see docs/ARCHITECTURE.md). */}
        <span className="text-charcoal/35" title="Staffing readiness comes from People Center">
          Staffing —
        </span>
      </div>
    </Card>
  )
}
