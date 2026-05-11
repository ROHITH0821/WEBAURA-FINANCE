import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createStaticClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()
    
    // Use the static client which is already pointed to the 'finance' schema
    const supabase = createStaticClient()

    // 1. Fetch Request from the 'finance' schema
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

    // 2. Simple Verify (Plain text match for now to be safe)
    if (request.otp_secret !== otp) {
      return NextResponse.json({ error: `Incorrect code.` }, { status: 400 })
    }

    // 3. Success - Generate Supabase Magic Link
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (authError || !authData.properties) {
      console.error('Supabase Auth Error:', authError)
      return NextResponse.json({ error: 'Failed to initialize secure session.' }, { status: 500 })
    }

    // Cleanup
    await supabase.from('finance_otp_requests').delete().eq('email', normalizedEmail)

    const cookieStore = await cookies()
    cookieStore.set('founder_email', normalizedEmail, {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    })

    // Return the token_hash for client-side login
    const props = authData.properties as any
    return NextResponse.json({ 
      ok: true, 
      tokenHash: props.hashed_token || props.token_hash 
    })
  } catch (e: any) {
    console.error('Verify API Error:', e)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
