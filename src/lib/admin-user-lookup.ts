import { revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import type { FinanceRole } from '@/lib/finance-role'

export type AdminUserRow = {
  email?: string | null
  role?: string | null
  is_active?: boolean | null
  full_name?: string | null
}

const ROLE_RANK: Record<FinanceRole, number> = {
  founder: 1,
  admin: 2,
  super_admin: 3,
}

function normalizeRole(raw: string | null | undefined): FinanceRole | '' {
  const r = String(raw || '')
    .trim()
    .toLowerCase()
  if (r === 'super_admin' || r === 'admin' || r === 'founder') return r
  return ''
}

/** Prefer the higher-privilege role when finance + admin schemas disagree. */
export function mergeAdminRoles(
  financeRole: string | null | undefined,
  adminSchemaRole: string | null | undefined,
): FinanceRole | '' {
  const f = normalizeRole(financeRole)
  const a = normalizeRole(adminSchemaRole)
  if (!f && !a) return ''
  if (!f) return a
  if (!a) return f
  return ROLE_RANK[f] >= ROLE_RANK[a] ? f : a
}

async function fetchAdminSchemaRow(email: string): Promise<AdminUserRow | null> {
  const supabase = createStaticClient()
  try {
    const adminClient = (supabase as unknown as { schema: (name: string) => typeof supabase }).schema('admin')
    const { data } = await adminClient
      .from('admin_users')
      .select('email, role, is_active, full_name')
      .eq('email', email)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

/**
 * Load user from finance.admin_users + admin.admin_users and return merged role.
 * If admin portal has `admin` but finance still has `founder`, merged role is `admin`.
 */
export async function fetchAdminUserByEmail(email: string): Promise<AdminUserRow | null> {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null

  const supabase = createStaticClient()

  const { data: financeRow } = await supabase
    .from('admin_users')
    .select('email, role, is_active, full_name')
    .eq('email', normalized)
    .maybeSingle()

  const adminRow = await fetchAdminSchemaRow(normalized)

  if (!financeRow && !adminRow) return null

  const mergedRole = mergeAdminRoles(financeRow?.role, adminRow?.role)
  const isActive =
    financeRow?.is_active === false || adminRow?.is_active === false
      ? false
      : financeRow?.is_active ?? adminRow?.is_active ?? true

  return {
    email: normalized,
    role: mergedRole || financeRow?.role || adminRow?.role,
    is_active: isActive,
    full_name: financeRow?.full_name ?? adminRow?.full_name,
  }
}

/**
 * Persist merged role into finance.admin_users (upgrade only — never auto-downgrade).
 * Call after OTP send / verify so WEBAURA-ADMIN admins get finance `admin` access.
 */
export async function syncFinanceAdminUserRole(email: string): Promise<void> {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return

  const supabase = createStaticClient()

  const { data: financeRow } = await supabase
    .from('admin_users')
    .select('email, role, is_active, full_name')
    .eq('email', normalized)
    .maybeSingle()

  const adminRow = await fetchAdminSchemaRow(normalized)
  const merged = mergeAdminRoles(financeRow?.role, adminRow?.role)
  if (!merged) return

  const current = normalizeRole(financeRow?.role)
  const shouldUpgrade = !current || ROLE_RANK[merged] > ROLE_RANK[current]

  if (!financeRow && adminRow) {
    await supabase.from('admin_users').insert({
      email: normalized,
      full_name: adminRow.full_name || normalized.split('@')[0],
      role: merged,
      is_active: adminRow.is_active !== false,
    })
    ;(revalidateTag as (tag: string) => void)('founders')
    return
  }

  if (financeRow && shouldUpgrade && merged !== current) {
    await supabase.from('admin_users').update({ role: merged }).eq('email', normalized)
    ;(revalidateTag as (tag: string) => void)('founders')
  }
}
