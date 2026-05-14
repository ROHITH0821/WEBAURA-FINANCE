'use client'

import { ReactNode, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import * as navigation from 'next/navigation'
import { Menu, X, ChevronRight } from 'lucide-react'
import type { RequestAttention } from '@/lib/request-attention'

const Sidebar = dynamic(() => import('@/components/SidebarStable'), { ssr: false })
const Header = dynamic(() => import('@/components/Header'), { ssr: false })

export default function DashboardLayoutClient({
  children,
  isSuperAdmin,
  profile,
  requestAttention,
}: {
  children: ReactNode
  isSuperAdmin: boolean
  profile: { name: string; role: string; email: string }
  requestAttention: RequestAttention
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = typeof navigation.usePathname === 'function' ? navigation.usePathname() : ''

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900 antialiased font-jakarta">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          isSuperAdmin={isSuperAdmin}
          requestAttentionTotal={requestAttention.total}
          onClose={() => setIsSidebarOpen(false)}
        />
        {/* Mobile Close Button */}
        <button 
          className="absolute top-4 right-4 p-2 lg:hidden text-slate-400 hover:text-slate-900"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 w-full min-w-0 relative">
        <header className="sticky top-0 z-30 flex flex-col bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="flex items-stretch h-20 min-h-[5rem] min-w-0">
            <button
              type="button"
              className="p-4 lg:hidden text-slate-500 hover:text-slate-900 transition-colors shrink-0 touch-manipulation"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 min-w-0 min-h-0 flex items-stretch overflow-visible">
              <Header initialProfile={profile} requestAttention={requestAttention} />
            </div>
          </div>

          {requestAttention.total > 0 && (
            <Link
              href="/requests#expenses"
              className="lg:hidden flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-50 border-t border-amber-200/90 text-amber-950 active:bg-amber-100 touch-manipulation"
            >
              <span
                className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black text-white tabular-nums shadow-sm"
                aria-hidden
              >
                {requestAttention.total > 99 ? '99+' : requestAttention.total}
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.12em] flex-1 text-center truncate">
                Requests & payouts — tap to review
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-amber-900/60" aria-hidden />
            </Link>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-[#fcfcfc] relative">
          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
          
          <div className="relative z-10 mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
