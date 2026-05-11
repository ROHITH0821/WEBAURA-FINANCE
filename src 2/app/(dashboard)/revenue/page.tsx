import { Wallet, ArrowLeftRight, AlertCircle, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabaseServer'

export default async function RevenuePage() {
  const supabase = await createClient()

  // Parallelize fetches
  const [
    { data: foundersData },
    { data: projects },
    { data: payments },
    { data: expenses }
  ] = await Promise.all([
    supabase.from('admin_users').select('id, email, full_name'),
    supabase.from('projects').select('id, project_lead'),
    supabase.from('payments_received').select('amount, project_id'),
    supabase.from('expense_requests').select('amount, requested_by, status')
  ])

  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      id: String(f.id),
      email: String(f.email),
      name: String(f.full_name || f.email),
    }))

  const founderCount = founders.length || 1

  // MATH LOGIC
  const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpenses = (expenses || [])
    .filter((e) => (e?.status || 'pending') === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  
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

  const projectLeads = new Map((projects || []).map((p) => [p.id, p.project_lead]))

  payments?.forEach(payment => {
    const leadId = projectLeads.get(payment.project_id)
    const amount = Number(payment.amount)
    const leadProfitShare = (amount * 0.90) * 0.50

    // Add common share to everyone
    founders.forEach((f) => {
      const b = founderBalances.get(f.email)
      if (b) b.profitShare += (amount * 0.90 * 0.50) / founderCount
    })

    // Add lead share to specific founder
    if (leadId && founderBalances.has(String(leadId))) {
      const b = founderBalances.get(String(leadId))
      if (b) b.profitShare += leadProfitShare
    }
  })

  // Calculate Expense Contributions
  expenses
    ?.filter((e) => (e?.status || 'pending') === 'paid')
    ?.forEach((expense) => {
      const by = String(expense.requested_by || '')
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

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Revenue & Settlements</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Real-time founder balances and fair-share calculations</p>
        </div>
        <div className="glass-card px-6 py-4 bg-slate-900 text-white border-none shadow-xl shadow-slate-200">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Maintenance Fee (10%)</p>
          <p className="text-xl font-black tracking-tighter">{formatCurrency(platformMaintenance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <Wallet className="w-5 h-5 text-slate-900" />
            Founder Earnings
          </h3>
          <div className="grid gap-4">
            {finalBalances.map((f, i) => (
              <div key={i} className="glass-card p-6 flex items-center justify-between group hover:border-slate-900 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-900 border border-slate-100 group-hover:bg-[#f7f7dc] transition-all">
                    {f.name[0]}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{f.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Profit: {formatCurrency(f.profitShare)} • Out-of-pocket: {formatCurrency(f.expensesPaid)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Settlement</div>
                  <div className={`text-lg font-black tracking-tight ${f.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {f.netBalance >= 0 ? `+${formatCurrency(f.netBalance)}` : formatCurrency(f.netBalance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <ArrowLeftRight className="w-5 h-5 text-slate-900" />
            Settlement Guide
          </h3>
          <div className="glass-card p-8 space-y-8 bg-white">
            <div className="bg-[#f7f7dc] border border-slate-200 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-slate-900 mt-1" />
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-2">Math Integrity Notice</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Calculations are based on <span className="text-slate-900 font-black tracking-tight">10% Maintenance Fee</span> and 
                    an <span className="text-slate-900 font-black tracking-tight">Equal Share Split</span> of all common expenses. 
                    Lead founders receive a <span className="text-slate-900 font-black tracking-tight">50% Success Bonus</span> from their projects.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-4 h-4 text-slate-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Expense Redistribution</h4>
              </div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Total organizational expenses to be shared: <span className="font-black text-slate-900">{formatCurrency(totalExpenses)}</span>.
                Each founder's liability: <span className="font-black text-slate-900">{formatCurrency(sharePerFounderExpenses)}</span>.
              </p>
            </div>

            <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-slate-800 shadow-xl shadow-slate-200">
              Generate Settlement Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
