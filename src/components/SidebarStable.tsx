'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import {
  LayoutDashboard,
  Briefcase,
  Receipt,
  Inbox,
  PieChart,
  Settings,
  ShieldCheck,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Summary', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Requests', href: '/requests', icon: Inbox },
  { name: 'Revenue', href: '/revenue', icon: PieChart },
  { name: 'Audit', href: '/audit', icon: ShieldCheck, superAdmin: true },
  { name: 'Settings', href: '/settings/team', icon: Settings, superAdmin: true },
  { name: 'Profile', href: '/profile', icon: User },
]

export default function SidebarStable({ isSuperAdmin, onClose }: { isSuperAdmin: boolean, onClose?: () => void }) {
  const pathname = usePathname()
  const filteredItems = useMemo(
    () => navItems.filter((i) => ((i as any).superAdmin ? isSuperAdmin : true)),
    [isSuperAdmin],
  )

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full z-20">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="relative w-10 h-10 overflow-hidden">
            <Image
              src="/webaura-mark-light.png"
              alt="WebAura"
              fill
              sizes="40px"
              className="object-contain object-center"
              priority
              draggable={false}
              unoptimized
            />
          </div>
          <div>
            <h1 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-900">WebAura</h1>
            <p className="text-[7px] uppercase tracking-[0.4em] text-slate-400 font-black -mt-0.5">Finance</p>
          </div>
        </div>

        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between px-5 py-3.5 rounded-xl transition-all duration-300 group border-l-[3px]',
                  isActive
                    ? 'bg-[#f7f7dc] text-slate-900 border-l-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] ring-1 ring-slate-200 translate-x-1'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-transparent hover:translate-x-1',
                )}
              >
                <div className="flex items-center gap-3">
                  {item.icon && (
                    <item.icon
                      className={cn(
                        'w-4 h-4 transition-transform duration-300',
                        isActive ? 'text-slate-900 scale-110' : 'text-slate-400 group-hover:text-slate-900',
                      )}
                    />
                  )}
                  <span className={cn(
                    "text-[11px] font-black uppercase tracking-wider transition-colors duration-300",
                    isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-900"
                  )}>
                    {item.name}
                  </span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-900 animate-in slide-in-from-left-1" />}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-100">
        <button
          onClick={async () => {
            const { createClient } = await import('@/lib/supabase')
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all group font-bold text-[10px] uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
