'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import BackButton from '@/components/BackButton'
import { formatCurrency } from '@/lib/utils'
import { useAppRouter } from '@/hooks/useAppRouter'
import {
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

function formatDate(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return '—'
  const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
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

export default function RevenueAddonDetailClient(props: {
  addon: RevenueAddonRow
  canDelete: boolean
}) {
  const { push, refresh } = useAppRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [customCategories, setCustomCategories] = useState<{ slug: string; label: string }[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => rowToForm(props.addon))
  const [addon, setAddon] = useState(props.addon)

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const slug of REVENUE_ADDON_CATEGORIES) {
      map.set(slug, REVENUE_ADDON_CATEGORY_LABELS[slug])
    }
    const current = String(addon.category || '').trim().toLowerCase()
    if (current && !map.has(current)) {
      map.set(current, formatRevenueAddonCategoryLabel(current))
    }
    for (const c of customCategories) {
      map.set(c.slug, c.label)
    }
    return Array.from(map.entries())
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [addon.category, customCategories])

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

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await updateRevenueAddonAction({ id: addon.id, ...form })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setAddon({
        ...addon,
        title: form.title.trim(),
        category: slugifyRevenueAddonCategory(form.category),
        amount: Number(form.amount),
        received_date: form.received_date,
        transaction_ref: form.transaction_ref.trim() || null,
        notes: form.notes.trim() || null,
      })
      setEditing(false)
      refresh()
    })
  }

  function handleDelete() {
    if (!window.confirm('Remove this revenue add-on? This cannot be undone.')) return
    startTransition(async () => {
      const res = await deleteRevenueAddonAction(addon.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      push('/revenue/add-ons')
    })
  }

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <BackButton fallbackHref="/revenue/add-ons" label="Back to Add-ons" />
        <div className="flex flex-wrap gap-3">
          {!editing && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setForm(rowToForm(addon))
                setEditing(true)
                setError('')
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {props.canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={handleDelete}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-100 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={handleSave}
          className="glass-card space-y-5 border border-slate-200 bg-white p-5 md:p-8"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              Edit add-on
            </p>
            <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900">
              Update other revenue
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
                Reference
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
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Save changes
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditing(false)
                setError('')
                setForm(rowToForm(addon))
              }}
              className="rounded-xl border border-slate-200 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="glass-card space-y-8 bg-white p-6 md:p-10">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Add-on detail
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-slate-900 md:text-3xl">
                {addon.title}
              </h2>
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {formatRevenueAddonCategoryLabel(addon.category)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-3xl font-black tabular-nums tracking-tight text-emerald-600 md:text-4xl">
                {formatCurrency(addon.amount)}
              </p>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Amount received
              </p>
            </div>
          </div>

          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Received date
              </dt>
              <dd className="mt-2 text-sm font-bold text-slate-900">
                {formatDate(addon.received_date)}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Logged at
              </dt>
              <dd className="mt-2 text-sm font-bold text-slate-900">
                {formatDateTime(addon.logged_at || addon.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Reference
              </dt>
              <dd className="mt-2 text-sm font-bold text-slate-900">
                {addon.transaction_ref || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Added by
              </dt>
              <dd className="mt-2 break-all text-sm font-bold text-slate-900">
                {addon.added_by || '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Notes
              </dt>
              <dd className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                {addon.notes || '—'}
              </dd>
            </div>
          </dl>

          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
