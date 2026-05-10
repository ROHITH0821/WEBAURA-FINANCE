import { createClient } from '@/lib/supabaseServer'
import { createStaticClient } from '@/lib/supabaseServer'
import TeamSettingsClient from './team-settings-client'

export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const myEmail = String(user?.email || '').toLowerCase()

  const { data: me } = await admin.from('admin_users').select('email, role').eq('email', myEmail).maybeSingle()
  const isSuperAdmin = Boolean(me?.role === 'super_admin')

  if (!isSuperAdmin) {
    return (
      <div className="glass-card bg-white p-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Access denied</p>
        <p className="mt-3 text-sm font-bold text-slate-700">Only Rohith (super admin) can manage the team.</p>
      </div>
    )
  }

  const { data: members } = await admin
    .from('admin_users')
    .select('email, full_name, role, is_active, created_at')
    .order('role', { ascending: true })

  return (
    <TeamSettingsClient myEmail={myEmail} members={members || []} />
  )
}

