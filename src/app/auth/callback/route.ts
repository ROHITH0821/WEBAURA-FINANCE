import { createClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && user) {
      const h = await headers()
      const host = h.get('x-forwarded-host') || h.get('host')
      const proto = h.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
      
      let redirectOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://finance.webauraindia.com'
      
      if (host) {
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          redirectOrigin = `http://${host}`
        } else {
          redirectOrigin = `${proto}://${host}`
        }
      }
      
      return NextResponse.redirect(`${redirectOrigin}${next}`)
    }
  }

  // return the user to an error page with instructions
  const { origin: urlOrigin } = new URL(request.url)
  return NextResponse.redirect(`${urlOrigin}/login?error=Could not authenticate user`)
}
