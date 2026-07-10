// Create / edit an opening site. Captures the key site information from the
// brief; construction appears only as milestone references (handover date +
// status + optional note/link) — never a construction task module.

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button, Field, Select, TextArea, TextInput } from '../../components/ui'
import {
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUSES,
  SITE_STATUS_LABELS,
  SITE_STATUSES,
  type OpeningSite,
  type OpeningSiteInput,
} from '../../types'

const EMPTY: OpeningSiteInput = {
  location_id: null,
  name: '',
  concept: null,
  address: null,
  opening_date: null,
  handover_date: null,
  soft_opening_date: null,
  status: 'planning',
  handover_status: 'not_scheduled',
  construction_note: null,
  construction_link: null,
  notes: null,
}

export function SiteFormModal({
  site,
  onCancel,
  onSubmit,
}: {
  site?: OpeningSite
  onCancel: () => void
  onSubmit: (input: OpeningSiteInput) => Promise<void>
}) {
  const [form, setForm] = useState<OpeningSiteInput>(
    site ? toInput(site) : EMPTY,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof OpeningSiteInput>(key: K, value: OpeningSiteInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  // Empty text inputs should persist as NULL, not "".
  function setText<K extends keyof OpeningSiteInput>(key: K, value: string) {
    set(key, (value.trim() === '' ? null : value) as OpeningSiteInput[K])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.name.trim() === '') {
      setError('A site name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the site.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative my-8 w-full max-w-2xl rounded-xl border border-surface-line bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-surface-line px-5 py-3">
          <h2 className="font-semibold">{site ? 'Edit opening' : 'New opening'}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-md p-1 text-charcoal/50 hover:bg-surface-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Site name" hint="e.g. Beertown Guelph">
              <TextInput
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Location name"
                autoFocus
              />
            </Field>
          </div>
          <Field label="Concept / brand">
            <TextInput
              value={form.concept ?? ''}
              onChange={(e) => setText('concept', e.target.value)}
              placeholder="Beertown, Wildcraft, …"
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value as OpeningSiteInput['status'])}
            >
              {SITE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SITE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <TextInput
                value={form.address ?? ''}
                onChange={(e) => setText('address', e.target.value)}
                placeholder="Street, city"
              />
            </Field>
          </div>

          <Field label="Target opening date">
            <TextInput
              type="date"
              value={form.opening_date ?? ''}
              onChange={(e) => setText('opening_date', e.target.value)}
            />
          </Field>
          <Field
            label="Construction handover"
            hint="Building becomes operationally available (~3 weeks before opening)."
          >
            <TextInput
              type="date"
              value={form.handover_date ?? ''}
              onChange={(e) => setText('handover_date', e.target.value)}
            />
          </Field>
          <Field label="Soft-opening date (optional)">
            <TextInput
              type="date"
              value={form.soft_opening_date ?? ''}
              onChange={(e) => setText('soft_opening_date', e.target.value)}
            />
          </Field>
          <Field label="Handover status">
            <Select
              value={form.handover_status}
              onChange={(e) =>
                set('handover_status', e.target.value as OpeningSiteInput['handover_status'])
              }
            >
              {HANDOVER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {HANDOVER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Construction note (optional)">
              <TextInput
                value={form.construction_note ?? ''}
                onChange={(e) => setText('construction_note', e.target.value)}
                placeholder="Reference only — construction is managed elsewhere."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Construction link (optional)">
              <TextInput
                value={form.construction_link ?? ''}
                onChange={(e) => setText('construction_link', e.target.value)}
                placeholder="https://…  (link to Shanna's construction tracker)"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <TextArea
                rows={2}
                value={form.notes ?? ''}
                onChange={(e) => setText('notes', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="mx-5 mb-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-surface-line px-5 py-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : site ? 'Save changes' : 'Create opening'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function toInput(site: OpeningSite): OpeningSiteInput {
  return {
    location_id: site.location_id,
    name: site.name,
    concept: site.concept,
    address: site.address,
    opening_date: site.opening_date,
    handover_date: site.handover_date,
    soft_opening_date: site.soft_opening_date,
    status: site.status,
    handover_status: site.handover_status,
    construction_note: site.construction_note,
    construction_link: site.construction_link,
    notes: site.notes,
  }
}
