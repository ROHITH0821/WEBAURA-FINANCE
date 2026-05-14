import Link from 'next/link'
import { Plus, Search, Filter, Receipt, Calendar, User, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabaseServer'
import { getExpenseRequests, getFounders } from '@/lib/data'
import ExpenseRow from '@/components/ExpenseRow'
import ExpensesFilters from './expenses-filters'
import SearchInput from '@/components/SearchInput'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const sp = (await searchParams) || {}
  const supabase = await createClient()
  
  // Use high-performance cached data
  const [
    { data: { user } },
    expenses,
    foundersData
  ] = await Promise.all([
    supabase.auth.getUser(),
    getExpenseRequests(),
    getFounders()
  ])
  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      email: String(f.email),
      name: String(f.full_name || f.email),
      role: String(f.role || ''),
    }))

  const myEmail = String(user?.email || '').toLowerCase()
  const me = founders.find((f) => f.email.toLowerCase() === myEmail)
  const isFinanceStaff = me?.role === 'super_admin' || me?.role === 'admin'
  const isSuperApprover = me?.role === 'super_admin'

  const rawView = sp.view
  const viewParam = String((Array.isArray(rawView) ? rawView[0] : rawView) || (isFinanceStaff ? 'all' : 'mine'))
  const statusParam = String(Array.isArray(sp.status) ? sp.status[0] : sp.status || 'paid')
  const founderParam = String(Array.isArray(sp.founder) ? sp.founder[0] : sp.founder || '').toLowerCase()
  const searchParam = String(Array.isArray(sp.q) ? sp.q[0] : sp.q || '').toLowerCase()

  const effectiveView = isFinanceStaff ? (viewParam === 'all' ? 'all' : 'mine') : 'mine'
  const effectiveFounder = (effectiveView === 'all' && founderParam) ? founderParam : (effectiveView === 'mine' ? myEmail : '')

  const filteredExpenses = expenses.filter((e) => {
    const st = String(e.status || '').toLowerCase()
    const who = String(e.requested_by || '').toLowerCase()
    const desc = String(e.spent_on || '').toLowerCase()
    const cat = String(e.category || '').toLowerCase()
    const ref = String(e.transaction_ref || '').toLowerCase()

    // 1. Status Filter
    if (statusParam !== 'all' && st !== statusParam) return false

    // 2. View/Founder Filter
    if (effectiveView === 'mine') {
      if (who !== myEmail) return false
    } else if (effectiveFounder) {
      if (who !== effectiveFounder) return false
    }

    // 3. Search Filter
    if (searchParam) {
      const match = desc.includes(searchParam) || cat.includes(searchParam) || ref.includes(searchParam) || who.includes(searchParam)
      if (!match) return false
    }

    return true
  })

  // Stats - using the full expenses list but filtered by base permissions for "ledger" feel
  const baseLedger = isFinanceStaff ? expenses : expenses.filter(e => String(e.requested_by || '').toLowerCase() === myEmail)
  const totalPaid = baseLedger
    .filter((e) => String(e.status || '').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  
  const filteredPaid = filteredExpenses
    .filter((e) => String(e.status || '').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const pendingCount = filteredExpenses.filter((e) => String(e.status || '').toLowerCase() === 'pending').length

  const isDefaultView = isFinanceStaff 
    ? (effectiveView === 'all' && statusParam === 'paid' && !founderParam) 
    : (statusParam === 'paid')
  const filtersActive = !isDefaultView || searchParam !== ''

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Expense Tracker</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">Categorized expenditure & reimbursement logs</p>
        </div>
        <Link
          href="/expenses/new"
          className="px-8 py-4 rounded-2xl bg-slate-900 text-white text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 flex items-center gap-3"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
        <div className="glass-card p-6 md:p-8 border-l-4 border-slate-900">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Total Ledger</p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(totalPaid)}</h3>
        </div>
        <div className="glass-card p-6 md:p-8 border-l-4 border-emerald-500">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">
            {effectiveView === 'mine'
              ? 'My Contribution'
              : effectiveFounder
                ? 'Founder Contribution'
                : 'All Founders'}
          </p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(filteredPaid)}</h3>
        </div>
        <div className="glass-card p-6 md:p-8 border-l-4 border-amber-500 sm:col-span-2 md:col-span-1">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Pending Requests</p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{pendingCount} Pending</h3>
        </div>
      </div>

      <div className="glass-card overflow-hidden bg-white">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <ExpensesFilters 
              isSuperAdmin={isFinanceStaff} 
              founders={founders} 
              current={{ view: effectiveView as any, status: statusParam, founder: founderParam }} 
            />
            <SearchInput placeholder="Filter expenses by description, category or ref..." />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 md:px-10 py-4 md:py-6">Description & Category</th>
                <th className="px-6 py-4 md:py-6">Date</th>
                <th className="px-6 py-4 md:py-6 text-right">Amount</th>
                <th className="px-6 py-4 md:py-6">Status</th>
                <th className="px-6 md:px-10 py-4 md:py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <ExpenseRow 
                    key={expense.id} 
                    expense={expense} 
                    founders={founders} 
                    isSuperAdmin={isSuperApprover}
                    currentUserEmail={user?.email || undefined}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 md:px-10 py-20 md:py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                        <Filter className="w-6 h-6 text-slate-200" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">
                          {filtersActive ? 'No matching results' : 'Empty Ledger'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {filtersActive 
                            ? 'Try adjusting your filters or search query' 
                            : 'Expenses you add will appear here'}
                        </p>
                      </div>
                      {filtersActive && (
                        <Link href="/expenses" className="mt-2 text-[9px] font-black text-slate-900 uppercase border-b-2 border-slate-900 pb-0.5">
                          Clear all filters
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
