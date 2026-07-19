'use client'

import { useState } from 'react'
import * as navigation from 'next/navigation'
import { Receipt, Tag, Calendar, CheckCircle2, Loader2, X, Trash2 } from 'lucide-react'
import { formatCurrency, formatExpenseCategory, formatExpenseLoggedAt } from '@/lib/utils'
import { approveExpense, deleteExpense } from '@/lib/actions'

interface ExpenseRowProps {
  expense: any
  founders: any[]
  /** Agency this expense is tagged to, if any (resolved server-side from expense.agency_id). */
  agencyName?: string
  /** Super admin only: approve & pay from ledger */
  canApproveAndPay?: boolean
  /** Super admin only: remove from ledger (audit retained) */
  canDelete?: boolean
  currentUserEmail?: string
}

export default function ExpenseRow({
  expense,
  founders,
  agencyName,
  canApproveAndPay = false,
  canDelete = false,
  currentUserEmail,
}: ExpenseRowProps) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(expense.status || 'pending')
  const [showApprove, setShowApprove] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [hidden, setHidden] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const founderName =
    founders.find((f) => String(f.email || '').toLowerCase() === String(expense.requested_by || '').toLowerCase())
      ?.name || expense.requested_by || 'System'

  const handleDelete = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await deleteExpense(expense.id)
      if ((res as any)?.error) throw new Error((res as any).error)
      setHidden(true)
      setShowDeleteConfirm(false)
      router?.refresh()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Delete failed.' })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmApprove = async () => {
    const ref = paymentRef.trim()
    if (!ref) {
      setMessage({ type: 'error', text: 'Enter a reimbursement transaction reference (UTR / UPI id).' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await approveExpense(expense.id, currentUserEmail, ref)
      if ((res as any)?.error) throw new Error((res as any).error)
      setStatus('paid')
      setShowApprove(false)
      setPaymentRef('')
      setMessage({ type: 'success', text: 'Marked as paid.' })
      router?.refresh()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Approval failed.' })
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = formatExpenseLoggedAt(expense)

  if (hidden) return null

  const snapshotRaw = expense.net_profit_snapshot
  const hasSnapshot = snapshotRaw !== null && snapshotRaw !== undefined && snapshotRaw !== ''
  const remainingThatDay = hasSnapshot ? Number(snapshotRaw) : null
  const showRemaining = remainingThatDay !== null && Number.isFinite(remainingThatDay)

  return (
    <article className="group min-w-0 border-b border-slate-100 bg-white px-4 py-5 transition-colors last:border-b-0 hover:bg-[#f7f7dc]/25 md:px-8 md:py-6">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-transparent bg-slate-50 text-slate-400 shadow-sm transition-all group-hover:border-slate-200 group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-md">
              <Receipt className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="break-words font-black uppercase tracking-tight text-slate-900 text-sm sm:text-base">
                {expense.spent_on || 'Unknown Item'}
              </h4>
              <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Tag className="h-3 w-3 shrink-0" aria-hidden />
                <span className="break-all">
                  {formatExpenseCategory(expense)} • {founderName}
                  {agencyName ? ` • ${agencyName}` : ''}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
                  {formattedDate}
                </span>
                <span
                  className={
                    status === 'paid' ? 'badge-green' : status === 'pending' ? 'badge-amber' : 'badge-slate'
                  }
                >
                  {status}
                </span>
              </div>
              {message && (
                <p
                  role="status"
                  className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${
                    message.type === 'error' ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {message.text}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-left sm:min-w-[8.5rem] sm:text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:hidden">Amount</p>
            <p className="font-black tabular-nums tracking-tight text-slate-900 text-lg md:text-xl">
              {formatCurrency(expense.amount)}
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 sm:ml-auto sm:inline-block sm:min-w-[8.5rem]">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                Remaining
              </p>
              <p
                className={`mt-0.5 font-black tabular-nums tracking-tight text-base md:text-lg ${
                  showRemaining
                    ? remainingThatDay! >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {showRemaining ? formatCurrency(remainingThatDay!) : '—'}
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                {status === 'paid' ? 'On that day' : 'After paid'}
              </p>
            </div>
          </div>
        </div>

        {(canApproveAndPay || canDelete) && (
          <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end sm:gap-3 sm:border-0 sm:pt-0">
            {canApproveAndPay && status === 'pending' && (
              <>
                {!showApprove ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowApprove(true)
                      setMessage(null)
                    }}
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Approve & pay
                  </button>
                ) : (
                  <div className="w-full min-w-0 max-w-full space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left sm:max-w-sm">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Reimbursement txn ref
                    </label>
                    <input
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="UTR / UPI reference"
                      className="box-border w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowApprove(false)
                          setPaymentRef('')
                          setMessage(null)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[9px] font-black uppercase text-slate-600 hover:bg-white"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmApprove}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {canDelete && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(true)
                      setMessage(null)
                    }}
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 sm:w-auto"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Remove
                  </button>
                ) : (
                  <div className="w-full min-w-0 max-w-full space-y-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-left sm:max-w-xs">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-800">
                      Remove from ledger? Audit log is kept.
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setMessage(null)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Confirm remove
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
