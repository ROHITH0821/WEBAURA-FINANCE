'use client'

import { Bell, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Header() {
  const [profile, setProfile] = useState<{name: string, role: string, email: string} | null>(null)

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
        
        const display = (data?.full_name || email.split('@')[0] || 'Founder').toUpperCase()
        const role = (data?.role || 'founder').replace('_', ' ').toUpperCase()
        setProfile({ name: display, role, email })
      }
    }
    fetchUser()
  }, [])

  return (
    <div className="h-20 flex items-center justify-between px-4 sm:px-8 w-full bg-white/50 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative flex h-2 w-2">
          <div className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20" />
          <div className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Secure</span>
      </div>

      <div className="flex items-center gap-4 sm:gap-8">
        <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors hidden sm:block">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-4 sm:pl-8 sm:border-l sm:border-slate-100">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.1em] mb-0.5">
              {profile?.name || 'LOADING...'}
            </p>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">
              {profile?.role || 'ACCESS'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 overflow-hidden group hover:scale-105 transition-transform cursor-pointer">
            <User className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  )
}
