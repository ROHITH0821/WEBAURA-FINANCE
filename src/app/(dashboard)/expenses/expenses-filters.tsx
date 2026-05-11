'use client'

import { useMemo } from 'react'
import * as navigation from 'next/navigation'

export default function ExpensesFilters(props: {
  isSuperAdmin: boolean
  founders: { email: string; name: string }[]
  current: { view: 'all' | 'mine'; status: string; founder: string }
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const pathname = typeof navigation.usePathname === 'function' ? navigation.usePathname() : '/'
  const sp = typeof navigation.useSearchParams === 'function' ? navigation.useSearchParams() : new URLSearchParams()

  const founderOptions = useMemo(() => {
    return (props.founders || []).map((f) => ({ email: f.email.toLowerCase(), name: f.name }))
  }, [props.founders])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString())
    if (!value) next.delete(key)
    else next.set(key, value)
    router?.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {props.isSuperAdmin && (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setParam('view', 'mine')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              props.current.view === 'mine' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Mine
          </button>
          <button
            type="button"
            onClick={() => setParam('view', 'all')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              props.current.view === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All
          </button>
        </div>
      )}

      {props.isSuperAdmin && props.current.view === 'all' && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1 mb-2">Founder</p>
          <select
            value={props.current.founder || ''}
            onChange={(e) => setParam('founder', e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none min-w-[220px]"
          >
            <option value="">All founders</option>
            {founderOptions.map((f) => (
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
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400 appearance-none min-w-[160px]"
        >
          <option value="paid">paid</option>
          <option value="pending">pending</option>
          <option value="rejected">rejected</option>
          <option value="all">all</option>
        </select>
      </div>
    </div>
  )
}

