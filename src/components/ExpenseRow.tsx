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
    <tr className="group hover:bg-[#f7f7dc]/30 transition-colors align-top">
      <td className="px-4 py-6 md:px-10 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all border border-transparent group-hover:border-slate-200 shadow-sm group-hover:shadow-md">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-slate-900 uppercase tracking-tight text-sm break-words">
              {expense.spent_on || 'Unknown Item'}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
              <Tag className="w-3 h-3 shrink-0" />
              <span className="break-all">
                {expense.category || 'misc'} • {founderName}
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
      </td>
      <td className="px-4 py-6 md:px-6 md:py-8 whitespace-nowrap">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
          <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          {formattedDate}
        </div>
      </td>
      <td className="px-4 py-6 md:px-6 md:py-8 text-right font-black text-slate-900 text-base md:text-lg whitespace-nowrap">
        {formatCurrency(expense.amount)}
      </td>
      <td className="px-4 py-6 md:px-6 md:py-8">
        <span
          className={
            status === 'paid' ? 'badge-green' : status === 'pending' ? 'badge-amber' : 'badge-slate'
          }
        >
          {status}
        </span>
      </td>
      <td className="px-4 py-6 md:px-10 md:py-8 text-right">
        {isSuperAdmin && (
          <div className="flex flex-col items-stretch sm:items-end gap-3 min-w-0">
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
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50 w-full sm:w-auto"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Approve
                  </button>
                ) : (
                  <div className="w-full max-w-xs sm:max-w-sm space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Reimbursement txn ref
                    </label>
                    <input
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="UTR / UPI reference"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                    <div className="flex flex-wrap gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowApprove(false)
                          setPaymentRef('')
                          setMessage(null)
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-[9px] font-black uppercase text-slate-600 hover:bg-white"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmApprove}
                        disabled={loading}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
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
                className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md disabled:opacity-50 w-full sm:w-auto"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            ) : (
              <div className="rounded-xl border border-rose-100 bg-rose-50/80 p-3 space-y-2 text-left">
                <p className="text-[10px] font-bold text-rose-800">Delete this row permanently?</p>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-[9px] font-black uppercase text-slate-600 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg bg-rose-700 text-white text-[9px] font-black uppercase disabled:opacity-50"
                  >
                    {loading ? '…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
