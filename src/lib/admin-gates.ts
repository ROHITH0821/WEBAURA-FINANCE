'use server'

import { fetchAdminUserByEmail } from '@/lib/admin-user-lookup'
import { activeFinanceRole, type FinanceRole } from '@/lib/finance-role'
import { createClient } from '@/lib/supabaseServer'

export type { FinanceRole } from '@/lib/finance-role'
export type GateOk = { ok: true; email: string; role: FinanceRole }
export type GateErr = { ok: false; error: string }

export async function requireActiveAdmin(): Promise<GateOk | GateErr> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = String(user?.email || '').toLowerCase()
  if (!email) return { ok: false, error: 'Unauthorized' }

  const row = await fetchAdminUserByEmail(email)
  if (!row || row.is_active === false) return { ok: false, error: 'Forbidden' }

  const role = activeFinanceRole(row)
  if (!role) return { ok: false, error: 'Forbidden' }

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

