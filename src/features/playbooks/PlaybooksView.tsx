// Role Playbooks — reusable groups of task templates for a role or
// department (GM, Chef, IT, Marketing, …). "Playbook" is the user-facing
// word; the underlying model is opening_playbooks + opening_task_templates.
// This is where the reusable library is curated, before it is generated
// onto a specific opening.

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  createPlaybook,
  createTemplate,
  deleteTemplate,
  listPlaybooks,
  listTemplates,
} from '../../lib/api'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from '../../components/ui'
import {
  ANCHOR_LABELS,
  ANCHOR_TYPES,
  type AnchorType,
  type Playbook,
  type TaskTemplate,
} from '../../types'

export function PlaybooksView({ canManage }: { canManage: boolean }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingPlaybook, setAddingPlaybook] = useState(false)

  const loadPlaybooks = useCallback(async () => {
    try {
      const pbs = await listPlaybooks(true)
      setPlaybooks(pbs)
      setSelectedId((cur) => cur ?? pbs[0]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load playbooks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlaybooks()
  }, [loadPlaybooks])

  useEffect(() => {
    if (!selectedId) {
      setTemplates([])
      return
    }
    listTemplates(selectedId)
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load templates.'))
  }, [selectedId])

  async function handleAddPlaybook(name: string) {
    const pb = await createPlaybook({ name, sort_order: playbooks.length })
    setAddingPlaybook(false)
    await loadPlaybooks()
    setSelectedId(pb.id)
  }

  const selected = playbooks.find((p) => p.id === selectedId) ?? null

  return (
    <div>
      <PageHeader
        title="Role Playbooks"
        subtitle="Reusable task templates, generated onto each opening."
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setAddingPlaybook(true)}>
              <Plus className="h-4 w-4" /> New playbook
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6">
        {error && (
          <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-charcoal/50">Loading…</p>
        ) : playbooks.length === 0 ? (
          <EmptyState
            title="No playbooks yet"
            hint={canManage ? 'Create a playbook to start building its task templates.' : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Playbook list */}
            <Card className="h-fit overflow-hidden lg:col-span-1">
              <ul>
                {playbooks.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={`flex w-full items-center justify-between gap-2 border-b border-surface-line px-3 py-2.5 text-left text-sm last:border-0 ${
                        p.id === selectedId
                          ? 'bg-cg-orange-soft font-medium text-cg-orange'
                          : 'hover:bg-surface-muted'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {!p.active && <Badge tone="neutral">inactive</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Templates for the selected playbook */}
            <div className="lg:col-span-3">
              {selected && (
                <TemplateList
                  playbook={selected}
                  templates={templates}
                  canManage={canManage}
                  onChange={() => selectedId && listTemplates(selectedId).then(setTemplates)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {addingPlaybook && (
        <NewPlaybookModal
          onCancel={() => setAddingPlaybook(false)}
          onSubmit={handleAddPlaybook}
        />
      )}
    </div>
  )
}

function TemplateList({
  playbook,
  templates,
  canManage,
  onChange,
}: {
  playbook: Playbook
  templates: TaskTemplate[]
  canManage: boolean
  onChange: () => void
}) {
  const [adding, setAdding] = useState(false)

  async function remove(id: string) {
    await deleteTemplate(id)
    onChange()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-charcoal">{playbook.name}</h2>
          {playbook.description && (
            <p className="text-sm text-charcoal/55">{playbook.description}</p>
          )}
        </div>
        {canManage && (
          <Button variant="secondary" onClick={() => setAdding((a) => !a)}>
            <Plus className="h-4 w-4" /> Add template
          </Button>
        )}
      </div>

      {canManage && adding && (
        <NewTemplateForm
          playbookId={playbook.id}
          nextSequence={templates.length}
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false)
            onChange()
          }}
        />
      )}

      {templates.length === 0 ? (
        <EmptyState
          title="No task templates"
          hint={canManage ? 'Add the tasks this playbook should generate.' : undefined}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-charcoal/50">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Anchor</th>
                <th className="px-3 py-2 font-medium">Offset</th>
                <th className="px-3 py-2 font-medium">Owner role</th>
                <th className="px-3 py-2 font-medium">Req.</th>
                {canManage && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-surface-line last:border-0">
                  <td className="px-3 py-2 text-charcoal/45">{t.sequence + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{t.title}</div>
                    {t.description && (
                      <div className="text-xs text-charcoal/55">{t.description}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-charcoal/70">{ANCHOR_LABELS[t.anchor_type]}</td>
                  <td className="px-3 py-2 tabular-nums text-charcoal/70">
                    {offsetLabel(t.offset_days)}
                  </td>
                  <td className="px-3 py-2 text-charcoal/70">{t.default_owner_role ?? '—'}</td>
                  <td className="px-3 py-2">
                    {t.required ? <Badge tone="warning">Required</Badge> : '—'}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => remove(t.id)}
                        title="Delete template"
                        className="rounded p-1 text-charcoal/40 hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-charcoal/45">
        Offset convention: negative = days <strong>before</strong> the anchor,
        positive = days <strong>after</strong>. e.g. “GM in place” = −14 on
        opening date.
      </p>
    </div>
  )
}

function offsetLabel(days: number): string {
  if (days === 0) return 'on day'
  return days < 0 ? `${Math.abs(days)}d before` : `${days}d after`
}

function NewTemplateForm({
  playbookId,
  nextSequence,
  onCancel,
  onCreated,
}: {
  playbookId: string
  nextSequence: number
  onCancel: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [anchor, setAnchor] = useState<AnchorType>('opening_date')
  const [offset, setOffset] = useState('-14')
  const [role, setRole] = useState('')
  const [required, setRequired] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim() === '') return
    setSaving(true)
    try {
      await createTemplate({
        playbook_id: playbookId,
        title: title.trim(),
        description: description.trim() === '' ? undefined : description.trim(),
        anchor_type: anchor,
        offset_days: Number.parseInt(offset, 10) || 0,
        default_owner_role: role.trim() === '' ? undefined : role.trim(),
        required,
        sequence: nextSequence,
      })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-surface-line p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Task title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description (optional)">
            <TextArea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Anchor date">
          <Select value={anchor} onChange={(e) => setAnchor(e.target.value as AnchorType)}>
            {ANCHOR_TYPES.map((a) => (
              <option key={a} value={a}>
                {ANCHOR_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Offset (days)" hint="Negative = before anchor, positive = after.">
          <TextInput
            type="number"
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
          />
        </Field>
        <Field label="Default owner role">
          <TextInput
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. General Manager"
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-charcoal/70">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Required task
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving || title.trim() === ''}>
          {saving ? 'Adding…' : 'Add template'}
        </Button>
      </div>
    </form>
  )
}

function NewPlaybookModal({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim() === '') return
    setSaving(true)
    setError(null)
    try {
      await onSubmit(name.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the playbook.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-xl border border-surface-line bg-surface p-5 shadow-xl"
      >
        <h2 className="mb-3 font-semibold">New playbook</h2>
        <Field label="Playbook name" hint="e.g. General Manager Playbook">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || name.trim() === ''}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}
