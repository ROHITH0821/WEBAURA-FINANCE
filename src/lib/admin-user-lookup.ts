import { createStaticClient } from '@/lib/supabaseServer'

export type AdminUserRow = {
  email?: string | null
  role?: string | null
  is_active?: boolean | null
  full_name?: string | null
}

/** Load role from finance.admin_users, then admin.admin_users if missing (shared Supabase project). */
export async function fetchAdminUserByEmail(email: string): Promise<AdminUserRow | null> {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null

  const supabase = createStaticClient()

  const { data: financeRow } = await supabase
    .from('admin_users')
    .select('email, role, is_active, full_name')
    .eq('email', normalized)
    .maybeSingle()

  if (financeRow) return financeRow

  try {
    const adminClient = (supabase as unknown as { schema: (name: string) => typeof supabase }).schema('admin')
    const { data: adminRow } = await adminClient
      .from('admin_users')
      .select('email, role, is_active, full_name')
      .eq('email', normalized)
      .maybeSingle()
    if (adminRow) return adminRow
  } catch {
    // admin schema not exposed on this project
  }

  return null
}
