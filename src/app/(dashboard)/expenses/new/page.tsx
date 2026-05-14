'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, IndianRupee, Calendar, User, Tag, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { createExpense } from '@/lib/actions'

export default function NewExpensePage() {
  const router = useRouter()

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
      if (err?.digest?.includes?.('NEXT_REDIRECT')) throw err
      setError(err.message || 'Failed to request reimbursement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-6 sm:space-y-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => router?.back()}
          className="mt-0.5 shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">Add New Expense</h2>
          <p className="mt-1 text-[9px] font-black uppercase leading-relaxed tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
            Record a company expenditure entry
          </p>
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:space-y-8 sm:p-8 md:p-10">
          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
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
                  className="box-border min-w-0 w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-4"
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
                  className="box-border min-w-0 w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-4"
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
                className="box-border min-w-0 w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-4"
              />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Category</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="box-border min-w-0 w-full max-w-full cursor-pointer appearance-none bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-10 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-12"
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
                  className="box-border min-w-0 w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-4"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                Required so finance can verify before reimbursing.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:gap-4 sm:pt-8">
            <button
              type="button"
              onClick={() => router?.back()}
              className="order-2 w-full min-w-0 touch-manipulation rounded-xl border border-slate-200 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:order-1 sm:flex-1 sm:py-5"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={loading}
              className="order-1 flex w-full min-w-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-200/80 transition-colors hover:bg-slate-800 disabled:opacity-60 sm:order-2 sm:flex-1 sm:gap-3 sm:py-5"
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
