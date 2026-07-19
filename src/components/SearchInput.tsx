'use client'

import { Search } from 'lucide-react'
import * as navigation from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function SearchInput({
  placeholder = 'Search...',
  param = 'q',
}: {
  placeholder?: string
  param?: string
}) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const pathname = typeof navigation.usePathname === 'function' ? navigation.usePathname() : ''
  const searchParams = typeof navigation.useSearchParams === 'function' ? navigation.useSearchParams() : new URLSearchParams()
  const [value, setValue] = useState(() => searchParams?.get(param) || '')
  const dirtyRef = useRef(false)
  const spKey = searchParams?.toString() ?? ''

  useEffect(() => {
    const fromUrl = new URLSearchParams(spKey).get(param) || ''
    if (dirtyRef.current) return
    setValue(fromUrl)
  }, [spKey, param])

  useEffect(() => {
    const trimmed = value.trim()
    const inUrl = new URLSearchParams(spKey).get(param) || ''
    if (trimmed === inUrl) {
      dirtyRef.current = false
      return
    }
    const timer = window.setTimeout(() => {
      const qs =
        typeof window !== 'undefined' ? window.location.search.slice(1) : spKey
      const params = new URLSearchParams(qs)
      if (trimmed) params.set(param, trimmed)
      else params.delete(param)
      const next = params.toString()
      const href = next ? `${pathname}?${next}` : pathname
      if (router) {
        router.replace(href, { scroll: false })
        router.refresh()
      } else if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state, '', href)
        window.location.assign(href)
      }
      dirtyRef.current = false
    }, 380)

    return () => window.clearTimeout(timer)
  }, [value, param, pathname, router, spKey])

  return (
    <div className="relative w-full min-w-0">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          dirtyRef.current = true
          setValue(e.target.value)
        }}
        placeholder={placeholder}
        className="box-border w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-xs font-medium outline-none transition-colors focus:border-slate-900"
      />
    </div>
  )
}
