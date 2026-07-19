import { createClient } from '@/lib/supabaseServer'
import { fetchAdminUserByEmail } from '@/lib/admin-user-lookup'
import {
  canViewOrgExpenseLedger,
  isSuperAdminRole,
  resolveFinanceRole,
} from '@/lib/finance-role'
import { getExpenseRequests, getFounders, getAgencies, getExpenseCategories } from '@/lib/data'
import ExpensesLedgerClient from './expenses-ledger-client'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myEmail = String(user?.email || '').trim().toLowerCase()

  const [meRow, expenses, foundersData, agencies, expenseCategories] = await Promise.all([
    fetchAdminUserByEmail(myEmail),
    getExpenseRequests(),
    getFounders(),
    getAgencies(),
    getExpenseCategories(),
  ])

  const agencyNameById: Record<string, string> = Object.fromEntries(
    (agencies || []).map((a: { id: string; name: string }) => [String(a.id), String(a.name)]),
  )

  const founders = (foundersData || [])
    .filter((f) => Boolean(f?.email))
    .map((f) => ({
      email: String(f.email),
      name: String(f.full_name || f.email),
      role: String(f.role || ''),
    }))

  const role = resolveFinanceRole(meRow, myEmail, founders)
  const isSuperAdmin = isSuperAdminRole(role)
  const isNormalAdmin = role === 'admin'
  const isFounder = role === 'founder'
  const canViewOrgLedger = canViewOrgExpenseLedger(role)

  const ledgerExpenses = (expenses || []).filter(
    (e) => String(e.status || '').toLowerCase() !== 'rejected',
  )

  const baseLedger = canViewOrgLedger
    ? ledgerExpenses
    : ledgerExpenses.filter((e) => String(e.requested_by || '').toLowerCase() === myEmail)

  const totalPaid = baseLedger
    .filter((e) => String(e.status || '').toLowerCase() === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const teamMembers = founders.filter((f) => ['founder', 'admin', 'super_admin'].includes(f.role))
  const agencyOptions = (agencies || []).map((a: { id: string; name: string }) => ({
    id: String(a.id),
    name: String(a.name),
  }))
  const categoryOptions = (expenseCategories || []).map((c: { slug: string; label: string }) => ({
    slug: String(c.slug),
    label: String(c.label),
  }))

  return (
    <ExpensesLedgerClient
      expenses={baseLedger as any[]}
      myEmail={myEmail}
      canViewTeamLedger={canViewOrgLedger}
      lockOrgWideView={isNormalAdmin}
      defaultView={canViewOrgLedger ? 'all' : 'mine'}
      isNormalAdmin={isNormalAdmin}
      isSuperAdmin={isSuperAdmin}
      isFounder={isFounder}
      canApproveAndPay={isSuperAdmin}
      canDelete={isSuperAdmin}
      totalPaid={totalPaid}
      founders={founders}
      teamMembers={teamMembers}
      agencies={agencyOptions}
      categories={categoryOptions}
      agencyNameById={agencyNameById}
      currentUserEmail={user?.email || undefined}
    />
  )
}
