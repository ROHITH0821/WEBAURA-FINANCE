import { ReactNode } from 'react'
import DashboardLayoutClient from '@/components/DashboardLayoutClient'
import { createClient, createStaticClient } from '@/lib/supabaseServer'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const admin = createStaticClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = String(user?.email || '').toLowerCase()
  const { data } = email
    ? await admin.from('admin_users').select('role,is_active').eq('email', email).maybeSingle()
    : { data: null as any }
  const isSuperAdmin = Boolean(data?.is_active && data?.role === 'super_admin')

  return (
    <DashboardLayoutClient isSuperAdmin={isSuperAdmin}>
      {children}
    </DashboardLayoutClient>
  )
}
