import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  Briefcase,
  ShieldCheck,
  AlertCircle,
  Inbox,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getDashboardStats, getRecentAuditLogs, getPendingExpenseRequestCount } from '@/lib/data'
import { createClient, createStaticClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createStaticClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = String(user?.email || '').trim().toLowerCase()

  let pendingExpenseApprovals = 0
  if (email) {
    const { data: me } = await admin.from('admin_users').select('role,is_active').eq('email', email).maybeSingle()
    if (me?.is_active && me.role === 'super_admin') {
      pendingExpenseApprovals = await getPendingExpenseRequestCount()
    }
  }

  const [statsData, auditLogs] = await Promise.all([getDashboardStats(), getRecentAuditLogs()])

  const stats = [
    // Dashboard integration: revenueThisMonth and totalRevenue include logged recurring collections.
    { name: 'Total Revenue This Month', value: statsData.revenueThisMonth, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Total Expenses', value: statsData.totalExpenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { name: 'Net Profit', value: statsData.netProfit, icon: CreditCard, color: 'text-slate-900', bg: 'bg-[#f7f7dc]' },
    { name: 'Order Book', value: statsData.orderBookValue, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Outstanding', value: statsData.outstanding, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-5 sm:space-y-8 md:space-y-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      {pendingExpenseApprovals > 0 && (
        <Link
          href="/requests#expenses"
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3.5 text-amber-950 shadow-sm transition-colors hover:border-amber-300 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <Inbox className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800">Action required</p>
              <p className="text-sm font-bold text-amber-950 mt-1">
                {pendingExpenseApprovals} expense request{pendingExpenseApprovals === 1 ? '' : 's'} awaiting approval
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 shrink-0 sm:self-center">
            Review →
          </span>
        </Link>
      )}

      <div className="min-w-0">
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
          Financial Analytics
        </h2>
        <p className="mt-1.5 max-w-2xl text-[8px] font-black uppercase leading-relaxed tracking-[0.16em] text-slate-500 sm:text-[9px] sm:tracking-[0.18em] md:text-[10px] md:tracking-[0.2em]">
          All-time totals from your finance ledger • figures cache briefly for speed
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:gap-3 lg:grid-cols-5 lg:gap-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="glass-card group flex min-h-0 min-w-0 flex-col touch-manipulation p-2.5 transition-colors duration-200 hover:border-slate-900 sm:p-3"
          >
            <div
              className={`mb-1.5 inline-flex w-fit rounded-lg border border-transparent p-1.5 transition-colors group-hover:border-current sm:mb-2 sm:p-2 ${stat.bg} ${stat.color}`}
            >
              <stat.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 line-clamp-2 text-[7px] font-black uppercase leading-tight tracking-[0.12em] text-slate-400 sm:text-[8px] md:text-[9px]">
                {stat.name}
              </p>
              <p className="break-words text-sm font-black tabular-nums leading-tight tracking-tight text-slate-900 sm:text-base lg:text-lg">
                {formatCurrency(stat.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="glass-card min-w-0 bg-white p-3 sm:p-5 md:p-6 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between md:mb-6">
            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 sm:text-base md:text-lg">
              Revenue vs Expenses
            </h3>
            <div className="flex gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-44 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:h-52 md:h-64 md:p-4">
            <div className="flex h-full flex-col justify-end gap-3">
              {statsData.totalRevenue === 0 && statsData.totalExpenses === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                  No activity yet
                </div>
              ) : (
                <>
                  <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">All time</div>
                  <div className="space-y-4">
                    {[
                      { label: 'Revenue', value: statsData.totalRevenue, color: 'bg-slate-900' },
                      { label: 'Expenses', value: statsData.totalExpenses, color: 'bg-rose-500' },
                    ].map((row) => {
                      const max = Math.max(statsData.totalRevenue, statsData.totalExpenses, 1)
                      const pct = Math.max(0, Math.min(100, (row.value / max) * 100))
                      return (
                        <div key={row.label} className="space-y-2">
                          <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600">
                            <span>{row.label}</span>
                            <span className="text-slate-900">{formatCurrency(row.value)}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white border border-slate-200 overflow-hidden">
                            <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card relative min-w-0 overflow-hidden bg-white p-3 sm:p-5 md:p-6">
          <div className="absolute top-0 right-0 p-3 opacity-5">
            <ShieldCheck className="h-14 w-14 text-slate-900 md:h-20 md:w-20" />
          </div>
          <h3 className="relative z-10 mb-4 text-sm font-bold uppercase tracking-tight text-slate-900 sm:mb-5 sm:text-base md:text-lg">
            Integrity Alerts
          </h3>
          <div className="relative z-10 space-y-3 sm:space-y-4">
            {(auditLogs || []).length > 0 ? (
              auditLogs?.map((log) => (
                <Link
                  key={log.id}
                  href={`/audit?focus=${encodeURIComponent(String(log.id))}`}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-900 transition-all group gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-wider truncate">
                      {log.action_type}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      {new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <AlertCircle className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors shrink-0" />
                </Link>
              ))
            ) : (
              <div className="text-center py-6 md:py-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No recent audit activity</p>
              </div>
            )}
            <Link
              href="/audit"
              className="block w-full py-3 md:py-4 text-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all mt-4 border border-transparent hover:border-slate-200"
            >
              View Audit Ledger
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
