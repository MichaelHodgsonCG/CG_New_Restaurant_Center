// Calendar-date helpers. Everything here works on date-only strings
// ('YYYY-MM-DD') and does arithmetic at UTC noon, so a due date never drifts
// across a day boundary because of the viewer's timezone.

import type { AnchorType, OpeningSite, OpeningTask } from '../types'

/** Parse a 'YYYY-MM-DD' string to a Date at UTC noon (drift-safe). */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

/** Format a Date back to 'YYYY-MM-DD'. */
function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Today as 'YYYY-MM-DD' in the viewer's local calendar. */
export function todayIso(): string {
  const now = new Date()
  return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12)))
}

/** Add (or subtract) whole days to a date string. */
export function addDays(iso: string, days: number): string {
  const d = parseDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toIso(d)
}

/** The anchor date on a site for a given anchor type. 'fixed_date' has no
 *  site-level anchor — a fixed-date task carries its own date, so template
 *  generation cannot compute one and leaves it unscheduled for manual entry. */
export function anchorDateFor(site: OpeningSite, anchor: AnchorType): string | null {
  switch (anchor) {
    case 'opening_date':
      return site.opening_date
    case 'handover_date':
      return site.handover_date
    case 'soft_opening_date':
      return site.soft_opening_date
    case 'fixed_date':
      return null
  }
}

/** Compute a task due date from a site anchor + offset. Returns null when the
 *  anchor date is not set yet (task stays unscheduled). */
export function computeDueDate(
  site: OpeningSite,
  anchor: AnchorType,
  offsetDays: number,
): string | null {
  const base = anchorDateFor(site, anchor)
  if (!base) return null
  return addDays(base, offsetDays)
}

/** Whole days from today until the date (negative = in the past). */
export function daysUntil(iso: string | null, from: string = todayIso()): number | null {
  if (!iso) return null
  const ms = parseDate(iso).getTime() - parseDate(from).getTime()
  return Math.round(ms / 86_400_000)
}

/** A task is overdue when it has a past due date and is not yet resolved. */
export function isOverdue(task: OpeningTask, from: string = todayIso()): boolean {
  if (!task.due_date) return false
  if (task.status === 'complete' || task.status === 'not_applicable') return false
  const d = daysUntil(task.due_date, from)
  return d !== null && d < 0
}

/** A task counts against readiness/risk when it is at risk, or blocked, or
 *  overdue — but not once it is complete or N/A. */
export function isAtRisk(task: OpeningTask, from: string = todayIso()): boolean {
  if (task.status === 'complete' || task.status === 'not_applicable') return false
  return task.at_risk || task.status === 'blocked' || isOverdue(task, from)
}

/** Human-friendly date, e.g. "Jul 10, 2026". Empty dates render as an em dash. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return parseDate(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** "in 12 days" / "3 days ago" / "today" — for the countdown surfaces. */
export function relativeDays(iso: string | null): string {
  const d = daysUntil(iso)
  if (d === null) return '—'
  if (d === 0) return 'today'
  if (d > 0) return `in ${d} day${d === 1 ? '' : 's'}`
  const a = Math.abs(d)
  return `${a} day${a === 1 ? '' : 's'} ago`
}
