// Searchable owner/support/role picker, ported from Menu Center's proven
// hybrid model: selecting a roster person links them (personId set) and
// stamps their name as the text label; free text that matches nobody is kept
// as-is (personId null) — the pre-hiring state of an opening. A typed name
// that exactly matches a person auto-links on blur.
//
// `resolved` renders a person the caller derived elsewhere (the site role
// assignment) when no explicit link is set — the avatar shows who the row
// resolves to while the text keeps saying the role.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, User } from 'lucide-react'
import type { RosterPerson } from '../types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || parts[0] === '') return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({
  name,
  photoUrl,
  size = 20,
}: {
  name: string
  photoUrl?: string | null
  size?: number
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-muted font-medium text-charcoal/60"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials(name)}
    </span>
  )
}

export function PersonPicker({
  value,
  personId,
  people,
  placeholder,
  className,
  resolved,
  onChange,
}: {
  value: string
  personId: string | null
  people: RosterPerson[]
  placeholder?: string
  className?: string
  resolved?: { name: string; photoUrl?: string | null; hint?: string } | null
  onChange: (next: { text: string; personId: string | null }) => void
}) {
  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase()
    const pool = q
      ? people.filter(
          (p) => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q),
        )
      : people
    return pool.slice(0, 8)
  }, [draft, people])

  function commit(next: { text: string; personId: string | null }) {
    if (next.text !== value || next.personId !== personId) onChange(next)
  }

  function commitDraft() {
    const text = draft.trim()
    const exact = people.find((p) => p.name.toLowerCase() === text.toLowerCase())
    commit({ text, personId: exact ? exact.id : null })
  }

  function selectPerson(p: RosterPerson) {
    setDraft(p.name)
    commit({ text: p.name, personId: p.id })
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        commitDraft()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  })

  const linkedPerson = personId ? people.find((p) => p.id === personId) : undefined
  const showAvatar = linkedPerson ?? (resolved && draft.trim() !== '' ? resolved : undefined)
  const title = linkedPerson
    ? `${linkedPerson.name} · ${linkedPerson.role}`
    : resolved
      ? (resolved.hint ?? resolved.name)
      : draft.trim()
        ? `${draft.trim()} (not linked to a person)`
        : ''

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        {showAvatar ? (
          <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2">
            <Avatar
              name={'name' in showAvatar ? showAvatar.name : ''}
              photoUrl={'photo_url' in showAvatar ? showAvatar.photo_url : showAvatar.photoUrl}
              size={18}
            />
          </span>
        ) : (
          personId === null &&
          draft.trim() !== '' && (
            <User className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-charcoal/25" />
          )
        )}
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitDraft()
              setOpen(false)
              ;(e.target as HTMLInputElement).blur()
            }
            if (e.key === 'Escape') {
              setDraft(value)
              setOpen(false)
            }
          }}
          placeholder={placeholder}
          className={`${className ?? ''} ${draft.trim() !== '' ? '!pl-7' : ''}`}
          title={title}
        />
      </div>

      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full z-40 mt-1 max-h-64 w-60 overflow-y-auto rounded-lg border border-surface-line bg-surface py-1 shadow-lg">
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                selectPerson(p)
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-muted"
            >
              <Avatar name={p.name} photoUrl={p.photo_url} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-charcoal">{p.name}</span>
                <span className="block text-[10px] text-charcoal/45">{p.role}</span>
              </span>
              {p.id === personId && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
