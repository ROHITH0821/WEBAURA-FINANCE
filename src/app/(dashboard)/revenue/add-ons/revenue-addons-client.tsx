'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Eye,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  createRevenueAddonAction,
  deleteRevenueAddonAction,
  updateRevenueAddonAction,
} from '@/lib/revenue-addons/actions'
import {
  REVENUE_ADDON_CATEGORIES,
  REVENUE_ADDON_CATEGORY_LABELS,
  formatRevenueAddonCategoryLabel,
  slugifyRevenueAddonCategory,
  type RevenueAddonRow,
} from '@/lib/revenue-addons/types'
import { useAppRouter } from '@/hooks/useAppRouter'

function emptyForm() {
  return {
    title: '',
    category: 'other',
    amount: '',
    received_date: new Date().toISOString().slice(0, 10),
    transaction_ref: '',
    notes: '',
  }
}

function rowToForm(row: RevenueAddonRow) {
  return {
    title: row.title || '',
    category: String(row.category || 'other').trim().toLowerCase() || 'other',
    amount: String(row.amount ?? ''),
    received_date: String(row.received_date || '').slice(0, 10),
    transaction_ref: row.transaction_ref || '',
    notes: row.notes || '',
  }
}

function formatAddonWhen(row: RevenueAddonRow) {
  const logged = String(row.logged_at || '').trim()
  if (logged) {
    const d = new Date(logged)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    }
  }
  return row.received_date || '—'
}

export default function RevenueAddonsClient(props: {
  addons: RevenueAddonRow[]
  canDelete: boolean
  myEmail: string
}) {
  const { refresh } = useAppRouter()
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [customCategories, setCustomCategories] = useState<{ slug: string; label: string }[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  const total = useMemo(
    () => props.addons.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [props.addons],
  )

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of props.addons) {
      const key = row.category || 'other'
      map.set(key, (map.get(key) || 0) + Number(row.amount || 0))
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [props.addons])

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const slug of REVENUE_ADDON_CATEGORIES) {
      map.set(slug, REVENUE_ADDON_CATEGORY_LABELS[slug])
    }
    for (const row of props.addons) {
      const slug = String(row.category || '').trim().toLowerCase()
      if (!slug) continue
      if (!map.has(slug)) map.set(slug, formatRevenueAddonCategoryLabel(slug))
    }
    for (const c of customCategories) {
      map.set(c.slug, c.label)
    }
    return Array.from(map.entries())
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [props.addons, customCategories])

  function resetForm() {
    setForm(emptyForm())
    setEditingId(null)
    setShowNewCategory(false)
    setNewCategoryLabel('')
    setError('')
  }

  function openCreateForm() {
    resetForm()
    setShowForm(true)
  }

  function openEditForm(row: RevenueAddonRow) {
    setEditingId(row.id)
    setForm(rowToForm(row))
    setShowNewCategory(false)
    setNewCategoryLabel('')
    setError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleAddCategory() {
    const label = newCategoryLabel.trim()
    if (!label) return
    const slug = slugifyRevenueAddonCategory(label)
    setCustomCategories((prev) => {
      if (prev.some((c) => c.slug === slug)) return prev
      return [...prev, { slug, label }]
    })
    setForm((prev) => ({ ...prev, category: slug }))
    setNewCategoryLabel('')
    setShowNewCategory(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = editingId
        ? await updateRevenueAddonAction({ id: editingId, ...form })
        : await createRevenueAddonAction(form)
      if (!res.ok) {
        setError(res.error)
        return
      }
      resetForm()
      setShowForm(false)
      refresh()
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Remove this revenue add-on? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deleteRevenueAddonAction(id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      if (editingId === id) {
        resetForm()
        setShowForm(false)
      }
      refresh()
    })
  }

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-6 md:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href="/revenue"
            className="mt-0.5 shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Back to Revenue"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
              Revenue Add-ons
            </h2>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-[10px]">
              Other income — company total + equal founder share
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm()
              setShowForm(false)
            } else {
              openCreateForm()
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Close form' : 'Add revenue'}
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <div className="glass-card border-l-4 border-emerald-500 p-5 md:p-8">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Add-ons total
          </p>
          <h3 className="text-2xl font-black tabular-nums tracking-tight text-slate-900 md:text-3xl">
            {formatCurrency(total)}
          </h3>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Included in company Total Revenue
          </p>
        </div>
        <div className="glass-card border-l-4 border-slate-900 p-5 md:p-8">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Entries
          </p>
          <h3 className="text-2xl font-black tabular-nums tracking-tight text-slate-900 md:text-3xl">
            {props.addons.length}
          </h3>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            All other revenue lives here
          </p>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([cat, amount]) => (
            <div
              key={cat}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600"
            >
              {formatRevenueAddonCategoryLabel(cat)}
              <span className="ml-2 tabular-nums text-slate-900">{formatCurrency(amount)}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="glass-card space-y-5 border border-slate-200 bg-white p-5 md:p-8"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              {editingId ? 'Edit add-on' : 'New add-on'}
            </p>
            <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900">
              {editingId ? 'Update other revenue' : 'Log other revenue'}
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Title
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Domain reseller commission, bank interest"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {showNewCategory ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="New category name"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={!newCategoryLabel.trim()}
                      onClick={handleAddCategory}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      Add
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

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Amount (₹)
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Received date
              </label>
              <input
                required
                type="date"
                value={form.received_date}
                onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Reference <span className="normal-case tracking-normal text-slate-400">(optional)</span>
              </label>
              <input
                value={form.transaction_ref}
                onChange={(e) => setForm({ ...form, transaction_ref: e.target.value })}
                placeholder="UTR / invoice / note"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Notes <span className="normal-case tracking-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Anything else to remember"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingId ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingId ? 'Save changes' : 'Save add-on'}
          </button>
        </form>
      )}

      <div className="glass-card overflow-hidden bg-white">
        <div className="border-b border-slate-100 px-5 py-4 md:px-8 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            All add-ons
          </p>
        </div>

        {props.addons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
              <Wallet className="h-6 w-6 text-slate-200" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
              No add-ons yet
            </p>
            <p className="max-w-sm text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Log freelance, interest, refunds, commissions — anything outside projects & recurring
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {props.addons.map((row) => (
              <article
                key={row.id}
                className="flex flex-col gap-3 px-5 py-5 transition-colors hover:bg-[#f7f7dc]/20 sm:flex-row sm:items-start sm:justify-between md:px-8"
              >
                <div className="min-w-0">
                  <Link
                    href={`/revenue/add-ons/${row.id}`}
                    className="font-black uppercase tracking-tight text-slate-900 transition-colors hover:text-emerald-700"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {formatRevenueAddonCategoryLabel(row.category)}
                    {' · '}
                    {formatAddonWhen(row)}
                    {row.transaction_ref ? ` · ${row.transaction_ref}` : ''}
                  </p>
                  {row.notes ? (
                    <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-500">{row.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <p className="text-lg font-black tabular-nums text-emerald-600 md:text-xl">
                    {formatCurrency(row.amount)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/revenue/add-ons/${row.id}`}
                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                    >
                      <Eye className="h-3 w-3" />
                      Details
                    </Link>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => openEditForm(row)}
                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 disabled:opacity-40"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    {props.canDelete && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDelete(row.id)}
                        className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
