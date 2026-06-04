'use client'

import { daysUntilExpiry, expiryBadgeTone } from '@/types/client-credentials'

export default function ExpiryBadge({ date }: { date: string | null | undefined }) {
  const days = daysUntilExpiry(date)
  if (days == null) {
    return <span className="badge-slate px-3">No date</span>
  }
  const tone = expiryBadgeTone(days)
  const cls =
    tone === 'green'
      ? 'badge-green'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest'
        : tone === 'red'
          ? 'bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest'
          : 'badge-slate px-3'
  return (
    <span className={cls}>
      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
    </span>
  )
}
