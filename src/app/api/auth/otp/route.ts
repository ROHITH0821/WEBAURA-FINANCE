import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Authorization Check
    const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (!authorizedEmails.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Access restricted to authorized personnel.' }, { status: 403 })
    }

    const supabase = createStaticClient()

    // 2. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // 3. Store in the 'finance' schema
    const { error: dbError } = await supabase
      .from('finance_otp_requests')
      .upsert({
        email: normalizedEmail,
        otp_secret: otp,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        updated_at: new Date().toISOString(),
      })

    if (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json({ error: 'Failed to store security code.' }, { status: 500 })
    }

    // 4. Send via Resend (Professional OTP Email)
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
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 12px;">
            <h2 style="color: #111; margin-bottom: 24px;">Finance Portal Access</h2>
            <p style="color: #666; font-size: 16px; line-height: 24px;">Use the code below to sign in to the WebAura Finance Portal.</p>
            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: `Email error: ${err.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: `System error: ${e.message}` }, { status: 500 })
  }
}
