import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const normalizedEmail = email.trim().toLowerCase()

    // 1. ONLY check if the email is authorized
    const authorizedEmails = (process.env.FOUNDER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    if (!authorizedEmails.includes(normalizedEmail)) {
      return NextResponse.json({ error: 'Access restricted to authorized personnel.' }, { status: 403 })
    }

    // 2. Return OK - the client will now trigger the OTP itself
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: `System error: ${e.message}` }, { status: 500 })
  }
}
