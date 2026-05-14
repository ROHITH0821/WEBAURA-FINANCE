'use client'

import { Search } from 'lucide-react'
import * as navigation from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SearchInput({ placeholder = "Search...", param = "q" }: { placeholder?: string, param?: string }) {
  const router = typeof navigation.useRouter === 'function' ? navigation.useRouter() : null
  const pathname = typeof navigation.usePathname === 'function' ? navigation.usePathname() : ''
  const searchParams = typeof navigation.useSearchParams === 'function' ? navigation.useSearchParams() : new URLSearchParams()
  const [value, setValue] = useState(searchParams?.get(param) || '')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchParams) return
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(param, value)
      } else {
        params.delete(param)
      }
      router?.push(`${pathname}?${params.toString()}`)
    }, 400)

    return () => clearTimeout(timer)
  }, [value, param, pathname, router, searchParams])

  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs outline-none focus:border-slate-900 transition-all font-medium"
      />
    </div>
  )
}
