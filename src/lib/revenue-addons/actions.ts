'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import { requireActiveAdmin, requireSuperAdmin } from '@/lib/admin-gates'
import { slugifyRevenueAddonCategory } from '@/lib/revenue-addons/types'

const revalidate = (tag: string) => (revalidateTag as any)(tag)

function refreshRevenueAddons(addonId?: string) {
  revalidate('revenue-addons')
  revalidate('finance-summary')
  revalidatePath('/revenue')
  revalidatePath('/revenue/add-ons')
  if (addonId) revalidatePath(`/revenue/add-ons/${addonId}`)
  revalidatePath('/')
}

export async function createRevenueAddonAction(input: {
  title: string
  category: string
  amount: string | number
  received_date: string
  transaction_ref?: string
  notes?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const title = String(input.title || '').trim()
  if (!title) return { ok: false, error: 'Title is required.' }

  const categoryRaw = String(input.category || '').trim()
  const category = slugifyRevenueAddonCategory(categoryRaw)
  if (!category) return { ok: false, error: 'Category is required.' }

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be a positive number.' }
  }

  const receivedDate = String(input.received_date || '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)) {
    return { ok: false, error: 'Received date is required.' }
  }

  const now = new Date().toISOString()
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('revenue_addons')
    .insert({
      title,
      category,
      amount,
      received_date: receivedDate,
      transaction_ref: String(input.transaction_ref || '').trim() || null,
      notes: String(input.notes || '').trim() || null,
      added_by: gate.email,
      logged_at: now,
    })
    .select('id')
    .single()

  if (error) {
    const { isRevenueAddonsUnavailableError } = await import('@/lib/revenue-addons/errors')
    if (isRevenueAddonsUnavailableError(error) || error.code === '42P01') {
      return { ok: false, error: 'Run migration 040_revenue_addons.sql in Supabase first (includes grants + schema reload).' }
    }
    return { ok: false, error: error.message }
  }

  refreshRevenueAddons(String(data.id))
  return { ok: true, id: String(data.id) }
}

export async function updateRevenueAddonAction(input: {
  id: string
  title: string
  category: string
  amount: string | number
  received_date: string
  transaction_ref?: string
  notes?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const addonId = String(input.id || '').trim()
  if (!addonId) return { ok: false, error: 'Missing add-on id.' }

  const title = String(input.title || '').trim()
  if (!title) return { ok: false, error: 'Title is required.' }

  const categoryRaw = String(input.category || '').trim()
  const category = slugifyRevenueAddonCategory(categoryRaw)
  if (!category) return { ok: false, error: 'Category is required.' }

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be a positive number.' }
  }

  const receivedDate = String(input.received_date || '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)) {
    return { ok: false, error: 'Received date is required.' }
  }

  const supabase = createStaticClient()
  const { error } = await supabase
    .from('revenue_addons')
    .update({
      title,
      category,
      amount,
      received_date: receivedDate,
      transaction_ref: String(input.transaction_ref || '').trim() || null,
      notes: String(input.notes || '').trim() || null,
    })
    .eq('id', addonId)

  if (error) {
    const { isRevenueAddonsUnavailableError } = await import('@/lib/revenue-addons/errors')
    if (isRevenueAddonsUnavailableError(error) || error.code === '42P01') {
      return { ok: false, error: 'Run migration 040_revenue_addons.sql in Supabase first (includes grants + schema reload).' }
    }
    return { ok: false, error: error.message }
  }

  refreshRevenueAddons(addonId)
  return { ok: true }
}

export async function deleteRevenueAddonAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const addonId = String(id || '').trim()
  if (!addonId) return { ok: false, error: 'Missing add-on id.' }

  const supabase = createStaticClient()
  const { error } = await supabase.from('revenue_addons').delete().eq('id', addonId)
  if (error) return { ok: false, error: error.message }

  refreshRevenueAddons(addonId)
  return { ok: true }
}
