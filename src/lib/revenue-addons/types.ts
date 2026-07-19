export const REVENUE_ADDON_CATEGORIES = [
  'freelance',
  'interest',
  'refund',
  'partnership',
  'commission',
  'asset_sale',
  'other',
] as const

export type RevenueAddonCategory = (typeof REVENUE_ADDON_CATEGORIES)[number]

export const REVENUE_ADDON_CATEGORY_LABELS: Record<RevenueAddonCategory, string> = {
  freelance: 'Freelance',
  interest: 'Interest / Bank',
  refund: 'Refund',
  partnership: 'Partnership',
  commission: 'Commission',
  asset_sale: 'Asset Sale',
  other: 'Other',
}

export type RevenueAddonRow = {
  id: string
  created_at: string
  logged_at: string
  title: string
  category: string
  amount: number
  received_date: string
  transaction_ref: string | null
  notes: string | null
  added_by: string
}

export function slugifyRevenueAddonCategory(label: string): string {
  const slug = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  return slug || 'other'
}

export function formatRevenueAddonCategoryLabel(slug: string): string {
  const key = String(slug || '').trim().toLowerCase()
  if (!key) return 'Other'
  const known = REVENUE_ADDON_CATEGORY_LABELS[key as RevenueAddonCategory]
  if (known) return known
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function sumRevenueAddons(
  rows: { amount?: number | string | null; received_date?: string | null }[],
  opts?: { monthStart?: string; monthEnd?: string },
): number {
  return (rows || []).reduce((sum, row) => {
    const amount = Number(row.amount || 0)
    if (!Number.isFinite(amount) || amount <= 0) return sum
    if (opts?.monthStart && opts?.monthEnd) {
      const date = String(row.received_date || '').slice(0, 10)
      if (!date || date < opts.monthStart || date > opts.monthEnd) return sum
    }
    return sum + amount
  }, 0)
}
