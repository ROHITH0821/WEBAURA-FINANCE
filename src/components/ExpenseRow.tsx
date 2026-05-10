'use client'

import { useState } from 'react'
import { Receipt, Tag, Calendar, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { approveExpense, deleteExpense } from '@/lib/actions'

interface ExpenseRowProps {
  expense: any
  founders: any[]
  isSuperAdmin: boolean
  currentUserEmail?: string
}

export default function ExpenseRow({ expense, founders, isSuperAdmin, currentUserEmail }: ExpenseRowProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(expense.status || 'pending')
  const [deleted, setDeleted] = useState(false)

  const founderName =
    founders.find((f) => String(f.email || '').toLowerCase() === String(expense.requested_by || '').toLowerCase())
      ?.name || expense.requested_by || 'System'

  const handleApprove = async () => {
    const paymentRef = window.prompt("Enter Rohith's reimbursement transaction reference (required).")
    if (!paymentRef || !paymentRef.trim()) return
    
    setLoading(true)
    try {
      const res = await approveExpense(expense.id, currentUserEmail, paymentRef.trim())
      if (res.error) throw new Error(res.error)
      setStatus('paid')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const ok = window.confirm(
      'Delete this expense permanently?\n\nThis is irreversible and will update project totals if this was paid.',
    )
    if (!ok) return
    setLoading(true)
    try {
      const res = await deleteExpense(expense.id)
      if ((res as any)?.error) throw new Error((res as any).error)
      setDeleted(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (deleted) return null

  return (
    <tr className="group hover:bg-[#f7f7dc]/30 transition-colors">
      <td className="px-10 py-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all border border-transparent group-hover:border-slate-200 shadow-sm group-hover:shadow-md">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{expense.spent_on}</div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
              <Tag className="w-3 h-3" />
              {expense.category} • {founderName}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-8">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
          <Calendar className="w-3.5 h-3.5 text-slate-300" />
          {new Date(expense.request_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </td>
      <td className="px-6 py-8 text-right font-black text-slate-900 text-lg">
        {formatCurrency(expense.amount)}
      </td>
      <td className="px-6 py-8">
        <span className={
          status === 'paid' ? 'badge-green' : 
          status === 'pending' ? 'badge-amber' : 
          'badge-slate'
        }>
          {status}
        </span>
      </td>
      <td className="px-10 py-8 text-right">
        {isSuperAdmin && (
          <div className="flex items-center justify-end gap-3">
            {status === 'pending' && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Confirm Payment
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-100 disabled:opacity-50"
              title="Delete expense"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
