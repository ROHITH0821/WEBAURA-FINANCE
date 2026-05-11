'use server'

import { createStaticClient } from '@/lib/supabaseServer'
import { revalidateTag } from 'next/cache'
import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Step 1: Send OTP via Resend
 */
export async function sendResendOTP(email: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Server is not configured (missing Supabase URL or Service Role Key).' }
  }

  const supabase = createStaticClient()
  const normalizedEmail = email.trim().toLowerCase()

  // 1) Primary authorization is via DB (Team Settings)
  const { data: adminUser, error: adminLookupErr } = await supabase
    .from('admin_users')
    .select('full_name,email,is_active')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (adminLookupErr && (adminLookupErr as any)?.code === '42P01') {
    return { error: 'Missing DB table `admin_users`.' }
  }

  if (adminUser && adminUser.is_active === false) {
    return { error: 'Access not authorized for this email.' }
  }

  // 2) Bootstrap allow-list
  const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isBootstrapAuthorized = authorizedEmails.includes(normalizedEmail)

  if (!adminUser && !isBootstrapAuthorized) {
    return { error: 'Access not authorized for this email.' }
  }

  // Auto-provision
  if (!adminUser) {
    const isRohith = normalizedEmail === 'rapakarohith8@gmail.com'
    await supabase.from('admin_users').insert({
      email: normalizedEmail,
      full_name: normalizedEmail.split('@')[0],
      role: isRohith ? 'super_admin' : 'founder',
      is_active: true,
    })
  }

  // 2. Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  // 3. Store OTP in DB
  await supabase.from('finance_otp_requests').upsert({
    email: normalizedEmail,
    otp_secret: otpHash,
    otp_expires_at: expiresAt,
    otp_attempts: 0,
    updated_at: new Date().toISOString(),
  })

  // 4. Send Email via Resend
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return { error: 'Email service configuration error.' }

    await fetch('https://api.resend.com/emails', {
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
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 40px; color: #1a2314;">
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; text-transform: uppercase;">Finance Portal Access</h1>
            <div style="background: #f7f7dc; padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 32px; border: 1px solid #efefd0;">
              <span style="font-family: ui-monospace, monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #000;">${otp}</span>
            </div>
            <p style="font-size: 11px; color: #999; text-transform: uppercase; text-align: center;">Expires in 10 minutes</p>
          </div>
        `
      }),
    })

    return { ok: true }
  } catch (err: any) {
    return { error: 'Failed to send verification code.' }
  }
}

/**
 * Step 2: Verify OTP and provide Token Hash (Redirect-less login)
 */
export async function verifyResendOTP(email: string, otp: string) {
  const supabase = createStaticClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data: req, error: reqError } = await supabase
    .from('finance_otp_requests')
    .select('*')
    .eq('email', normalizedEmail)
    .single()

  if (reqError || !req) return { error: 'Verification failed' }

  if (!req.otp_secret || !req.otp_expires_at) return { error: 'No access code requested' }
  if (new Date(req.otp_expires_at) < new Date()) return { error: 'Access code has expired' }
  
  const isValid = await bcrypt.compare(otp, req.otp_secret)
  if (!isValid) return { error: 'Incorrect code.' }

  // 3. Success - Generate Token Hash for Client-Side Verification (Bypass Supabase Redirect)
  const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
  })

  if (authError || !authData.properties?.hashed_token) {
    return { error: 'Failed to initialize session.' }
  }

  // Cleanup
  await supabase.from('finance_otp_requests').update({ otp_secret: null, otp_expires_at: null, otp_attempts: 0 }).eq('email', normalizedEmail)

  const cookieStore = await cookies()
  cookieStore.set('founder_email', normalizedEmail, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })

  const props = authData.properties as any
  return { ok: true, tokenHash: props.hashed_token || props.token_hash }
}
