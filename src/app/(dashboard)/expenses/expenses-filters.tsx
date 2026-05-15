'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import * as navigation from 'next/navigation'

export default function ExpensesFilters(props: {
  /** Super admin + normal admin: org-wide ledger filters */
  canViewTeamLedger: boolean
  /** Normal admin: locked to org-wide view (same rows as super admin All). */
  lockOrgWideView?: boolean
  teamMembers: { email: string; name: string; role?: string }[]
  current: { view: 'all' | 'mine'; status: string; founder: string; q: string }
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const pathname = typeof navigation.usePathname === 'function' ? navigation.usePathname() : '/'
  const sp = typeof navigation.useSearchParams === 'function' ? navigation.useSearchParams() : new URLSearchParams()

  const [qDraft, setQDraft] = useState(() => props.current.q || '')
  const qDirtyRef = useRef(false)

  const memberOptions = useMemo(() => {
    return (props.teamMembers || []).map((f) => ({
      email: f.email.toLowerCase(),
      name: f.role === 'admin' ? `${f.name} (admin)` : f.name,
    }))
  }, [props.teamMembers])

  const spKey = sp.toString()

  /** URL changed externally (clear filters, history): sync search box when user is not mid-edit. */
  useEffect(() => {
    const fromUrl = new URLSearchParams(spKey).get('q') || ''
    if (qDirtyRef.current) return
    setQDraft(fromUrl)
  }, [spKey])

  const applyQuery = useCallback(
    (next: URLSearchParams, mode: 'push' | 'replace') => {
      const qs = next.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      if (mode === 'replace') router?.replace(href, { scroll: false })
      else router?.push(href, { scroll: false })
    },
    [pathname, router]
  )

  /** Normal admin: always org-wide URL (matches server effectiveView). */
  useEffect(() => {
    if (!props.lockOrgWideView) return
    const next = new URLSearchParams(spKey)
    if (next.get('view') === 'mine') {
      next.set('view', 'all')
      applyQuery(next, 'replace')
    }
  }, [props.lockOrgWideView, spKey, applyQuery])

  /** Base params from current URL, always overlay latest search draft so filter changes never drop pending text. */
  const baseParams = useCallback(() => {
    const next = new URLSearchParams(sp.toString())
    const trimmed = qDraft.trim()
    if (trimmed) next.set('q', trimmed)
    else next.delete('q')
    return next
  }, [sp, qDraft])

  function setParam(key: string, value: string) {
    const next = baseParams()
    if (!value) next.delete(key)
    else next.set(key, value)
    applyQuery(next, 'push')
  }

  useEffect(() => {
    const trimmed = qDraft.trim()
    const inUrl = new URLSearchParams(spKey).get('q') || ''
    if (trimmed === inUrl) {
      qDirtyRef.current = false
      return
    }
    const t = window.setTimeout(() => {
      const qs =
        typeof window !== 'undefined' ? window.location.search.slice(1) : spKey
      const next = new URLSearchParams(qs)
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      applyQuery(next, 'replace')
      qDirtyRef.current = false
    }, 320)
    return () => window.clearTimeout(t)
  }, [qDraft, spKey, applyQuery])

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
      <div className="flex flex-wrap items-end gap-3">
        {props.canViewTeamLedger &&
          (props.lockOrgWideView ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Team ledger (all)</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setParam('view', 'mine')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                  props.current.view === 'mine' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Mine
              </button>
              <button
                type="button"
                onClick={() => setParam('view', 'all')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                  props.current.view === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All
              </button>
            </div>
          ))}

        {props.canViewTeamLedger && props.current.view === 'all' && (
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1 mb-2">Team member</p>
            <select
              value={props.current.founder || ''}
              onChange={(e) => setParam('founder', e.target.value)}
              className="box-border min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none sm:min-w-[220px]"
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
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1 mb-2">Status</p>
          <select
            value={props.current.status}
            onChange={(e) => setParam('status', e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none min-w-[140px] sm:min-w-[160px]"
          >
            <option value="paid">paid</option>
            <option value="pending">pending</option>
            <option value="all">all</option>
          </select>
        </div>
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
          onBlur={() => {
            qDirtyRef.current = false
          }}
          placeholder="Filter by description, category, ref, or email…"
          className="box-border w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-xs font-medium outline-none transition-colors focus:border-slate-900"
        />
      </div>
    </div>
  )
}
