'use client'

import { useState } from 'react'
import { X, Save, IndianRupee, Calendar, CreditCard, User, FileText } from 'lucide-react'
import { PaymentMethod, PaymentStage } from '@/types/finance'

interface PaymentEntryFormProps {
  onClose: () => void
  onSubmit: (data: any) => void
  founders: { id: string, name: string }[]
}

export default function PaymentEntryForm({ onClose, onSubmit, founders }: PaymentEntryFormProps) {
  const [formData, setFormData] = useState({
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
    received_by: '',
    payment_method: 'UPI' as PaymentMethod,
    transaction_ref: '',
    payment_stage: 'Advance' as PaymentStage,
    notes: ''
  })

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h3 className="text-2xl font-bold text-white">Record Payment</h3>
            <p className="text-sm text-slate-500 mt-1">Add a new transaction to this project</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form className="p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="number" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-purple-500/50 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date Received</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="date" 
                  value={formData.received_date}
                  onChange={(e) => setFormData({...formData, received_date: e.target.value})}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-purple-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Recipient Founder</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select 
                  value={formData.received_by}
                  onChange={(e) => setFormData({...formData, received_by: e.target.value})}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-purple-500/50 appearance-none transition-all"
                >
                  <option value="" disabled className="bg-zinc-900">Select Founder</option>
                  {founders.map(f => (
                    <option key={f.id} value={f.id} className="bg-zinc-900">{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Method</label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select 
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value as PaymentMethod})}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-purple-500/50 appearance-none transition-all"
                >
                  <option value="UPI" className="bg-zinc-900">UPI</option>
                  <option value="BankTransfer" className="bg-zinc-900">Bank Transfer</option>
                  <option value="Cash" className="bg-zinc-900">Cash</option>
                  <option value="Other" className="bg-zinc-900">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Transaction Ref (UPI ID / UTR / Invoice)</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={formData.transaction_ref}
                onChange={(e) => setFormData({...formData, transaction_ref: e.target.value})}
                placeholder="e.g. 61239847123"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-2 py-4 px-10 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
            >
              <Save className="w-5 h-5" />
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
