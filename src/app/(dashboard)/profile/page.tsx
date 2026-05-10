import { createClient } from '@/lib/supabaseServer'
import { createStaticClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = String(user?.email || '').toLowerCase()

  const { data: me } = email
    ? await admin.from('admin_users').select('email, full_name, role, is_active, created_at').eq('email', email).maybeSingle()
    : { data: null as any }

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-1 md:mb-2 uppercase">Profile</h2>
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">Your finance access identity</p>
      </div>

      <div className="glass-card bg-white p-6 md:p-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Email</p>
            <p className="text-base md:text-lg font-black text-slate-900 break-all">{me?.email || email || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Role</p>
            <p className="text-base md:text-lg font-black text-slate-900">{me?.role || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Name</p>
            <p className="text-base md:text-lg font-black text-slate-900">{me?.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Status</p>
            <p className="text-base md:text-lg font-black text-slate-900">{me?.is_active === false ? 'disabled' : 'active'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

