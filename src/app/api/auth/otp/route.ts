import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Authorization Check (Founder Emails)
    const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (!authorizedEmails.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Access restricted to authorized personnel.' }, { status: 403 })
    }

    const supabase = createStaticClient()

    // 2. Trigger Supabase Native OTP
    // This sends a 6-digit code to the user's email
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false, // Only allow existing admins/founders
      }
    })

    if (error) {
      console.error('Supabase OTP Error:', error)
      return NextResponse.json({ error: `OTP Error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('OTP API Error:', e)
    return NextResponse.json({ error: `System error: ${e.message}` }, { status: 500 })
  }
}
