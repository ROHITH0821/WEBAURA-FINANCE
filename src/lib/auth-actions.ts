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
  let host = 'finance.webauraindia.com'
  try {
    const h = await headers()
    host = h.get('host') || host
  } catch (e) {
    // Build time or environment without headers
  }
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const origin = `${protocol}://${host}`

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
    return { error: 'Missing DB table `admin_users`. Run migration `018_finance_portal_admin_users.sql` in Supabase.' }
  }

  if (adminUser && adminUser.is_active === false) {
    return { error: 'Access not authorized for this email.' }
  }

  // Ensure Rohith is always super_admin (even if an old row exists as founder)
  if (adminUser && normalizedEmail === 'rapakarohith8@gmail.com') {
    await supabase
      .from('admin_users')
      .update({ role: 'super_admin', is_active: true })
      .eq('email', normalizedEmail)
  }

  // 2) Bootstrap allow-list (only when email is not yet in admin_users)
  const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isBootstrapAuthorized = authorizedEmails.includes(normalizedEmail)

  // If user exists in admin_users and is active → allow.
  // If not in admin_users → allow only if in bootstrap allow-list (then auto-provision below).
  if (!adminUser && !isBootstrapAuthorized) {
    return { error: 'Access not authorized for this email.' }
  }

  // Auto-provision admin_users on first login request (no manual DB seeding needed)
  if (!adminUser) {
    const isRohith = normalizedEmail === 'rapakarohith8@gmail.com'
    const { error: provisionError } = await supabase
      .from('admin_users')
      .insert({
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
        role: isRohith ? 'super_admin' : 'founder',
        is_active: true,
      })
    if (provisionError) {
      console.error('Admin user auto-provision error:', provisionError)
      if ((provisionError as any)?.code === '42P01') {
        return { error: 'Missing DB table `admin_users`. Run migration `018_finance_portal_admin_users.sql` in Supabase.' }
      }
      return { error: `Could not provision admin access: ${(provisionError as any)?.message || 'Unknown error'}` }
    }
  }

  // 2. Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins

  // 3. Store OTP in DB
  const { error: updateError } = await supabase
    .from('finance_otp_requests')
    .upsert({
      email: normalizedEmail,
      otp_secret: otpHash,
      otp_expires_at: expiresAt,
      otp_attempts: 0,
      updated_at: new Date().toISOString(),
    })

  if (updateError) {
    console.error('Failed to store OTP:', updateError)
    // Most common: migration not run yet
    if ((updateError as any)?.code === '42P01') {
      return { error: 'Missing DB table `finance_otp_requests`. Run migration `016_finance_portal_otp.sql` in Supabase.' }
    }
    return { error: 'Failed to generate secure access code. Please try again.' }
  }

  // 4. Send Email via Resend
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY is missing in environment variables')
      return { error: 'Email service configuration error. Please contact admin.' }
    }

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
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 40px; color: #1a2314;">
            <img
              src="${origin}/webaura-mark-light.png"
              width="44"
              height="44"
              alt="WebAura"
              style="display:block;margin:0 0 24px 0;object-fit:contain;"
            />
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.02em;">Finance Portal Access</h1>
            <p style="font-size: 14px; line-height: 1.5; color: #666; margin-bottom: 32px;">
              Hello ${(adminUser?.full_name || normalizedEmail.split('@')[0]).split(' ')[0]}, use the secure code below to access the WebAura Internal Finance Module.
            </p>
            <div style="background: #f7f7dc; padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 32px; border: 1px solid #efefd0;">
              <span style="font-family: ui-monospace, monospace; font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #000;">${otp}</span>
            </div>
            <p style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">
              Expires in 10 minutes • Internal Use Only
            </p>
          </div>
        `
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend API Error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    return { ok: true }
  } catch (err: any) {
    console.error('Resend OTP Error:', err)
    return { error: 'Failed to send verification code. Please try again.' }
  }
}

/**
 * Step 2: Verify OTP and provide Supabase Auth Link
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

  // 1. Checks
  if (!req.otp_secret || !req.otp_expires_at) return { error: 'No access code requested' }
  if (new Date(req.otp_expires_at) < new Date()) return { error: 'Access code has expired' }
  if (req.otp_attempts >= 5) return { error: 'Too many attempts. Please request a new code.' }

  // 2. Verify Hash
  const isValid = await bcrypt.compare(otp, req.otp_secret)

  if (!isValid) {
    const newAttempts = (req.otp_attempts || 0) + 1
    await supabase.from('finance_otp_requests').update({ otp_attempts: newAttempts, updated_at: new Date().toISOString() }).eq('email', normalizedEmail)
    return { error: `Incorrect code. ${5 - newAttempts} attempts remaining.` }
  }

  // 3. Success - Generate Supabase Magic Link via Admin API
  // This allows us to use Resend for delivery but Supabase for the session
  let host = 'finance.webauraindia.com'
  try {
    const h = await headers()
    host = h.get('host') || host
  } catch (e) {
    // Build time
  }
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const origin = `${protocol}://${host}`

  const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { 
      redirectTo: `${origin}/auth/callback`
    }
  })

  if (authError) {
    console.error('Auth Link Error:', authError)
    return { error: 'Failed to initialize secure session.' }
  }

  // 4. Cleanup OTP
  await supabase
    .from('finance_otp_requests')
    .update({ otp_secret: null, otp_expires_at: null, otp_attempts: 0, updated_at: new Date().toISOString() })
    .eq('email', normalizedEmail)

  // Store the founder email for UI convenience (Supabase session remains the source of truth).
  const cookieStore = await cookies()
  const cookieDomain =
    process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN?.trim()
      ? process.env.COOKIE_DOMAIN.trim()
      : undefined
  cookieStore.set('founder_email', normalizedEmail, {
    path: '/',
    httpOnly: false, // Accessible by client-side JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })

  // Return the magic link URL for the client to redirect to
  return { ok: true, redirectUrl: authData.properties.action_link }
}
