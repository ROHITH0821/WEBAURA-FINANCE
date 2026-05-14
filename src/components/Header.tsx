'use client'

import { Bell, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { RequestAttention } from '@/lib/request-attention'
import WebAuraFinanceBrand from '@/components/WebAuraFinanceBrand'

type Profile = { name: string; role: string; email: string }

const NOTIFICATION_ROWS: {
  key: string
  href: string
  label: string
  count: (a: RequestAttention) => number
}[] = [
  { key: 'expenses', href: '/requests#expenses', label: 'Expense requests', count: (a) => a.expenses },
  { key: 'referrals', href: '/requests#referrals', label: 'Referral rewards', count: (a) => a.referrals },
  { key: 'recruitment', href: '/requests#recruitment', label: 'Recruitment', count: (a) => a.recruitment },
]

function rowClass(active: boolean) {
  const base =
    'flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border text-left transition-colors'
  if (active) return `${base} border-amber-200 bg-amber-50/90 text-amber-950 active:bg-amber-100`
  return `${base} border-slate-100 bg-white text-slate-700 active:bg-slate-50`
}

export default function Header({
  initialProfile,
  requestAttention,
}: {
  initialProfile: Profile
  requestAttention: RequestAttention
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuGroupRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const total = requestAttention.total

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuGroupRef.current?.contains(t)) return
      if (sheetRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const mq = window.matchMedia('(max-width: 639.98px)')
    const apply = () => {
      document.body.style.overflow = mq.matches ? 'hidden' : ''
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  /** If user rotates / resizes to desktop, close the mobile sheet. */
  useEffect(() => {
    if (!menuOpen) return
    const mq = window.matchMedia('(min-width: 640px)')
    const onWide = () => {
      if (mq.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', onWide)
    return () => mq.removeEventListener('change', onWide)
  }, [menuOpen])

  const close = () => setMenuOpen(false)

  const mobileSheet =
    menuOpen && mounted ? (
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-sheet-title"
        className="pointer-events-auto fixed inset-0 z-[200] flex min-h-0 flex-col bg-[#fcfcfc] sm:hidden"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 pt-1">
            <p
              id="notif-sheet-title"
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
            >
              Requests & payouts
            </p>
            <p className="mt-1 text-lg font-black leading-snug tracking-tight text-slate-900">
              {total > 0
                ? `${total} item${total === 1 ? '' : 's'} need your attention`
                : 'You are all caught up'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 touch-manipulation rounded-2xl p-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Queues</p>
          <ul className="space-y-3">
            {NOTIFICATION_ROWS.map((row) => {
              const n = row.count(requestAttention)
              const active = n > 0
              return (
                <li key={row.key}>
                  <Link href={row.href} onClick={close} className={rowClass(active)}>
                    <span className="text-base font-bold tracking-tight">{row.label}</span>
                    <span
                      className={`shrink-0 text-sm font-black tabular-nums ${active ? 'text-amber-900' : 'text-slate-400'}`}
                    >
                      {active ? n : '—'}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <Link
            href="/requests"
            onClick={close}
            className="flex w-full touch-manipulation items-center justify-center rounded-2xl bg-slate-900 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/15 transition-transform active:scale-[0.99]"
          >
            Open requests
          </Link>
        </div>
      </div>
    ) : null

  return (
    <div className="flex h-20 w-full min-w-0 items-center justify-between gap-2 overflow-visible bg-white/95 px-2 sm:gap-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-1 sm:gap-3">
        <WebAuraFinanceBrand compact className="min-w-0" />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-6">
        <div ref={menuGroupRef} className="relative overflow-visible">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-label={total > 0 ? `Notifications, ${total} items` : 'Notifications'}
            onClick={() => setMenuOpen((o) => !o)}
            className="relative touch-manipulation rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Bell className="h-5 w-5" />
            {total > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-black leading-none text-white ring-2 ring-white">
                {total > 99 ? '99+' : total}
              </span>
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-[100] mt-2 hidden h-auto max-h-[min(70vh,22rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 sm:flex sm:flex-col"
            >
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Requests & payouts
                </p>
                <p className="mt-0.5 break-words text-xs font-bold text-slate-900">
                  {total > 0 ? `${total} item${total === 1 ? '' : 's'} need your attention` : 'You are all caught up'}
                </p>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                {NOTIFICATION_ROWS.map((row) => {
                  const n = row.count(requestAttention)
                  const active = n > 0
                  return (
                    <li key={row.key}>
                      <Link
                        role="menuitem"
                        href={row.href}
                        onClick={close}
                        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors ${
                          active
                            ? 'bg-amber-50/80 text-amber-950 hover:bg-amber-100'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="min-w-0 break-words">{row.label}</span>
                        <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-500">
                          {active ? n : '—'}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2">
                <Link
                  href="/requests"
                  onClick={close}
                  className="block rounded-xl bg-slate-900 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
                >
                  Open requests
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2 border-slate-100 sm:gap-4 sm:border-l sm:pl-6">
          <div className="max-w-[min(42vw,11rem)] min-w-0 text-right sm:max-w-[200px]">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-900 sm:text-[11px]">
              {initialProfile.name}
            </p>
            <p className="truncate text-[7px] font-black uppercase tracking-[0.15em] text-slate-400 sm:text-[8px]">
              {initialProfile.role}
            </p>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200/80 sm:h-10 sm:w-10"
            title={initialProfile.email}
          >
            <User className="h-4 w-4 opacity-80 sm:h-5 sm:w-5" aria-hidden />
          </div>
        </div>
      </div>

      {mounted && mobileSheet ? createPortal(mobileSheet, document.body) : null}
    </div>
  )
}
