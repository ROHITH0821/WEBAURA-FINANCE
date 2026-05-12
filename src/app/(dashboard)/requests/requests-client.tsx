'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function RequestsClient(props: {
  isSuperAdmin: boolean
  myEmail: string
  pendingExpenseRequests: any[]
  pendingReferralLeadRewards: any[]
  pendingRecruitmentRewards: any[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'expenses' | 'referrals' | 'recruitment'>('expenses')
  const [pending, startTransition] = useTransition()

  const expenseCount = props.pendingExpenseRequests.length
  const referralCount = props.pendingReferralLeadRewards.length
  const recruitmentCount = props.pendingRecruitmentRewards.length

  const empty =
    (tab === 'expenses' && expenseCount === 0) ||
    (tab === 'referrals' && referralCount === 0) ||
    (tab === 'recruitment' && recruitmentCount === 0)

  const header = useMemo(() => {
    if (tab === 'expenses') return { title: 'Founder Expense Requests', subtitle: 'Verify proof and reimburse founders' }
    if (tab === 'referrals') return { title: 'Referral Payout Requests', subtitle: 'Converted referral leads waiting for payout' }
    return { title: 'Recruitment Rewards', subtitle: 'Bonuses and passive commissions from recruitment' }
  }, [tab])

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">{header.title}</h3>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">{header.subtitle}</p>
        </div>

        {!props.isSuperAdmin && (
          <Link
            href="/expenses/new"
            className="px-6 py-3 rounded-xl bg-slate-900 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 text-center"
          >
            Submit Request
          </Link>
        )}

        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 overflow-x-auto scrollbar-hide max-w-full">
          <button
            type="button"
            onClick={() => setTab('expenses')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              tab === 'expenses' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Expenses <span className="ml-1 opacity-70">{expenseCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('referrals')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              tab === 'referrals' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Referrals <span className="ml-1 opacity-70">{referralCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('recruitment')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              tab === 'recruitment' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Recruit <span className="ml-1 opacity-70">{recruitmentCount}</span>
          </button>
        </div>
      </div>

      {empty ? (
        <div className="glass-card bg-white p-10 md:p-14 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No pending items</p>
          {!props.isSuperAdmin && tab === 'expenses' && (
            <p className="mt-3 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Create an expense request and it will appear here for approval.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6">
          {tab === 'expenses' && (
            props.pendingExpenseRequests.map((r) => (
              <ExpenseCard
                key={r.id}
                row={r}
                isSuperAdmin={props.isSuperAdmin}
                myEmail={props.myEmail}
                pending={pending}
                startTransition={startTransition}
              />
            ))
          )}

          {tab === 'referrals' && (
            props.pendingReferralLeadRewards.map((row) => (
              <ReferralCard
                key={row.id}
                row={row}
                pending={pending}
                startTransition={startTransition}
              />
            ))
          )}

          {tab === 'recruitment' && (
            props.pendingRecruitmentRewards.map((row) => (
              <RecruitmentCard
                key={row.id}
                row={row}
                pending={pending}
                startTransition={startTransition}
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
}: {
  row: any
  isSuperAdmin: boolean
  myEmail: string
  pending: boolean
  startTransition: any
}) {
  const [payRef, setPayRef] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const canAct = isSuperAdmin

  return (
    <article className="glass-card bg-white p-6 md:p-8">
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
            {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </div>

      {!canAct ? (
        <div className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Pending approval by Rohith
        </div>
      ) : (
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
            Enter Rohith reimbursement transaction ID (mandatory)
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="flex-1 min-w-[240px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-slate-400"
              placeholder="UPI txn id / UTR"
            />
            <button
              type="button"
              disabled={pending || !payRef.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await approveExpenseRequestAction(row.id, myEmail, payRef.trim())
                  if (r.ok === false) window.alert(r.error)
                  router.refresh()
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
              className="flex-1 min-w-[240px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
              placeholder="Why is this rejected?"
            />
            <button
              type="button"
              disabled={pending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await rejectExpenseRequestAction(row.id, myEmail, rejectReason.trim())
                  if (r.ok === false) window.alert(r.error)
                  router.refresh()
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
  pending,
  startTransition,
}: {
  row: any
  pending: boolean
  startTransition: any
}) {
  const [payRef, setPayRef] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const reward = Number(row.reward_amount_inr || 0)

  return (
    <article className="glass-card bg-white p-6 md:p-8">
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
          <p className="mt-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
            {row.reward_status}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || row.reward_status !== 'pending'}
          onClick={() =>
            startTransition(async () => {
              const r = await approveReferralLeadRewardAction(row.id)
              if (r.ok === false) window.alert(r.error)
              router.refresh()
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

      {payOpen && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Payment transaction ID (mandatory)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="flex-1 min-w-[240px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-slate-400"
              placeholder="UPI txn id / UTR"
            />
            <button
              type="button"
              disabled={pending || !payRef.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await payReferralLeadRewardAction(row.id, payRef.trim())
                  if (r.ok === false) window.alert(r.error)
                  router.refresh()
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

      {rejectOpen && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-3">Rejection reason (required)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="flex-1 min-w-[240px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
              placeholder="Why is this rejected?"
            />
            <button
              type="button"
              disabled={pending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await rejectReferralLeadRewardAction(row.id, rejectReason.trim())
                  if (r.ok === false) window.alert(r.error)
                  router.refresh()
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
  pending,
  startTransition,
}: {
  row: any
  pending: boolean
  startTransition: any
}) {
  const [payRef, setPayRef] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  return (
    <article className="glass-card bg-white p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="min-w-0 w-full md:w-auto">
          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1 md:mb-2">Recruitment Reward</p>
          <p className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{row.reward_type}</p>
          <p className="mt-1 md:mt-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">
            Status: {row.status} {row.is_locked ? '• LOCKED' : ''}
          </p>
        </div>

        <div className="text-left md:text-right w-full md:w-auto flex md:flex-col justify-between items-end md:items-end">
          <div className="md:block">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payout</p>
            <p className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900">{formatCurrency(row.reward_amount)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || row.status !== 'pending' || row.is_locked}
          onClick={() =>
            startTransition(async () => {
              const r = await approveRecruitmentRewardAction(row.id)
              if (r.ok === false) window.alert(r.error)
              router.refresh()
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

      {payOpen && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Payment transaction ID (mandatory)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              className="flex-1 min-w-[240px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-slate-400"
              placeholder="UPI txn id / UTR"
            />
            <button
              type="button"
              disabled={pending || !payRef.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await payRecruitmentRewardAction(row.id, payRef.trim())
                  if (r.ok === false) window.alert(r.error)
                  router.refresh()
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

      {rejectOpen && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/40 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 mb-3">Rejection reason (required)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="flex-1 min-w-[240px] rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-300"
              placeholder="Why is this rejected?"
            />
            <button
              type="button"
              disabled={pending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await rejectRecruitmentRewardAction(row.id, rejectReason.trim())
                  if (r.ok === false) window.alert(r.error)
                  router.refresh()
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

