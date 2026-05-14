import { createClient, createStaticClient } from '@/lib/supabaseServer'
import { formatCurrency } from '@/lib/utils'
import { getRequestsData, getReferrers } from '@/lib/data'
import { computeRequestAttention } from '@/lib/request-attention'
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
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const myEmail = String(user?.email || '').trim().toLowerCase()

  // Use high-performance cached data
  const [meRowResult, requestsData, referrers] = await Promise.all([
    admin.from('admin_users').select('email, role, is_active').eq('email', myEmail).maybeSingle(),
    getRequestsData(),
    getReferrers(),
  ])

  const { data: meRow } = meRowResult
  const { expenses, referralLeadRewards, recruitmentRewards } = requestsData
  /** Sees org-wide queues (super admin or admin). */
  const isFinanceAdmin = Boolean(meRow?.is_active && (meRow?.role === 'super_admin' || meRow?.role === 'admin'))
  /** Can execute payouts / approvals (matches server actions). */
  const canApprovePayouts = Boolean(meRow?.is_active && meRow?.role === 'super_admin')
  /** Submit reimbursement (founder, admin, or super — not blocked for “finance admin” viewers). */
  const canSubmitExpenseRequest = Boolean(
    meRow?.is_active &&
      ['founder', 'admin', 'super_admin'].includes(String(meRow?.role || '')),
  )

  const filterFn = (item: any, fields: string[]) => {
    if (!searchParam) return true
    return fields.some(f => String(item[f] || '').toLowerCase().includes(searchParam))
  }

  // 1. Expenses visibility:
  // - Non-approvers: own expense_requests (excluding rejected — cleared from this queue)
  // - Super admin: pending only (team queue). Own paid entries live on /expenses, not Requests.
  const expensesVisible = (expenses || [])
    .filter((r: any) => String(r.status || '').toLowerCase() !== 'rejected')
    .filter((r: any) => {
      const requesterEmail = String(r.requested_by || '').trim().toLowerCase()
      const isMine = requesterEmail === myEmail
      if (canApprovePayouts) {
        return String(r.status || '').toLowerCase() === 'pending'
      }
      return isMine
    })
    .filter(e => filterFn(e, ['spent_on', 'category', 'requested_by', 'transaction_ref']))

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

  const referralVisible = referralRows
    .filter((r: any) => String(r.reward_status || '').toLowerCase() !== 'rejected')
    .filter((r: any) => {
      const refEmail = String(r.referrer_email || '').trim().toLowerCase()
      const isMine = refEmail === myEmail
      if (isFinanceAdmin) {
        return isMine || r.reward_status === 'pending' || r.reward_status === 'approved'
      }
      return isMine
    })
    .filter(r => filterFn(r, ['referrer_name', 'referrer_email', 'lead_name']))

  const recruitmentVisible = (recruitmentRewards || [])
    .filter((r: any) => String(r.status || '').toLowerCase() !== 'rejected')
    .filter((r: any) => {
      const ref = r.recruiter_id ? refMap.get(String(r.recruiter_id)) : null
      const refEmail = String(ref?.email || '').trim().toLowerCase()
      const isMine = refEmail === myEmail
      if (isFinanceAdmin) {
        return isMine || r.status === 'pending' || r.status === 'approved'
      }
      return isMine
    })
    .filter(r => filterFn(r, ['reward_type', 'status', 'candidate_name']))

  const totals = {
    pendingExpenseCount: canApprovePayouts
      ? (expenses || []).filter((r) => String(r.status || '').toLowerCase() === 'pending').length
      : (expenses || []).filter(
          (r) =>
            String(r.requested_by || '').trim().toLowerCase() === myEmail &&
            String(r.status || '').toLowerCase() === 'pending',
        ).length,
    pendingExpenseAmount: canApprovePayouts
      ? (expenses || [])
          .filter((r) => String(r.status || '').toLowerCase() === 'pending')
          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
      : (expenses || [])
          .filter(
            (r) =>
              String(r.requested_by || '').trim().toLowerCase() === myEmail &&
              String(r.status || '').toLowerCase() === 'pending',
          )
          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
    pendingReferralAmount: isFinanceAdmin 
      ? (referralRows || []).filter(r => r.reward_status === 'pending').reduce((s: number, r: any) => s + Number(r.reward_amount_inr || 0), 0)
      : referralRows.filter(r => String(r.referrer_email || '').trim().toLowerCase() === myEmail).reduce((s: number, r: any) => s + Number(r.reward_amount_inr || 0), 0),
    pendingRecruitmentAmount: isFinanceAdmin 
      ? (recruitmentRewards || []).filter(r => r.status === 'pending').reduce((s: number, r: any) => s + Number(r.reward_amount || 0), 0)
      : (recruitmentRewards || []).filter(r => {
          const ref = r.recruiter_id ? refMap.get(String(r.recruiter_id)) : null
          return String(ref?.email || '').trim().toLowerCase() === myEmail
        }).reduce((s: number, r: any) => s + Number(r.reward_amount || 0), 0),
  }

  const attention = computeRequestAttention({
    myEmail,
    role: meRow?.role,
    isActive: meRow?.is_active,
    expenses,
    referralLeadRewards,
    recruitmentRewards,
    referrers,
  })

  return (
    <div className="space-y-6 md:space-y-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">Requests</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] max-w-2xl leading-relaxed">
            {canApprovePayouts
              ? 'Pending expenses from founders and admins appear here for approval and payment.'
              : isFinanceAdmin
                ? 'Submit expense requests for super admin approval; referral views for your role.'
                : 'Track your reimbursement requests and earned rewards'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch w-full xl:w-auto shrink-0">
          <div className="w-full sm:min-w-[200px] xl:min-w-[220px]">
            <SearchInput placeholder="Search requests..." />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="glass-card flex-1 sm:flex-initial px-4 py-3 sm:px-6 sm:py-4 bg-white min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 truncate">
                {canApprovePayouts ? 'Pending expense ₹ (all)' : 'My pending expense ₹'}
              </p>
              <p className="text-lg sm:text-xl font-black tracking-tighter">{formatCurrency(totals.pendingExpenseAmount)}</p>
            </div>
            <div className="glass-card flex-1 sm:flex-initial px-4 py-3 sm:px-6 sm:py-4 bg-white min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 truncate">
                {isFinanceAdmin ? 'Pending Referral ₹' : 'My Earnings ₹'}
              </p>
              <p className="text-lg sm:text-xl font-black tracking-tighter">{formatCurrency(totals.pendingReferralAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <RequestsClient
        isFinanceAdmin={isFinanceAdmin}
        canApprovePayouts={canApprovePayouts}
        canSubmitExpenseRequest={canSubmitExpenseRequest}
        myEmail={myEmail}
        pendingExpenseRequests={expensesVisible}
        pendingReferralLeadRewards={referralVisible}
        pendingRecruitmentRewards={recruitmentVisible}
        attention={attention}
      />

    </div>
  )
}

