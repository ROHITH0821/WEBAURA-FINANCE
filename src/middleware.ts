import { type NextRequest } from 'next/server'
import { proxy } from './auth-proxy'

/**
 * Global Middleware for WebAura Finance
 * - Enforces 'finance' schema in Supabase context
 * - Refreshes Auth Sessions on every request
 * - Redirects unauthorized users to /login
 * - Prevents auth loops on production domains
 */
export async function middleware(request: NextRequest) {
  return await proxy(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .png, .jpg, .svg (images)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
