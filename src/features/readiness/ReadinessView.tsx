// Basic Readiness View — a cross-site, at-a-glance table of where every
// opening stands: completion, overdue, at-risk, and days to open. Deliberately
// lightweight (no deep analytics yet). Staffing readiness is a placeholder
// column until the People Center integration lands.

import { useEffect, useMemo, useState } from 'react'
import { listAllTasks, listSites } from '../../lib/api'
import { taskMetrics } from '../../lib/metrics'
import { relativeDays } from '../../lib/dates'
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SiteStatusBadge,
} from '../../components/ui'
import type { OpeningSite, OpeningTask } from '../../types'

export function ReadinessView({ onOpenSite }: { onOpenSite: (id: string) => void }) {
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

  const rows = useMemo(() => {
    const byId = new Map<string, OpeningTask[]>()
    for (const t of tasks) {
      const arr = byId.get(t.opening_site_id) ?? []
      arr.push(t)
      byId.set(t.opening_site_id, arr)
    }
    return sites
      .filter((s) => s.status !== 'cancelled')
      .map((site) => ({ site, metrics: taskMetrics(byId.get(site.id) ?? []) }))
  }, [sites, tasks])

  return (
    <div>
      <PageHeader
        title="Readiness"
        subtitle="Operational readiness at a glance across every opening."
      />
      <div className="p-4 sm:p-6">
        {error && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-charcoal/50">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState title="No openings to report on yet" />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-charcoal/50">
                  <th className="px-4 py-2.5 font-medium">Site</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Opens</th>
                  <th className="px-4 py-2.5 font-medium">Completion</th>
                  <th className="px-4 py-2.5 font-medium">Overdue</th>
                  <th className="px-4 py-2.5 font-medium">At risk</th>
                  <th className="px-4 py-2.5 font-medium">Staffing</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ site, metrics }) => (
                  <tr
                    key={site.id}
                    onClick={() => onOpenSite(site.id)}
                    className="cursor-pointer border-b border-surface-line last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-charcoal">{site.name}</div>
                      <div className="text-xs text-charcoal/50">{site.concept ?? '—'}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <SiteStatusBadge status={site.status} />
                    </td>
                    <td className="px-4 py-2.5 text-charcoal/70">
                      {site.opening_date ? relativeDays(site.opening_date) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <ProgressBar pct={metrics.completionPct} />
                        </div>
                        <span className="tabular-nums text-xs text-charcoal/60">
                          {Math.round(metrics.completionPct)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          metrics.overdue > 0
                            ? 'font-medium text-danger'
                            : 'text-charcoal/45'
                        }
                      >
                        {metrics.overdue}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          metrics.atRisk > 0
                            ? 'font-medium text-warning'
                            : 'text-charcoal/45'
                        }
                      >
                        {metrics.atRisk}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone="neutral">People Center</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <p className="mt-3 text-xs text-charcoal/45">
          Staffing readiness is owned by People Center and will populate here
          once the readiness link is connected — this app never becomes the
          system of record for people.
        </p>
      </div>
    </div>
  )
}
