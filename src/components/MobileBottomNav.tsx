'use client'

import Link from 'next/link'
import * as navigation from 'next/navigation'
import { cn } from '@/lib/utils'
import { dashboardBottomNavItems } from '@/lib/dashboard-bottom-nav'
import type { RequestAttention } from '@/lib/request-attention'

export default function MobileBottomNav({ requestAttention }: { requestAttention: RequestAttention }) {
  const pathname = typeof navigation.usePathname === 'function' ? navigation.usePathname() : ''
  const total = requestAttention.total

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-6px_24px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden"
    >
      <ul className="flex w-full min-w-0 items-stretch justify-between gap-0 px-0.5 sm:px-1">
        {dashboardBottomNavItems.map((item) => {
          const pathOnly = item.href.split('#')[0]
          const isActive =
            pathname === pathOnly || (pathOnly !== '/' && pathname.startsWith(`${pathOnly}/`))
          const linkHref = item.href === '/requests' && total > 0 ? '/requests#expenses' : item.href
          const Icon = item.icon

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={linkHref}
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-center transition-colors touch-manipulation active:scale-[0.98] sm:rounded-xl sm:py-1.5',
                  isActive ? 'bg-[#f7f7dc] text-slate-900' : 'text-slate-400 hover:text-slate-700',
                )}
              >
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
                  <Icon
                    className={cn('h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]', isActive ? 'text-slate-900' : 'text-slate-400')}
                    aria-hidden
                  />
                  {item.href === '/requests' && total > 0 && (
                    <span
                      className="absolute -right-1.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-black leading-none text-white tabular-nums shadow-sm sm:h-[15px] sm:min-w-[15px] sm:text-[9px]"
                      aria-label={`${total} open requests`}
                    >
                      {total > 99 ? '99+' : total}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'max-w-full truncate px-0.5 text-[7px] font-black uppercase tracking-[0.04em] sm:text-[8px] sm:tracking-[0.06em]',
                    isActive ? 'text-slate-900' : 'text-slate-500',
                  )}
                >
                  {item.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
