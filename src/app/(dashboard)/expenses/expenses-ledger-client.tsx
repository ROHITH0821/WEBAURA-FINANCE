'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Filter, Plus, Search } from 'lucide-react'
import ExpenseRow from '@/components/ExpenseRow'
import { formatCurrency, sortExpensesNewestFirst } from '@/lib/utils'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/types/finance'

type ExpenseRowData = Record<string, unknown> & {
  id: string
  status?: string | null
  requested_by?: string | null
  spent_on?: string | null
  category?: string | null
  custom_category_label?: string | null
  transaction_ref?: string | null
  agency_id?: string | null
  amount?: number | string | null
  logged_at?: string | null
  paid_at?: string | null
  created_at?: string | null
  request_date?: string | null
}

function normalizeExpenseCategory(category: string | null | undefined) {
  const value = String(category || '').trim().toLowerCase()
  return value || 'miscellaneous'
}

function defaultFilters(defaultView: 'all' | 'mine') {
  return {
    view: defaultView,
    status: 'all',
    founder: '',
    category: '',
    agency: '',
    q: '',
  }
}

function readFiltersFromUrl(defaultView: 'all' | 'mine') {
  if (typeof window === 'undefined') return defaultFilters(defaultView)
  const sp = new URLSearchParams(window.location.search)
  const rawView = sp.get('view')
  return {
    view: (rawView === 'mine' || rawView === 'all' ? rawView : defaultView) as 'all' | 'mine',
    status: sp.get('status') || 'all',
    founder: sp.get('founder') || '',
    category: sp.get('category') || '',
    agency: sp.get('agency') || '',
    q: sp.get('q') || '',
  }
}

export default function ExpensesLedgerClient(props: {
  expenses: ExpenseRowData[]
  myEmail: string
  canViewTeamLedger: boolean
  lockOrgWideView?: boolean
  defaultView: 'all' | 'mine'
  isNormalAdmin: boolean
  isSuperAdmin: boolean
  isFounder: boolean
  canApproveAndPay: boolean
  canDelete: boolean
  totalPaid: number
  founders: { email: string; name: string; role?: string }[]
  teamMembers: { email: string; name: string; role?: string }[]
  agencies: { id: string; name: string }[]
  categories: { slug: string; label: string }[]
  agencyNameById: Record<string, string>
  currentUserEmail?: string
}) {
  const lockedDefaultView = props.lockOrgWideView ? 'all' : props.defaultView
  const [view, setViewState] = useState<'all' | 'mine'>(lockedDefaultView)
  const [status, setStatus] = useState('all')
  const [founder, setFounder] = useState('')
  const [category, setCategory] = useState('')
  const [agency, setAgency] = useState('')
  const [qDraft, setQDraft] = useState('')
  const [q, setQ] = useState('')
  const qDirtyRef = useRef(false)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const initial = readFiltersFromUrl(lockedDefaultView)
    setViewState(props.lockOrgWideView ? 'all' : initial.view)
    setStatus(initial.status)
    setFounder(initial.founder)
    setCategory(initial.category)
    setAgency(initial.agency)
    setQDraft(initial.q)
    setQ(initial.q)
  }, [lockedDefaultView, props.lockOrgWideView])

  const syncUrl = useCallback(
    (next: {
      view: string
      status: string
      founder: string
      category: string
      agency: string
      q: string
    }) => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams()
      if (props.canViewTeamLedger && !props.lockOrgWideView && next.view !== props.defaultView) {
        params.set('view', next.view)
      }
      if (next.status && next.status !== 'all') params.set('status', next.status)
      if (next.founder) params.set('founder', next.founder)
      if (next.category) params.set('category', next.category)
      if (next.agency) params.set('agency', next.agency)
      if (next.q.trim()) params.set('q', next.q.trim())
      const qs = params.toString()
      const href = qs ? `/expenses?${qs}` : '/expenses'
      window.history.replaceState(window.history.state, '', href)
    },
    [props.canViewTeamLedger, props.lockOrgWideView, props.defaultView],
  )

  useEffect(() => {
    const trimmed = qDraft.trim()
    if (trimmed === q) {
      qDirtyRef.current = false
      return
    }
    const t = window.setTimeout(() => {
      setQ(trimmed)
      qDirtyRef.current = false
    }, 220)
    return () => window.clearTimeout(t)
  }, [qDraft, q])

  useEffect(() => {
    syncUrl({ view, status, founder, category, agency, q })
  }, [view, status, founder, category, agency, q, syncUrl])

  const categoryOptions = useMemo(() => {
    if (props.categories.length > 0) return props.categories
    return EXPENSE_CATEGORIES.map((slug) => ({
      slug,
      label: EXPENSE_CATEGORY_LABELS[slug],
    }))
  }, [props.categories])

  const memberOptions = useMemo(
    () =>
      (props.teamMembers || []).map((f) => ({
        email: f.email.toLowerCase(),
        name: f.role === 'admin' ? `${f.name} (admin)` : f.name,
      })),
    [props.teamMembers],
  )

  const effectiveView = props.lockOrgWideView
    ? 'all'
    : props.isFounder
      ? 'mine'
      : props.canViewTeamLedger
        ? view
        : 'mine'

  const effectiveFounder =
    effectiveView === 'all' && founder
      ? founder.toLowerCase()
      : effectiveView === 'mine'
        ? props.myEmail
        : ''

  const filteredExpenses = useMemo(() => {
    const searchParam = q.toLowerCase()
    const filtered = props.expenses.filter((e) => {
      const st = String(e.status || '').toLowerCase()
      const who = String(e.requested_by || '').toLowerCase()
      const desc = String(e.spent_on || '').toLowerCase()
      const cat = normalizeExpenseCategory(e.category)
      const customCat = String(e.custom_category_label || '').toLowerCase()
      const ref = String(e.transaction_ref || '').toLowerCase()
      const agencyName = String(
        e.agency_id ? props.agencyNameById[String(e.agency_id)] || '' : '',
      ).toLowerCase()

      if (status !== 'all' && st !== status) return false

      if (effectiveView === 'mine') {
        if (who !== props.myEmail) return false
      } else if (effectiveFounder) {
        if (who !== effectiveFounder) return false
      }

      if (category && cat !== category.toLowerCase()) return false
      if (agency && String(e.agency_id || '') !== agency) return false

      if (searchParam) {
        const match =
          desc.includes(searchParam) ||
          cat.includes(searchParam) ||
          customCat.includes(searchParam) ||
          ref.includes(searchParam) ||
          who.includes(searchParam) ||
          agencyName.includes(searchParam)
        if (!match) return false
      }

      return true
    })
    // Same day → latest logged time on top; older rows stay in the list below.
    return sortExpensesNewestFirst(filtered)
  }, [
    props.expenses,
    props.myEmail,
    props.agencyNameById,
    status,
    effectiveView,
    effectiveFounder,
    category,
    agency,
    q,
  ])

  const filteredPaid = useMemo(
    () =>
      filteredExpenses
        .filter((e) => String(e.status || '').toLowerCase() === 'paid')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filteredExpenses],
  )

  const pendingCount = useMemo(
    () => filteredExpenses.filter((e) => String(e.status || '').toLowerCase() === 'pending').length,
    [filteredExpenses],
  )

  const filtersActive =
    effectiveView !== props.defaultView ||
    status !== 'all' ||
    Boolean(founder) ||
    Boolean(category) ||
    Boolean(agency) ||
    Boolean(q)

  const contributionLabel =
    effectiveView === 'mine'
      ? 'My Contribution'
      : effectiveFounder
        ? 'Member Contribution'
        : props.isNormalAdmin
          ? 'Team Total'
          : 'All Team'

  function clearFilters() {
    setViewState(props.defaultView)
    setStatus('all')
    setFounder('')
    setCategory('')
    setAgency('')
    setQDraft('')
    setQ('')
  }

  return (
    <div className="mx-auto min-w-0 max-w-full space-y-6 md:space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2 uppercase">
            Expense Tracker
          </h2>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
            {props.canViewTeamLedger
              ? props.isNormalAdmin
                ? 'Same team ledger as super admin — all founders & admins'
                : 'Team-wide expense ledger — all founders & admins'
              : props.isFounder
                ? 'Your reimbursement requests & paid expenses'
                : 'Categorized expenditure & reimbursement logs'}
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="px-8 py-4 rounded-2xl bg-slate-900 text-white text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 flex items-center gap-3"
        >
          <Plus className="w-4 h-4" />
          {props.isSuperAdmin ? 'Log expense' : 'Submit expense request'}
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 md:gap-8">
        <div className="glass-card min-w-0 border-l-4 border-slate-900 p-4 sm:p-5 md:p-8">
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] md:mb-2 md:text-[10px] md:tracking-[0.2em]">
            Total Ledger
          </p>
          <h3 className="break-words text-lg font-black tabular-nums tracking-tight text-slate-900 sm:text-xl md:text-2xl lg:text-3xl">
            {formatCurrency(props.totalPaid)}
          </h3>
        </div>
        <div className="glass-card min-w-0 border-l-4 border-emerald-500 p-4 sm:p-5 md:p-8">
          <p className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] md:mb-2 md:text-[10px] md:tracking-[0.2em]">
            {contributionLabel}
          </p>
          <h3 className="break-words text-lg font-black tabular-nums tracking-tight text-slate-900 sm:text-xl md:text-2xl lg:text-3xl">
            {formatCurrency(filteredPaid)}
          </h3>
        </div>
        <div className="glass-card col-span-2 w-[calc((100%-0.75rem)/2)] max-w-full justify-self-center border-l-4 border-amber-500 p-4 sm:p-5 md:col-span-1 md:w-full md:max-w-none md:justify-self-stretch md:p-8">
          <p className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[9px] md:mb-2 md:text-left md:text-[10px] md:tracking-[0.2em]">
            Pending Requests
          </p>
          <h3 className="text-center text-lg font-black tabular-nums tracking-tight text-slate-900 sm:text-xl md:text-left md:text-2xl lg:text-3xl">
            {pendingCount} Pending
          </h3>
        </div>
      </div>

      <div className="glass-card min-w-0 overflow-hidden bg-white">
        <div className="border-b border-slate-100 p-4 md:p-8">
          <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              {props.canViewTeamLedger &&
                (props.lockOrgWideView ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                      Team ledger (all)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewState('mine')
                        setFounder('')
                      }}
                      className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                        view === 'mine' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Mine
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewState('all')}
                      className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                        view === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All
                    </button>
                  </div>
                ))}

              {props.canViewTeamLedger && view === 'all' && !props.lockOrgWideView && (
                <div>
                  <p className="mb-2 ml-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Team member
                  </p>
                  <select
                    value={founder}
                    onChange={(e) => setFounder(e.target.value)}
                    className="box-border w-full min-w-0 max-w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 sm:min-w-[220px]"
                  >
                    <option value="">Everyone</option>
                    {memberOptions.map((f) => (
                      <option key={f.email} value={f.email}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {props.canViewTeamLedger && props.lockOrgWideView && (
                <div>
                  <p className="mb-2 ml-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Team member
                  </p>
                  <select
                    value={founder}
                    onChange={(e) => setFounder(e.target.value)}
                    className="box-border w-full min-w-0 max-w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 sm:min-w-[220px]"
                  >
                    <option value="">Everyone</option>
                    {memberOptions.map((f) => (
                      <option key={f.email} value={f.email}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <p className="mb-2 ml-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Status</p>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="min-w-[140px] appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 sm:min-w-[160px]"
                >
                  <option value="all">all</option>
                  <option value="paid">paid</option>
                  <option value="pending">pending</option>
                </select>
              </div>

              <div>
                <p className="mb-2 ml-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Category</p>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="min-w-[140px] appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 sm:min-w-[160px]"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {props.agencies.length > 0 && (
                <div>
                  <p className="mb-2 ml-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Agency</p>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="box-border w-full min-w-0 max-w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 sm:min-w-[180px]"
                  >
                    <option value="">All agencies</option>
                    {props.agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="relative w-full min-w-0 lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={qDraft}
                onChange={(e) => {
                  qDirtyRef.current = true
                  setQDraft(e.target.value)
                }}
                autoComplete="off"
                placeholder="Filter by description, category, ref, or email…"
                className="box-border w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-xs font-medium outline-none transition-colors focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="min-w-0">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                founders={props.founders}
                agencyName={
                  expense.agency_id ? props.agencyNameById[String(expense.agency_id)] : undefined
                }
                canApproveAndPay={props.canApproveAndPay}
                canDelete={props.canDelete}
                currentUserEmail={props.currentUserEmail}
              />
            ))
          ) : (
            <div className="px-6 py-16 text-center md:px-10 md:py-24">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <Filter className="h-6 w-6 text-slate-200" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-900">
                    {filtersActive ? 'No matching results' : 'Empty Ledger'}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {filtersActive
                      ? 'Try adjusting your filters or search query'
                      : props.canViewTeamLedger
                        ? 'No team expenses yet — submissions from founders and admins will appear here'
                        : 'Submit a request from Expenses or Requests — it will appear here'}
                  </p>
                </div>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 border-b-2 border-slate-900 pb-0.5 text-[9px] font-black uppercase text-slate-900"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
