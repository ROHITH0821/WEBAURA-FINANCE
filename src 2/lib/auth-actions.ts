'use server'

import { createStaticClient } from '@/lib/supabaseServer'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Step 1: Send OTP via Resend
 */
export async function sendResendOTP(email: string) {
  const supabase = createStaticClient()
  const normalizedEmail = email.trim().toLowerCase()

  // 1. Check if email is in the authorized list from environment variables
  const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  const isAuthorized = authorizedEmails.includes(normalizedEmail)

  // 2. Fetch or Auto-provision founder profile
  let { data: founder, error: founderError } = await supabase
    .from('founder_profiles')
    .select('id, name')
    .eq('email', normalizedEmail)
    .single()

  if (founderError || !founder) {
    if (isAuthorized) {
      // Auto-provision if authorized but not in DB
      const { data: newFounder, error: insertError } = await supabase
        .from('founder_profiles')
        .insert({
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          role: normalizedEmail === 'rapakarohith8@gmail.com' ? 'super_admin' : 'founder'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Auto-provisioning error:', insertError)
        if (insertError.code === '42P01') {
          return { error: 'Database tables not found. Please run the MASTER_MIGRATION.sql in your Supabase SQL editor.' }
        }
        return { error: `Database error: ${insertError.message}` }
      }
      founder = newFounder
    } else {
      return { error: 'Access not authorized for this email.' }
    }
  }

  // Final check to satisfy TypeScript
  if (!founder) {
    return { error: 'Access not authorized for this email.' }
  }

  // 2. Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins

  // 3. Store OTP in DB
  const { error: updateError } = await supabase
    .from('founder_profiles')
    .update({
      otp_secret: otpHash,
      otp_expires_at: expiresAt,
      otp_attempts: 0
    })
    .eq('id', founder.id)

  if (updateError) {
    console.error('Failed to store OTP:', updateError)
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
            <div style="background: #000; width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="color: #fff; font-weight: bold; font-size: 14px;">WA</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.02em;">Finance Portal Access</h1>
            <p style="font-size: 14px; line-height: 1.5; color: #666; margin-bottom: 32px;">
              Hello ${founder.name.split(' ')[0]}, use the secure code below to access the WebAura Internal Finance Module.
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

  const { data: founder, error: founderError } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('email', normalizedEmail)
    .single()

  if (founderError || !founder) return { error: 'Verification failed' }

  // 1. Checks
  if (!founder.otp_secret || !founder.otp_expires_at) return { error: 'No access code requested' }
  if (new Date(founder.otp_expires_at) < new Date()) return { error: 'Access code has expired' }
  if (founder.otp_attempts >= 5) return { error: 'Too many attempts. Please request a new code.' }

  // 2. Verify Hash
  const isValid = await bcrypt.compare(otp, founder.otp_secret)

  if (!isValid) {
    const newAttempts = (founder.otp_attempts || 0) + 1
    await supabase.from('founder_profiles').update({ otp_attempts: newAttempts }).eq('id', founder.id)
    return { error: `Incorrect code. ${5 - newAttempts} attempts remaining.` }
  }

  // 3. Success - Generate Supabase Magic Link via Admin API
  // This allows us to use Resend for delivery but Supabase for the session
  const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` }
  })

  if (authError) {
    console.error('Auth Link Error:', authError)
    return { error: 'Failed to initialize secure session.' }
  }

  // 4. Cleanup OTP
  await supabase
    .from('founder_profiles')
    .update({ otp_secret: null, otp_expires_at: null, otp_attempts: 0 })
    .eq('id', founder.id)

  // 5. Success - Set a secure session cookie to satisfy the middleware
  const cookieStore = await cookies()
  const cookieDomain =
    process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN?.trim()
      ? process.env.COOKIE_DOMAIN.trim()
      : undefined
  cookieStore.set('dummy_auth', 'true', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })
  
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
