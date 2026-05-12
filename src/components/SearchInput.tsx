'use client'

import { Search } from 'lucide-react'
import * as navigation from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'

export default function SearchInput({ 
  placeholder = "Filter...", 
  paramName = "q",
  defaultValue = "" 
}: { 
  placeholder?: string
  paramName?: string
  defaultValue?: string
}) {
  const router = navigation.useRouter()
  const pathname = navigation.usePathname()
  const searchParams = navigation.useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== defaultValue) {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set(paramName, value)
        } else {
          params.delete(paramName)
        }
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`)
        })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [value, pathname, router, searchParams, defaultValue, paramName])

  return (
    <div className="relative w-full">
      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isPending ? 'text-slate-900 animate-pulse' : 'text-slate-400'}`} />
      <input 
        type="text" 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder} 
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs outline-none focus:border-slate-900 transition-all font-bold text-slate-900 placeholder:text-slate-400"
      />
    </div>
  )
}
