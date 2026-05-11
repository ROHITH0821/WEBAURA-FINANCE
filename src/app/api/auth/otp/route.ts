import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error (Supabase).' }, { status: 500 })
    }

    const supabase = createStaticClient()

    // 1. Authorization Check (Founder Emails)
    const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (!authorizedEmails.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Access restricted to authorized personnel.' }, { status: 403 })
    }

    // 2. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins

    // 3. Store in DB
    const { error: dbError } = await supabase
      .from('finance_otp_requests')
      .upsert({
        email: normalizedEmail,
        otp_secret: otp, // Simplified for now to ensure matching works perfectly
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        updated_at: new Date().toISOString(),
      })

    if (dbError) {
      console.error('DB Error Details:', dbError)
      // RETURN THE ACTUAL ERROR TO HELP US DEBUG
      return NextResponse.json({ 
        error: `Database Error: ${dbError.message}. Code: ${dbError.code}. Hint: ${dbError.hint || 'None'}` 
      }, { status: 500 })
    }

    // 4. Send via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WebAura Finance <info@webauraindia.com>',
        to: normalizedEmail,
        subject: `${otp} is your Finance Access Code`,
        html: `<div style="font-family:sans-serif;padding:40px;"><h1>${otp}</h1><p>Expires in 10 minutes.</p></div>`
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: `Email error: ${err.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('OTP API Error:', e)
    return NextResponse.json({ error: `System error: ${e.message}` }, { status: 500 })
  }
}
