import { createClient } from '@/lib/supabaseServer'
import { formatCurrency } from '@/lib/utils'
import { getFounders, getPendingRequestsData, getReferrers } from '@/lib/data'
import RequestsClient from './requests-client'
import SearchInput from '@/components/SearchInput'

export const dynamic = 'force-dynamic'

export default async function RequestsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const sp = (await searchParams) || {}
  const searchParam = String(Array.isArray(sp.q) ? sp.q[0] : sp.q || '').toLowerCase()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const myEmail = String(user?.email || '').toLowerCase()

  // Use high-performance cached data
  const [founders, requestsData, referrers] = await Promise.all([
    getFounders(),
    getPendingRequestsData(),
    getReferrers()
  ])

  const { pendingExpenses, referralLeadRewards, recruitmentRewards } = requestsData
  const meRow = (founders || []).find(f => String(f.email || '').toLowerCase() === myEmail)
  const isAdmin = Boolean(meRow?.is_active && (meRow?.role === 'super_admin' || meRow?.role === 'admin'))

  const filterFn = (item: any, fields: string[]) => {
    if (!searchParam) return true
    return fields.some(f => String(item[f] || '').toLowerCase().includes(searchParam))
  }

  const expensesVisible = (isAdmin
    ? pendingExpenses || []
    : (pendingExpenses || []).filter((r: any) => String(r.requested_by || '').toLowerCase() === myEmail)
  ).filter(e => filterFn(e, ['spent_on', 'category', 'requested_by', 'transaction_ref']))

  const refMap = new Map((referrers || []).map((r: any) => [String(r.id), r]))

  const referralRows = (referralLeadRewards || []).map((row: any) => {
    const ref = row.referrer_id ? refMap.get(String(row.referrer_id)) : null
    return {
      ...row,
      referrer_name: String(ref?.name || 'Unknown'),
      referrer_email: String(ref?.email || ''),
      referrer_upi_id: String(ref?.upi_id || ''),
    }
  })

  const referralVisible = (isAdmin ? referralRows : [])
    .filter(r => filterFn(r, ['referrer_name', 'referrer_email', 'lead_name']))

  const recruitmentVisible = (isAdmin ? recruitmentRewards || [] : [])
    .filter(r => filterFn(r, ['reward_type', 'status', 'candidate_name']))

  const totals = {
    pendingExpenseCount: expensesVisible.length,
    pendingExpenseAmount: expensesVisible.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
    pendingReferralAmount: referralVisible.reduce((s: number, r: any) => s + Number(r.reward_amount_inr || 0), 0),
    pendingRecruitmentAmount: recruitmentVisible.reduce((s: number, r: any) => s + Number(r.reward_amount || 0), 0),
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">Requests</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
            Founder reimbursements and referral payouts in one queue
          </p>
        </div>
        <div className="flex items-center gap-6">
          <SearchInput placeholder="Search requests..." />
          <div className="flex gap-3">
            <div className="glass-card px-6 py-4 bg-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Pending Expense ₹</p>
              <p className="text-xl font-black tracking-tighter">{formatCurrency(totals.pendingExpenseAmount)}</p>
            </div>
            <div className="glass-card px-6 py-4 bg-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Pending Referral ₹</p>
              <p className="text-xl font-black tracking-tighter">{formatCurrency(totals.pendingReferralAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <RequestsClient
        isSuperAdmin={isAdmin}
        myEmail={myEmail}
        pendingExpenseRequests={expensesVisible}
        pendingReferralLeadRewards={referralVisible}
        pendingRecruitmentRewards={recruitmentVisible}
      />
    </div>
  )
}

