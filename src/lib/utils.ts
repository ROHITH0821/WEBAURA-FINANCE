import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/types/finance'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Renders an expense's category for display, expanding 'other' into its free-text label. */
export function formatExpenseCategory(expense: { category?: string | null; custom_category_label?: string | null }): string {
  const category = String(expense.category || '').trim()
  if (!category) return 'Miscellaneous'
  if (category === 'other') {
    const label = String(expense.custom_category_label || '').trim()
    return label ? `Other: ${label}` : 'Other'
  }
  return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category
}

export function formatCurrency(value: number) {
  const n = Number(value || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

