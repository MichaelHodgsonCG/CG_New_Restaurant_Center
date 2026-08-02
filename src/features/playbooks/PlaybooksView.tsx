// Playbook Editor — where the reusable playbooks (GM, Chef, Regional, …)
// are curated before their templates generate onto every opening
// automatically. One playbook at a time, picked from a dropdown, with the
// full page width for editing. Templates are grouped into category
// sections — the same sections the site task board renders. Underlying
// model: opening_playbooks + opening_task_templates.

import { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createPlaybook,
  createTemplate,
  deleteTemplate,
  listPeople,
  listPlaybooks,
  listTemplates,
  renameTemplateCategory,
  updatePlaybook,
  updateTemplate,
} from '../../lib/api'
import { Avatar, PersonPicker } from '../../components/PersonPicker'
import { sectionMovePlan } from '../../lib/sectionOrder'
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
  type RosterPerson,
  type TaskTemplate,
} from '../../types'

const GENERAL = 'General' // display name for templates without a category

const pickerInputClass =
  'w-full rounded-md border border-surface-line bg-surface px-2.5 py-1.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus-visible:border-cg-orange'

function templatePosition(t: TaskTemplate): number {
  return t.sort_order ?? t.sequence
}

export function PlaybooksView({ canManage }: { canManage: boolean }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [people, setPeople] = useState<RosterPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingPlaybook, setAddingPlaybook] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState(false)

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch(() => setPeople([])) // picker degrades to free text
  }, [])

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
        title="Playbook Editor"
        subtitle="Curate each playbook's templates — they generate onto every opening automatically."
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
          selected && (
            <TemplateList
              playbook={selected}
              templates={templates}
              people={people}
              canManage={canManage}
              onChange={loadTemplates}
              onEditPlaybook={() => setEditingPlaybook(true)}
              picker={
                <Select
                  value={selectedId ?? ''}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="!w-auto min-w-64 font-medium"
                  title="Choose a playbook to edit"
                >
                  {playbooks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.active ? '' : ' (inactive)'}
                    </option>
                  ))}
                </Select>
              }
            />
          )
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
  people,
  canManage,
  onChange,
  onEditPlaybook,
  picker,
}: {
  playbook: Playbook
  templates: TaskTemplate[]
  people: RosterPerson[]
  canManage: boolean
  onChange: () => void
  onEditPlaybook: () => void
  picker: React.ReactNode
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [movingSelection, setMovingSelection] = useState(false)

  // Selection survives reloads poorly and never survives switching playbooks.
  useEffect(() => {
    setSelected(new Set())
    setMovingSelection(false)
  }, [playbook.id])

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

  async function moveSection(index: number, dir: -1 | 1) {
    const plan = sectionMovePlan(
      sections.map(([, ts]) => ts.map((t) => ({ id: t.id, position: templatePosition(t) }))),
      index,
      dir,
    )
    if (!plan) return
    await Promise.all(plan.map((p) => updateTemplate(p.id, { sort_order: p.sort_order })))
    onChange()
  }

  // --- Multi-select operations (the Menu Center Menu Editor pattern) -------

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSectionSelected(sectionTemplates: TaskTemplate[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allIn = sectionTemplates.every((t) => next.has(t.id))
      for (const t of sectionTemplates) {
        if (allIn) next.delete(t.id)
        else next.add(t.id)
      }
      return next
    })
  }

  /** Append the selection to `category` (null = General): fractional
   *  positions slot the moved rows after the target section's last row and
   *  before the next section. */
  async function moveSelectionTo(category: string | null) {
    const chosen = templates
      .filter((t) => selected.has(t.id))
      .sort((a, b) => templatePosition(a) - templatePosition(b))
    if (chosen.length === 0) return

    const targetKey = category ?? GENERAL
    const allPositions = templates.map(templatePosition)
    const maxAll = allPositions.length > 0 ? Math.max(...allPositions) : 0
    const sectionIdx = sections.findIndex(([c]) => c === targetKey)
    const targetRest =
      sectionIdx >= 0 ? sections[sectionIdx][1].filter((t) => !selected.has(t.id)) : []

    let lo: number
    let hi: number
    if (targetRest.length > 0) {
      lo = Math.max(...targetRest.map(templatePosition))
      const nextRest = sections[sectionIdx + 1]?.[1].filter((t) => !selected.has(t.id)) ?? []
      hi = nextRest.length > 0 ? Math.min(...nextRest.map(templatePosition)) : lo + chosen.length + 1
      if (hi <= lo) hi = lo + chosen.length + 1
    } else {
      // New or emptied section: it starts at the end of the playbook.
      lo = maxAll + 1
      hi = lo + chosen.length + 1
    }
    const step = (hi - lo) / (chosen.length + 1)

    await Promise.all(
      chosen.map((t, i) =>
        updateTemplate(t.id, { category, sort_order: lo + step * (i + 1) }),
      ),
    )
    setSelected(new Set())
    setMovingSelection(false)
    onChange()
  }

  async function removeSelection() {
    const ids = [...selected]
    if (ids.length === 0) return
    if (
      !window.confirm(
        `Delete ${ids.length} template${ids.length === 1 ? '' : 's'} from "${playbook.name}"?\n\nOpenings keep their already-generated tasks.`,
      )
    )
      return
    await Promise.all(ids.map((id) => deleteTemplate(id)))
    setSelected(new Set())
    onChange()
  }

  return (
    <div className="space-y-5">
      {/* Picker row — the dropdown IS the title */}
      <div className="flex flex-wrap items-center gap-2">
        {picker}
        {canManage && (
          <button
            onClick={onEditPlaybook}
            title="Edit playbook name, description, active"
            className="rounded p-1.5 text-charcoal/30 transition-colors hover:text-charcoal/70"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {!playbook.active && <Badge tone="neutral">inactive</Badge>}
        {playbook.description && (
          <span className="min-w-0 truncate text-sm text-charcoal/55">
            {playbook.description}
          </span>
        )}
        {canManage && (
          <div className="ml-auto">
            <Button variant="secondary" onClick={() => setAdding((a) => !a)}>
              <Plus className="h-4 w-4" /> Add template
            </Button>
          </div>
        )}
      </div>

      {/* Bulk selection bar */}
      {canManage && selected.size > 0 && (
        <div className="sticky top-2 z-30 flex items-center gap-3 rounded-xl bg-charcoal px-4 py-2.5 text-white shadow-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button
            onClick={() => setMovingSelection(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/20"
          >
            <ArrowRightLeft className="h-3 w-3" />
            Move to Section
          </button>
          <button
            onClick={removeSelection}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-danger/70"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-white/70 transition-colors hover:text-white"
          >
            Clear selection
          </button>
        </div>
      )}

      {canManage && adding && (
        <TemplateForm
          categories={categories}
          people={people}
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
        sections.map(([category, sectionTemplates], sectionIdx) => (
          <div key={category}>
            <SectionHeader
              name={category}
              count={`${sectionTemplates.length}`}
              onRename={
                canManage && category !== GENERAL
                  ? (to) => renameSection(category, to)
                  : undefined
              }
              onMove={canManage ? (dir) => moveSection(sectionIdx, dir) : undefined}
              canMoveUp={sectionIdx > 0}
              canMoveDown={sectionIdx < sections.length - 1}
            />
            <Card className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-surface-line text-left text-xs uppercase tracking-wide text-charcoal/50">
                    {canManage && (
                      <th className="w-14 px-2 py-2">
                        <input
                          type="checkbox"
                          title="Select all in this section"
                          checked={sectionTemplates.every((t) => selected.has(t.id))}
                          onChange={() => toggleSectionSelected(sectionTemplates)}
                        />
                      </th>
                    )}
                    <th className="px-3 py-2 font-medium">Task</th>
                    <th className="px-3 py-2 font-medium">Anchor</th>
                    <th className="px-3 py-2 font-medium">Offset</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
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
                            people={people}
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
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={selected.has(t.id)}
                                onChange={() => toggleSelected(t.id)}
                              />
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
                          <DefaultAssignee
                            text={t.default_owner_role}
                            personId={t.default_owner_person_id}
                            people={people}
                          />
                          {t.default_support_role && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-charcoal/45">
                              Support:{' '}
                              <DefaultAssignee
                                text={t.default_support_role}
                                personId={t.default_support_person_id}
                                people={people}
                                size={14}
                              />
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

      {movingSelection && (
        <MoveToSectionModal
          count={selected.size}
          categories={sections.map(([c]) => c)}
          onMove={(cat) => moveSelectionTo(cat === GENERAL ? null : cat)}
          onCancel={() => setMovingSelection(false)}
        />
      )}
    </div>
  )
}

function MoveToSectionModal({
  count,
  categories,
  onMove,
  onCancel,
}: {
  count: number
  categories: string[]
  onMove: (category: string) => void
  onCancel: () => void
}) {
  const [newSection, setNewSection] = useState('')
  return (
    <Modal onClose={onCancel}>
      <h2 className="font-semibold">
        Move {count} template{count === 1 ? '' : 's'} to section
      </h2>
      <p className="mt-0.5 text-xs text-charcoal/55">
        Selected templates are appended to the chosen section.
      </p>
      <div className="mt-3 max-h-64 space-y-0.5 overflow-y-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => onMove(c)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-charcoal/75 transition-colors hover:bg-surface-muted"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-charcoal/35" />
            {c}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-surface-line pt-3">
        <TextInput
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newSection.trim() !== '') onMove(newSection.trim())
          }}
          placeholder="Or a new section…"
          className="!py-1.5 !text-xs"
        />
        <Button
          variant="secondary"
          className="!px-2.5 !py-1.5 !text-xs"
          disabled={newSection.trim() === ''}
          onClick={() => onMove(newSection.trim())}
        >
          <Plus className="h-3.5 w-3.5" /> Move
        </Button>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}

function offsetLabel(days: number): string {
  if (days === 0) return 'on day'
  return days < 0 ? `${Math.abs(days)}d before` : `${days}d after`
}

// Default owner/support display: avatar + name when a person is linked,
// plain role text otherwise.
function DefaultAssignee({
  text,
  personId,
  people,
  size = 18,
}: {
  text: string | null
  personId: string | null
  people: RosterPerson[]
  size?: number
}) {
  if (!text) return <>—</>
  const person = personId ? people.find((p) => p.id === personId) : undefined
  if (!person) return <>{text}</>
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <Avatar name={person.name} photoUrl={person.photo_url} size={size} />
      {text}
    </span>
  )
}

interface TemplateFormValues {
  title: string
  description: string | null
  category: string | null
  anchor_type: AnchorType
  offset_days: number
  default_owner_role: string | null
  default_owner_person_id: string | null
  default_support_role: string | null
  default_support_person_id: string | null
  required: boolean
  sequence?: number
  sort_order?: number
}

// One form for both create (no `template`) and inline edit (prefilled).
function TemplateForm({
  template,
  categories,
  people,
  nextSequence,
  nextPosition,
  onCancel,
  onSubmit,
}: {
  template?: TaskTemplate
  categories: string[]
  people: RosterPerson[]
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
  const [owner, setOwner] = useState({
    text: template?.default_owner_role ?? '',
    personId: template?.default_owner_person_id ?? null,
  })
  const [support, setSupport] = useState({
    text: template?.default_support_role ?? '',
    personId: template?.default_support_person_id ?? null,
  })
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
        default_owner_role: owner.text.trim() === '' ? null : owner.text.trim(),
        default_owner_person_id: owner.text.trim() === '' ? null : owner.personId,
        default_support_role: support.text.trim() === '' ? null : support.text.trim(),
        default_support_person_id: support.text.trim() === '' ? null : support.personId,
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
        <Field
          label="Default owner"
          hint="A role (resolved per opening via the Team panel) or a named person for HQ-owned tasks."
        >
          <PersonPicker
            value={owner.text}
            personId={owner.personId}
            people={people}
            placeholder="e.g. General Manager, or Darryl"
            className={pickerInputClass}
            onChange={setOwner}
          />
        </Field>
        <Field label="Default support (optional)">
          <PersonPicker
            value={support.text}
            personId={support.personId}
            people={people}
            placeholder="Role or person"
            className={pickerInputClass}
            onChange={setSupport}
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
