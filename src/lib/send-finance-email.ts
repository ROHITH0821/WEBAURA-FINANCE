/** Transactional emails (Resend) — same env vars as OTP flow. */

export function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendFinanceTransactionalEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('sendFinanceTransactionalEmail: RESEND_API_KEY missing; email skipped.')
    return { ok: false, error: 'Email not configured' }
  }
  const to = String(opts.to || '')
    .trim()
    .toLowerCase()
  if (!to || !to.includes('@')) return { ok: false, error: 'Invalid recipient' }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `WebAura Finance <${process.env.RESEND_FROM_EMAIL || 'info@webauraindia.com'}>`,
        to,
        subject: opts.subject,
        html: opts.html,
      }),
    })
    const resendData = (await resendRes.json()) as { message?: string }
    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return { ok: false, error: resendData.message || 'Resend request failed' }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('sendFinanceTransactionalEmail:', e)
    return { ok: false, error: e?.message || 'Email send failed' }
  }
}
