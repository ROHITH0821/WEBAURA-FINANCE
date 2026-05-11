import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createStaticClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()
    const supabase = createStaticClient()

    // 1. Fetch Request
    const { data: request, error: fetchError } = await supabase
      .from('finance_otp_requests')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (fetchError || !request) {
      return NextResponse.json({ error: 'Session expired. Please request a new code.' }, { status: 400 })
    }

    if (new Date(request.otp_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access code has expired.' }, { status: 400 })
    }

    if (request.otp_attempts >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 400 })
    }

    // 2. Simple Verify (matching what's in DB)
    if (request.otp_secret !== otp) {
      const newAttempts = (request.otp_attempts || 0) + 1
      await supabase.from('finance_otp_requests').update({ otp_attempts: newAttempts }).eq('email', normalizedEmail)
      return NextResponse.json({ error: `Incorrect code. ${5 - newAttempts} attempts remaining.` }, { status: 400 })
    }

    // 3. Success - Generate Magic Link
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://finance.webauraindia.com'

    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: { redirectTo: `${origin}/auth/callback` }
    })

    if (authError) {
      return NextResponse.json({ error: 'Failed to initialize session.' }, { status: 500 })
    }

    // 4. Set cookie and cleanup
    const cookieStore = await cookies()
    cookieStore.set('founder_email', normalizedEmail, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 60 * 60 * 24 * 7
    })

    await supabase.from('finance_otp_requests').update({ otp_secret: null, otp_expires_at: null, otp_attempts: 0 }).eq('email', normalizedEmail)

    return NextResponse.json({ ok: true, redirectUrl: authData.properties.action_link })
  } catch (e: any) {
    console.error('Verify API Error:', e)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
