import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'
import { escapeHtml, sendFinanceTransactionalEmail } from '@/lib/send-finance-email'
import { daysUntilExpiry } from '@/types/client-credentials'

function founderEmails(): string[] {
  const raw =
    process.env.FOUNDER_EMAILS ||
    'rapakarohith8@gmail.com,rohith@webauraindia.in,gopal@webauraindia.in,santosh@webauraindia.in,sriman@webauraindia.in,ronith@webauraindia.in'
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV === 'development'
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createStaticClient()
  const { data: rows, error } = await supabase
    .from('client_credentials')
    .select(
      'id,project_id,client_name,website_url,domain_name,domain_expiry_date,domain_registrar,hosting_provider,hosting_expiry_date,hosting_renewal_cost',
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recipients = founderEmails()
  let sent = 0

  for (const row of rows || []) {
    const checks: {
      alertType: 'domain_expiry' | 'hosting_expiry'
      expiryDate: string
      label: string
      provider: string | null
      cost: number | null
    }[] = []

    if (row.domain_expiry_date) {
      checks.push({
        alertType: 'domain_expiry',
        expiryDate: row.domain_expiry_date,
        label: 'Domain',
        provider: row.domain_registrar,
        cost: null,
      })
    }
    if (row.hosting_expiry_date) {
      checks.push({
        alertType: 'hosting_expiry',
        expiryDate: row.hosting_expiry_date,
        label: 'Hosting',
        provider: row.hosting_provider,
        cost: row.hosting_renewal_cost,
      })
    }

    for (const check of checks) {
      const daysLeft = daysUntilExpiry(check.expiryDate)
      if (daysLeft == null || daysLeft > 30 || daysLeft < 0) continue

      const thresholdsToSend: number[] = []
      if (daysLeft > 7 && daysLeft <= 30) thresholdsToSend.push(30)
      if (daysLeft > 2 && daysLeft <= 7) thresholdsToSend.push(7)
      if (daysLeft <= 2) thresholdsToSend.push(2)

      for (const threshold of thresholdsToSend) {
        const { data: existing } = await supabase
          .from('credentials_expiry_alerts')
          .select('id')
          .eq('project_id', row.project_id)
          .eq('alert_type', check.alertType)
          .eq('expiry_date', check.expiryDate)
          .eq('days_before_alert', threshold)
          .maybeSingle()

        if (existing) continue

        const financeUrl = `https://finance.webauraindia.in/projects/${row.project_id}?tab=vault`
        const adminUrl = `https://webauraindia.in/admin/client-vault/${row.project_id}`
        const subject = `Client ${check.label.toLowerCase()} expiring soon — ${row.client_name}`
        const html = `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
            <p style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Credentials expiry alert</p>
            <p style="font-size:16px;margin:12px 0;"><strong>${escapeHtml(row.client_name)}</strong> — ${escapeHtml(check.label)} expires in <strong>${daysLeft}</strong> day(s).</p>
            <table style="width:100%;font-size:14px;margin:16px 0;">
              <tr><td style="color:#64748b;padding:6px 0;">Website</td><td style="font-weight:700;">${escapeHtml(row.website_url || '')}</td></tr>
              <tr><td style="color:#64748b;padding:6px 0;">Expiry date</td><td style="font-weight:700;">${escapeHtml(check.expiryDate)}</td></tr>
              <tr><td style="color:#64748b;padding:6px 0;">Provider</td><td style="font-weight:700;">${escapeHtml(check.provider || '—')}</td></tr>
              ${check.cost != null ? `<tr><td style="color:#64748b;padding:6px 0;">Renewal cost</td><td style="font-weight:700;">₹${escapeHtml(String(check.cost))}</td></tr>` : ''}
            </table>
            <p style="font-size:13px;"><a href="${financeUrl}">Open in Finance Portal</a> · <a href="${adminUrl}">Open in Admin Console</a></p>
          </div>`

        for (const to of recipients) {
          await sendFinanceTransactionalEmail({ to, subject, html })
        }

        await supabase.from('credentials_expiry_alerts').insert({
          project_id: row.project_id,
          alert_type: check.alertType,
          expiry_date: check.expiryDate,
          days_before_alert: threshold,
          alert_sent_at: new Date().toISOString(),
        })

        sent += 1
      }
    }
  }

  return NextResponse.json({ ok: true, alertsSent: sent })
}
