export type FinanceRole = 'super_admin' | 'admin' | 'founder'

/** Role from `admin_users` when the account is active (`is_active` not explicitly false). */
export function activeFinanceRole(
  row: { role?: string | null; is_active?: boolean | null } | null | undefined,
): FinanceRole | '' {
  if (!row || row.is_active === false) return ''
  const r = String(row.role || '')
  if (r === 'super_admin' || r === 'admin' || r === 'founder') return r
  return ''
}
