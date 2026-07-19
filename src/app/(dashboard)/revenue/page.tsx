import { Wallet, ArrowLeftRight, AlertCircle, Info, PieChart, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getRevenueData } from '@/lib/data'
import { REVENUE_TYPES, REVENUE_TYPE_LABELS, type RevenueType } from '@/types/finance'

export default async function RevenuePage() {
  // Use high-performance cached data
  const revenue = await getRevenueData()
  const { founders: foundersData, projects, payments, expenses, recurringRevenue, recurringPayments, agencies } = revenue

  // Audit fix: normalize founder emails so expense attribution matches lowercase DB values.
  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      id: String(f.id),
      email: String(f.email).trim().toLowerCase(),
      name: String(f.full_name || f.email),
    }))

  const founderCount = founders.length || 1

  // MATH LOGIC
  const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpenses = (expenses || [])
    .filter((e) => (e?.status || 'pending') === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  // Company-wide net profit — same formula as the Dashboard's Net Profit card (all revenue incl.
  // recurring collections, minus ALL paid expenses regardless of project/agency tagging). Shown here
  // so it's visible right alongside the by-type/by-agency breakdowns, which only reflect TAGGED
  // expenses and therefore don't reconcile to this number on their own (untagged/general expenses —
  // e.g. a subscription with no linked project or agency — are still deducted here).
  const recurringTotalRevenue = (recurringPayments || []).reduce((sum, rp) => sum + Number(rp.amount_received || 0), 0)
  const companyTotalRevenue = totalRevenue + recurringTotalRevenue
  const companyNetProfit = companyTotalRevenue - totalExpenses

  const platformMaintenance = totalRevenue * 0.10
  const distributableProfit = totalRevenue * 0.90
  
  const sharePerFounderExpenses = totalExpenses / founderCount

  // Map to store balances
  const founderBalances = new Map(
    founders.map((f) => [
      f.email,
      {
        name: f.name,
        email: f.email,
        profitShare: 0,
        expensesPaid: 0,
        netBalance: 0,
      },
    ]),
  )

  // Calculate Profit Shares
  // 50% of 90% (45% total) goes to Lead
  // 50% of 90% (45% total) shared equally
  const commonProfitPool = distributableProfit * 0.50
  const shareFromCommonPool = commonProfitPool / founderCount

  const projectLeads = new Map(
    (projects || []).map((p) => [p.id, String(p.project_lead || '').trim().toLowerCase()]),
  )

  payments?.forEach(payment => {
    const leadId = projectLeads.get(payment.project_id)
    const amount = Number(payment.amount)
    const leadProfitShare = (amount * 0.90) * 0.50

    // Add common share to everyone
    founders.forEach((f) => {
      const b = founderBalances.get(f.email)
      if (b) b.profitShare += (amount * 0.90 * 0.50) / founderCount
    })

    // Audit fix: project_lead emails were compared case-sensitively, so lead bonuses could be skipped.
    if (leadId && founderBalances.has(leadId)) {
      const b = founderBalances.get(leadId)
      if (b) b.profitShare += leadProfitShare
    }
  })

  // Calculate Expense Contributions
  expenses
    ?.filter((e) => (e?.status || 'pending') === 'paid')
    ?.forEach((expense) => {
      const by = String(expense.requested_by || '').trim().toLowerCase()
      if (by && founderBalances.has(by)) {
        const b = founderBalances.get(by)
        if (b) b.expensesPaid += Number(expense.amount)
      }
    })

  // Final Net Balance
  // Balance = ProfitShare + ExpensesPaid - ShareOfTotalExpenses
  const finalBalances = Array.from(founderBalances.values()).map((b) => ({
    ...b,
    netBalance: b.profitShare + b.expensesPaid - sharePerFounderExpenses
  }))

  // Revenue by Type — additive breakdown, does not feed into or alter any of the founder math above.
  const projectRevenueType = new Map(
    (projects || []).map((p: any) => [p.id, (p.revenue_type || 'direct_client') as RevenueType]),
  )
  const recurringRevenueType = new Map(
    (recurringRevenue || []).map((r: any) => [r.id, (r.revenue_type || 'direct_client') as RevenueType]),
  )

  const byType = new Map<RevenueType, { grossTotal: number; netTotal: number; expensesTotal: number }>(
    REVENUE_TYPES.map((rt) => [rt, { grossTotal: 0, netTotal: 0, expensesTotal: 0 }]),
  )

  for (const p of payments || []) {
    const type = projectRevenueType.get(p.project_id) || 'direct_client'
    const bucket = byType.get(type)!
    const net = Number(p.amount || 0)
    bucket.netTotal += net
    bucket.grossTotal += p.gross_amount != null ? Number(p.gross_amount) : net
  }

  for (const rp of recurringPayments || []) {
    const type = recurringRevenueType.get(rp.recurring_id) || 'direct_client'
    const bucket = byType.get(type)!
    const net = Number(rp.amount_received || 0)
    bucket.netTotal += net
    bucket.grossTotal += rp.gross_amount != null ? Number(rp.gross_amount) : net
  }

  // Expenses tagged to a project (via the Expenses ledger's optional "Client project" link) count
  // against that project's revenue type. Only paid expenses count.
  const paidExpenses = (expenses || []).filter((e: any) => String(e?.status || 'pending').toLowerCase() === 'paid')
  for (const e of paidExpenses) {
    if (!e.project_id) continue
    const type = projectRevenueType.get(e.project_id)
    if (!type) continue
    byType.get(type)!.expensesTotal += Number(e.amount || 0)
  }

  const revenueByType = REVENUE_TYPES.map((rt) => {
    const { grossTotal, netTotal, expensesTotal } = byType.get(rt)!
    return { type: rt, label: REVENUE_TYPE_LABELS[rt], grossTotal, netTotal, expensesTotal, netAfterExpenses: netTotal - expensesTotal }
  })

  // Revenue by Agency — rolls up ALL projects + recurring clients tied to the same agency, so the
  // gross/share math reflects the whole relationship, not one project in isolation. Expenses come
  // from the Expenses ledger tagged directly to the agency (not entered per payment).
  const projectAgency = new Map((projects || []).map((p: any) => [p.id, p.agency_id as string | null]))
  const recurringAgency = new Map((recurringRevenue || []).map((r: any) => [r.id, r.agency_id as string | null]))

  const byAgency = new Map<string, { grossTotal: number; netTotal: number; expensesTotal: number }>()
  const touchAgencyBucket = (agencyId: string) => {
    if (!byAgency.has(agencyId)) byAgency.set(agencyId, { grossTotal: 0, netTotal: 0, expensesTotal: 0 })
    return byAgency.get(agencyId)!
  }

  for (const p of payments || []) {
    const agencyId = projectAgency.get(p.project_id)
    if (!agencyId) continue
    const bucket = touchAgencyBucket(agencyId)
    const net = Number(p.amount || 0)
    bucket.netTotal += net
    bucket.grossTotal += p.gross_amount != null ? Number(p.gross_amount) : net
  }

  for (const rp of recurringPayments || []) {
    const agencyId = recurringAgency.get(rp.recurring_id)
    if (!agencyId) continue
    const bucket = touchAgencyBucket(agencyId)
    const net = Number(rp.amount_received || 0)
    bucket.netTotal += net
    bucket.grossTotal += rp.gross_amount != null ? Number(rp.gross_amount) : net
  }

  for (const e of paidExpenses) {
    if (!e.agency_id) continue
    touchAgencyBucket(e.agency_id).expensesTotal += Number(e.amount || 0)
  }

  const agencyNameById = new Map((agencies || []).map((a: any) => [String(a.id), String(a.name)]))
  const revenueByAgency = Array.from(byAgency.entries())
    .map(([agencyId, totals]) => ({
      agencyId,
      name: agencyNameById.get(agencyId) || 'Unknown agency',
      ...totals,
      netAfterExpenses: totals.netTotal - totals.expensesTotal,
    }))
    .sort((a, b) => b.netAfterExpenses - a.netAfterExpenses)

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Revenue & Settlements</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">Founder balances and profit-share math</p>
        </div>
        <div className="glass-card px-4 md:px-6 py-3 md:py-4 bg-slate-900 text-white border-none shadow-xl shadow-slate-200 w-full sm:w-auto">
          <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Maintenance Fee (10%)</p>
          <p className="text-lg md:text-xl font-black tracking-tighter">{formatCurrency(platformMaintenance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="glass-card p-5 md:p-6 bg-white border-l-4 border-slate-900">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Revenue (incl. recurring)</p>
          <p className="text-xl md:text-2xl font-black tabular-nums tracking-tight text-slate-900">{formatCurrency(companyTotalRevenue)}</p>
        </div>
        <div className="glass-card p-5 md:p-6 bg-white border-l-4 border-rose-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Paid Expenses (all)</p>
          <p className="text-xl md:text-2xl font-black tabular-nums tracking-tight text-slate-900">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className={`glass-card p-5 md:p-6 bg-white border-l-4 ${companyNetProfit >= 0 ? 'border-emerald-500' : 'border-rose-600'}`}>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Profit After Expenses</p>
          <p className={`text-xl md:text-2xl font-black tabular-nums tracking-tight ${companyNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(companyNetProfit)}
          </p>
          <p className="mt-1 text-[9px] font-bold text-slate-400">Every logged payment adds here; every paid expense cuts it — same total as the Dashboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <Wallet className="w-4 h-4 md:w-5 h-5 text-slate-900" />
            Founder Earnings
          </h3>
          <div className="grid gap-3 md:gap-4">
            {finalBalances.map((f, i) => (
              <div key={i} className="glass-card p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-slate-900 transition-all">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-900 border border-slate-100 group-hover:bg-[#f7f7dc] transition-all shrink-0">
                    {f.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-xs md:text-sm truncate">{f.name}</h4>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Profit: {formatCurrency(f.profitShare)}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                  <div className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-0.5 md:mb-1">Settlement</div>
                  <div className={`text-base md:text-lg font-black tracking-tight ${f.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.netBalance >= 0 ? `+${formatCurrency(f.netBalance)}` : formatCurrency(f.netBalance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <ArrowLeftRight className="w-4 h-4 md:w-5 h-5 text-slate-900" />
            Settlement Guide
          </h3>
          <div className="glass-card p-6 md:p-8 space-y-6 md:space-y-8 bg-white">
            <div className="bg-[#f7f7dc] border border-slate-200 rounded-2xl p-5 md:p-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-slate-900 mt-1 shrink-0" />
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-[10px] md:text-xs mb-2">Math Integrity</h4>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                    Calculations follow the <span className="text-slate-900 font-black tracking-tight">10% Maintenance</span> rule and lead founder <span className="text-slate-900 font-black tracking-tight">Success Bonuses</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 md:p-6">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <Info className="w-4 h-4 text-slate-400" />
                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Liability</h4>
              </div>
              <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
                Shared expense liability: <span className="font-black text-slate-900">{formatCurrency(sharePerFounderExpenses)}</span>.
              </p>
            </div>

            <button className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] transition-all hover:bg-slate-800 shadow-xl shadow-slate-200">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
          <PieChart className="w-4 h-4 md:w-5 h-5 text-slate-900" />
          Revenue by Type
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {revenueByType.map((bucket) => (
            <div key={bucket.type} className="glass-card p-5 md:p-6 bg-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">{bucket.label}</p>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Gross</span>
                  <span className="font-black tabular-nums text-slate-700 text-sm">{formatCurrency(bucket.grossTotal)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net (our share)</span>
                  <span className="font-black tabular-nums text-slate-900 text-sm">{formatCurrency(bucket.netTotal)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Expenses (tagged, paid)</span>
                  <span className="font-black tabular-nums text-rose-600 text-sm">{formatCurrency(bucket.expensesTotal)}</span>
                </div>
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net after expenses</span>
                  <span className={`font-black tabular-nums text-lg ${bucket.netAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(bucket.netAfterExpenses)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {revenueByAgency.length > 0 ? (
        <div className="space-y-4 md:space-y-6">
          <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <Building2 className="w-4 h-4 md:w-5 h-5 text-slate-900" />
            Revenue by Agency
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {revenueByAgency.map((agency) => (
              <div key={agency.agencyId} className="glass-card p-5 md:p-6 bg-white">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">{agency.name}</p>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Gross (all projects)</span>
                    <span className="font-black tabular-nums text-slate-700 text-sm">{formatCurrency(agency.grossTotal)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Our share (net)</span>
                    <span className="font-black tabular-nums text-slate-900 text-sm">{formatCurrency(agency.netTotal)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Expenses (tagged, paid)</span>
                    <span className="font-black tabular-nums text-rose-600 text-sm">{formatCurrency(agency.expensesTotal)}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net after expenses</span>
                    <span className={`font-black tabular-nums text-lg ${agency.netAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(agency.netAfterExpenses)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
