import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createStaticClient } from '@/lib/supabaseServer'
import crypto from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Validate Founder Identity
    const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (!authorizedEmails.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Access restricted to authorized personnel.' }, { status: 403 })
    }

    // 2. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins

    // 3. Store in Supabase
    const supabase = createStaticClient()
    const { error: dbError } = await supabase
      .from('finance_otp_requests')
      .upsert({ 
        email: normalizedEmail, 
        otp_secret: otp, // In production, consider hashing this
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })

    if (dbError) {
      console.error('DB Error:', dbError)
      return NextResponse.json({ error: 'Failed to generate access code.' }, { status: 500 })
    }

    // 4. Send Email via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service configuration missing.' }, { status: 500 })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'info@webauraindia.com',
        to: normalizedEmail,
        subject: `${otp} is your Finance Portal access code`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1a202c;">
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Access Verification</h2>
            <p style="font-size: 16px; margin-bottom: 30px;">Enter the following code to enter the WebAura Finance Portal:</p>
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em; padding: 20px; background: #f7f7dc; border-radius: 12px; display: inline-block;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #718096; margin-top: 40px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `
      })
    })

    if (!resendRes.ok) {
      const err = await resendRes.json()
      console.error('Resend Error:', err)
      return NextResponse.json({ error: 'Failed to deliver access code.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('OTP API Error:', e)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
