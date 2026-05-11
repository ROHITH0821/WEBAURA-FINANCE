import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'

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
      return NextResponse.json({ error: 'Session expired. Please request a new code.' }, { status: 400 })
    }

    if (request.otp_secret !== otp) {
      return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 })
    }

    // 2. Code is valid - Generate the official Supabase activation link
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (authError || !authData.properties?.action_link) {
      return NextResponse.json({ error: 'Failed to generate session link.' }, { status: 500 })
    }

    // Cleanup
    await supabase.from('finance_otp_requests').delete().eq('email', normalizedEmail)

    // Return the action_link so the browser can "ping" it to log in
    return NextResponse.json({ 
      ok: true, 
      actionLink: authData.properties.action_link 
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
