// Sticky-note popover on a task row (the Menu Center pattern): the icon
// fills in when a note exists, the note itself stays out of the row until
// asked for.

import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { Button } from './ui'

export function NotePopover({
  note,
  onSave,
}: {
  note: string | null
  onSave: (note: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(note ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function save() {
    const next = value.trim()
    onSave(next === '' ? null : next)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setValue(note ?? '')
          setOpen((o) => !o)
        }}
        title={note ? 'Edit note' : 'Add note'}
        className={`rounded-md p-1.5 transition-colors ${
          note
            ? 'text-warning hover:bg-warning/10'
            : 'text-charcoal/30 hover:bg-surface-muted hover:text-charcoal/70'
        }`}
      >
        <StickyNote className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-surface-line bg-surface p-2 shadow-lg">
          <textarea
            autoFocus
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Note…"
            className="w-full resize-none rounded-md border border-surface-line bg-surface px-2 py-1.5 text-xs text-charcoal placeholder:text-charcoal/40 focus:outline-none focus-visible:border-cg-orange"
          />
          <div className="mt-1.5 flex justify-end gap-1.5">
            <Button variant="ghost" className="!px-2 !py-1 !text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="!px-2 !py-1 !text-xs" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
