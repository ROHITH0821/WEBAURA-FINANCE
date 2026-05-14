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
    { name: 'Total Revenue', value: statsData.totalRevenue, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Total Expenses', value: statsData.totalExpenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
    { name: 'Net Profit', value: statsData.netProfit, icon: CreditCard, color: 'text-slate-900', bg: 'bg-[#f7f7dc]' },
    { name: 'Order Book', value: statsData.orderBookValue, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Outstanding', value: statsData.outstanding, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      {pendingExpenseApprovals > 0 && (
        <Link
          href="/requests"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-6 text-amber-950 shadow-sm hover:border-amber-300 transition-colors"
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

      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Financial Analytics</h2>
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
          Live data from your finance ledger • figures cache briefly for speed
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass-card p-6 md:p-8 group hover:border-slate-900 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div
                className={`p-3 md:p-4 rounded-2xl ${stat.bg} ${stat.color} border border-transparent group-hover:border-current transition-all`}
              >
                <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 md:mb-2">
                {stat.name}
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(stat.value)}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 glass-card p-6 md:p-8 bg-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-tight">Revenue vs Expenses</h3>
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
          <div className="h-64 md:h-80 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 md:p-6">
            <div className="flex h-full flex-col justify-end gap-3">
              {statsData.totalRevenue === 0 && statsData.totalExpenses === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                  No activity yet
                </div>
              ) : (
                <>
                  <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">This month</div>
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

        <div className="glass-card p-6 md:p-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck className="w-16 md:w-24 h-16 md:h-24 text-slate-900" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-6 md:mb-8 uppercase tracking-tight relative z-10">
            Integrity Alerts
          </h3>
          <div className="space-y-4 md:space-y-6 relative z-10">
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
