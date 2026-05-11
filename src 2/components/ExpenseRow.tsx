'use client'

import { useState } from 'react'
import { Receipt, Tag, Calendar, CheckCircle2, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { approveExpense } from '@/lib/actions'

interface ExpenseRowProps {
  expense: any
  founders: any[]
  isSuperAdmin: boolean
  currentUserId?: string
}

export default function ExpenseRow({ expense, founders, isSuperAdmin, currentUserId }: ExpenseRowProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(expense.status || 'pending')

  const founderName = founders.find(f => f.id === expense.founder_id || f.user_id === expense.paid_by)?.name || 'System'

  const handleApprove = async () => {
    if (!confirm('Mark this request as paid?')) return
    
    setLoading(true)
    try {
      const res = await approveExpense(expense.id, currentUserId)
      if (res.error) throw new Error(res.error)
      setStatus('paid')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <tr className="group hover:bg-[#f7f7dc]/30 transition-colors">
      <td className="px-10 py-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all border border-transparent group-hover:border-slate-200 shadow-sm group-hover:shadow-md">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{expense.description}</div>
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
          {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
        {isSuperAdmin && status === 'pending' && (
          <button 
            onClick={handleApprove}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Confirm Payment
          </button>
        )}
      </td>
    </tr>
  )
}
