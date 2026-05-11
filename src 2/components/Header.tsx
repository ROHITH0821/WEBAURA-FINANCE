'use client'

import { Bell, Search, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Header() {
  const [profile, setProfile] = useState<{name: string, role: string} | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('founder_profiles')
          .select('name, role')
          .eq('email', user.email)
          .single()
        if (data) setProfile(data)
      } else {
        // Check cookie fallback
        const cookies = document.cookie.split('; ')
        const emailCookie = cookies.find(c => c.startsWith('founder_email='))
        if (emailCookie) {
          const email = decodeURIComponent(emailCookie.split('=')[1])
          const { data } = await supabase
            .from('founder_profiles')
            .select('name, role')
            .eq('email', email)
            .single()
          if (data) setProfile(data)
        }
      }
    }
    fetchUser()
  }, [])

  return (
    <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl w-96 group focus-within:border-slate-900 transition-all">
        <Search className="w-4 h-4 text-slate-400 group-focus-within:text-slate-900" />
        <input 
          type="text" 
          placeholder="Search finance logs..." 
          className="bg-transparent border-none outline-none text-xs w-full text-slate-900 placeholder:text-slate-400 font-medium"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <div className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20" />
            <div className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Secure</span>
        </div>
        
        <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {profile?.name || 'Authorized Founder'}
            </p>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest -mt-0.5">
              {profile?.role?.replace('_', ' ') || 'Internal Access'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden hover:border-slate-900 transition-all">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  )
}
