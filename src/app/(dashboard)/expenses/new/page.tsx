'use client'

import { useState, useEffect } from 'react'
import * as navigation from 'next/navigation'
import { ArrowLeft, Save, IndianRupee, Calendar, User, Tag, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { createExpense } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export default function NewExpensePage() {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    spent_on: '',
    category: 'miscellaneous',
    request_date: new Date().toISOString().split('T')[0],
    transaction_ref: '',
    requested_by: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email || ''
      setFormData((prev) => ({ ...prev, requested_by: email }))
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await createExpense(formData)

      if (res?.error) throw new Error(res.error)
    } catch (err: any) {
      setError(err.message || 'Failed to request reimbursement')
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
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Add New Expense</h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Record a company expenditure entry</p>
        </div>
      </div>

      <div className="max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="number" 
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Request Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  required
                  value={formData.request_date}
                  onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">What did you spend on?</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                value={formData.spent_on}
                onChange={(e) => setFormData({ ...formData, spent_on: e.target.value })}
                placeholder="e.g. Vercel renewal, Client lunch, Domain purchase"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Category</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 appearance-none transition-all font-bold text-sm"
                >
                  <option value="infrastructure">infrastructure</option>
                  <option value="tools">tools</option>
                  <option value="marketing">marketing</option>
                  <option value="travel">travel</option>
                  <option value="client_work">client_work</option>
                  <option value="team">team</option>
                  <option value="subscriptions">subscriptions</option>
                  <option value="miscellaneous">miscellaneous</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Your proof (mandatory)</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.transaction_ref}
                  onChange={(e) => setFormData({ ...formData, transaction_ref: e.target.value })}
                  placeholder="UPI transaction ID / UTR / Invoice number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 outline-none focus:border-slate-900 transition-all font-bold text-sm"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                Required so Rohith can verify before reimbursing.
              </p>
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Submitting...' : 'Submit Expense Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
