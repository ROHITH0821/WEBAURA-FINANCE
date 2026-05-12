import { NextResponse } from 'next/server'
import { sendResendOTP } from '@/lib/auth-actions'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Call the server action that handles auth check, OTP generation, DB storage, and Resend email
    const result = await sendResendOTP(email)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: `System error: ${e.message}` }, { status: 500 })
  }
}
