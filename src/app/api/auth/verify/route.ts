import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()
    
    const supabase = createStaticClient()

    // 1. Fetch OTP Request from 'finance' schema
    const { data: request, error: fetchError } = await supabase
      .from('finance_otp_requests')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (fetchError || !request) {
      return NextResponse.json({ error: 'Session expired or not found.' }, { status: 400 })
    }

    if (new Date(request.otp_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Access code has expired.' }, { status: 400 })
    }

    if (request.otp_secret !== otp) {
      return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 })
    }

    // 2. Code is valid - Generate a real Supabase session token
    // Note: generateLink is part of auth.admin and is schema-independent
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (authError || !authData.properties) {
      console.error('Supabase Session Error:', authError)
      return NextResponse.json({ error: 'Failed to create secure session.' }, { status: 500 })
    }

    // Cleanup OTP
    await supabase.from('finance_otp_requests').delete().eq('email', normalizedEmail)

    // Return the token_hash to the client
    const props = authData.properties as any
    return NextResponse.json({ 
      ok: true, 
      tokenHash: props.hashed_token || props.token_hash 
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
