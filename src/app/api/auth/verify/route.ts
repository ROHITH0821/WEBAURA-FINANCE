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

    // 2. Simple Verify
    if (request.otp_secret !== otp) {
      const newAttempts = (request.otp_attempts || 0) + 1
      await supabase.from('finance_otp_requests').update({ otp_attempts: newAttempts }).eq('email', normalizedEmail)
      return NextResponse.json({ error: `Incorrect code. ${5 - newAttempts} attempts remaining.` }, { status: 400 })
    }

    // 3. Success - Generate Supabase Link and Extract Token Hash
    // We generate a link but we won't use it for redirection. 
    // We'll extract the token_hash to perform a client-side login.
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (authError || !authData.properties?.hashed_token) {
      console.error('Supabase Link Error:', authError)
      return NextResponse.json({ error: 'Failed to initialize secure session.' }, { status: 500 })
    }

    // 4. Set helper cookie
    const cookieStore = await cookies()
    cookieStore.set('founder_email', normalizedEmail, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    })

    await supabase.from('finance_otp_requests').update({ otp_secret: null, otp_expires_at: null, otp_attempts: 0 }).eq('email', normalizedEmail)

    // Return the token_hash so the client can sign in without a redirect
    return NextResponse.json({ 
      ok: true, 
      tokenHash: authData.properties.hashed_token 
    })
  } catch (e: any) {
    console.error('Verify API Error:', e)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
