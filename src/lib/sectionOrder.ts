// Moving a whole section up/down. Sections aren't rows — they are the
// contiguous position ranges of their rows — so moving one means re-slotting
// every row of the moving section into the gap beside its neighbour. With
// fractional sort_order there is always a gap: the moving rows spread evenly
// between the surrounding sections' edges, touching only |moving| rows.

export interface PositionedRow {
  id: string
  position: number
}

export interface PositionUpdate {
  id: string
  sort_order: number
}

/**
 * Plan the sort_order writes that move `sections[index]` one step in `dir`
 * (-1 = up, +1 = down). `sections` is the on-screen order, each inner array
 * position-sorted. Returns null when the move falls off either end. Falls
 * back to renumbering everything when the data leaves no usable gap.
 */
export function sectionMovePlan(
  sections: PositionedRow[][],
  index: number,
  dir: -1 | 1,
): PositionUpdate[] | null {
  const target = index + dir
  if (index < 0 || index >= sections.length) return null
  if (target < 0 || target >= sections.length) return null

  const moving = sections[index]
  const other = sections[target]
  if (moving.length === 0 || other.length === 0) return null

  const min = (rows: PositionedRow[]) => rows[0].position
  const max = (rows: PositionedRow[]) => rows[rows.length - 1].position

  let lo: number
  let hi: number
  if (dir === -1) {
    // Slot between the section before `other` (if any) and `other`.
    hi = min(other)
    const before = sections[target - 1]
    lo = before ? max(before) : hi - moving.length - 1
  } else {
    // Slot between `other` and the section after it (if any).
    lo = max(other)
    const after = sections[target + 1]
    hi = after ? min(after) : lo + moving.length + 1
  }

  const step = (hi - lo) / (moving.length + 1)
  if (step > 0) {
    return moving.map((row, k) => ({ id: row.id, sort_order: lo + step * (k + 1) }))
  }

  // No usable gap (overlapping/duplicate positions) — renumber every row in
  // the intended section order instead.
  const reordered = [...sections]
  reordered.splice(index, 1)
  reordered.splice(target, 0, moving)
  return reordered.flat().map((row, k) => ({ id: row.id, sort_order: k + 1 }))
}
