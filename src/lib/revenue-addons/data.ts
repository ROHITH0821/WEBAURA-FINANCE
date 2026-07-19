import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import type { RevenueAddonRow } from '@/lib/revenue-addons/types'
import { isRevenueAddonsUnavailableError } from '@/lib/revenue-addons/errors'
import { logSupabaseQueryError } from '@/lib/supabase-log'

export type {
  RevenueAddonCategory,
  RevenueAddonRow,
} from '@/lib/revenue-addons/types'

export {
  REVENUE_ADDON_CATEGORIES,
  REVENUE_ADDON_CATEGORY_LABELS,
  sumRevenueAddons,
} from '@/lib/revenue-addons/types'

export const getRevenueAddons = unstable_cache(
  async (): Promise<RevenueAddonRow[]> => {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('revenue_addons')
      .select('id,created_at,logged_at,title,category,amount,received_date,transaction_ref,notes,added_by')
      .order('logged_at', { ascending: false })

    if (error) {
      if (!isRevenueAddonsUnavailableError(error)) {
        logSupabaseQueryError('[getRevenueAddons] query failed:', error)
      }
      return []
    }

    return (data || []).map(mapRevenueAddonRow)
  },
  ['revenue-addons-list'],
  { revalidate: 30, tags: ['revenue-addons', 'finance-summary'] },
)

function mapRevenueAddonRow(row: Record<string, unknown>): RevenueAddonRow {
  return {
    id: String(row.id),
    created_at: String(row.created_at || ''),
    logged_at: String(row.logged_at || row.created_at || ''),
    title: String(row.title || ''),
    category: String(row.category || 'other'),
    amount: Number(row.amount || 0),
    received_date: String(row.received_date || '').slice(0, 10),
    transaction_ref: row.transaction_ref ? String(row.transaction_ref) : null,
    notes: row.notes ? String(row.notes) : null,
    added_by: String(row.added_by || ''),
  }
}

export async function getRevenueAddonById(id: string): Promise<RevenueAddonRow | null> {
  const addonId = String(id || '').trim()
  if (!addonId) return null

  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('revenue_addons')
    .select('id,created_at,logged_at,title,category,amount,received_date,transaction_ref,notes,added_by')
    .eq('id', addonId)
    .maybeSingle()

  if (error || !data) return null
  return mapRevenueAddonRow(data as Record<string, unknown>)
}
