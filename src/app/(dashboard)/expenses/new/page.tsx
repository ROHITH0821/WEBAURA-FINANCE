'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Save, IndianRupee, Tag, FileText, Loader2, Briefcase, Building2, CheckCircle2, Plus } from 'lucide-react'
import BackButton from '@/components/BackButton'
import { useAppRouter } from '@/hooks/useAppRouter'
import { submitExpenseRequest } from '@/lib/expense-actions'
import { getAgenciesForForm } from '@/lib/agency-actions'
import { createExpenseCategoryAction, getExpenseCategoriesForForm } from '@/lib/expense-category-actions'
import type { Agency, ExpenseCategoryCatalogItem } from '@/types/finance'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/types/finance'

type ProjectOption = { id: string; label: string }

const EMPTY_FORM = {
  amount: '',
  spent_on: '',
  category: 'miscellaneous',
  custom_category_label: '',
  transaction_ref: '',
  project_id: '',
  agency_id: '',
}

export default function NewExpensePage() {
  const { back, refresh } = useAppRouter()

  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectsError, setProjectsError] = useState('')
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [categories, setCategories] = useState<ExpenseCategoryCatalogItem[]>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [role, setRole] = useState<'super_admin' | 'admin' | 'founder' | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/expense-form/context', { credentials: 'include' })
        const json = (await res.json()) as {
          role?: 'super_admin' | 'admin' | 'founder'
          projects?: ProjectOption[]
          projectsError?: string
          error?: string
        }
        if (cancelled) return
        if (!res.ok) {
          setProjectsError(json.error || 'Could not load form data')
          return
        }
        if (json.role) setRole(json.role)
        setProjects(json.projects || [])
        if (json.projectsError) setProjectsError(json.projectsError)

        const agencyRes = await getAgenciesForForm()
        if (!cancelled && agencyRes.ok) setAgencies(agencyRes.agencies)

        const categoryRes = await getExpenseCategoriesForForm()
        if (!cancelled && categoryRes.ok) setCategories(categoryRes.categories)
      } catch (e: unknown) {
        if (!cancelled) {
          setProjectsError(e instanceof Error ? e.message : 'Network error loading projects')
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!success) return
    const t = window.setTimeout(() => setSuccess(null), 12000)
    return () => window.clearTimeout(t)
  }, [success])

  const handleAddCategory = async () => {
    const label = newCategoryLabel.trim()
    if (!label) return
    setCategoryBusy(true)
    try {
      const res = await createExpenseCategoryAction({ label })
      if (res.ok) {
        setCategories((prev) =>
          [...prev.filter((c) => c.slug !== res.category.slug), res.category].sort(
            (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label),
          ),
        )
        setFormData((prev) => ({ ...prev, category: res.category.slug }))
        setNewCategoryLabel('')
        setShowNewCategory(false)
      } else {
        setError(res.error)
      }
    } finally {
      setCategoryBusy(false)
    }
  }

  const categoryOptions: ExpenseCategoryCatalogItem[] =
    categories.length > 0
      ? categories
      : EXPENSE_CATEGORIES.map((slug, index) => ({
          id: slug,
          slug,
          label: EXPENSE_CATEGORY_LABELS[slug],
          sort_order: (index + 1) * 10,
          is_active: true,
          is_system: true,
          created_at: '',
        }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const res = await submitExpenseRequest({
        ...formData,
        project_id: formData.project_id.trim() || null,
        agency_id: formData.agency_id.trim() || null,
        custom_category_label: formData.category === 'other' ? formData.custom_category_label.trim() : null,
      })
      if (res?.error) throw new Error(res.error)
      if (res?.ok) {
        setFormData(EMPTY_FORM)
        setSuccess(res.message || 'Request submitted successfully.')
        refresh()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      throw new Error('Unexpected response from server. Try again.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request reimbursement')
    } finally {
      setLoading(false)
    }
  }

  const isSuperAdmin = role === 'super_admin'

  const subtitle = isSuperAdmin
    ? 'Recorded as paid immediately — no approval queue'
    : role === 'admin' || role === 'founder'
      ? 'Sent to super admin for approval and reimbursement — five fields only'
      : 'Five fields — what you spent, amount, category, optional project, proof'

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-6 sm:space-y-10">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <BackButton fallbackHref="/expenses" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
            {isSuperAdmin ? 'Log expense' : 'Expense request'}
          </h2>
          <p className="mt-1 text-[9px] font-black uppercase leading-relaxed tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
            {subtitle}
          </p>
        </div>
      </div>

      {success ? (
        <div
          role="status"
          className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-6 sm:py-5"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
              {isSuperAdmin ? 'Recorded on ledger' : 'Submitted successfully'}
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-emerald-950">{success}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700/90">
              {isSuperAdmin
                ? 'Form cleared — log another expense below or view the team ledger.'
                : 'Form cleared — you can submit another request below.'}
            </p>
            {isSuperAdmin ? (
              <Link
                href="/expenses"
                className="mt-3 inline-block text-[10px] font-black uppercase tracking-widest text-emerald-800 underline underline-offset-2"
              >
                View expense tracker →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={`mx-auto w-full min-w-0 max-w-3xl overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
          success ? 'border-emerald-200 ring-2 ring-emerald-100' : 'border-slate-200'
        }`}
      >
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
                  disabled={bootstrapping}
                  className="box-border min-w-0 w-full max-w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-10 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 disabled:opacity-60 sm:pr-12"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              {showNewCategory ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="New category name"
                    className="box-border min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={categoryBusy || !newCategoryLabel.trim()}
                      onClick={handleAddCategory}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {categoryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false)
                        setNewCategoryLabel('')
                      }}
                      className="rounded-xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New category
                </button>
              )}
            </div>
          </div>

          {formData.category === 'other' ? (
            <div className="space-y-3">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Describe the category
              </label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.custom_category_label}
                  onChange={(e) => setFormData({ ...formData, custom_category_label: e.target.value })}
                  placeholder="e.g. Client gift, Legal fees, Coworking day pass"
                  className="box-border min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-4"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Client project <span className="font-bold normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                disabled={bootstrapping}
                className="box-border min-w-0 w-full max-w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-10 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 disabled:opacity-60 sm:pr-12"
              >
                <option value="">{bootstrapping ? 'Loading projects…' : 'Not linked to a project'}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {projectsError ? (
              <p className="text-[10px] font-bold text-amber-700">
                {projectsError} — you can still submit without a project.
              </p>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Link only when this spend should reduce that project&apos;s net.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Agency <span className="font-bold normal-case tracking-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={formData.agency_id}
                onChange={(e) => setFormData({ ...formData, agency_id: e.target.value })}
                className="box-border min-w-0 w-full max-w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-10 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-slate-900 sm:pr-12"
              >
                <option value="">Not tied to an agency</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Tag when this spend (salaries, infra, etc.) counts against a specific agency&apos;s share.
            </p>
          </div>

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {isSuperAdmin ? 'Payment / proof reference' : 'Proof — UPI txn ID or invoice number'}
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
              {isSuperAdmin
                ? 'UTR / UPI id or invoice number — saved as payment reference on the ledger.'
                : 'Required so finance can verify before reimbursing.'}
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
              onClick={() => back('/expenses')}
              className="order-2 w-full min-w-0 touch-manipulation rounded-xl border border-slate-200 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:order-1 sm:flex-1 sm:py-5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || bootstrapping}
              className="order-1 flex w-full min-w-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-200/80 transition-colors hover:bg-slate-800 disabled:opacity-60 sm:order-2 sm:flex-1 sm:gap-3 sm:py-5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Saving…' : isSuperAdmin ? 'Record on ledger' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
