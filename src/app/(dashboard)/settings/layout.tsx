import { ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseServer'
import { createStaticClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const items = [
  { name: 'Team', href: '/settings/team' },
]

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const admin = createStaticClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '').toLowerCase()
  const { data: me } = await admin.from('admin_users').select('role,email').eq('email', myEmail).maybeSingle()
  const isSuperAdmin = Boolean(me?.role === 'super_admin')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10">
      <aside className="glass-card bg-white p-8 h-fit">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Settings</h3>
        <nav className="space-y-2">
          {items.map((i) => {
            const isTeam = i.href === '/settings/team'
            const disabled = isTeam ? !isSuperAdmin : true
            return (
              <Link
                key={i.href}
                href={isTeam ? i.href : '#'}
                aria-disabled={disabled}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${
                  isTeam
                    ? 'bg-[#f7f7dc] border-slate-900 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-400'
                } ${disabled ? 'pointer-events-none opacity-50' : 'hover:border-slate-400 hover:text-slate-900'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{i.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <section>{children}</section>
    </div>
  )
}

