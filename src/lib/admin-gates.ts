'use server'

import { createClient, createStaticClient } from '@/lib/supabaseServer'

export type GateOk = { ok: true; email: string; role: 'super_admin' | 'admin' | 'founder' }
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

  const role = (row.role === 'super_admin' ? 'super_admin' : row.role === 'admin' ? 'admin' : 'founder') as any
  return { ok: true, email, role }
}

export async function requireAdmin(): Promise<GateOk | GateErr> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return gate
  if (gate.role !== 'super_admin' && gate.role !== 'admin') return { ok: false, error: 'Forbidden' }
  return gate
}

export async function requireSuperAdmin(): Promise<GateOk | GateErr> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return gate
  if (gate.role !== 'super_admin') return { ok: false, error: 'Forbidden' }
  return gate
}

