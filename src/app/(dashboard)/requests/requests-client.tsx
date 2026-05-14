'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import * as navigation from 'next/navigation'
import { CheckCircle2, Loader2, XCircle, ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  approveExpenseRequestAction,
  rejectExpenseRequestAction,
  approveReferralLeadRewardAction,
  payReferralLeadRewardAction,
  rejectReferralLeadRewardAction,
  approveRecruitmentRewardAction,
  payRecruitmentRewardAction,
  rejectRecruitmentRewardAction,
} from '@/lib/requests-actions'
import type { RequestAttention } from '@/lib/request-attention'

export default function RequestsClient(props: {
  isFinanceAdmin: boolean
  canApprovePayouts: boolean
  canSubmitExpenseRequest: boolean
  myEmail: string
  pendingExpenseRequests: any[]
  pendingReferralLeadRewards: any[]
  pendingRecruitmentRewards: any[]
  /** Same counts as header / sidebar badges (pending + payable pipeline). */
  attention?: RequestAttention
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const [tab, setTab] = useState<'expenses' | 'referrals' | 'recruitment'>('expenses')
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const setTabWithHash = (next: 'expenses' | 'referrals' | 'recruitment') => {
    setTab(next)
    const frag = next === 'recruitment' ? 'recruitment' : next
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${frag}`)
    }
  }

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1).toLowerCase()
      if (h === 'referrals') setTab('referrals')
      else if (h === 'recruitment') setTab('recruitment')
      else if (h === 'expenses') setTab('expenses')
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 8000)
    return () => window.clearTimeout(t)
  }, [banner])

  const expenseCount = props.pendingExpenseRequests.length
  const referralCount = props.pendingReferralLeadRewards.length
  const recruitmentCount = props.pendingRecruitmentRewards.length

  const empty =
    (tab === 'expenses' && expenseCount === 0) ||
    (tab === 'referrals' && referralCount === 0) ||
    (tab === 'recruitment' && recruitmentCount === 0)

  const header = useMemo(() => {
    if (tab === 'expenses')
      return {
        title: 'Expense requests',
        subtitle: props.canApprovePayouts
          ? 'Approve and pay pending submissions from the team'
          : 'Submit reimbursements; super admin approves and pays',
      }
    if (tab === 'referrals') return { title: 'Referral Payout Requests', subtitle: 'Converted referral leads waiting for payout' }
    return { title: 'Recruitment Rewards', subtitle: 'Bonuses and passive commissions from recruitment' }
  }, [tab, props.canApprovePayouts])

  const att = props.attention
  const attentionTotal = att?.total ?? 0

  return (
    <div className="space-y-6 md:space-y-8">
      {banner && (
        <div
          role="alert"
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            banner.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {banner.text}
        </div>
      )}
      {attentionTotal > 0 && att && (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 sm:px-5 sm:py-4 text-slate-900 shadow-sm"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800 mb-1">Needs attention</p>
          <p className="text-sm font-semibold text-amber-950 leading-snug">
            {attentionTotal === 1
              ? 'You have 1 open item in your requests queue.'
              : `You have ${attentionTotal} open items in your requests queue.`}{' '}
            <span className="font-normal text-amber-900/90">
              {att.expenses ? `${att.expenses} expense${att.expenses === 1 ? '' : 's'}` : null}
              {att.expenses && (att.referrals || att.recruitment) ? ', ' : ''}
              {att.referrals ? `${att.referrals} referral${att.referrals === 1 ? '' : 's'}` : null}
              {att.referrals && att.recruitment ? ', ' : ''}
              {att.recruitment ? `${att.recruitment} recruit${att.recruitment === 1 ? '' : 's'}` : null}
              {att.expenses || att.referrals || att.recruitment ? '.' : ''}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {att.expenses > 0 && (
              <button
                type="button"
                onClick={() => setTabWithHash('expenses')}
                className="rounded-lg bg-white/90 border border-amber-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-950 hover:bg-white touch-manipulation"
              >
                Go to expenses ({att.expenses})
              </button>
            )}
            {att.referrals > 0 && (
              <button
                type="button"
                onClick={() => setTabWithHash('referrals')}
                className="rounded-lg bg-white/90 border border-amber-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-950 hover:bg-white touch-manipulation"
              >
                Go to referrals ({att.referrals})
              </button>
            )}
            {att.recruitment > 0 && (
              <button
                type="button"
                onClick={() => setTabWithHash('recruitment')}
                className="rounded-lg bg-white/90 border border-amber-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-950 hover:bg-white touch-manipulation"
              >
                Go to recruit ({att.recruitment})
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">{header.title}</h3>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] mt-1">
            {header.subtitle}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:justify-end shrink-0 w-full min-w-0 lg:w-auto">
          {props.canSubmitExpenseRequest && !props.canApprovePayouts && (
            <Link
              href="/expenses/new"
              className="shrink-0 px-5 sm:px-6 py-3 rounded-xl bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 text-center whitespace-nowrap touch-manipulation"
            >
              Submit Request
            </Link>
          )}
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 gap-1 overflow-x-auto scrollbar-hide w-full sm:w-auto min-w-0 snap-x snap-mandatory scroll-pl-1">
            <button
              type="button"
              onClick={() => setTabWithHash('expenses')}
              className={`shrink-0 snap-start px-3 sm:px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap touch-manipulation ${
                tab === 'expenses' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              } ${att && att.expenses > 0 && tab !== 'expenses' ? 'ring-1 ring-amber-300/80' : ''}`}
            >
              Expenses <span className="ml-1 opacity-70">{expenseCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setTabWithHash('referrals')}
              className={`shrink-0 snap-start px-3 sm:px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap touch-manipulation ${
                tab === 'referrals' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              } ${att && att.referrals > 0 && tab !== 'referrals' ? 'ring-1 ring-amber-300/80' : ''}`}
            >
              Referrals <span className="ml-1 opacity-70">{referralCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setTabWithHash('recruitment')}
              className={`shrink-0 snap-start px-3 sm:px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap touch-manipulation ${
                tab === 'recruitment' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              } ${att && att.recruitment > 0 && tab !== 'recruitment' ? 'ring-1 ring-amber-300/80' : ''}`}
            >
              Recruit <span className="ml-1 opacity-70">{recruitmentCount}</span>
            </button>
          </div>
        </div>
      </div>

      {empty ? (
        <div className="glass-card bg-white p-10 sm:p-16 md:p-32 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-slate-200" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">
                Nothing here
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {tab === 'expenses' ? 'All reimbursement requests processed' : 
                 tab === 'referrals' ? 'No pending referral payouts' : 
                 'No pending recruitment rewards'}
              </p>
            </div>
            <Link href="/requests" className="mt-2 text-[9px] font-black text-slate-900 uppercase border-b-2 border-slate-900 pb-0.5">
              Reset view
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6">
          {tab === 'expenses' && (
            props.pendingExpenseRequests.map((r) => (
              <ExpenseCard
                key={r.id}
                row={r}
                isSuperAdmin={props.canApprovePayouts}
                myEmail={props.myEmail}
                pending={pending}
                startTransition={startTransition}
                notify={setBanner}
              />
            ))
          )}

          {tab === 'referrals' && (
            props.pendingReferralLeadRewards.map((row) => (
              <ReferralCard
                key={row.id}
                row={row}
                canApprovePayouts={props.canApprovePayouts}
                pending={pending}
                startTransition={startTransition}
                notify={setBanner}
              />
            ))
          )}

          {tab === 'recruitment' && (
            props.pendingRecruitmentRewards.map((row) => (
              <RecruitmentCard
                key={row.id}
                row={row}
                canApprovePayouts={props.canApprovePayouts}
                pending={pending}
                startTransition={startTransition}
                notify={setBanner}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ExpenseCard({
  row,
  isSuperAdmin,
  myEmail,
  pending,
  startTransition,
  notify,
}: {
  row: any
  /** Super admin only (matches server `approveExpenseRequestAction`). */
  isSuperAdmin: boolean
  myEmail: string
  pending: boolean
  startTransition: any
  notify: (msg: { type: 'success' | 'error'; text: string }) => void
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const [payRef, setPayRef] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const canAct = isSuperAdmin

  return (
    <article className="glass-card bg-white p-4 sm:p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="min-w-0 w-full md:w-auto">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Expense Request</p>
          <p className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{row.spent_on}</p>
          <p className="mt-1 md:mt-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">
            {row.category} • {row.requested_by}
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-[#f7f7dc] p-4">
            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Transaction Ref</p>
            <p className="font-black text-slate-900 tracking-tight text-xs md:text-sm">{row.transaction_ref}</p>
          </div>
        </div>

        <div className="text-left md:text-right w-full md:w-auto flex md:flex-col justify-between items-end md:items-end">
          <div className="md:block">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</p>
            <p className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900">{formatCurrency(row.amount)}</p>
          </div>
          <p className="mt-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
            {(() => {
              const raw = row.created_at ?? row.request_date
              if (!raw) return '—'
              const d = new Date(raw)
              return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            })()}
          </p>
          {row.status !== 'pending' && (
            <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              row.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
              {row.status === 'paid' ? 'Paid / Accepted' : 'Rejected'}
            </div>
          )}
        </div>
      </div>

      {row.status === 'pending' && !canAct && (
        <div className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Awaiting super admin approval
        </div>
      )}

      {row.status === 'rejected' && row.rejection_reason && (
        <div className="mt-6 p-4 rounded-xl border border-rose-100 bg-rose-50 text-[11px] font-medium text-rose-600">
          <span className="font-black uppercase tracking-widest mr-2">Reason:</span>
          {row.rejection_reason}
        </div>
      )}

      {row.status === 'paid' && row.payment_transaction_ref && (
        <div className="mt-6 p-4 rounded-xl border border-emerald-100 bg-emerald-50 text-[11px] font-medium text-emerald-600">
          <span className="font-black uppercase tracking-widest mr-2">Reimbursement Txn Ref:</span>
          {row.payment_transaction_ref}
        </div>
      )}
      {row.status === 'pending' && canAct && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => setPayOpen((v) => !v)}
            className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Approve & Pay
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRejectOpen((v) => !v)}
            className="px-5 py-3 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}

      {payOpen && canAct && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">
            Enter reimbursement transaction ID paid to the requester (UTR / UPI reference).
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="flex-1 min-w-0 w-full sm:min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-slate-400"
              placeholder="UPI txn id / UTR"
            />
            <button
              type="button"
              disabled={pending || !payRef.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await approveExpenseRequestAction(row.id, myEmail, payRef.trim())
                  if (r.ok === false) {
                    notify({ type: 'error', text: r.error })
                    return
                  }
                  notify({ type: 'success', text: 'Expense marked as paid.' })
                  router?.refresh()
                  setPayOpen(false)
                })
              }
              className="px-7 py-3 rounded-xl bg-[#f7f7dc] text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#efefd0] transition-all disabled:opacity-30 flex items-center gap-2"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {rejectOpen && canAct && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-3">Rejection reason (required)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="flex-1 min-w-0 w-full sm:min-w-[200px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
              placeholder="Why is this rejected?"
            />
            <button
              type="button"
              disabled={pending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await rejectExpenseRequestAction(row.id, myEmail, rejectReason.trim())
                  if (r.ok === false) {
                    notify({ type: 'error', text: r.error })
                    return
                  }
                  notify({ type: 'success', text: 'Request rejected.' })
                  router?.refresh()
                  setRejectOpen(false)
                })
              }
              className="px-7 py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-30"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function ReferralCard({
  row,
  canApprovePayouts,
  pending,
  startTransition,
  notify,
}: {
  row: any
  canApprovePayouts: boolean
  pending: boolean
  startTransition: any
  notify: (msg: { type: 'success' | 'error'; text: string }) => void
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const [payRef, setPayRef] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const reward = Number(row.reward_amount_inr || 0)

  return (
    <article className="glass-card bg-white p-4 sm:p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="min-w-0 w-full md:w-auto">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Referral Reward</p>
          <p className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{row.referrer_name}</p>
          <p className="mt-1 md:mt-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">
            Lead: {row.lead_name || 'Converted'}
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Referrer UPI</p>
            <p className="font-black text-slate-900 tracking-tight text-xs md:text-sm">{row.referrer_upi_id || 'NOT_SET'}</p>
          </div>
        </div>

        <div className="text-left md:text-right w-full md:w-auto flex md:flex-col justify-between items-end md:items-end">
          <div className="md:block">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payout</p>
            <p className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900">{formatCurrency(reward)}</p>
          </div>
          <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
            row.reward_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
            row.reward_status === 'pending' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
            row.reward_status === 'approved' ? 'bg-[#f7f7dc] text-slate-700 border border-slate-900' :
            'bg-rose-50 text-rose-600 border border-rose-100'
          }`}>
            {row.reward_status}
          </div>
        </div>
      </div>

      {canApprovePayouts && (
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || row.reward_status !== 'pending'}
          onClick={() =>
            startTransition(async () => {
              const r = await approveReferralLeadRewardAction(row.id)
              if (r.ok === false) {
                notify({ type: 'error', text: r.error })
                return
              }
              notify({ type: 'success', text: 'Referral reward approved.' })
              router?.refresh()
            })
          }
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-30"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setPayOpen((v) => !v)}
          className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30"
        >
          Pay
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setRejectOpen((v) => !v)}
          className="px-5 py-3 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all disabled:opacity-30"
        >
          Reject
        </button>
      </div>
      )}

      {payOpen && canApprovePayouts && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Payment transaction ID (mandatory)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="flex-1 min-w-0 w-full sm:min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-slate-400"
              placeholder="UPI txn id / UTR"
            />
            <button
              type="button"
              disabled={pending || !payRef.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await payReferralLeadRewardAction(row.id, payRef.trim())
                  if (r.ok === false) {
                    notify({ type: 'error', text: r.error })
                    return
                  }
                  notify({ type: 'success', text: 'Referral marked as paid.' })
                  router?.refresh()
                  setPayOpen(false)
                })
              }
              className="px-7 py-3 rounded-xl bg-[#f7f7dc] text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#efefd0] transition-all disabled:opacity-30"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {rejectOpen && canApprovePayouts && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-3">Rejection reason (required)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="flex-1 min-w-0 w-full sm:min-w-[200px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
              placeholder="Why is this rejected?"
            />
            <button
              type="button"
              disabled={pending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await rejectReferralLeadRewardAction(row.id, rejectReason.trim())
                  if (r.ok === false) {
                    notify({ type: 'error', text: r.error })
                    return
                  }
                  notify({ type: 'success', text: 'Referral reward rejected.' })
                  router?.refresh()
                  setRejectOpen(false)
                })
              }
              className="px-7 py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-30"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function RecruitmentCard({
  row,
  canApprovePayouts,
  pending,
  startTransition,
  notify,
}: {
  row: any
  canApprovePayouts: boolean
  pending: boolean
  startTransition: any
  notify: (msg: { type: 'success' | 'error'; text: string }) => void
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const [payRef, setPayRef] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  return (
    <article className="glass-card bg-white p-4 sm:p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="min-w-0 w-full md:w-auto">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Recruitment Reward</p>
          <p className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{row.reward_type}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              row.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
              row.status === 'pending' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
              row.status === 'approved' ? 'bg-[#f7f7dc] text-slate-700 border border-slate-900' :
              'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
              {row.status}
            </div>
            {row.is_locked && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                Locked
              </div>
            )}
          </div>
        </div>

        <div className="text-left md:text-right w-full md:w-auto flex md:flex-col justify-between items-end md:items-end">
          <div className="md:block">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payout</p>
            <p className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900">{formatCurrency(row.reward_amount)}</p>
          </div>
        </div>
      </div>

      {canApprovePayouts && (
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || row.status !== 'pending' || row.is_locked}
          onClick={() =>
            startTransition(async () => {
              const r = await approveRecruitmentRewardAction(row.id)
              if (r.ok === false) {
                notify({ type: 'error', text: r.error })
                return
              }
              notify({ type: 'success', text: 'Recruitment reward approved.' })
              router?.refresh()
            })
          }
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-30"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending || row.is_locked}
          onClick={() => setPayOpen((v) => !v)}
          className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30"
        >
          Pay
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setRejectOpen((v) => !v)}
          className="px-5 py-3 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all disabled:opacity-30"
        >
          Reject
        </button>
      </div>
      )}

      {payOpen && canApprovePayouts && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Payment transaction ID (mandatory)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="flex-1 min-w-0 w-full sm:min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-slate-400"
              placeholder="UPI txn id / UTR"
            />
            <button
              type="button"
              disabled={pending || !payRef.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await payRecruitmentRewardAction(row.id, payRef.trim())
                  if (r.ok === false) {
                    notify({ type: 'error', text: r.error })
                    return
                  }
                  notify({ type: 'success', text: 'Recruitment reward marked paid.' })
                  router?.refresh()
                  setPayOpen(false)
                })
              }
              className="px-7 py-3 rounded-xl bg-[#f7f7dc] text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#efefd0] transition-all disabled:opacity-30"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {rejectOpen && canApprovePayouts && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-3">Rejection reason (required)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="flex-1 min-w-0 w-full sm:min-w-[200px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
              placeholder="Why is this rejected?"
            />
            <button
              type="button"
              disabled={pending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await rejectRecruitmentRewardAction(row.id, rejectReason.trim())
                  if (r.ok === false) {
                    notify({ type: 'error', text: r.error })
                    return
                  }
                  notify({ type: 'success', text: 'Recruitment reward rejected.' })
                  router?.refresh()
                  setRejectOpen(false)
                })
              }
              className="px-7 py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-30"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

