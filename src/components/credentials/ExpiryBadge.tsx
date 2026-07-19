'use client'

import { daysUntilExpiry, expiryBadgeTone } from '@/types/client-credentials'

const badgeBase =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest'

const toneClasses = {
  green: `${badgeBase} border-emerald-200 bg-emerald-100 text-emerald-800`,
  amber: `${badgeBase} border-amber-200 bg-amber-100 text-amber-800`,
  red: `${badgeBase} border-rose-200 bg-rose-100 text-rose-700`,
  slate: `${badgeBase} border-slate-200 bg-slate-100 text-slate-600`,
} as const

export default function ExpiryBadge({ date }: { date: string | null | undefined }) {
  const days = daysUntilExpiry(date)
  if (days == null) {
    return <span className={toneClasses.slate}>No date</span>
  }

  const tone = expiryBadgeTone(days)
  const label = days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`

  return <span className={toneClasses[tone]}>{label}</span>
}
