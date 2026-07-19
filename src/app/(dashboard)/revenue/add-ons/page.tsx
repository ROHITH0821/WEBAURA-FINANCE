import { createClient } from '@/lib/supabaseServer'
import { fetchAdminUserByEmail } from '@/lib/admin-user-lookup'
import { isSuperAdminRole, resolveFinanceRole } from '@/lib/finance-role'
import { getFounders } from '@/lib/data'
import { getRevenueAddons } from '@/lib/revenue-addons/data'
import RevenueAddonsClient from './revenue-addons-client'

export const dynamic = 'force-dynamic'

export default async function RevenueAddonsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '').trim().toLowerCase()

  const [meRow, foundersData, addons] = await Promise.all([
    fetchAdminUserByEmail(myEmail),
    getFounders(),
    getRevenueAddons(),
  ])

  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      email: String(f.email),
      name: String(f.full_name || f.email),
      role: String(f.role || ''),
    }))

  const role = resolveFinanceRole(meRow, myEmail, founders)

  return (
    <RevenueAddonsClient
      addons={addons}
      canDelete={isSuperAdminRole(role)}
      myEmail={myEmail}
    />
  )
}
