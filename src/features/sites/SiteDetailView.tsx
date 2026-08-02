// Opening Detail — one restaurant opening end to end: site + construction
// milestones, readiness metrics, playbook assignment / task generation, and
// the task board in the Menu Center format: playbook blocks with category
// sections, due-date filter pills, per-section add + reorder.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  UserCheck,
  Wand2,
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
  Metric,
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t, pbs, asg, ppl, rls] = await Promise.all([
        getSite(siteId),
        listTasks(siteId),
        listPlaybooks(),
        listSitePlaybooks(siteId),
        listPeople(),
        listSiteRoles(siteId),
      ])
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

  const bucketCounts = useMemo(() => {
    const counts: Record<DueBucket, number> = { overdue: 0, week: 0, fortnight: 0, later: 0 }
    for (const t of tasks) {
      const b = bucketForTask(t)
      if (b) counts[b]++
    }
    return counts
  }, [tasks])

  const me = useMemo(() => buildCurrentUser(profile, people), [profile, people])
  const myCount = useMemo(
    () => tasks.filter((t) => taskMatchesUser(t, roles, me)).length,
    [tasks, roles, me],
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
    () => (filtering ? tasks.filter(matchesFilter).length : tasks.length),
    [tasks, filtering, matchesFilter],
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
  const trackedNames = assignments.map((a) => playbookName(a.playbook_id))

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
            {trackedNames.length > 0 && (
              <p className="mt-1 text-xs text-charcoal/45">
                Tracking: {trackedNames.join(' · ')}
              </p>
            )}
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

          {/* Right: playbooks + task board */}
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
              </Card>
            )}

            {tasks.length > 0 && (
              <>
                <div className="flex max-w-md items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar pct={metrics.completionPct} />
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-charcoal/50">
                    {metrics.complete}/{metrics.counted} complete
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                    ? 'Add a playbook above to generate its tasks, or add a one-off task below.'
                    : 'Tasks appear once a playbook is added to this opening.'
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
                {groups.map((group) => (
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
                    matchesFilter={matchesFilter}
                    onPatch={patchTask}
                    onDelete={removeTask}
                    onMove={moveTask}
                    onAddTask={addTask}
                    onRenameSection={renameSection}
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
  matchesFilter,
  onPatch,
  onDelete,
  onMove,
  onAddTask,
  onRenameSection,
}: {
  name: string
  playbookId: string | null
  tasks: OpeningTask[]
  sections: [string, OpeningTask[]][]
  people: RosterPerson[]
  roles: SiteRole[]
  canManage: boolean
  filtering: boolean
  matchesFilter: (t: OpeningTask) => boolean
  onPatch: (id: string, patch: Partial<OpeningTask>) => void
  onDelete: (id: string) => void
  onMove: (task: OpeningTask, dir: -1 | 1) => void
  onAddTask: (playbookId: string | null, category: string | null) => void
  onRenameSection: (playbookId: string | null, from: string, to: string) => void
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
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 pb-2"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <ChevronDown
          className={`h-4 w-4 text-charcoal/40 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
        <h2 className="text-sm font-semibold text-charcoal">{name}</h2>
        <span className="ml-auto text-xs tabular-nums text-charcoal/40">
          {complete}/{counted}
        </span>
      </button>

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
