// Opening Detail — one restaurant opening end to end: site + construction
// milestones, readiness metrics, playbook assignment / task generation, and
// the task list grouped by playbook.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Wand2,
} from 'lucide-react'
import {
  addPlaybookToSite,
  createOneOffTask,
  getSite,
  listPlaybooks,
  listSitePlaybooks,
  listTasks,
  recalculateDueDates,
  updateSite,
  updateTask,
} from '../../lib/api'
import { taskMetrics } from '../../lib/metrics'
import { formatDate, relativeDays } from '../../lib/dates'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Metric,
  ProgressBar,
  Select,
  SiteStatusBadge,
  TextInput,
} from '../../components/ui'
import { SiteFormModal } from './SiteFormModal'
import { TaskRow } from './TaskRow'
import {
  HANDOVER_STATUS_LABELS,
  type OpeningSite,
  type OpeningSiteInput,
  type OpeningTask,
  type Playbook,
  type SitePlaybook,
} from '../../types'

export function SiteDetailView({
  siteId,
  canManage,
  onBack,
}: {
  siteId: string
  canManage: boolean
  onBack: () => void
}) {
  const [site, setSite] = useState<OpeningSite | null>(null)
  const [tasks, setTasks] = useState<OpeningTask[]>([])
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [assignments, setAssignments] = useState<SitePlaybook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t, pbs, asg] = await Promise.all([
        getSite(siteId),
        listTasks(siteId),
        listPlaybooks(),
        listSitePlaybooks(siteId),
      ])
      setSite(s)
      setTasks(t)
      setPlaybooks(pbs)
      setAssignments(asg)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the site.')
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    load()
  }, [load])

  const metrics = useMemo(() => taskMetrics(tasks), [tasks])
  const assignedPlaybookIds = useMemo(
    () => new Set(assignments.map((a) => a.playbook_id)),
    [assignments],
  )
  const playbookName = useCallback(
    (id: string | null) => playbooks.find((p) => p.id === id)?.name ?? 'Other tasks',
    [playbooks],
  )

  // Tasks grouped by playbook for a role-oriented read.
  const groups = useMemo(() => {
    const map = new Map<string, OpeningTask[]>()
    for (const t of tasks) {
      const key = t.playbook_id ?? '__oneoff__'
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return [...map.entries()]
  }, [tasks])

  async function patchTask(id: string, patch: Partial<OpeningTask>) {
    // Optimistic — the row already reflects the intent.
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    try {
      await updateTask(id, patch)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the task.')
      load()
    }
  }

  async function handleEditSubmit(input: OpeningSiteInput) {
    const updated = await updateSite(siteId, input)
    setSite(updated)
    setEditing(false)
    setNotice(
      'Site saved. If you changed an anchor date, use “Recalculate dates” to reschedule generated tasks.',
    )
  }

  async function handleAddPlaybook(playbookId: string) {
    if (!site) return
    setBusy(true)
    setError(null)
    try {
      const res = await addPlaybookToSite(site, playbookId)
      setNotice(
        `${playbookName(playbookId)}: ${res.created} task${res.created === 1 ? '' : 's'} generated` +
          (res.skipped ? `, ${res.skipped} already existed` : '') +
          '.',
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate tasks.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRecalc() {
    if (!site) return
    setBusy(true)
    setError(null)
    try {
      const res = await recalculateDueDates(site)
      setNotice(
        `Recalculated: ${res.updated} updated, ${res.preserved} manual dates preserved` +
          (res.unscheduled ? `, ${res.unscheduled} still unscheduled` : '') +
          '.',
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not recalculate dates.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="p-6 text-sm text-charcoal/50">Loading…</p>
  if (!site)
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="mt-4 text-sm text-danger">{error ?? 'Site not found.'}</p>
      </div>
    )

  const unassigned = playbooks.filter((p) => !assignedPlaybookIds.has(p.id))

  return (
    <div>
      {/* Header */}
      <div className="border-b border-surface-line px-4 py-4 sm:px-6">
        <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> All openings
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-charcoal">{site.name}</h1>
              <SiteStatusBadge status={site.status} />
            </div>
            <p className="mt-0.5 text-sm text-charcoal/60">
              {site.concept ?? 'Concept TBD'}
              {site.address ? ` · ${site.address}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button variant="secondary" onClick={handleRecalc} disabled={busy}>
                <RefreshCw className="h-4 w-4" /> Recalculate dates
              </Button>
            )}
            {canManage && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {notice && (
          <p className="rounded-md bg-info/10 px-3 py-2 text-sm text-info">{notice}</p>
        )}

        {/* Key dates + metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Opening" value={<DateValue iso={site.opening_date} />} />
          <Metric label="Handover" value={<DateValue iso={site.handover_date} />} />
          <Metric label="Soft open" value={<DateValue iso={site.soft_opening_date} />} />
          <Metric label="Completion" value={`${Math.round(metrics.completionPct)}%`} />
          <Metric
            label="Overdue"
            value={metrics.overdue}
            tone={metrics.overdue > 0 ? 'danger' : 'default'}
          />
          <Metric
            label="At risk"
            value={metrics.atRisk}
            tone={metrics.atRisk > 0 ? 'warning' : 'default'}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: construction milestones + staffing placeholder */}
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-charcoal">Construction milestones</h2>
              <p className="mt-0.5 text-xs text-charcoal/50">
                Reference only — construction is managed outside this system.
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-charcoal/60">Handover date</dt>
                  <dd className="font-medium">{formatDate(site.handover_date)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-charcoal/60">Handover status</dt>
                  <dd>
                    <Badge
                      tone={site.handover_status === 'complete' ? 'success' : 'neutral'}
                    >
                      {HANDOVER_STATUS_LABELS[site.handover_status]}
                    </Badge>
                  </dd>
                </div>
                {site.construction_note && (
                  <div>
                    <dt className="text-charcoal/60">Note</dt>
                    <dd className="mt-0.5 text-charcoal/80">{site.construction_note}</dd>
                  </div>
                )}
                {site.construction_link && (
                  <a
                    href={site.construction_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-cg-orange hover:underline"
                  >
                    Construction tracker <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </dl>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-semibold text-charcoal">Staffing readiness</h2>
              <p className="mt-1 text-xs text-charcoal/55">
                People are owned by People Center. This panel will surface the
                assigned person, required-by date, actual start date and a link
                to the People Center record once the readiness integration lands.
              </p>
              <div className="mt-3">
                <Badge tone="neutral">Integration pending</Badge>
              </div>
            </Card>

            {site.notes && (
              <Card className="p-4">
                <h2 className="text-sm font-semibold text-charcoal">Notes</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal/75">
                  {site.notes}
                </p>
              </Card>
            )}
          </div>

          {/* Right: playbooks + tasks */}
          <div className="space-y-4 lg:col-span-2">
            {canManage && (
              <Card className="p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-charcoal">Add a playbook</h2>
                    <p className="mt-0.5 text-xs text-charcoal/55">
                      Generates the playbook's tasks against this site's anchor
                      dates. Re-adding never duplicates existing tasks.
                    </p>
                  </div>
                  <AddPlaybook
                    playbooks={unassigned}
                    disabled={busy}
                    onAdd={handleAddPlaybook}
                  />
                </div>
                {assignments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {assignments.map((a) => (
                      <Badge key={a.id} tone="info">
                        {playbookName(a.playbook_id)}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal">
                Opening tasks
                <span className="ml-2 font-normal text-charcoal/45">
                  {metrics.complete}/{metrics.counted} complete
                </span>
              </h2>
            </div>
            {tasks.length > 0 && <ProgressBar pct={metrics.completionPct} />}

            {canManage && (
              <OneOffTaskForm
                siteId={site.id}
                disabled={busy}
                onCreated={(t) => setTasks((ts) => [...ts, t])}
              />
            )}

            {tasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                hint={
                  canManage
                    ? 'Add a playbook above to generate its tasks, or add a one-off task.'
                    : 'Tasks appear once a playbook is added to this opening.'
                }
              />
            ) : (
              <div className="space-y-4">
                {groups.map(([key, groupTasks]) => (
                  <Card key={key}>
                    <div className="border-b border-surface-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal/55">
                      {key === '__oneoff__' ? 'One-off tasks' : playbookName(key)}
                      <span className="ml-2 font-normal normal-case tracking-normal text-charcoal/40">
                        {groupTasks.filter((t) => t.status === 'complete').length}/
                        {groupTasks.filter((t) => t.status !== 'not_applicable').length}
                      </span>
                    </div>
                    {groupTasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        canManage={canManage}
                        onChange={(patch) => patchTask(t.id, patch)}
                      />
                    ))}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <SiteFormModal
          site={site}
          onCancel={() => setEditing(false)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}

function DateValue({ iso }: { iso: string | null }) {
  return (
    <span className="block">
      <span className="text-base font-semibold">{formatDate(iso)}</span>
      {iso && (
        <span className="block text-xs font-normal text-charcoal/45">
          {relativeDays(iso)}
        </span>
      )}
    </span>
  )
}

function AddPlaybook({
  playbooks,
  disabled,
  onAdd,
}: {
  playbooks: Playbook[]
  disabled: boolean
  onAdd: (id: string) => void
}) {
  const [selected, setSelected] = useState('')
  if (playbooks.length === 0)
    return <span className="text-xs text-charcoal/45">All playbooks added.</span>
  return (
    <div className="flex items-center gap-2">
      <Select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="!w-auto"
      >
        <option value="">Select a playbook…</option>
        {playbooks.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <Button
        variant="primary"
        disabled={disabled || selected === ''}
        onClick={() => {
          if (selected) onAdd(selected)
          setSelected('')
        }}
      >
        <Wand2 className="h-4 w-4" /> Generate
      </Button>
    </div>
  )
}

function OneOffTaskForm({
  siteId,
  disabled,
  onCreated,
}: {
  siteId: string
  disabled: boolean
  onCreated: (task: OpeningTask) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim() === '') return
    setSaving(true)
    try {
      const task = await createOneOffTask({
        opening_site_id: siteId,
        title: title.trim(),
        due_date: due === '' ? null : due,
        assigned_role: role.trim() === '' ? null : role.trim(),
        anchor_type: due === '' ? null : 'fixed_date',
      })
      onCreated(task)
      setTitle('')
      setDue('')
      setRole('')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="h-4 w-4" /> Add one-off task
      </Button>
    )

  return (
    <form onSubmit={submit} className="rounded-lg border border-surface-line p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Field label="Task">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="One-off task title"
              autoFocus
            />
          </Field>
        </div>
        <Field label="Due date">
          <TextInput type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Owner role">
          <TextInput
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. GM"
          />
        </Field>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving || title.trim() === ''}>
          {saving ? 'Adding…' : 'Add task'}
        </Button>
      </div>
    </form>
  )
}
