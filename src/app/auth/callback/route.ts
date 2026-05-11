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
      let redirectOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://finance.webauraindia.com'
      const h = await headers()
      const host = h.get('x-forwarded-host') || h.get('host')
      
      if (process.env.NODE_ENV !== 'production' && host?.includes('localhost')) {
        redirectOrigin = `http://${host}`
      }
      
      return NextResponse.redirect(`${redirectOrigin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
