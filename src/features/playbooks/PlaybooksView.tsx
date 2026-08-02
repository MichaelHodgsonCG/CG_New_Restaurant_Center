// Role Playbooks — reusable groups of task templates for a role or
// department (GM, Chef, IT, Marketing, …). "Playbook" is the user-facing
// word; the underlying model is opening_playbooks + opening_task_templates.
// This is where the reusable library is curated, before it is generated
// onto a specific opening. Templates are grouped into category sections —
// the same sections the site task board renders.

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createPlaybook,
  createTemplate,
  deleteTemplate,
  listPlaybooks,
  listTemplates,
  renameTemplateCategory,
  updatePlaybook,
  updateTemplate,
} from '../../lib/api'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from '../../components/ui'
import { SectionHeader } from '../../components/SectionHeader'
import {
  ANCHOR_LABELS,
  ANCHOR_TYPES,
  type AnchorType,
  type Playbook,
  type TaskTemplate,
} from '../../types'

const GENERAL = 'General' // display name for templates without a category

function templatePosition(t: TaskTemplate): number {
  return t.sort_order ?? t.sequence
}

export function PlaybooksView({ canManage }: { canManage: boolean }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingPlaybook, setAddingPlaybook] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState(false)

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

  const loadTemplates = useCallback(() => {
    if (!selectedId) {
      setTemplates([])
      return
    }
    listTemplates(selectedId)
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load templates.'))
  }, [selectedId])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  async function handleAddPlaybook(name: string) {
    const pb = await createPlaybook({ name, sort_order: playbooks.length })
    setAddingPlaybook(false)
    await loadPlaybooks()
    setSelectedId(pb.id)
  }

  async function handleEditPlaybook(patch: Partial<Playbook>) {
    if (!selectedId) return
    await updatePlaybook(selectedId, patch)
    setEditingPlaybook(false)
    await loadPlaybooks()
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
                  onChange={loadTemplates}
                  onEditPlaybook={() => setEditingPlaybook(true)}
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
      {editingPlaybook && selected && (
        <EditPlaybookModal
          playbook={selected}
          onCancel={() => setEditingPlaybook(false)}
          onSubmit={handleEditPlaybook}
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
  onEditPlaybook,
}: {
  playbook: Playbook
  templates: TaskTemplate[]
  canManage: boolean
  onChange: () => void
  onEditPlaybook: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Sections in order of first appearance, templates already position-sorted.
  const sections: [string, TaskTemplate[]][] = []
  {
    const map = new Map<string, TaskTemplate[]>()
    for (const t of templates) {
      const cat = t.category ?? GENERAL
      const arr = map.get(cat)
      if (arr) arr.push(t)
      else {
        const next: TaskTemplate[] = [t]
        map.set(cat, next)
        sections.push([cat, next])
      }
    }
  }
  const categories = sections.map(([c]) => c).filter((c) => c !== GENERAL)

  async function remove(id: string) {
    await deleteTemplate(id)
    onChange()
  }

  async function move(sectionTemplates: TaskTemplate[], idx: number, dir: -1 | 1) {
    const a = sectionTemplates[idx]
    const b = sectionTemplates[idx + dir]
    if (!b) return
    await Promise.all([
      updateTemplate(a.id, { sort_order: templatePosition(b) }),
      updateTemplate(b.id, { sort_order: templatePosition(a) }),
    ])
    onChange()
  }

  async function renameSection(from: string, to: string) {
    await renameTemplateCategory(playbook.id, from, to)
    onChange()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-charcoal">{playbook.name}</h2>
            {canManage && (
              <button
                onClick={onEditPlaybook}
                title="Edit playbook"
                className="rounded p-1 text-charcoal/30 transition-colors hover:text-charcoal/70"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
        <TemplateForm
          categories={categories}
          nextSequence={templates.length}
          nextPosition={
            templates.length === 0 ? 1 : Math.max(...templates.map(templatePosition)) + 1
          }
          onCancel={() => setAdding(false)}
          onSubmit={async (values) => {
            await createTemplate({ playbook_id: playbook.id, ...values })
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
        sections.map(([category, sectionTemplates]) => (
          <div key={category}>
            <SectionHeader
              name={category}
              count={`${sectionTemplates.length}`}
              onRename={
                canManage && category !== GENERAL
                  ? (to) => renameSection(category, to)
                  : undefined
              }
            />
            <Card className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-charcoal/50">
                    {canManage && <th className="w-10 px-2 py-2" />}
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 font-medium">Anchor</th>
                    <th className="px-3 py-2 font-medium">Offset</th>
                    <th className="px-3 py-2 font-medium">Owner role</th>
                    <th className="px-3 py-2 font-medium">Req.</th>
                    {canManage && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {sectionTemplates.map((t, idx) =>
                    editingId === t.id ? (
                      <tr key={t.id} className="border-b border-surface-line last:border-0">
                        <td colSpan={canManage ? 7 : 5} className="p-2">
                          <TemplateForm
                            template={t}
                            categories={categories}
                            onCancel={() => setEditingId(null)}
                            onSubmit={async (values) => {
                              await updateTemplate(t.id, values)
                              setEditingId(null)
                              onChange()
                            }}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr key={t.id} className="border-b border-surface-line last:border-0">
                        {canManage && (
                          <td className="px-2 py-2">
                            <div className="flex flex-col">
                              <button
                                onClick={() => move(sectionTemplates, idx, -1)}
                                disabled={idx === 0}
                                className="p-0.5 text-charcoal/25 hover:text-charcoal/70 disabled:opacity-30"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => move(sectionTemplates, idx, 1)}
                                disabled={idx === sectionTemplates.length - 1}
                                className="p-0.5 text-charcoal/25 hover:text-charcoal/70 disabled:opacity-30"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <div className="font-medium">{t.title}</div>
                          {t.description && (
                            <div className="text-xs text-charcoal/55">{t.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-charcoal/70">
                          {ANCHOR_LABELS[t.anchor_type]}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-charcoal/70">
                          {offsetLabel(t.offset_days)}
                        </td>
                        <td className="px-3 py-2 text-charcoal/70">
                          {t.default_owner_role ?? '—'}
                          {t.default_support_role && (
                            <div className="text-xs text-charcoal/45">
                              Support: {t.default_support_role}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {t.required ? <Badge tone="warning">Required</Badge> : '—'}
                        </td>
                        {canManage && (
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => setEditingId(t.id)}
                                title="Edit template"
                                className="rounded p-1 text-charcoal/40 hover:bg-surface-muted hover:text-charcoal"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => remove(t.id)}
                                title="Delete template"
                                className="rounded p-1 text-charcoal/40 hover:bg-danger/10 hover:text-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        ))
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

interface TemplateFormValues {
  title: string
  description: string | null
  category: string | null
  anchor_type: AnchorType
  offset_days: number
  default_owner_role: string | null
  default_support_role: string | null
  required: boolean
  sequence?: number
  sort_order?: number
}

// One form for both create (no `template`) and inline edit (prefilled).
function TemplateForm({
  template,
  categories,
  nextSequence,
  nextPosition,
  onCancel,
  onSubmit,
}: {
  template?: TaskTemplate
  categories: string[]
  nextSequence?: number
  nextPosition?: number
  onCancel: () => void
  onSubmit: (values: TemplateFormValues) => Promise<void>
}) {
  const [title, setTitle] = useState(template?.title ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [category, setCategory] = useState(template?.category ?? '')
  const [anchor, setAnchor] = useState<AnchorType>(template?.anchor_type ?? 'opening_date')
  const [offset, setOffset] = useState(String(template?.offset_days ?? -14))
  const [role, setRole] = useState(template?.default_owner_role ?? '')
  const [supportRole, setSupportRole] = useState(template?.default_support_role ?? '')
  const [required, setRequired] = useState(template?.required ?? false)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim() === '') return
    setSaving(true)
    try {
      const values: TemplateFormValues = {
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        category: category.trim() === '' ? null : category.trim(),
        anchor_type: anchor,
        offset_days: Number.parseInt(offset, 10) || 0,
        default_owner_role: role.trim() === '' ? null : role.trim(),
        default_support_role: supportRole.trim() === '' ? null : supportRole.trim(),
        required,
      }
      if (!template) {
        values.sequence = nextSequence
        values.sort_order = nextPosition
      }
      await onSubmit(values)
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
        <Field label="Section" hint="Groups tasks on the board, e.g. Hiring, Training.">
          <TextInput
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="template-categories"
            placeholder={GENERAL}
          />
          <datalist id="template-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
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
        <Field label="Default support role (optional)">
          <TextInput
            value={supportRole}
            onChange={(e) => setSupportRole(e.target.value)}
            placeholder="e.g. Regional"
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
          {saving ? 'Saving…' : template ? 'Save' : 'Add template'}
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
    <Modal onClose={onCancel}>
      <form onSubmit={submit}>
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
    </Modal>
  )
}

function EditPlaybookModal({
  playbook,
  onCancel,
  onSubmit,
}: {
  playbook: Playbook
  onCancel: () => void
  onSubmit: (patch: Partial<Playbook>) => Promise<void>
}) {
  const [name, setName] = useState(playbook.name)
  const [description, setDescription] = useState(playbook.description ?? '')
  const [active, setActive] = useState(playbook.active)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim() === '') return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
        active,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the playbook.')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onCancel}>
      <form onSubmit={submit}>
        <h2 className="mb-3 font-semibold">Edit playbook</h2>
        <div className="space-y-3">
          <Field label="Playbook name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Description (optional)">
            <TextArea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-charcoal/70">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active — offered when adding playbooks to an opening
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || name.trim() === ''}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
