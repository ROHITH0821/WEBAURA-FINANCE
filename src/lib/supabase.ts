'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // During `next build`, Next may evaluate client components on the server.
  // Avoid failing the build when env vars are not injected in that context.
  if (!url || !anon) {
    if (typeof window === 'undefined') {
      return createBrowserClient('http://localhost:54321', 'missing-env')
    }
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createBrowserClient(url, anon)
}

