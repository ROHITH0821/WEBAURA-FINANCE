'use server'

import { revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import { requireActiveAdmin } from '@/lib/admin-gates'
import type { Agency } from '@/types/finance'

const revalidate = (tag: string) => (revalidateTag as any)(tag)

export async function createAgencyAction(input: {
  name: string
}): Promise<{ ok: true; agency: Agency } | { ok: false; error: string }> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const name = String(input.name || '').trim()
  if (!name) return { ok: false, error: 'Agency name is required.' }

  const supabase = createStaticClient()

  const { data: existing } = await supabase
    .from('agencies')
    .select('id,name,is_active,notes,created_at')
    .ilike('name', name)
    .maybeSingle()

  if (existing) {
    return { ok: true, agency: existing as Agency }
  }

  const { data, error } = await supabase
    .from('agencies')
    .insert({ name, is_active: true })
    .select('id,name,is_active,notes,created_at')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidate('agencies')
  return { ok: true, agency: data as Agency }
}

export async function getAgenciesForForm(): Promise<{ ok: true; agencies: Agency[] } | { ok: false; error: string }> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('agencies')
    .select('id,name,is_active,notes,created_at')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) return { ok: false, error: error.message }
  return { ok: true, agencies: (data || []) as Agency[] }
}
