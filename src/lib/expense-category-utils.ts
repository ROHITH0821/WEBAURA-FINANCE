import { createStaticClient } from '@/lib/supabaseServer'
import { EXPENSE_CATEGORIES } from '@/types/finance'

const FALLBACK_SLUGS = new Set<string>(EXPENSE_CATEGORIES)

export function slugifyExpenseCategoryLabel(label: string): string {
  const slug = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  return slug || 'category'
}

export async function isActiveExpenseCategorySlug(slug: string): Promise<boolean> {
  const normalized = String(slug || '').trim().toLowerCase()
  if (!normalized) return false

  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('expense_categories')
    .select('slug')
    .eq('slug', normalized)
    .eq('is_active', true)
    .maybeSingle()

  if (error && error.code === '42P01') {
    return FALLBACK_SLUGS.has(normalized)
  }
  if (error) {
    // Unexpected DB error — fail open so custom catalog slugs are not falsely rejected.
    return true
  }
  if (data) return true
  return FALLBACK_SLUGS.has(normalized)
}
