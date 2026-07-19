'use client'

import Link from 'next/link'
import * as navigation from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  Briefcase,
  Receipt,
  Inbox,
  PieChart,
  Repeat,
  Settings,
  ShieldCheck,
  User,
  LogOut,
  ChevronRight,
  CirclePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashboardBottomNavPathSet } from '@/lib/dashboard-bottom-nav'
import WebAuraFinanceBrand from '@/components/WebAuraFinanceBrand'

const navItems = [
  { name: 'Summary', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Recurring Revenue', href: '/recurring', icon: Repeat },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Requests', href: '/requests', icon: Inbox },
  { name: 'Revenue', href: '/revenue', icon: PieChart },
  { name: 'Revenue Add-ons', href: '/revenue/add-ons', icon: CirclePlus },
  { name: 'Audit', href: '/audit', icon: ShieldCheck, superAdmin: true },
  { name: 'Settings', href: '/settings/team', icon: Settings, superAdmin: true },
  { name: 'Profile', href: '/profile', icon: User },
]

export default function SidebarStable({
  isSuperAdmin,
  requestAttentionTotal = 0,
  onClose,
}: {
  isSuperAdmin: boolean
  requestAttentionTotal?: number
  onClose?: () => void
}) {
  const pathname = typeof navigation.usePathname === 'function' ? navigation.usePathname() : ''
  const [hideBottomDuplicates, setHideBottomDuplicates] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => setHideBottomDuplicates(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const filteredItems = useMemo(() => {
    let list = navItems.filter((i) => ((i as any).superAdmin ? isSuperAdmin : true))
    if (hideBottomDuplicates) {
      list = list.filter((item) => !dashboardBottomNavPathSet.has(item.href.split('#')[0]))
    }
    return list
  }, [isSuperAdmin, hideBottomDuplicates])

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full z-20">
      <div className="p-8">
        <div className="mb-10">
          <WebAuraFinanceBrand onNavigate={onClose} />
        </div>

        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const pathOnly = item.href.split('#')[0]
            const isActive =
              pathOnly === '/revenue'
                ? pathname === '/revenue'
                : pathname === pathOnly ||
                  (pathOnly !== '/' && pathname.startsWith(`${pathOnly}/`))

            const linkHref =
              item.href === '/requests' && requestAttentionTotal > 0 ? '/requests#expenses' : item.href

            return (
              <Link
                key={item.href}
                href={linkHref}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between px-5 py-3.5 rounded-xl transition-all duration-300 group border-l-[3px]',
                  isActive
                    ? 'bg-[#f7f7dc] text-slate-900 border-l-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] ring-1 ring-slate-200 translate-x-1'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-transparent hover:translate-x-1',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.icon && (
                    <item.icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-transform duration-300',
                        isActive ? 'text-slate-900 scale-110' : 'text-slate-400 group-hover:text-slate-900',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'text-[11px] font-black uppercase tracking-wider transition-colors duration-300 truncate',
                      isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900',
                    )}
                  >
                    {item.name}
                  </span>
                  {item.href === '/requests' && requestAttentionTotal > 0 && (
                    <span
                      className={cn(
                        'shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-black tabular-nums',
                        isActive ? 'bg-slate-900 text-[#f7f7dc]' : 'bg-rose-500 text-white',
                      )}
                      aria-label={`${requestAttentionTotal} open requests`}
                    >
                      {requestAttentionTotal > 99 ? '99+' : requestAttentionTotal}
                    </span>
                  )}
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-900 animate-in slide-in-from-left-1 shrink-0" />}
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
