import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from '@/components/DashboardLayoutClient'
import { fetchAdminUserByEmail, syncFinanceAdminUserRole } from '@/lib/admin-user-lookup'
import { createClient } from '@/lib/supabaseServer'
import { getRequestsData, getReferrers } from '@/lib/data'
import { computeRequestAttention } from '@/lib/request-attention'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = String(user?.email || '').toLowerCase()
  if (!email) {
    redirect('/login')
  }

  await syncFinanceAdminUserRole(email)

  const [data, requestsData, referrersList] = await Promise.all([
    fetchAdminUserByEmail(email),
    getRequestsData(),
    getReferrers(),
  ])

  if (!data || data.is_active === false) {
    redirect('/login?error=forbidden')
  }

  const isSuperAdmin = Boolean(data.role === 'super_admin')
  const { expenses, referralLeadRewards, recruitmentRewards } = requestsData
  const requestAttention = computeRequestAttention({
    myEmail: email,
    role: data.role,
    isActive: data.is_active,
    expenses,
    referralLeadRewards,
    recruitmentRewards,
    referrers: referrersList,
  })

  const roleLabel =
    data.role === 'super_admin'
      ? 'SUPER ADMIN'
      : data.role === 'admin'
        ? 'FINANCE ADMIN'
        : data.role === 'founder'
          ? 'FOUNDER'
          : 'MEMBER'

  const profile = {
    name: String(data.full_name || email.split('@')[0] || 'User').toUpperCase(),
    role: roleLabel,
    email,
  }

  return (
    <DashboardLayoutClient
      isSuperAdmin={isSuperAdmin}
      profile={profile}
      requestAttention={requestAttention}
    >
      {children}
    </DashboardLayoutClient>
  )
}
