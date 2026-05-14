import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from '@/components/DashboardLayoutClient'
import { createClient, createStaticClient } from '@/lib/supabaseServer'
import { getRequestsData, getReferrers } from '@/lib/data'
import { computeRequestAttention } from '@/lib/request-attention'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const admin = createStaticClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = String(user?.email || '').toLowerCase()
  if (!email) {
    redirect('/login')
  }

  const [{ data }, requestsData, referrersList] = await Promise.all([
    admin.from('admin_users').select('role,is_active,full_name,email').eq('email', email).maybeSingle(),
    getRequestsData(),
    getReferrers(),
  ])

  if (!data?.is_active) {
    redirect('/login?error=forbidden')
  }

  const isSuperAdmin = Boolean(data?.role === 'super_admin')
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

  const profile = {
    name: String(data.full_name || email.split('@')[0] || 'User').toUpperCase(),
    role: String(data.role || 'member').replace(/_/g, ' ').toUpperCase(),
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
