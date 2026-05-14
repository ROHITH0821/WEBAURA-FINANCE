import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'
import bcrypt from 'bcryptjs'

const NO_STORE = { 'Cache-Control': 'no-store, private, must-revalidate' } as const

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()
    
    const supabase = createStaticClient()

    // 1. Verify OTP from our custom table
    const { data: request, error: fetchError } = await supabase
      .from('finance_otp_requests')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (fetchError || !request) {
      return NextResponse.json({ error: 'Session expired. Please request a new code.' }, { status: 400, headers: NO_STORE })
    }

    if (!request.otp_secret) {
      return NextResponse.json({ error: 'No active access code found.' }, { status: 400, headers: NO_STORE })
    }

    const isValid = await bcrypt.compare(otp, request.otp_secret)
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect code.' }, { status: 400, headers: NO_STORE })
    }

    // 2. Code is valid - Generate the official Supabase activation link
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (authError || !authData.properties?.action_link) {
      return NextResponse.json({ error: 'Failed to generate session link.' }, { status: 500, headers: NO_STORE })
    }

    // Cleanup
    await supabase.from('finance_otp_requests').delete().eq('email', normalizedEmail)

    // Return the tokenHash so the browser can log in without a redirect
    const props = authData.properties as any
    return NextResponse.json({ 
      ok: true, 
      tokenHash: props.hashed_token || props.token_hash,
      actionLink: props.action_link 
    }, { headers: NO_STORE })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500, headers: NO_STORE })
  }
}
