/* eslint-disable react/no-unescaped-entities */
'use client'

import { useMemo, useState } from 'react'
import * as navigation from 'next/navigation'
import {
  ArrowLeft,
  Save,
  IndianRupee,
  Calendar,
  User,
  CreditCard,
  FileText,
  Loader2,
} from 'lucide-react'
import { recordPaymentAction } from '@/lib/payment-actions'

type FounderOption = { email: string; name: string }

export default function NewPaymentClient({
  projectId,
  project,
  founders,
  defaultReceivedBy,
}: {
  projectId: string
  project: any
  founders: FounderOption[]
  defaultReceivedBy: string
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
    received_by: defaultReceivedBy || '',
    payment_method: 'bank_transfer' as 'upi' | 'bank_transfer' | 'cash' | 'cheque',
    payment_stage: 'milestone_1',
    transaction_ref: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const amountInt = Math.max(0, Math.round(Number(formData.amount)))
      const r = await recordPaymentAction({
        projectId,
        amount: amountInt,
        paymentDate: formData.received_date,
        receivedBy: formData.received_by,
        paymentMethod: formData.payment_method,
        paymentStage: formData.payment_stage as any,
        transactionRef: formData.transaction_ref,
        notes: formData.notes,
      })
      if (r.ok === false) throw new Error(r.error)

      router?.push(`/projects/${projectId}`)
      router?.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router?.back()}
          className="p-2 rounded-full hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Record Payment
          </h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
            Log transaction for {project?.client_name || 'Loading...'} (
            {project?.project_code || '...'})
          </p>
        </div>
      </div>

      <div className="max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                Amount Received (₹)
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                Date Received
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.received_date}
                  onChange={(e) =>
                    setFormData({ ...formData, received_date: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                Recipient Founder
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={formData.received_by}
                  onChange={(e) =>
                    setFormData({ ...formData, received_by: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 appearance-none transition-all font-bold text-sm"
                >
                  <option value="">Select Recipient</option>
                  {founders.map((f) => (
                    <option key={f.email} value={f.email}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                Payment Method
              </label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={formData.payment_method}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payment_method: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 appearance-none transition-all font-bold text-sm"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                Payment Stage
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={formData.payment_stage}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_stage: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 appearance-none transition-all font-bold text-sm"
                >
                  <option value="advance">advance</option>
                  <option value="milestone_1">milestone_1</option>
                  <option value="milestone_2">milestone_2</option>
                  <option value="milestone_3">milestone_3</option>
                  <option value="final">final</option>
                  <option value="full">full</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                Transaction Ref (UTR/UPI ID)
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.transaction_ref}
                  onChange={(e) =>
                    setFormData({ ...formData, transaction_ref: e.target.value })
                  }
                  placeholder="e.g. 1234567890"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
              Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes regarding this payment..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="pt-8 border-t border-slate-100 flex gap-6">
            <button
              type="button"
              onClick={() => router?.back()}
              className="flex-1 py-5 rounded-xl border border-slate-200 text-slate-400 font-black hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-[0.2em] text-[10px]"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-5 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.2em] text-[10px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

