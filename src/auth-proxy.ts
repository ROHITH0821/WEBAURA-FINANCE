import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  const cookieDomain =
    process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN?.trim()
      ? process.env.COOKIE_DOMAIN.trim()
      : undefined

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'finance' }, // Force 'finance' schema
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // 1. Allow public routes and auth APIs
  if (
    pathname.startsWith('/login') || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // static files (favicon, images, etc.)
  ) {
    // Redirect logged in users away from login page (unless they need to recover from forbidden/disabled)
    if (pathname === '/login' && user) {
      const err = request.nextUrl.searchParams.get('error')
      if (err !== 'forbidden') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    return response
  }

  // 2. Protect all other routes
  if (!user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}
