'use client'

import { useCallback } from 'react'
import * as navigation from 'next/navigation'

type NextRouter = ReturnType<typeof navigation.useRouter>

function canSafelyGoBack(fallbackHref: string): boolean {
  if (typeof window === 'undefined') return false
  if (window.history.length <= 1) return false

  const referrer = String(document.referrer || '')
  if (!referrer) return false

  try {
    const refUrl = new URL(referrer)
    if (refUrl.origin !== window.location.origin) return false
    // Avoid bouncing to the same page when fallback is intended.
    const fallbackPath = fallbackHref.split('?')[0]
    if (refUrl.pathname === window.location.pathname) return false
    if (fallbackPath && refUrl.pathname === fallbackPath) return true
    return true
  } catch {
    return false
  }
}

export function useAppRouter() {
  const router: NextRouter | null =
    typeof navigation.useRouter === 'function' ? navigation.useRouter() : null

  const back = useCallback(
    (fallbackHref: string) => {
      if (typeof window === 'undefined') return

      if (canSafelyGoBack(fallbackHref)) {
        if (router) router.back()
        else window.history.back()
        return
      }

      if (router) router.push(fallbackHref)
      else window.location.assign(fallbackHref)
    },
    [router],
  )

  const push = useCallback(
    (href: string) => {
      if (router) router.push(href)
      else if (typeof window !== 'undefined') window.location.assign(href)
    },
    [router],
  )

  const refresh = useCallback(() => {
    router?.refresh()
  }, [router])

  return { router, back, push, refresh }
}
