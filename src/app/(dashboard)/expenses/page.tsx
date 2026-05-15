import Link from 'next/link'
import { Plus, Filter } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { activeFinanceRole } from '@/lib/admin-gates'
import { createClient, createStaticClient } from '@/lib/supabaseServer'
import { getExpenseRequests, getFounders } from '@/lib/data'
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

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '').trim().toLowerCase()

  const [{ data: meRow }, expenses, foundersData] = await Promise.all([
    admin.from('admin_users').select('email, role, is_active').eq('email', myEmail).maybeSingle(),
    getExpenseRequests(),
    getFounders(),
  ])
  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      email: String(f.email),
      name: String(f.full_name || f.email),
      role: String(f.role || ''),
    }))

  const role = activeFinanceRole(meRow)
  const isSuperAdmin = role === 'super_admin'
  const isNormalAdmin = role === 'admin'
  const isFounder = role === 'founder'
  /** Same org-wide ledger as super admin (All view). */
  const canViewOrgLedger = isSuperAdmin || isNormalAdmin
  const isSuperApprover = isSuperAdmin
  const defaultStatusFilter = 'all'

  const rawView = sp.view
  const viewParam = String((Array.isArray(rawView) ? rawView[0] : rawView) || (canViewOrgLedger ? 'all' : 'mine'))
  const statusParam = String(Array.isArray(sp.status) ? sp.status[0] : sp.status || defaultStatusFilter)
  const founderParam = String(Array.isArray(sp.founder) ? sp.founder[0] : sp.founder || '').toLowerCase()
  const searchParam = String(Array.isArray(sp.q) ? sp.q[0] : sp.q || '').toLowerCase()

  /** Founders: own only. Normal admin: always org-wide (matches super admin All). Super admin: All / Mine toggle. */
  const effectiveView = isNormalAdmin
    ? 'all'
    : isFounder
      ? 'mine'
      : canViewOrgLedger
        ? viewParam === 'mine'
          ? 'mine'
          : 'all'
        : 'mine'
  const effectiveFounder = (effectiveView === 'all' && founderParam) ? founderParam : (effectiveView === 'mine' ? myEmail : '')

  const ledgerExpenses = expenses.filter((e) => String(e.status || '').toLowerCase() !== 'rejected')

  const filteredExpenses = ledgerExpenses.filter((e) => {
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
  const baseLedger = canViewOrgLedger
    ? ledgerExpenses
    : ledgerExpenses.filter((e) => String(e.requested_by || '').toLowerCase() === myEmail)
  const totalPaid = baseLedger
    .filter((e) => String(e.status || '').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  
  const filteredPaid = filteredExpenses
    .filter((e) => String(e.status || '').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const pendingCount = filteredExpenses.filter((e) => String(e.status || '').toLowerCase() === 'pending').length

  const isDefaultView =
    effectiveView === (canViewOrgLedger ? 'all' : 'mine') && statusParam === 'all' && !founderParam && !searchParam
  const filtersActive = !isDefaultView

  const teamMembers = founders.filter((f) => ['founder', 'admin', 'super_admin'].includes(f.role))

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-6 md:space-y-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Expense Tracker</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
            {canViewOrgLedger
              ? isNormalAdmin
                ? 'Same team ledger as super admin — all founders & admins'
                : 'Team-wide expense ledger — all founders & admins'
              : isFounder
                ? 'Your reimbursement requests & paid expenses'
                : 'Categorized expenditure & reimbursement logs'}
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="px-8 py-4 rounded-2xl bg-slate-900 text-white text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 flex items-center gap-3"
        >
          <Plus className="w-4 h-4" />
          Submit expense request
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 md:gap-8">
        <div className="glass-card min-w-0 border-l-4 border-slate-900 p-4 sm:p-5 md:p-8">
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] md:mb-2 md:text-[10px] md:tracking-[0.2em]">
            Total Ledger
          </p>
          <h3 className="break-words text-lg font-black tabular-nums tracking-tight text-slate-900 sm:text-xl md:text-2xl lg:text-3xl">
            {formatCurrency(totalPaid)}
          </h3>
        </div>
        <div className="glass-card min-w-0 border-l-4 border-emerald-500 p-4 sm:p-5 md:p-8">
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] md:mb-2 md:text-[10px] md:tracking-[0.2em]">
            {effectiveView === 'mine'
              ? 'My Contribution'
              : effectiveFounder
                ? 'Member Contribution'
                : isNormalAdmin
                  ? 'Team Total'
                  : 'All Team'}
          </p>
          <h3 className="break-words text-lg font-black tabular-nums tracking-tight text-slate-900 sm:text-xl md:text-2xl lg:text-3xl">
            {formatCurrency(filteredPaid)}
          </h3>
        </div>
        <div className="glass-card col-span-2 w-[calc((100%-0.75rem)/2)] max-w-full justify-self-center border-l-4 border-amber-500 p-4 sm:p-5 md:col-span-1 md:w-full md:max-w-none md:justify-self-stretch md:p-8">
          <p className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] md:mb-2 md:text-left md:text-[10px] md:tracking-[0.2em]">
            Pending Requests
          </p>
          <h3 className="text-center text-lg font-black tabular-nums tracking-tight text-slate-900 sm:text-xl md:text-left md:text-2xl lg:text-3xl">
            {pendingCount} Pending
          </h3>
        </div>
      </div>

      <div className="glass-card min-w-0 overflow-hidden bg-white">
        <div className="border-b border-slate-100 p-4 md:p-8">
          <ExpensesFilters
            canViewTeamLedger={canViewOrgLedger}
            lockOrgWideView={isNormalAdmin}
            teamMembers={teamMembers}
            current={{
              view: effectiveView as 'all' | 'mine',
              status: statusParam,
              founder: founderParam,
              q: searchParam,
            }}
          />
        </div>

        <div className="min-w-0">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                founders={founders}
                canApproveAndPay={isSuperApprover}
                canDelete={isSuperAdmin}
                currentUserEmail={user?.email || undefined}
              />
            ))
          ) : (
            <div className="px-6 py-16 text-center md:px-10 md:py-24">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <Filter className="h-6 w-6 text-slate-200" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-900">
                    {filtersActive ? 'No matching results' : 'Empty Ledger'}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {filtersActive
                      ? 'Try adjusting your filters or search query'
                      : canViewOrgLedger
                        ? 'No team expenses yet — submissions from founders and admins will appear here'
                        : 'Submit a request from Expenses or Requests — it will appear here'}
                  </p>
                </div>
                {filtersActive && (
                  <Link
                    href="/expenses"
                    className="mt-2 border-b-2 border-slate-900 pb-0.5 text-[9px] font-black uppercase text-slate-900"
                  >
                    Clear all filters
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
