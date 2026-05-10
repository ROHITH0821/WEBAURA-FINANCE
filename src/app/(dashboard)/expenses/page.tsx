import Link from 'next/link'
import { Plus, Search, Filter, Receipt, Calendar, User, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createClient, createStaticClient } from '@/lib/supabaseServer'
import ExpenseRow from '@/components/ExpenseRow'
import ExpensesFilters from './expenses-filters'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const sp = (await searchParams) || {}
  const supabase = await createClient()
  const admin = createStaticClient()
  
  // Fetch user, expenses, and founders in parallel
  const [
    { data: { user } },
    { data: expensesData, error: expensesErr },
    { data: foundersData, error: foundersErr }
  ] = await Promise.all([
    supabase.auth.getUser(),
    // Use admin client so paid items always appear (no RLS surprises)
    admin.from('expense_requests').select('*').order('created_at', { ascending: false }),
    admin.from('admin_users').select('email, full_name, role, is_active').eq('is_active', true)
  ])

  const expenses = expensesData || []
  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      email: String(f.email),
      name: String(f.full_name || f.email),
      role: String(f.role || ''),
    }))

  const me = founders.find((f) => f.email.toLowerCase() === String(user?.email || '').toLowerCase())
  const isAdmin = me?.role === 'super_admin'
  const myEmail = String(user?.email || '').toLowerCase()

  const rawView = Array.isArray(sp.view) ? sp.view[0] : sp.view
  const viewParam = String(rawView || (isAdmin ? 'all' : 'mine'))
  const statusParam = String(Array.isArray(sp.status) ? sp.status[0] : sp.status || 'paid')
  const founderParamRaw = String(Array.isArray(sp.founder) ? sp.founder[0] : sp.founder || '')
  const founderParam = founderParamRaw ? founderParamRaw.toLowerCase() : ''

  const effectiveView = isAdmin ? (viewParam === 'all' ? 'all' : 'mine') : 'mine'
  const effectiveFounder =
    effectiveView === 'mine'
      ? myEmail
      : founderParam && founders.some((f) => f.email.toLowerCase() === founderParam)
        ? founderParam
        : ''

  const filteredExpenses = expenses
    .filter((e) => {
      const st = String(e.status || '').toLowerCase()
      if (statusParam === 'all') return true
      return st === statusParam
    })
    .filter((e) => {
      const who = String(e.requested_by || '').toLowerCase()
      if (effectiveView === 'mine') return who === myEmail
      if (effectiveFounder) return who === effectiveFounder
      return true
    })

  const filtersActive =
    (isAdmin && effectiveView === 'all') ||
    statusParam !== 'paid' ||
    Boolean(effectiveFounder) ||
    Boolean(sp.view) ||
    Boolean(sp.status) ||
    Boolean(sp.founder)

  // Stats calculations
  const monthlyTotal = filteredExpenses
    .filter((e) => String(e.status || '').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const personalSpending = filteredExpenses
    .filter((e) => String(e.status || '').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const pendingRequests = filteredExpenses.filter((e) => String(e.status || '').toLowerCase() === 'pending').length

  return (
    <div className="space-y-6 md:space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      {(expensesErr || foundersErr) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 md:p-6 text-sm font-bold text-rose-900">
          {expensesErr ? `Failed to load expenses: ${expensesErr.message}` : null}
          {expensesErr && foundersErr ? <br /> : null}
          {foundersErr ? `Failed to load founders: ${foundersErr.message}` : null}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Expense Tracker</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">Categorized expenditure & reimbursement logs</p>
        </div>
        <Link 
          href="/expenses/new"
          className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-[9px] md:text-[10px] w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
        <div className="glass-card p-6 md:p-8 border-l-4 border-slate-900">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Total Ledger</p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(monthlyTotal)}</h3>
        </div>
        <div className="glass-card p-6 md:p-8 border-l-4 border-emerald-500">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">
            {effectiveView === 'mine'
              ? 'My Contribution'
              : effectiveFounder
                ? 'Founder Contribution'
                : 'All Founders'}
          </p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(personalSpending)}</h3>
        </div>
        <div className="glass-card p-6 md:p-8 border-l-4 border-amber-500 sm:col-span-2 md:col-span-1">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Pending Requests</p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{pendingRequests} Pending</h3>
        </div>
      </div>

      <div className="glass-card overflow-hidden bg-white">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter expenses..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs outline-none focus:border-slate-900 transition-all font-medium"
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <ExpensesFilters
              isSuperAdmin={isAdmin}
              founders={founders}
              current={{
                view: effectiveView,
                status: statusParam,
                founder: effectiveFounder || '',
              }}
            />
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
                    isSuperAdmin={isAdmin}
                    currentUserEmail={user?.email || undefined}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 md:px-10 py-12 md:py-20 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {filtersActive ? 'No results for selected filters' : 'No expenses logged in ledger'}
                    </p>
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
