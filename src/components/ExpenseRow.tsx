'use client'

import { useState } from 'react'
import * as navigation from 'next/navigation'
import { Receipt, Tag, Calendar, CheckCircle2, Loader2, Trash2, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { approveExpense, deleteExpense } from '@/lib/actions'

interface ExpenseRowProps {
  expense: any
  founders: any[]
  /** Super admin only: approve paid ledger / delete */
  isSuperAdmin: boolean
  currentUserEmail?: string
}

export default function ExpenseRow({ expense, founders, isSuperAdmin, currentUserEmail }: ExpenseRowProps) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(expense.status || 'pending')
  const [deleted, setDeleted] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const founderName =
    founders.find((f) => String(f.email || '').toLowerCase() === String(expense.requested_by || '').toLowerCase())
      ?.name || expense.requested_by || 'System'

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

  const handleDelete = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await deleteExpense(expense.id)
      if ((res as any)?.error) throw new Error((res as any).error)
      setDeleted(true)
      router?.refresh()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Delete failed.' })
      setDeleteConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = (() => {
    try {
      if (!expense.request_date) return 'No Date'
      const d = new Date(expense.request_date)
      if (isNaN(d.getTime())) return 'Invalid Date'
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return 'Error'
    }
  })()

  if (deleted) return null

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
                  {expense.category || 'misc'} • {founderName}
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
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:hidden">Amount</p>
            <p className="font-black tabular-nums tracking-tight text-slate-900 text-lg md:text-xl">
              {formatCurrency(expense.amount)}
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end sm:gap-3 sm:border-0 sm:pt-0">
            {status === 'pending' && (
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
                    Approve
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
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-rose-700 disabled:opacity-50 sm:w-auto"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            ) : (
              <div className="w-full min-w-0 space-y-2 rounded-xl border border-rose-100 bg-rose-50/80 p-3 sm:max-w-xs">
                <p className="text-[10px] font-bold text-rose-800">Delete this row permanently?</p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="rounded-lg bg-rose-700 px-3 py-2 text-[9px] font-black uppercase text-white disabled:opacity-50"
                  >
                    {loading ? '…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
