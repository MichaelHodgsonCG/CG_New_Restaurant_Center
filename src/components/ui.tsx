// Small shared presentational primitives, styled with the CGOPS design
// tokens. Kept here so every view reads the same and colour usage stays
// semantic (orange = action/active only; status colours communicate state).

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  SITE_STATUS_LABELS,
  TASK_STATUS_LABELS,
  type SiteStatus,
  type TaskStatus,
} from '../types'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-line px-4 py-4 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-charcoal">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-charcoal/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'secondary', className = '', ...props }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const styles = {
    primary: 'bg-cg-orange text-white hover:bg-cg-orange-hover',
    secondary:
      'border border-surface-line bg-surface text-charcoal hover:bg-surface-muted',
    ghost: 'text-charcoal/70 hover:bg-surface-muted hover:text-charcoal',
  }[variant]
  return <button className={`${base} ${styles} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-surface-line bg-surface ${className}`}
    >
      {children}
    </div>
  )
}

export function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  tone?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const toneClass = {
    default: 'text-charcoal',
    warning: 'text-warning',
    danger: 'text-danger',
    success: 'text-success',
  }[tone]
  return (
    <div className="rounded-lg border border-surface-line bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-charcoal/50">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-charcoal/60">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-charcoal/45">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-md border border-surface-line bg-surface px-2.5 py-1.5 text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:border-cg-orange'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

// --- Status badges -------------------------------------------------------

function badgeClass(tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger') {
  return {
    neutral: 'bg-surface-muted text-charcoal/70',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  }[tone]
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(
        tone,
      )}`}
    >
      {children}
    </span>
  )
}

const SITE_TONE: Record<SiteStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  planning: 'neutral',
  in_progress: 'info',
  pre_opening: 'warning',
  open: 'success',
  on_hold: 'warning',
  cancelled: 'danger',
}

export function SiteStatusBadge({ status }: { status: SiteStatus }) {
  return <Badge tone={SITE_TONE[status]}>{SITE_STATUS_LABELS[status]}</Badge>
}

const TASK_TONE: Record<TaskStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  not_started: 'neutral',
  in_progress: 'info',
  blocked: 'danger',
  complete: 'success',
  not_applicable: 'neutral',
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={TASK_TONE[status]}>{TASK_STATUS_LABELS[status]}</Badge>
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-surface-line bg-surface-muted/40 px-6 py-10 text-center">
      <p className="text-sm font-medium text-charcoal/70">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-charcoal/45">{hint}</p>}
    </div>
  )
}

export function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className="h-full rounded-full bg-cg-orange transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
