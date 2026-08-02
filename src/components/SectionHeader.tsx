// Section header for the task board and the template library: uppercase
// tracked label, inline rename for managers, right-aligned count. Sections
// are not entities — they are the distinct category values on the rows — so
// "rename" is the caller doing a bulk update.

import { useState } from 'react'
import { Pencil } from 'lucide-react'

export function SectionHeader({
  name,
  count,
  onRename,
}: {
  name: string
  count: string
  /** Absent → the section is not renamable (e.g. the implicit "General"). */
  onRename?: (to: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  function commit() {
    setEditing(false)
    const next = value.trim()
    if (onRename && next !== '' && next !== name) onRename(next)
    else setValue(name)
  }

  return (
    <div className="group flex items-center gap-2 border-b border-surface-line pb-1.5">
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setValue(name)
              setEditing(false)
            }
          }}
          className="rounded border border-surface-line bg-surface px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-charcoal focus:outline-none"
        />
      ) : (
        <>
          <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/55">
            {name}
          </h3>
          {onRename && (
            <button
              onClick={() => {
                setValue(name)
                setEditing(true)
              }}
              title="Rename section"
              className="p-1 text-charcoal/25 transition-colors hover:text-charcoal/70 md:opacity-0 md:group-hover:opacity-100"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </>
      )}
      <span className="ml-auto text-[10px] tabular-nums text-charcoal/40">{count}</span>
    </div>
  )
}
