import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabaseServer'
import { fetchAdminUserByEmail } from '@/lib/admin-user-lookup'
import { isSuperAdminRole, resolveFinanceRole } from '@/lib/finance-role'
import { getFounders } from '@/lib/data'
import { getRevenueAddonById } from '@/lib/revenue-addons/data'
import RevenueAddonDetailClient from './revenue-addon-detail-client'

export const dynamic = 'force-dynamic'

export default async function RevenueAddonDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params)
  const id = String(resolved?.id || '').trim()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '').trim().toLowerCase()

  const [addon, meRow, foundersData] = await Promise.all([
    getRevenueAddonById(id),
    fetchAdminUserByEmail(myEmail),
    getFounders(),
  ])

  if (!addon) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Add-on not found
        </p>
      </div>
    )
  }

  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      email: String(f.email),
      name: String(f.full_name || f.email),
      role: String(f.role || ''),
    }))

  const role = resolveFinanceRole(meRow, myEmail, founders)

  return (
    <RevenueAddonDetailClient addon={addon} canDelete={isSuperAdminRole(role)} />
  )
}
