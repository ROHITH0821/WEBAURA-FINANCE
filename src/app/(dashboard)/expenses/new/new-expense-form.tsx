'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, IndianRupee, Tag, FileText, Loader2, Briefcase } from 'lucide-react'
import { createExpense } from '@/lib/actions'

export type NewExpenseProjectOption = { id: string; label: string }

export default function NewExpenseForm({ projects }: { projects: NewExpenseProjectOption[] }) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    spent_on: '',
    category: 'miscellaneous',
    transaction_ref: '',
    project_id: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = (await createExpense({
        ...formData,
        project_id: formData.project_id.trim() || null,
      })) as { error?: string; ok?: boolean; redirect?: string } | undefined
      if (res?.error) throw new Error(res.error)
      if (res?.redirect) {
        router.push(res.redirect)
        router.refresh()
        return
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request reimbursement'
      setError(msg)
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
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">Expense request</h2>
          <p className="mt-1 text-[9px] font-black uppercase leading-relaxed tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
            Submit for super admin approval — five fields only
          </p>
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:space-y-8 sm:p-8 md:p-10">
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">What you spent on</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={formData.spent_on}
                onChange={(e) => setFormData({ ...formData, spent_on: e.target.value })}
                placeholder="e.g. Vercel renewal, client lunch, domain purchase"
                className="box-border min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-4"
              />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <div className="space-y-3">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="box-border min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-4"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="box-border min-w-0 w-full max-w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-10 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-12"
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
          </div>

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Client project <span className="font-bold normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="box-border min-w-0 w-full max-w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-10 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-12"
              >
                <option value="">Not linked to a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Link only when this spend should reduce that project&apos;s net.
            </p>
          </div>

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Proof — UPI txn ID or invoice number
            </label>
            <input
              type="text"
              required
              value={formData.transaction_ref}
              onChange={(e) => setFormData({ ...formData, transaction_ref: e.target.value })}
              placeholder="UPI transaction ID / UTR / Invoice number"
              className="box-border min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:px-5"
            />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Required so finance can verify before reimbursing.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-[10px] font-black uppercase tracking-widest text-rose-500">
              {error}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:gap-4 sm:pt-8">
            <button
              type="button"
              onClick={() => router?.back()}
              className="order-2 w-full min-w-0 touch-manipulation rounded-xl border border-slate-200 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:order-1 sm:flex-1 sm:py-5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="order-1 flex w-full min-w-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-200/80 transition-colors hover:bg-slate-800 disabled:opacity-60 sm:order-2 sm:flex-1 sm:gap-3 sm:py-5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
