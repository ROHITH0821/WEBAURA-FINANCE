import { NextResponse } from 'next/server'
import { sendResendOTP } from '@/lib/auth-actions'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400, headers: { 'Cache-Control': 'no-store, private, must-revalidate' } })
    }

    // Call the server action that handles auth check, OTP generation, DB storage, and Resend email
    const result = await sendResendOTP(email)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403, headers: { 'Cache-Control': 'no-store, private, must-revalidate' } })
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, private, must-revalidate' } })
  } catch (e: any) {
    return NextResponse.json({ error: `System error: ${e.message}` }, { status: 500, headers: { 'Cache-Control': 'no-store, private, must-revalidate' } })
  }
}
