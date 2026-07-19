import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/types/finance'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function humanizeExpenseCategorySlug(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Renders an expense's category for display, expanding 'other' into its free-text label. */
export function formatExpenseCategory(
  expense: { category?: string | null; custom_category_label?: string | null },
  labelMap?: Record<string, string>,
): string {
  const category = String(expense.category || '').trim().toLowerCase()
  if (!category) return 'Miscellaneous'
  if (category === 'other') {
    const label = String(expense.custom_category_label || '').trim()
    return label ? `Other: ${label}` : 'Other'
  }
  const labels = { ...EXPENSE_CATEGORY_LABELS, ...labelMap }
  return labels[category as ExpenseCategory] || humanizeExpenseCategorySlug(category)
}

export function formatCurrency(value: number) {
  const n = Number(value || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

/**
 * Expense timestamp for UI.
 * - New rows (logged_at set): date + time
 * - Legacy rows: date only from request_date (unchanged)
 */
export function formatExpenseLoggedAt(expense: {
  logged_at?: string | null
  request_date?: string | null
  created_at?: string | null
}): string {
  const loggedAt = String(expense.logged_at || '').trim()
  if (loggedAt) {
    const d = new Date(loggedAt)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
  }

  const dateOnly = String(expense.request_date || '').trim()
  if (dateOnly) {
    const d = new Date(dateOnly.length <= 10 ? `${dateOnly}T12:00:00` : dateOnly)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }
  }

  return 'No Date'
}

/** Milliseconds used to order expenses newest-first (same day → later time on top). */
export function expenseSortTimeMs(expense: {
  logged_at?: string | null
  paid_at?: string | null
  created_at?: string | null
  request_date?: string | null
  id?: string | null
}): number {
  const candidates = [
    expense.logged_at,
    expense.paid_at,
    expense.created_at,
    expense.request_date
      ? String(expense.request_date).length <= 10
        ? `${expense.request_date}T00:00:00.000Z`
        : expense.request_date
      : null,
  ]
  for (const raw of candidates) {
    const value = String(raw || '').trim()
    if (!value) continue
    const ms = new Date(value).getTime()
    if (Number.isFinite(ms)) return ms
  }
  // Stable fallback so two undated rows still have a deterministic order.
  const id = String(expense.id || '')
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash
}

/** Newest first. Same calendar day → latest added time stays on top. Never drops rows. */
export function sortExpensesNewestFirst<T extends {
  logged_at?: string | null
  paid_at?: string | null
  created_at?: string | null
  request_date?: string | null
  id?: string | null
}>(expenses: T[]): T[] {
  return [...expenses].sort((a, b) => {
    const diff = expenseSortTimeMs(b) - expenseSortTimeMs(a)
    if (diff !== 0) return diff
    return String(b.id || '').localeCompare(String(a.id || ''))
  })
}

