'use client'

import { Bell, Search, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Header() {
  const [profile, setProfile] = useState<{name: string, role: string} | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const email = String(user.email || '').toLowerCase()
        const { data } = await supabase
          .from('admin_users')
          .select('full_name, role, email')
          .eq('email', email)
          .maybeSingle()
        const display =
          String(data?.full_name || '').trim() ||
          String(data?.email || '').trim() ||
          (email ? email.split('@')[0] : 'Founder')
        const role = String(data?.role || 'founder')
        setProfile({ name: display, role })
      }
    }
    fetchUser()
  }, [])

  return (
    <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 z-10 w-full">
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-3 sm:px-4 py-2 rounded-xl flex-1 max-w-[400px] group focus-within:border-slate-900 transition-all">
        <Search className="w-4 h-4 text-slate-400 group-focus-within:text-slate-900 shrink-0" />
        <input 
          type="text" 
          placeholder="Search..." 
          className="bg-transparent border-none outline-none text-[11px] sm:text-xs w-full text-slate-900 placeholder:text-slate-400 font-medium"
        />
      </div>

      <div className="flex items-center gap-3 sm:gap-6 ml-4 shrink-0">
        <div className="hidden md:flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <div className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20" />
            <div className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Secure</span>
        </div>
        
        <div className="flex items-center gap-3 sm:pl-6 sm:border-l sm:border-slate-100">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900 uppercase tracking-wider line-clamp-1">
              {profile?.name || 'Authorized Founder'}
            </p>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest -mt-0.5">
              {profile?.role?.replace('_', ' ') || 'Internal Access'}
            </p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden hover:border-slate-900 transition-all">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>
    </header>
  )
}
