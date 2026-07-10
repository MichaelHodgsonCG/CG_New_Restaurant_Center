// Opening Sites — the master list of every opening, with create. Rows are
// dense and scannable; clicking one opens its detail.

import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { createSite, listSites } from '../../lib/api'
import { formatDate, relativeDays } from '../../lib/dates'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SiteStatusBadge,
} from '../../components/ui'
import { SiteFormModal } from './SiteFormModal'
import type { OpeningSite, OpeningSiteInput } from '../../types'

export function SitesView({
  canManage,
  startCreating,
  onCreateHandled,
  onOpenSite,
}: {
  canManage: boolean
  startCreating: boolean
  onCreateHandled: () => void
  onOpenSite: (id: string) => void
}) {
  const [sites, setSites] = useState<OpeningSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    listSites()
      .then(setSites)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => load(), [load])

  // The dashboard's "New opening" button routes here with a create request.
  useEffect(() => {
    if (startCreating && canManage) setCreating(true)
    if (startCreating) onCreateHandled()
  }, [startCreating, canManage, onCreateHandled])

  async function handleCreate(input: OpeningSiteInput) {
    const site = await createSite(input)
    setCreating(false)
    onOpenSite(site.id)
  }

  return (
    <div>
      <PageHeader
        title="Opening Sites"
        subtitle="Every restaurant opening, newest target first."
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New opening
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {loading ? (
          <p className="text-sm text-charcoal/50">Loading…</p>
        ) : sites.length === 0 ? (
          <EmptyState
            title="No openings yet"
            hint={canManage ? 'Use “New opening” to add the first site.' : undefined}
          />
        ) : (
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-charcoal/50">
                  <th className="px-4 py-2.5 font-medium">Site</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Concept</th>
                  <th className="px-4 py-2.5 font-medium">Opening</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Handover</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr
                    key={site.id}
                    onClick={() => onOpenSite(site.id)}
                    className="cursor-pointer border-b border-surface-line last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-charcoal">{site.name}</div>
                      <div className="text-xs text-charcoal/50 sm:hidden">
                        {site.concept ?? 'Concept TBD'}
                      </div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-charcoal/70 sm:table-cell">
                      {site.concept ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{formatDate(site.opening_date)}</div>
                      <div className="text-xs text-charcoal/50">
                        {site.opening_date ? relativeDays(site.opening_date) : ''}
                      </div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-charcoal/70 md:table-cell">
                      {formatDate(site.handover_date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <SiteStatusBadge status={site.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {creating && (
        <SiteFormModal onCancel={() => setCreating(false)} onSubmit={handleCreate} />
      )}
    </div>
  )
}
