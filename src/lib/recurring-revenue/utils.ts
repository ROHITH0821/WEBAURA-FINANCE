/** Isolated helpers for the recurring revenue module — not shared with other finance features. */

export type BillingCycle = 'monthly' | 'quarterly' | 'annual'

export function currentMonthBounds(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function isDateInCurrentMonth(dateStr: string): boolean {
  const { start, end } = currentMonthBounds()
  return dateStr >= start && dateStr <= end
}

/** Normalize billing cycle amounts to a monthly equivalent for MRR display. */
export function monthlyEquivalentAmount(amount: number, cycle: BillingCycle): number {
  const base = Math.max(0, Math.round(Number(amount)))
  if (cycle === 'quarterly') return Math.round(base / 3)
  if (cycle === 'annual') return Math.round(base / 12)
  return base
}

/** Advance next due date by one billing cycle after a payment is logged. */
export function advanceDueDate(isoDate: string, cycle: BillingCycle): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3)
  else d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

/** Roll back next due date by one billing cycle when the latest payment log is deleted. */
export function rollbackDueDate(isoDate: string, cycle: BillingCycle): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  if (cycle === 'monthly') d.setMonth(d.getMonth() - 1)
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() - 3)
  else d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
