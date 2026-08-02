// One opening task in the Menu Center row format: reorder arrows, checkbox,
// inline-editable title with strikethrough on complete, ghost date input,
// owner + support cells, and a right-hand cluster (at-risk flag, note,
// delete). The checkbox is the primary interaction (complete ↔ not started);
// the remaining statuses live in a compact chip menu so `blocked` and `N/A`
// keep carrying information without cluttering the row.
//
// Owner/support display the RESOLVED person: an explicit per-task link, else
// the site's role assignment (avatar appears, text keeps saying the role),
// else the bare role text.

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, CircleDashed, Flag, Lock, X } from 'lucide-react'
import { Badge, TaskStatusBadge, ghostInputClass } from '../../components/ui'
import { NotePopover } from '../../components/NotePopover'
import { Avatar, PersonPicker } from '../../components/PersonPicker'
import { formatDate, isOverdue } from '../../lib/dates'
import { resolveAssignee, type AssigneeKind } from '../../lib/assignment'
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type OpeningTask,
  type RosterPerson,
  type SiteRole,
  type TaskStatus,
} from '../../types'

// Row and column-header grids must match; the header renders spacers for the
// control and action clusters.
export const TASK_GRID = 'sm:grid-cols-[3.5rem_minmax(0,1fr)_8.5rem_7.5rem_7.5rem_6rem]'

export function TaskRow({
  task,
  people,
  roles,
  canManage,
  canMoveUp,
  canMoveDown,
  onChange,
  onDelete,
  onMove,
}: {
  task: OpeningTask
  people: RosterPerson[]
  roles: SiteRole[]
  canManage: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (patch: Partial<OpeningTask>) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [title, setTitle] = useState(task.title)
  useEffect(() => setTitle(task.title), [task.title])

  const done = task.status === 'complete'
  const na = task.status === 'not_applicable'
  const overdue = isOverdue(task)

  function setStatus(status: TaskStatus) {
    const patch: Partial<OpeningTask> = { status }
    if (status === 'complete' && !task.completed_at) {
      patch.completed_at = new Date().toISOString()
    }
    if (status !== 'complete') patch.completed_at = null
    onChange(patch)
  }

  return (
    <div
      className={`grid grid-cols-1 items-center gap-x-2 rounded-lg border px-2 py-1 ${TASK_GRID} ${
        done
          ? 'border-success/20 bg-success/5'
          : na
            ? 'border-surface-line bg-surface-muted/50 opacity-60'
            : 'border-surface-line bg-surface'
      }`}
    >
      {/* Reorder + complete */}
      <div className="flex w-14 items-center gap-1">
        {canManage && (
          <div className="flex flex-col">
            <button
              onClick={() => onMove(-1)}
              disabled={!canMoveUp}
              className="p-0.5 text-charcoal/25 transition-colors hover:text-charcoal/70 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={!canMoveDown}
              className="p-0.5 text-charcoal/25 transition-colors hover:text-charcoal/70 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          disabled={!canManage}
          onClick={() => setStatus(done ? 'not_started' : 'complete')}
          title={done ? 'Mark incomplete' : 'Mark complete'}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            done
              ? 'border-success bg-success'
              : 'border-surface-line bg-surface enabled:hover:border-charcoal/40'
          } disabled:cursor-default`}
        >
          {done && <Check className="h-3 w-3 text-white" />}
        </button>
      </div>

      {/* Title + secondary line */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {canManage ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== task.title) onChange({ title })
              }}
              placeholder="Task description…"
              className={`${ghostInputClass} ${done ? 'text-charcoal/45 line-through' : ''}`}
            />
          ) : (
            <span
              className={`px-2 py-1.5 text-sm ${done ? 'text-charcoal/45 line-through' : 'text-charcoal'}`}
            >
              {task.title}
            </span>
          )}
          {task.priority === 'high' && !done && <Badge tone="warning">Required</Badge>}
          <StatusChip status={task.status} canManage={canManage} onSelect={setStatus} />
        </div>
        {task.description && (
          <p className="px-2 pb-1 text-xs text-charcoal/50">{task.description}</p>
        )}
        {!canManage && task.notes && (
          <p className="mx-2 mb-1 rounded-md bg-surface-muted px-2 py-1 text-xs text-charcoal/60">
            {task.notes}
          </p>
        )}
      </div>

      {/* Due date */}
      <div className="relative flex items-center">
        {canManage ? (
          <input
            type="date"
            value={task.due_date ?? ''}
            onChange={(e) =>
              onChange({
                due_date: e.target.value === '' ? null : e.target.value,
                date_overridden: true,
              })
            }
            className={`${ghostInputClass} ${overdue ? '!text-danger font-medium' : ''}`}
          />
        ) : (
          <span
            className={`px-2 py-1.5 text-sm ${overdue ? 'font-medium text-danger' : 'text-charcoal/70'}`}
          >
            {formatDate(task.due_date)}
          </span>
        )}
        {task.date_overridden && task.due_date && (
          <Lock
            className="pointer-events-none absolute right-1.5 h-3 w-3 text-charcoal/30"
            aria-label="Due date set manually — recalculation will not change it"
          />
        )}
      </div>

      <AssigneeCell
        task={task}
        kind="owner"
        people={people}
        roles={roles}
        canManage={canManage}
        onChange={onChange}
      />
      <AssigneeCell
        task={task}
        kind="support"
        people={people}
        roles={roles}
        canManage={canManage}
        onChange={onChange}
      />

      {/* At-risk flag, note, delete */}
      <div className="flex w-24 items-center justify-end gap-0.5 justify-self-end">
        {canManage ? (
          <button
            onClick={() => onChange({ at_risk: !task.at_risk })}
            title={task.at_risk ? 'Clear at-risk flag' : 'Flag as at risk'}
            className={`rounded-md p-1.5 transition-colors ${
              task.at_risk
                ? 'text-warning hover:bg-warning/10'
                : 'text-charcoal/25 hover:bg-surface-muted hover:text-charcoal/70'
            }`}
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        ) : (
          task.at_risk && <Flag className="h-3.5 w-3.5 text-warning" />
        )}
        {canManage && (
          <>
            <NotePopover note={task.notes} onSave={(notes) => onChange({ notes })} />
            <button
              onClick={onDelete}
              title="Delete task"
              className="rounded-md p-1.5 text-charcoal/25 transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Owner / Support cell: PersonPicker for managers (explicit link + free text),
// static resolved display otherwise. When the person comes from the site role
// assignment, their avatar appears while the text keeps saying the role.
function AssigneeCell({
  task,
  kind,
  people,
  roles,
  canManage,
  onChange,
}: {
  task: OpeningTask
  kind: AssigneeKind
  people: RosterPerson[]
  roles: SiteRole[]
  canManage: boolean
  onChange: (patch: Partial<OpeningTask>) => void
}) {
  const a = resolveAssignee(task, kind, roles)
  const text = (kind === 'owner' ? task.assigned_role : task.support_role) ?? ''
  const explicitId = kind === 'owner' ? task.assigned_person_id : task.support_person_id
  const rolePerson = a.viaRole ? people.find((p) => p.id === a.personId) : undefined
  const roleName = a.viaRole ? (rolePerson?.name ?? a.personName) : null

  if (!canManage) {
    const explicitPerson = explicitId ? people.find((p) => p.id === explicitId) : undefined
    const display = explicitPerson?.name ?? roleName ?? text
    if (!display) return <span className="px-2 py-1.5 text-sm text-charcoal/40">—</span>
    return (
      <span
        className="flex min-w-0 items-center gap-1.5 px-2 py-1.5"
        title={roleName ? `${roleName} · via ${text}` : undefined}
      >
        {(explicitPerson || roleName) && (
          <Avatar
            name={display}
            photoUrl={explicitPerson?.photo_url ?? rolePerson?.photo_url}
            size={18}
          />
        )}
        <span className="truncate text-sm text-charcoal/70">{display}</span>
      </span>
    )
  }

  return (
    <PersonPicker
      value={text}
      personId={explicitId}
      people={people}
      placeholder={kind === 'owner' ? 'Owner' : 'Support'}
      className={ghostInputClass}
      resolved={
        roleName
          ? {
              name: roleName,
              photoUrl: rolePerson?.photo_url ?? null,
              hint: `${roleName} · via ${text}`,
            }
          : null
      }
      onChange={({ text: nextText, personId }) =>
        onChange(
          kind === 'owner'
            ? {
                assigned_role: nextText === '' ? null : nextText,
                assigned_person_id: personId,
              }
            : {
                support_role: nextText === '' ? null : nextText,
                support_person_id: personId,
              },
        )
      }
    />
  )
}

// Compact entry point to the statuses the checkbox can't express. Shows as a
// badge when one of them is active; otherwise (managers only) a subtle dashed
// circle that opens the menu.
function StatusChip({
  status,
  canManage,
  onSelect,
}: {
  status: TaskStatus
  canManage: boolean
  onSelect: (s: TaskStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const notable = status === 'in_progress' || status === 'blocked' || status === 'not_applicable'

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!canManage) return notable ? <TaskStatusBadge status={status} /> : null

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Set status"
        className={notable ? '' : 'rounded-md p-1 text-charcoal/25 transition-colors hover:bg-surface-muted hover:text-charcoal/70'}
      >
        {notable ? <TaskStatusBadge status={status} /> : <CircleDashed className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-lg border border-surface-line bg-surface py-1 shadow-lg">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setOpen(false)
                onSelect(s)
              }}
              className={`block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-muted ${
                s === status ? 'font-semibold text-charcoal' : 'text-charcoal/70'
              }`}
            >
              {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
