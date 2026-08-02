// Opening Detail — one restaurant opening end to end: site + construction
// milestones, readiness metrics, playbook assignment / task generation, and
// the task board in the Menu Center format: playbook blocks with category
// sections, due-date filter pills, per-section add + reorder.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  FilePlus,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  addPlaybookToSite,
  createOneOffTask,
  deleteTask,
  getSite,
  listPeople,
  listPlaybooks,
  listSitePlaybooks,
  listSiteRoles,
  listTasks,
  recalculateDueDates,
  renameTaskCategory,
  updateSite,
  updateTask,
} from '../../lib/api'
import {
  buildCurrentUser,
  taskMatchesUser,
  userIsUnresolvable,
} from '../../lib/assignment'
import {
  applyPlaybookUpdates,
  reapplyDefaultRoles,
  savePlaybookFromSite,
  updatePlaybookFromSite,
} from '../../lib/playbookSync'
import { taskMetrics } from '../../lib/metrics'
import {
  bucketForTask,
  DUE_BUCKETS,
  DUE_BUCKET_LABELS,
  formatDate,
  relativeDays,
  type DueBucket,
} from '../../lib/dates'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Metric,
  Modal,
  ProgressBar,
  Select,
  SiteStatusBadge,
  TextInput,
} from '../../components/ui'
import { SectionHeader } from '../../components/SectionHeader'
import { SiteFormModal } from './SiteFormModal'
import { TASK_GRID, TaskRow } from './TaskRow'
import { TeamPanel } from './TeamPanel'
import {
  HANDOVER_STATUS_LABELS,
  type OpeningSite,
  type OpeningSiteInput,
  type OpeningTask,
  type Playbook,
  type Profile,
  type RosterPerson,
  type SitePlaybook,
  type SiteRole,
} from '../../types'

const GENERAL = 'General' // display name for tasks without a category
const ONE_OFF = '__oneoff__'

// Openings still in flight — finished/cancelled sites don't auto-generate.
const GENERATING_STATUSES = new Set(['planning', 'in_progress', 'pre_opening', 'on_hold'])

function taskPosition(t: OpeningTask): number {
  return t.sort_order ?? t.sequence
}

function sortByPosition(tasks: OpeningTask[]): OpeningTask[] {
  return [...tasks].sort((a, b) => taskPosition(a) - taskPosition(b) || a.sequence - b.sequence)
}

export function SiteDetailView({
  siteId,
  profile,
  canManage,
  onBack,
}: {
  siteId: string
  profile: Profile | null
  canManage: boolean
  onBack: () => void
}) {
  const [site, setSite] = useState<OpeningSite | null>(null)
  const [tasks, setTasks] = useState<OpeningTask[]>([])
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [assignments, setAssignments] = useState<SitePlaybook[]>([])
  const [people, setPeople] = useState<RosterPerson[]>([])
  const [roles, setRoles] = useState<SiteRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dueFilter, setDueFilter] = useState<'all' | DueBucket>('all')
  const [myOnly, setMyOnly] = useState(false)
  const [playbookFilter, setPlaybookFilter] = useState('all') // 'all' | playbook id | ONE_OFF
  const [saveAsFor, setSaveAsFor] = useState<{ playbookId: string | null } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, initialTasks, pbs, initialAssignments, ppl, rls] = await Promise.all([
        getSite(siteId),
        listTasks(siteId),
        listPlaybooks(),
        listSitePlaybooks(siteId),
        listPeople(),
        listSiteRoles(siteId),
      ])
      let t = initialTasks
      let asg = initialAssignments

      // Every location needs every playbook: generate any missing ones on
      // sight (idempotent — only inserts what isn't there yet). New library
      // playbooks flow onto active openings with no manual step.
      if (s && canManage && GENERATING_STATUSES.has(s.status)) {
        const have = new Set(asg.map((a) => a.playbook_id))
        const missing = pbs.filter((p) => !have.has(p.id))
        if (missing.length > 0) {
          let created = 0
          for (const p of missing) {
            const r = await addPlaybookToSite(s, p.id)
            created += r.created
          }
          const refreshed = await Promise.all([listTasks(siteId), listSitePlaybooks(siteId)])
          t = refreshed[0]
          asg = refreshed[1]
          if (created > 0) {
            setNotice(
              `${created} task${created === 1 ? '' : 's'} generated from ${missing.length} playbook${
                missing.length === 1 ? '' : 's'
              } newly added to this opening.`,
            )
          }
        }
      }

      setSite(s)
      setTasks(sortByPosition(t))
      setPlaybooks(pbs)
      setAssignments(asg)
      setPeople(ppl)
      setRoles(rls)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the site.')
    } finally {
      setLoading(false)
    }
  }, [siteId, canManage])

  useEffect(() => {
    load()
  }, [load])

  const metrics = useMemo(() => taskMetrics(tasks), [tasks])
  const playbookName = useCallback(
    (id: string | null) => playbooks.find((p) => p.id === id)?.name ?? 'Other tasks',
    [playbooks],
  )

  // Playbook blocks in row order, each split into category sections in order
  // of first appearance; one-off tasks group last under "Other tasks".
  const groups = useMemo(() => {
    const map = new Map<string, OpeningTask[]>()
    for (const t of tasks) {
      const key = t.playbook_id ?? ONE_OFF
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    const entries = [...map.entries()].sort((a, b) =>
      a[0] === ONE_OFF ? 1 : b[0] === ONE_OFF ? -1 : 0,
    )
    return entries.map(([key, groupTasks]) => {
      const sections = new Map<string, OpeningTask[]>()
      for (const t of groupTasks) {
        const cat = t.category ?? GENERAL
        const arr = sections.get(cat) ?? []
        arr.push(t)
        sections.set(cat, arr)
      }
      return {
        key,
        playbookId: key === ONE_OFF ? null : key,
        name: key === ONE_OFF ? 'Other tasks' : playbookName(key),
        tasks: groupTasks,
        sections: [...sections.entries()],
      }
    })
  }, [tasks, playbookName])

  // The playbook filter scopes which block is shown — plus the progress bar
  // and due-pill counts, so "Beverage Manager · 0/61 complete" reads true.
  const scopedTasks = useMemo(
    () =>
      playbookFilter === 'all'
        ? tasks
        : tasks.filter((t) => (t.playbook_id ?? ONE_OFF) === playbookFilter),
    [tasks, playbookFilter],
  )
  const scopedMetrics = useMemo(() => taskMetrics(scopedTasks), [scopedTasks])

  const bucketCounts = useMemo(() => {
    const counts: Record<DueBucket, number> = { overdue: 0, week: 0, fortnight: 0, later: 0 }
    for (const t of scopedTasks) {
      const b = bucketForTask(t)
      if (b) counts[b]++
    }
    return counts
  }, [scopedTasks])

  const me = useMemo(() => buildCurrentUser(profile, people), [profile, people])
  const myCount = useMemo(
    () => scopedTasks.filter((t) => taskMatchesUser(t, roles, me)).length,
    [scopedTasks, roles, me],
  )

  const filtering = dueFilter !== 'all' || myOnly
  const matchesFilter = useCallback(
    (t: OpeningTask) => {
      if (myOnly && !taskMatchesUser(t, roles, me)) return false
      if (dueFilter !== 'all' && bucketForTask(t) !== dueFilter) return false
      return true
    },
    [dueFilter, myOnly, roles, me],
  )
  const visibleCount = useMemo(
    () => (filtering ? scopedTasks.filter(matchesFilter).length : scopedTasks.length),
    [scopedTasks, filtering, matchesFilter],
  )

  async function patchTask(id: string, patch: Partial<OpeningTask>) {
    // Optimistic — the row already reflects the intent.
    setTasks((ts) => sortByPosition(ts.map((t) => (t.id === id ? { ...t, ...patch } : t))))
    try {
      await updateTask(id, patch)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the task.')
      load()
    }
  }

  async function removeTask(id: string) {
    const prev = tasks
    setTasks((ts) => ts.filter((t) => t.id !== id))
    try {
      await deleteTask(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the task.')
      setTasks(prev)
    }
  }

  async function moveTask(task: OpeningTask, dir: -1 | 1) {
    const section = tasks.filter(
      (t) =>
        (t.playbook_id ?? null) === (task.playbook_id ?? null) &&
        (t.category ?? GENERAL) === (task.category ?? GENERAL),
    )
    const idx = section.findIndex((t) => t.id === task.id)
    const other = section[idx + dir]
    if (!other) return
    const a = taskPosition(task)
    const b = taskPosition(other)
    setTasks((ts) =>
      sortByPosition(
        ts.map((t) =>
          t.id === task.id ? { ...t, sort_order: b } : t.id === other.id ? { ...t, sort_order: a } : t,
        ),
      ),
    )
    try {
      await Promise.all([
        updateTask(task.id, { sort_order: b }),
        updateTask(other.id, { sort_order: a }),
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reorder the task.')
      load()
    }
  }

  async function addTask(playbookId: string | null, category: string | null) {
    if (!site) return
    const assignment = playbookId
      ? (assignments.find((a) => a.playbook_id === playbookId) ?? null)
      : null
    const positions = tasks.map(taskPosition)
    const nextPos = positions.length === 0 ? 1 : Math.max(...positions) + 1
    try {
      const task = await createOneOffTask({
        opening_site_id: site.id,
        title: '',
        category: category === GENERAL ? null : category,
        playbook_id: playbookId,
        site_playbook_id: assignment?.id ?? null,
        sort_order: nextPos,
      })
      setTasks((ts) => sortByPosition([...ts, task]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the task.')
    }
  }

  async function renameSection(playbookId: string | null, from: string, to: string) {
    if (!site) return
    setTasks((ts) =>
      ts.map((t) =>
        (t.playbook_id ?? null) === playbookId && (t.category ?? GENERAL) === from
          ? { ...t, category: to }
          : t,
      ),
    )
    try {
      await renameTaskCategory(site.id, playbookId, from, to)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename the section.')
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

  async function runPlaybookTool(action: 'apply' | 'push' | 'roles', playbookId: string) {
    if (!site) return
    const pbName = playbookName(playbookId)
    if (
      action === 'apply' &&
      !window.confirm(
        `Apply "${pbName}" template updates to this opening?\n\nNew templates become tasks, changed templates update their tasks (hand-set dates are preserved), and deactivated templates mark their open tasks N/A. Roles and people are not touched.`,
      )
    )
      return
    if (
      action === 'push' &&
      !window.confirm(
        `Update the "${pbName}" playbook from this opening?\n\nTemplate titles, sections, order, role defaults and hand-set date offsets are pushed back to the library and will shape future openings. Hand-added tasks become new templates.`,
      )
    )
      return
    setBusy(true)
    setError(null)
    try {
      if (action === 'apply') {
        const r = await applyPlaybookUpdates(site, playbookId)
        setNotice(
          `${pbName}: ${r.added} task${r.added === 1 ? '' : 's'} added, ${r.updated} updated` +
            (r.retired ? `, ${r.retired} retired to N/A (template deactivated)` : '') +
            '.',
        )
      } else if (action === 'push') {
        const r = await updatePlaybookFromSite(site, playbookId)
        setNotice(
          `"${pbName}" playbook updated: ${r.templatesUpdated} template${
            r.templatesUpdated === 1 ? '' : 's'
          } changed` +
            (r.templatesAdded
              ? `, ${r.templatesAdded} added from this opening's hand-added tasks`
              : '') +
            '.',
        )
      } else {
        const r = await reapplyDefaultRoles(site, playbookId)
        setNotice(
          `${pbName}: default roles re-applied to ${r.updated} task${r.updated === 1 ? '' : 's'}.`,
        )
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The playbook operation failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveAs(playbookId: string | null, name: string) {
    if (!site) return
    setBusy(true)
    setError(null)
    try {
      const r = await savePlaybookFromSite(site, playbookId, name)
      setNotice(
        `Playbook “${r.playbook.name}” created with ${r.templates} template${
          r.templates === 1 ? '' : 's'
        } — it's now available under Playbooks and for other openings.`,
      )
      setSaveAsFor(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the playbook.')
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
            {tasks.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setMyOnly((v) => !v)}
                title="Show only tasks you own or support"
                className={
                  myOnly ? '!border-charcoal !bg-charcoal !text-white hover:!bg-charcoal' : ''
                }
              >
                <UserCheck className="h-4 w-4" />
                My Tasks{myCount > 0 ? ` (${myCount})` : ''}
              </Button>
            )}
            {canManage && (
              <ToolsMenu
                busy={busy}
                onRecalc={handleRecalc}
                onEdit={() => setEditing(true)}
              />
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

        {/* Site context in one compact row so the task board below gets the
            full page width. */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
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

          <TeamPanel
            siteId={siteId}
            tasks={tasks}
            roles={roles}
            people={people}
            canManage={canManage}
            onRoleSaved={(saved) =>
              setRoles((rs) => {
                const rest = rs.filter((r) => r.id !== saved.id)
                return [...rest, saved].sort((a, b) => a.role_key.localeCompare(b.role_key))
              })
            }
            onError={setError}
          />

          {site.notes && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-charcoal">Notes</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-charcoal/75">
                {site.notes}
              </p>
            </Card>
          )}
        </div>

        {/* Task board — full width */}
        <div className="space-y-4">
          {tasks.length > 0 && (
            <>
              <div className="flex max-w-md items-center gap-3">
                <div className="flex-1">
                  <ProgressBar pct={scopedMetrics.completionPct} />
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-charcoal/50">
                  {scopedMetrics.complete}/{scopedMetrics.counted} complete
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={playbookFilter}
                  onChange={(e) => setPlaybookFilter(e.target.value)}
                  className="!w-auto !rounded-full !py-1.5 !text-xs"
                  title="Filter by playbook"
                >
                  <option value="all">All playbooks</option>
                  {groups.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.name}
                    </option>
                  ))}
                </Select>
                <FilterPill
                  label="All tasks"
                  active={dueFilter === 'all'}
                  activeClass="border-charcoal bg-charcoal text-white"
                  onClick={() => setDueFilter('all')}
                />
                {DUE_BUCKETS.map((b) => (
                  <FilterPill
                    key={b}
                    label={`${DUE_BUCKET_LABELS[b]} (${bucketCounts[b]})`}
                    active={dueFilter === b}
                    activeClass={BUCKET_ACTIVE_CLASS[b]}
                    onClick={() => setDueFilter(b)}
                  />
                ))}
              </div>
            </>
          )}

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              hint={
                canManage
                  ? 'Playbook tasks generate automatically for active openings — set the anchor dates and refresh, or add a one-off task below.'
                  : 'Playbook tasks generate automatically once a manager opens this page.'
              }
            />
          ) : filtering && visibleCount === 0 ? (
            <EmptyState
              title={
                myOnly && userIsUnresolvable(me)
                  ? "We couldn't match your login to a person, so we can't find your tasks yet."
                  : myOnly
                    ? 'No tasks assigned to you in this view.'
                    : 'No open tasks in this timeframe.'
              }
            />
          ) : (
            <div className="space-y-6">
              {groups
                .filter((g) => playbookFilter === 'all' || g.key === playbookFilter)
                .map((group) => (
                <PlaybookBlock
                  key={group.key}
                  name={group.name}
                  playbookId={group.playbookId}
                  tasks={group.tasks}
                  sections={group.sections}
                  people={people}
                  roles={roles}
                  canManage={canManage}
                  filtering={filtering}
                  busy={busy}
                  matchesFilter={matchesFilter}
                  onPatch={patchTask}
                  onDelete={removeTask}
                  onMove={moveTask}
                  onAddTask={addTask}
                  onRenameSection={renameSection}
                  onTool={runPlaybookTool}
                  onSaveAs={(playbookId) => setSaveAsFor({ playbookId })}
                />
                ))}
            </div>
          )}

          {canManage && !filtering && (
            <Button variant="secondary" onClick={() => addTask(null, null)} disabled={busy}>
              <Plus className="h-4 w-4" /> Add one-off task
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <SiteFormModal
          site={site}
          onCancel={() => setEditing(false)}
          onSubmit={handleEditSubmit}
        />
      )}
      {saveAsFor && (
        <SaveAsPlaybookModal
          sourceName={saveAsFor.playbookId ? playbookName(saveAsFor.playbookId) : 'Other tasks'}
          busy={busy}
          onCancel={() => setSaveAsFor(null)}
          onSubmit={(name) => handleSaveAs(saveAsFor.playbookId, name)}
        />
      )}
    </div>
  )
}

function SaveAsPlaybookModal({
  sourceName,
  busy,
  onCancel,
  onSubmit,
}: {
  sourceName: string
  busy: boolean
  onCancel: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <Modal onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim() !== '') onSubmit(name.trim())
        }}
      >
        <h2 className="mb-1 font-semibold">Save as new playbook</h2>
        <p className="mb-3 text-xs text-charcoal/55">
          Snapshots the “{sourceName}” tasks on this opening as a reusable
          playbook (e.g. a concept-specific variant). This opening is not
          changed.
        </p>
        <Field label="Playbook name" hint="e.g. General Manager — Beertown variant">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy || name.trim() === ''}>
            {busy ? 'Saving…' : 'Create playbook'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const BUCKET_ACTIVE_CLASS: Record<DueBucket, string> = {
  overdue: 'border-danger bg-danger text-white',
  week: 'border-warning bg-warning text-white',
  fortnight: 'border-info bg-info text-white',
  later: 'border-success bg-success text-white',
}

function FilterPill({
  label,
  active,
  activeClass,
  onClick,
}: {
  label: string
  active: boolean
  activeClass: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? activeClass
          : 'border-surface-line bg-surface text-charcoal/55 hover:border-charcoal/25 hover:text-charcoal/80'
      }`}
    >
      {label}
    </button>
  )
}

function PlaybookBlock({
  name,
  playbookId,
  tasks,
  sections,
  people,
  roles,
  canManage,
  filtering,
  busy,
  matchesFilter,
  onPatch,
  onDelete,
  onMove,
  onAddTask,
  onRenameSection,
  onTool,
  onSaveAs,
}: {
  name: string
  playbookId: string | null
  tasks: OpeningTask[]
  sections: [string, OpeningTask[]][]
  people: RosterPerson[]
  roles: SiteRole[]
  canManage: boolean
  filtering: boolean
  busy: boolean
  matchesFilter: (t: OpeningTask) => boolean
  onPatch: (id: string, patch: Partial<OpeningTask>) => void
  onDelete: (id: string) => void
  onMove: (task: OpeningTask, dir: -1 | 1) => void
  onAddTask: (playbookId: string | null, category: string | null) => void
  onRenameSection: (playbookId: string | null, from: string, to: string) => void
  onTool: (action: 'apply' | 'push' | 'roles', playbookId: string) => void
  onSaveAs: (playbookId: string | null) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [newSection, setNewSection] = useState('')
  const complete = tasks.filter((t) => t.status === 'complete').length
  const counted = tasks.filter((t) => t.status !== 'not_applicable').length
  const visibleSections = filtering
    ? sections
        .map(([cat, ts]) => [cat, ts.filter(matchesFilter)] as [string, OpeningTask[]])
        .filter(([, ts]) => ts.length > 0)
    : sections

  if (filtering && visibleSections.length === 0) return null

  return (
    <div>
      <div className="flex w-full items-center gap-2 pb-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-charcoal/40 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          />
          <h2 className="truncate text-sm font-semibold text-charcoal">{name}</h2>
        </button>
        <span className="text-xs tabular-nums text-charcoal/40">
          {complete}/{counted}
        </span>
        {canManage && !filtering && (
          <BlockMenu
            playbookId={playbookId}
            busy={busy}
            onTool={onTool}
            onSaveAs={() => onSaveAs(playbookId)}
          />
        )}
      </div>

      {!collapsed && (
        <div className="space-y-5 pl-1">
          {visibleSections.map(([category, sectionTasks]) => (
            <div key={category}>
              <SectionHeader
                name={category}
                count={`${sectionTasks.filter((t) => t.status === 'complete').length}/${
                  sectionTasks.filter((t) => t.status !== 'not_applicable').length
                }`}
                onRename={
                  canManage && !filtering && category !== GENERAL
                    ? (to) => onRenameSection(playbookId, category, to)
                    : undefined
                }
              />

              <div
                className={`mt-1.5 hidden grid-cols-1 gap-x-2 px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-charcoal/40 sm:grid ${TASK_GRID}`}
              >
                <span className="w-14" />
                <span>Task</span>
                <span>Due date</span>
                <span>Owner</span>
                <span>Support</span>
                <span className="w-24" />
              </div>

              <div className="space-y-1.5">
                {sectionTasks.map((task, idx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    people={people}
                    roles={roles}
                    canManage={canManage}
                    canMoveUp={!filtering && idx > 0}
                    canMoveDown={!filtering && idx < sectionTasks.length - 1}
                    onChange={(patch) => onPatch(task.id, patch)}
                    onDelete={() => onDelete(task.id)}
                    onMove={(dir) => onMove(task, dir)}
                  />
                ))}
              </div>

              {canManage && !filtering && (
                <button
                  onClick={() => onAddTask(playbookId, category)}
                  className="mt-1.5 flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-charcoal/40 transition-colors hover:text-charcoal/80"
                >
                  <Plus className="h-3.5 w-3.5" /> Add task
                </button>
              )}
            </div>
          ))}

          {canManage && !filtering && (
            <div className="flex max-w-sm items-center gap-2 border-t border-surface-line/60 pt-2">
              <TextInput
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSection.trim() !== '') {
                    onAddTask(playbookId, newSection.trim())
                    setNewSection('')
                  }
                }}
                placeholder="New section name…"
                className="!py-1.5 !text-xs"
              />
              <Button
                variant="ghost"
                className="!px-2 !py-1.5 !text-xs"
                disabled={newSection.trim() === ''}
                onClick={() => {
                  onAddTask(playbookId, newSection.trim())
                  setNewSection('')
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add section
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Per-playbook sync tools (the Menu Center Tools menu, scoped to one block).
// The one-off "Other tasks" block only offers the snapshot.
function BlockMenu({
  playbookId,
  busy,
  onTool,
  onSaveAs,
}: {
  playbookId: string | null
  busy: boolean
  onTool: (action: 'apply' | 'push' | 'roles', playbookId: string) => void
  onSaveAs: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function run(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Playbook tools"
        className="rounded-md p-1 text-charcoal/35 transition-colors hover:bg-surface-muted hover:text-charcoal/70"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-surface-line bg-surface py-1 shadow-lg">
          {playbookId && (
            <>
              <ToolItem
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                label="Apply playbook updates"
                disabled={busy}
                onClick={() => run(() => onTool('apply', playbookId))}
              />
              <ToolItem
                icon={<Upload className="h-3.5 w-3.5" />}
                label="Update playbook from this opening"
                disabled={busy}
                onClick={() => run(() => onTool('push', playbookId))}
              />
              <ToolItem
                icon={<Users className="h-3.5 w-3.5" />}
                label="Re-apply default roles"
                disabled={busy}
                onClick={() => run(() => onTool('roles', playbookId))}
              />
              <hr className="my-1 border-surface-line" />
            </>
          )}
          <ToolItem
            icon={<FilePlus className="h-3.5 w-3.5" />}
            label="Save as new playbook…"
            disabled={busy}
            onClick={() => run(onSaveAs)}
          />
        </div>
      )}
    </div>
  )
}

function ToolsMenu({
  busy,
  onRecalc,
  onEdit,
}: {
  busy: boolean
  onRecalc: () => void
  onEdit: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)}>
        <Settings className="h-4 w-4" /> Tools
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-surface-line bg-surface py-1 shadow-lg">
          <ToolItem
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            label="Recalculate dates"
            disabled={busy}
            onClick={() => {
              setOpen(false)
              onRecalc()
            }}
          />
          <ToolItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="Edit details"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          />
        </div>
      )}
    </div>
  )
}

function ToolItem({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-charcoal/75 transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
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
