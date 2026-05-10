import { createClient } from '@/lib/supabaseServer'
import { createStaticClient } from '@/lib/supabaseServer'
import { formatCurrency } from '@/lib/utils'
import RequestsClient from './requests-client'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = await createClient()
  const admin = createStaticClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const myEmail = String(user?.email || '').toLowerCase()

  const { data: meRow } = await admin
    .from('admin_users')
    .select('email, full_name, role, is_active')
    .eq('email', myEmail)
    .maybeSingle()

  const isSuperAdmin = Boolean(meRow?.role === 'super_admin')

  const [{ data: pendingExpenses }, { data: referralLeadRewards }, { data: recruitmentRewards }] =
    await Promise.all([
      admin
        .from('expense_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      admin
        .from('referral_leads')
        .select('id,lead_name,lead_email,referrer_id,stage,reward_status,project_value_inr,reward_amount_inr,created_at')
        .eq('stage', 'converted')
        .in('reward_status', ['pending', 'approved'])
        .order('created_at', { ascending: false }),
      admin
        .from('recruitment_rewards')
        .select('id,created_at,recruiter_id,recruit_id,trigger_lead_id,reward_type,reward_amount,status,is_locked,unlocked_at,notes,payout_transaction_ref,payout_paid_by,approved_at,paid_at')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false }),
    ])

  const expensesVisible = isSuperAdmin
    ? pendingExpenses || []
    : (pendingExpenses || []).filter((r) => String(r.requested_by || '').toLowerCase() === myEmail)

  // Referrer lookups (only needed for super admin view)
  const refIds = [...new Set((referralLeadRewards || []).map((r: any) => r.referrer_id).filter(Boolean))] as string[]
  const { data: referrers } = refIds.length
    ? await admin.from('referrers').select('id,name,email,upi_id').in('id', refIds)
    : { data: [] as any[] }
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

  const recruitmentVisible = isSuperAdmin ? recruitmentRewards || [] : []
  const referralVisible = isSuperAdmin ? referralRows : []

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

      <RequestsClient
        isSuperAdmin={isSuperAdmin}
        myEmail={myEmail}
        pendingExpenseRequests={expensesVisible}
        pendingReferralLeadRewards={referralVisible}
        pendingRecruitmentRewards={recruitmentVisible}
      />
    </div>
  )
}

