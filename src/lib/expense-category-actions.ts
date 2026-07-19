'use server'

import { revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import { requireActiveAdmin } from '@/lib/admin-gates'
import { slugifyExpenseCategoryLabel } from '@/lib/expense-category-utils'
import type { ExpenseCategoryCatalogItem } from '@/types/finance'

const revalidate = (tag: string) => (revalidateTag as any)(tag)

export async function createExpenseCategoryAction(input: {
  label: string
}): Promise<{ ok: true; category: ExpenseCategoryCatalogItem } | { ok: false; error: string }> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const label = String(input.label || '').trim()
  if (!label) return { ok: false, error: 'Category name is required.' }

  const slug = slugifyExpenseCategoryLabel(label)
  if (!slug) return { ok: false, error: 'Category name is invalid.' }

  const supabase = createStaticClient()

  const { data: existing, error: existingError } = await supabase
    .from('expense_categories')
    .select('id,slug,label,sort_order,is_active,is_system,created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (existingError) {
    if (existingError.code === '42P01' || /does not exist/i.test(existingError.message)) {
      return {
        ok: false,
        error: 'Run migration 037_expense_category_catalog.sql in Supabase first, then try again.',
      }
    }
    return { ok: false, error: existingError.message }
  }

  if (existing) {
    if (!existing.is_active) {
      const { data: reactivated, error: reactivateError } = await supabase
        .from('expense_categories')
        .update({ is_active: true, label })
        .eq('id', existing.id)
        .select('id,slug,label,sort_order,is_active,is_system,created_at')
        .single()

      if (reactivateError) return { ok: false, error: reactivateError.message }

      revalidate('expense-categories')
      return { ok: true, category: reactivated as ExpenseCategoryCatalogItem }
    }
    return { ok: true, category: existing as ExpenseCategoryCatalogItem }
  }

  const { data: lastRow } = await supabase
    .from('expense_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = Number(lastRow?.sort_order || 0) + 10

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ slug, label, sort_order: sortOrder, is_active: true, is_system: false })
    .select('id,slug,label,sort_order,is_active,is_system,created_at')
    .single()

  if (error) {
    if (error.code === '42P01' || /does not exist/i.test(error.message)) {
      return {
        ok: false,
        error: 'Run migration 037_expense_category_catalog.sql in Supabase first, then try again.',
      }
    }
    return { ok: false, error: error.message }
  }

  revalidate('expense-categories')
  return { ok: true, category: data as ExpenseCategoryCatalogItem }
}

export async function getExpenseCategoriesForForm(): Promise<
  { ok: true; categories: ExpenseCategoryCatalogItem[] } | { ok: false; error: string }
> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id,slug,label,sort_order,is_active,is_system,created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })

  if (error) return { ok: false, error: error.message }
  return { ok: true, categories: (data || []) as ExpenseCategoryCatalogItem[] }
}
