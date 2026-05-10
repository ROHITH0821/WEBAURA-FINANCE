'use server'

import { createClient, createStaticClient } from '@/lib/supabaseServer'

export type GateOk = { ok: true; email: string; role: 'super_admin' | 'founder' }
export type GateErr = { ok: false; error: string }

export async function requireActiveAdmin(): Promise<GateOk | GateErr> {
  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = String(user?.email || '').toLowerCase()
  if (!email) return { ok: false, error: 'Unauthorized' }

  const { data: row, error } = await admin
    .from('admin_users')
    .select('email, role, is_active')
    .eq('email', email)
    .maybeSingle()

  if ((error as any)?.code === '42P01') return { ok: false, error: 'Missing DB table `admin_users`.' }
  if (!row || row.is_active === false) return { ok: false, error: 'Forbidden' }

  const role = (row.role === 'super_admin' ? 'super_admin' : 'founder') as 'super_admin' | 'founder'
  return { ok: true, email, role }
}

export async function requireSuperAdmin(): Promise<GateOk | GateErr> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return gate
  if (gate.role !== 'super_admin') return { ok: false, error: 'Forbidden' }
  return gate
}

