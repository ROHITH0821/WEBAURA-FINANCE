import type { AdminUserRow } from '@/lib/admin-user-lookup'

export type FinanceRole = 'super_admin' | 'admin' | 'founder'

function normalizeRole(raw: string | null | undefined): FinanceRole | '' {
  const r = String(raw || '')
    .trim()
    .toLowerCase()
  if (r === 'super_admin' || r === 'admin' || r === 'founder') return r
  return ''
}

/** Role from `admin_users` when the account is active (`is_active` not explicitly false). */
export function activeFinanceRole(row: AdminUserRow | null | undefined): FinanceRole | '' {
  if (!row || row.is_active === false) return ''
  return normalizeRole(row.role)
}

/** Prefer DB row; fall back to cached founders list (same table, avoids stale-only edge cases). */
export function resolveFinanceRole(
  meRow: AdminUserRow | null | undefined,
  myEmail: string,
  founders?: { email?: string | null; role?: string | null; is_active?: boolean | null }[],
): FinanceRole | '' {
  const fromDb = activeFinanceRole(meRow)
  if (fromDb) return fromDb

  const email = String(myEmail || '').trim().toLowerCase()
  if (!email || !founders?.length) return ''

  const match = founders.find((f) => String(f.email || '').trim().toLowerCase() === email)
  const fromFounders = activeFinanceRole(match)
  if (fromFounders) return fromFounders

  return ''
}

export function canViewOrgExpenseLedger(role: FinanceRole | ''): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function isSuperAdminRole(role: FinanceRole | ''): boolean {
  return role === 'super_admin'
}
