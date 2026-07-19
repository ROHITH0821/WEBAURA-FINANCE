import { Wallet, ArrowLeftRight, AlertCircle, Info, PieChart, Building2, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { getRevenueData } from '@/lib/data'
import { REVENUE_TYPES, REVENUE_TYPE_LABELS, type RevenueType } from '@/types/finance'

type FounderBalance = {
  name: string
  email: string
  profitShare: number
  expensesPaid: number
  netBalance: number
}

export default async function RevenuePage() {
  const revenue = await getRevenueData()
  const {
    founders: foundersData,
    projects,
    payments,
    expenses,
    recurringRevenue,
    recurringPayments,
    agencies,
    revenueAddons,
  } = revenue

  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      id: String(f.email).trim().toLowerCase(),
      email: String(f.email).trim().toLowerCase(),
      name: String(f.full_name || f.email),
    }))

  const founderCount = founders.length || 1

  const projectRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const totalExpenses = (expenses || [])
    .filter((e) => String(e?.status || 'pending').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  const recurringTotalRevenue = (recurringPayments || []).reduce(
    (sum, rp) => sum + Number(rp.amount_received || 0),
    0,
  )
  const addonsTotalRevenue = (revenueAddons || []).reduce(
    (sum, a: { amount?: number | string | null }) => sum + Number(a.amount || 0),
    0,
  )
  const companyTotalRevenue = projectRevenue + recurringTotalRevenue + addonsTotalRevenue
  const companyNetProfit = companyTotalRevenue - totalExpenses

  /** Each founder’s equal share of all paid company expenses. */
  const sharePerFounderExpenses = totalExpenses / founderCount

  const founderBalances = new Map<string, FounderBalance>(
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

  const projectLeads = new Map(
    (projects || []).map((p) => [p.id, String(p.project_lead || '').trim().toLowerCase()]),
  )

  const recurringProjectId = new Map(
    (recurringRevenue || []).map((r: { id: string; project_id?: string | null }) => [
      r.id,
      r.project_id ? String(r.project_id) : '',
    ]),
  )

  /**
   * Real split (no platform cut):
   * - With a project lead: 50% lead + 50% split equally across all founders
   * - Without a lead: 100% split equally across all founders
   * Sum of all founder profit shares = amount (exact).
   */
  function allocateRevenue(amount: number, leadEmail: string | null) {
    if (!Number.isFinite(amount) || amount === 0) return
    const lead = leadEmail && founderBalances.has(leadEmail) ? leadEmail : null

    if (lead) {
      const leadShare = amount * 0.5
      const equalPool = amount * 0.5
      const equalEach = equalPool / founderCount

      founders.forEach((f) => {
        const b = founderBalances.get(f.email)
        if (b) b.profitShare += equalEach
      })

      const leadBal = founderBalances.get(lead)
      if (leadBal) leadBal.profitShare += leadShare
      return
    }

    const equalEach = amount / founderCount
    founders.forEach((f) => {
      const b = founderBalances.get(f.email)
      if (b) b.profitShare += equalEach
    })
  }

  for (const payment of payments || []) {
    const amount = Number(payment.amount || 0)
    const lead = projectLeads.get(payment.project_id) || null
    allocateRevenue(amount, lead)
  }

  for (const rp of recurringPayments || []) {
    const amount = Number(rp.amount_received || 0)
    const projectId = recurringProjectId.get(rp.recurring_id) || ''
    const lead = projectId ? projectLeads.get(projectId) || null : null
    allocateRevenue(amount, lead)
  }

  for (const addon of revenueAddons || []) {
    allocateRevenue(Number((addon as { amount?: number | string | null }).amount || 0), null)
  }

  for (const expense of expenses || []) {
    if (String(expense?.status || 'pending').toLowerCase() !== 'paid') continue
    const by = String(expense.requested_by || '').trim().toLowerCase()
    if (by && founderBalances.has(by)) {
      const b = founderBalances.get(by)!
      b.expensesPaid += Number(expense.amount || 0)
    }
  }

  // Settlement = profit credit + what they already paid out − their equal expense share
  const finalBalances = Array.from(founderBalances.values())
    .map((b) => ({
      ...b,
      netBalance: b.profitShare + b.expensesPaid - sharePerFounderExpenses,
    }))
    .sort((a, b) => b.netBalance - a.netBalance)

  const profitShareTotal = finalBalances.reduce((sum, b) => sum + b.profitShare, 0)
  const settlementCheckOk = Math.abs(profitShareTotal - companyTotalRevenue) < 1

  // Revenue by Type
  const projectRevenueType = new Map(
    (projects || []).map((p: { id: string; revenue_type?: string | null }) => [
      p.id,
      (p.revenue_type || 'direct_client') as RevenueType,
    ]),
  )
  const recurringRevenueType = new Map(
    (recurringRevenue || []).map((r: { id: string; revenue_type?: string | null }) => [
      r.id,
      (r.revenue_type || 'direct_client') as RevenueType,
    ]),
  )

  const byType = new Map<RevenueType, { receivedTotal: number; expensesTotal: number }>(
    REVENUE_TYPES.map((rt) => [rt, { receivedTotal: 0, expensesTotal: 0 }]),
  )

  for (const p of payments || []) {
    const type = projectRevenueType.get(p.project_id) || 'direct_client'
    byType.get(type)!.receivedTotal += Number(p.amount || 0)
  }

  for (const rp of recurringPayments || []) {
    const type = recurringRevenueType.get(rp.recurring_id) || 'direct_client'
    byType.get(type)!.receivedTotal += Number(rp.amount_received || 0)
  }

  const paidExpenses = (expenses || []).filter(
    (e: { status?: string | null }) => String(e?.status || 'pending').toLowerCase() === 'paid',
  )
  for (const e of paidExpenses) {
    if (!e.project_id) continue
    const type = projectRevenueType.get(e.project_id)
    if (!type) continue
    byType.get(type)!.expensesTotal += Number(e.amount || 0)
  }

  const revenueByType = REVENUE_TYPES.map((rt) => {
    const { receivedTotal, expensesTotal } = byType.get(rt)!
    return {
      type: rt,
      label: REVENUE_TYPE_LABELS[rt],
      receivedTotal,
      expensesTotal,
      netAfterExpenses: receivedTotal - expensesTotal,
    }
  })

  // Revenue by Agency
  const projectAgency = new Map(
    (projects || []).map((p: { id: string; agency_id?: string | null }) => [p.id, p.agency_id as string | null]),
  )
  const recurringAgency = new Map(
    (recurringRevenue || []).map((r: { id: string; agency_id?: string | null }) => [
      r.id,
      r.agency_id as string | null,
    ]),
  )

  const byAgency = new Map<string, { receivedTotal: number; expensesTotal: number }>()
  const touchAgencyBucket = (agencyId: string) => {
    if (!byAgency.has(agencyId)) byAgency.set(agencyId, { receivedTotal: 0, expensesTotal: 0 })
    return byAgency.get(agencyId)!
  }

  for (const p of payments || []) {
    const agencyId = projectAgency.get(p.project_id)
    if (!agencyId) continue
    touchAgencyBucket(agencyId).receivedTotal += Number(p.amount || 0)
  }

  for (const rp of recurringPayments || []) {
    const agencyId = recurringAgency.get(rp.recurring_id)
    if (!agencyId) continue
    touchAgencyBucket(agencyId).receivedTotal += Number(rp.amount_received || 0)
  }

  for (const e of paidExpenses) {
    if (!e.agency_id) continue
    touchAgencyBucket(e.agency_id).expensesTotal += Number(e.amount || 0)
  }

  const agencyNameById = new Map(
    (agencies || []).map((a: { id: string; name: string }) => [String(a.id), String(a.name)]),
  )
  const revenueByAgency = Array.from(byAgency.entries())
    .map(([agencyId, totals]) => ({
      agencyId,
      name: agencyNameById.get(agencyId) || 'Unknown agency',
      ...totals,
      netAfterExpenses: totals.receivedTotal - totals.expensesTotal,
    }))
    .sort((a, b) => b.netAfterExpenses - a.netAfterExpenses)

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">
            Revenue & Settlements
          </h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
            Real ledger totals — no platform cut
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/revenue/add-ons"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-colors hover:border-slate-900 hover:text-slate-900"
          >
            <Plus className="h-4 w-4" />
            Revenue Add-ons
          </Link>
          <div className="glass-card w-full border-none bg-slate-900 px-4 py-3 text-white shadow-xl shadow-slate-200 sm:w-auto md:px-6 md:py-4">
            <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-slate-400 md:text-[9px]">
              Equal expense share
            </p>
            <p className="text-lg font-black tracking-tighter md:text-xl">
              {formatCurrency(sharePerFounderExpenses)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <div className="glass-card border-l-4 border-slate-900 bg-white p-5 md:p-6">
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
          <p className="text-xl font-black tabular-nums tracking-tight text-slate-900 md:text-2xl">
            {formatCurrency(companyTotalRevenue)}
          </p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Projects {formatCurrency(projectRevenue)} · Recurring {formatCurrency(recurringTotalRevenue)} · Add-ons{' '}
            {formatCurrency(addonsTotalRevenue)}
          </p>
        </div>
        <div className="glass-card border-l-4 border-rose-500 bg-white p-5 md:p-6">
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Total Paid Expenses (all)
          </p>
          <p className="text-xl font-black tabular-nums tracking-tight text-slate-900 md:text-2xl">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div
          className={`glass-card border-l-4 bg-white p-5 md:p-6 ${
            companyNetProfit >= 0 ? 'border-emerald-500' : 'border-rose-600'
          }`}
        >
          <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Net Profit After Expenses
          </p>
          <p
            className={`text-xl font-black tabular-nums tracking-tight md:text-2xl ${
              companyNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(companyNetProfit)}
          </p>
          <p className="mt-1 text-[9px] font-bold text-slate-400">
            Same formula as the Dashboard — all revenue minus all paid expenses.
          </p>
        </div>
      </div>

      <Link
        href="/revenue/add-ons"
        className="glass-card group flex flex-col gap-4 border border-slate-200 bg-white p-5 transition-colors hover:border-slate-900 md:flex-row md:items-center md:justify-between md:p-6"
      >
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Other income</p>
          <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900">Revenue Add-ons</h3>
          <p className="mt-2 max-w-xl text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Freelance, interest, refunds, commissions — anything outside projects & recurring. Counts toward company
            totals and equal founder share.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-left md:text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Add-ons total</p>
            <p className="text-xl font-black tabular-nums text-emerald-600">
              {formatCurrency(addonsTotalRevenue)}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white group-hover:bg-slate-800">
            <Plus className="h-3.5 w-3.5" />
            Manage
          </span>
        </div>
      </Link>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 md:gap-8">
        <div className="space-y-4 md:space-y-6">
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900 md:text-xl">
            <Wallet className="h-4 w-4 text-slate-900 md:h-5 md:w-5" />
            Founder Earnings
          </h3>
          <div className="grid gap-3 md:gap-4">
            {finalBalances.length === 0 ? (
              <div className="glass-card p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                No active founders found
              </div>
            ) : (
              finalBalances.map((f) => (
                <div
                  key={f.email}
                  className="glass-card group flex flex-col items-start justify-between gap-4 p-4 transition-all hover:border-slate-900 sm:flex-row sm:items-center md:p-6"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 font-black text-slate-900 transition-all group-hover:bg-[#f7f7dc] md:h-12 md:w-12">
                      {f.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-black uppercase tracking-tight text-slate-900 md:text-sm">
                        {f.name}
                      </h4>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-400 md:text-[10px]">
                        Profit: {formatCurrency(f.profitShare)} · Paid: {formatCurrency(f.expensesPaid)}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between border-t border-slate-100 pt-3 sm:w-auto sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div className="mb-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 md:mb-1 md:text-[9px]">
                      Settlement
                    </div>
                    <div
                      className={`text-base font-black tracking-tight md:text-lg ${
                        f.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {f.netBalance >= 0 ? `+${formatCurrency(f.netBalance)}` : formatCurrency(f.netBalance)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900 md:text-xl">
            <ArrowLeftRight className="h-4 w-4 text-slate-900 md:h-5 md:w-5" />
            Settlement Guide
          </h3>
          <div className="glass-card space-y-6 bg-white p-6 md:space-y-8 md:p-8">
            <div className="rounded-2xl border border-slate-200 bg-[#f7f7dc] p-5 md:p-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-slate-900" />
                <div>
                  <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-900 md:text-xs">
                    How settlement works
                  </h4>
                  <p className="text-xs font-medium leading-relaxed text-slate-700 md:text-sm">
                    Project / recurring (with lead):{' '}
                    <span className="font-black tracking-tight text-slate-900">50% lead · 50% equal</span>. Add-ons and
                    unassigned recurring: <span className="font-black tracking-tight text-slate-900">equal split</span>.
                    Settlement = profit share + expenses you paid − equal expense share.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 md:p-6">
              <div className="mb-3 flex items-center gap-3 md:mb-4">
                <Info className="h-4 w-4 text-slate-400" />
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 md:text-[10px]">
                  Liability
                </h4>
              </div>
              <p className="text-xs font-medium leading-relaxed text-slate-600 md:text-sm">
                Shared expense liability per founder:{' '}
                <span className="font-black text-slate-900">{formatCurrency(sharePerFounderExpenses)}</span>
                {' · '}
                Profit shares sum to{' '}
                <span className="font-black text-slate-900">{formatCurrency(profitShareTotal)}</span>
                {settlementCheckOk ? (
                  <span className="ml-2 font-black uppercase tracking-widest text-emerald-600">· Balanced</span>
                ) : (
                  <span className="ml-2 font-black uppercase tracking-widest text-amber-600">· Check data</span>
                )}
              </p>
            </div>

            <button
              type="button"
              className="w-full rounded-2xl bg-slate-900 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 md:py-5 md:text-[10px]"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900 md:text-xl">
          <PieChart className="h-4 w-4 text-slate-900 md:h-5 md:w-5" />
          Revenue by Type
        </h3>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Project + recurring only — add-ons ({formatCurrency(addonsTotalRevenue)}) sit outside type buckets
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {revenueByType.map((bucket) => (
            <div key={bucket.type} className="glass-card bg-white p-5 md:p-6">
              <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">{bucket.label}</p>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Received</span>
                  <span className="text-sm font-black tabular-nums text-slate-900">
                    {formatCurrency(bucket.receivedTotal)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Expenses (tagged, paid)
                  </span>
                  <span className="text-sm font-black tabular-nums text-rose-600">
                    {formatCurrency(bucket.expensesTotal)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net after expenses</span>
                  <span
                    className={`text-lg font-black tabular-nums ${
                      bucket.netAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
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
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900 md:text-xl">
            <Building2 className="h-4 w-4 text-slate-900 md:h-5 md:w-5" />
            Revenue by Agency
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {revenueByAgency.map((agency) => (
              <div key={agency.agencyId} className="glass-card bg-white p-5 md:p-6">
                <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">{agency.name}</p>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Received (all projects)
                    </span>
                    <span className="text-sm font-black tabular-nums text-slate-900">
                      {formatCurrency(agency.receivedTotal)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Expenses (tagged, paid)
                    </span>
                    <span className="text-sm font-black tabular-nums text-rose-600">
                      {formatCurrency(agency.expensesTotal)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Net after expenses
                    </span>
                    <span
                      className={`text-lg font-black tabular-nums ${
                        agency.netAfterExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
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
