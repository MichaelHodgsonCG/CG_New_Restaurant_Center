// One opening task, editable inline. Managers can change status, owner role,
// assigned person (hand-picking flags a manual override so assignee auto-fill
// leaves it alone; clearing returns the task to auto-fill), due date (which
// flags a manual override so recalculation leaves it alone), priority/at-risk,
// and notes. Read-only users see the same information without controls.

import { useState } from 'react'
import { CheckCircle2, Flag, Lock } from 'lucide-react'
import { Badge, Select, TextInput } from '../../components/ui'
import { formatDate, isOverdue, relativeDays } from '../../lib/dates'
import {
  TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type OpeningTask,
  type Person,
  type TaskPriority,
  type TaskStatus,
} from '../../types'

export function TaskRow({
  task,
  canManage,
  people,
  onChange,
}: {
  task: OpeningTask
  canManage: boolean
  people: Person[]
  onChange: (patch: Partial<OpeningTask>) => void
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const overdue = isOverdue(task)
  const done = task.status === 'complete'

  function setStatus(status: TaskStatus) {
    const patch: Partial<OpeningTask> = { status }
    // Stamp/clear completion metadata as the status crosses the finish line.
    if (status === 'complete' && !task.completed_at) {
      patch.completed_at = new Date().toISOString()
    }
    if (status !== 'complete') patch.completed_at = null
    onChange(patch)
  }

  return (
    <div
      className={`border-b border-surface-line px-3 py-2.5 last:border-0 ${
        done ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          disabled={!canManage}
          onClick={() => setStatus(done ? 'not_started' : 'complete')}
          title={done ? 'Mark not started' : 'Mark complete'}
          className={`mt-0.5 shrink-0 rounded-full ${
            done ? 'text-success' : 'text-charcoal/25 hover:text-success'
          } disabled:hover:text-charcoal/25`}
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-medium ${done ? 'line-through' : ''}`}>
              {task.title}
            </span>
            {task.priority === 'high' && (
              <Badge tone="warning">Required</Badge>
            )}
            {task.at_risk && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-warning">
                <Flag className="h-3 w-3" /> At risk
              </span>
            )}
            {task.date_overridden && (
              <span
                className="inline-flex items-center gap-0.5 text-xs text-charcoal/40"
                title="Due date set manually — recalculation will not change it"
              >
                <Lock className="h-3 w-3" /> manual date
              </span>
            )}
          </div>

          {task.description && (
            <p className="mt-0.5 text-xs text-charcoal/55">{task.description}</p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal/60">
            <span className={overdue ? 'font-medium text-danger' : ''}>
              Due {formatDate(task.due_date)}
              {task.due_date ? ` · ${relativeDays(task.due_date)}` : ' · unscheduled'}
            </span>
            {task.assigned_role && (
              <span>
                Owner: {task.assigned_role}
                {task.assigned_person_name ? (
                  <span className="text-charcoal/80"> — {task.assigned_person_name}</span>
                ) : (
                  <span className="text-charcoal/40"> — unassigned</span>
                )}
                {task.assignee_overridden && (
                  <span
                    className="ml-1 inline-flex items-center gap-0.5 text-charcoal/40"
                    title="Person picked manually — assignee auto-fill will not change it"
                  >
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </span>
            )}
            {!task.assigned_role && task.assigned_person_name && (
              <span>Owner: {task.assigned_person_name}</span>
            )}
          </div>

          {canManage && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select
                value={task.status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="!w-auto py-1 text-xs"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              <Select
                value={task.priority}
                onChange={(e) => onChange({ priority: e.target.value as TaskPriority })}
                className="!w-auto py-1 text-xs"
                title="Priority"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-1 text-xs text-charcoal/60">
                <input
                  type="checkbox"
                  checked={task.at_risk}
                  onChange={(e) => onChange({ at_risk: e.target.checked })}
                />
                at risk
              </label>
              <TextInput
                type="date"
                value={task.due_date ?? ''}
                onChange={(e) =>
                  onChange({
                    due_date: e.target.value === '' ? null : e.target.value,
                    date_overridden: true,
                  })
                }
                className="!w-auto py-1 text-xs"
                title="Set due date (marks a manual override)"
              />
              <TextInput
                defaultValue={task.assigned_role ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v !== (task.assigned_role ?? ''))
                    onChange({ assigned_role: v === '' ? null : v })
                }}
                placeholder="Owner role"
                className="!w-32 py-1 text-xs"
              />
              <TextInput
                key={task.assigned_person_name ?? ''}
                list={`people-${task.id}`}
                defaultValue={task.assigned_person_name ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v === (task.assigned_person_name ?? '')) return
                  if (v === '') {
                    // Clearing returns the task to auto-fill on the next refresh.
                    onChange({
                      assigned_person_id: null,
                      assigned_person_name: null,
                      assignee_overridden: false,
                    })
                    return
                  }
                  const person = people.find(
                    (p) => p.full_name.toLowerCase() === v.toLowerCase(),
                  )
                  // Only roster people can be assigned; unmatched text is not saved.
                  if (person)
                    onChange({
                      assigned_person_id: person.id,
                      assigned_person_name: person.full_name,
                      assignee_overridden: true,
                    })
                }}
                placeholder="Person (auto)"
                className="!w-36 py-1 text-xs"
                title="Pick a person from the roster (marks a manual override; clear to return to auto-fill)"
              />
              <datalist id={`people-${task.id}`}>
                {people.map((p) => (
                  <option key={p.id} value={p.full_name} />
                ))}
              </datalist>
              <button
                onClick={() => setNotesOpen((o) => !o)}
                className="text-xs text-cg-orange hover:underline"
              >
                {task.notes ? 'Edit note' : 'Add note'}
              </button>
            </div>
          )}

          {(notesOpen || (!canManage && task.notes)) && (
            <div className="mt-2">
              {canManage ? (
                <TextInput
                  defaultValue={task.notes ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v !== (task.notes ?? '')) onChange({ notes: v === '' ? null : v })
                  }}
                  placeholder="Note"
                  className="text-xs"
                />
              ) : (
                <p className="rounded-md bg-surface-muted px-2 py-1 text-xs text-charcoal/60">
                  {task.notes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
