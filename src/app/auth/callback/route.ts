import { createClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && user) {
      const h = await headers()
      const host = h.get('x-forwarded-host') || h.get('host') || origin
      const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
      const trueOrigin = host.includes('://') ? host : `${proto}://${host}`
      
      return NextResponse.redirect(`${trueOrigin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
