// Task roll-ups shared by the dashboard, readiness view and site detail.
// One definition of "complete %", "overdue", "at risk" so every surface
// agrees.

import { isAtRisk, isOverdue } from './dates'
import type { OpeningTask } from '../types'

export interface TaskMetrics {
  total: number
  counted: number // total excluding not_applicable — the completion denominator
  complete: number
  overdue: number
  atRisk: number
  completionPct: number // 0–100
}

export function taskMetrics(tasks: OpeningTask[]): TaskMetrics {
  const counted = tasks.filter((t) => t.status !== 'not_applicable')
  const complete = counted.filter((t) => t.status === 'complete').length
  const overdue = tasks.filter((t) => isOverdue(t)).length
  const atRisk = tasks.filter((t) => isAtRisk(t)).length
  return {
    total: tasks.length,
    counted: counted.length,
    complete,
    overdue,
    atRisk,
    completionPct: counted.length === 0 ? 0 : (complete / counted.length) * 100,
  }
}
