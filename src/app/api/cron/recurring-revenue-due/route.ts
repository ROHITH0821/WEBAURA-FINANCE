import { NextResponse } from 'next/server'
import { createStaticClient } from '@/lib/supabaseServer'
import { escapeHtml, sendFinanceTransactionalEmail } from '@/lib/send-finance-email'
import { daysUntilExpiry } from '@/types/client-credentials'

const EXTRA_ADMIN_EMAIL = 'srimanrao0707@gmail.com'

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV === 'development'
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret
}

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function recurringPortalUrl() {
  return (process.env.FINANCE_PORTAL_URL || 'https://finance.webauraindia.in').replace(/\/$/, '') + '/recurring'
}

function alertThresholds(daysLeft: number): number[] {
  const thresholds: number[] = []
  if (daysLeft > 2 && daysLeft <= 7) thresholds.push(7)
  if (daysLeft > 0 && daysLeft <= 2) thresholds.push(2)
  if (daysLeft === 0) thresholds.push(0)
  if (daysLeft < 0) thresholds.push(-1)
  return thresholds
}

function alertSubject(clientName: string, daysLeft: number, threshold: number) {
  if (threshold === -1) {
    return `Recurring payment overdue — ${clientName}`
  }
  if (threshold === 0) {
    return `Recurring payment due today — ${clientName}`
  }
  return `Recurring payment due in ${daysLeft} day(s) — ${clientName}`
}

function alertIntro(daysLeft: number, threshold: number) {
  if (threshold === -1) {
    return `The recurring payment is <strong>${Math.abs(daysLeft)} day(s) overdue</strong>.`
  }
  if (threshold === 0) {
    return 'The recurring payment is <strong>due today</strong>.'
  }
  return `The recurring payment is due in <strong>${daysLeft}</strong> day(s).`
}

async function getDueAlertRecipients(supabase: ReturnType<typeof createStaticClient>) {
  const { data: superAdmins } = await supabase
    .from('admin_users')
    .select('email')
    .eq('role', 'super_admin')
    .eq('is_active', true)

  const emails = new Set<string>()
  for (const row of superAdmins || []) {
    const email = String(row.email || '').trim().toLowerCase()
    if (email.includes('@')) emails.add(email)
  }
  emails.add(EXTRA_ADMIN_EMAIL.toLowerCase())
  return [...emails]
}

function buildDueAlertEmail(row: {
  client_name: string
  service_description: string
  amount: number
  billing_cycle: string
  next_due_date: string
}, daysLeft: number, threshold: number, portalUrl: string, test = false) {
  const subject = `${test ? '[TEST] ' : ''}${alertSubject(String(row.client_name), daysLeft, threshold)}`
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <p style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Recurring revenue due alert</p>
      <p style="font-size:16px;margin:12px 0;"><strong>${escapeHtml(String(row.client_name))}</strong> — ${alertIntro(daysLeft, threshold)}</p>
      <table style="width:100%;font-size:14px;margin:16px 0;">
        <tr><td style="color:#64748b;padding:6px 0;">Service</td><td style="font-weight:700;">${escapeHtml(String(row.service_description || ''))}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Amount</td><td style="font-weight:700;">${escapeHtml(formatInr(Number(row.amount || 0)))}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Billing cycle</td><td style="font-weight:700;">${escapeHtml(String(row.billing_cycle || 'monthly'))}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;">Due date</td><td style="font-weight:700;">${escapeHtml(String(row.next_due_date || ''))}</td></tr>
      </table>
      <p style="font-size:13px;"><a href="${portalUrl}">Open Recurring Revenue in Finance Portal</a></p>
    </div>`
  return { subject, html }
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createStaticClient()
  const url = new URL(req.url)
  const isTest = url.searchParams.get('test') === '1'

  const { data: rows, error } = await supabase
    .from('recurring_revenue')
    .select('id,client_name,service_description,amount,billing_cycle,next_due_date,is_active')
    .eq('is_active', true)

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ ok: true, alertsSent: 0, note: 'recurring_revenue table missing' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recipients = await getDueAlertRecipients(supabase)
  if (recipients.length === 0) {
    return NextResponse.json({ ok: false, error: 'No alert recipients configured' }, { status: 500 })
  }

  const portalUrl = recurringPortalUrl()

  if (isTest) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Test mode only allowed in development' }, { status: 403 })
    }

    const sample = rows?.[0]
    const dueDate = String(sample?.next_due_date || new Date().toISOString().slice(0, 10))
    const daysLeft = daysUntilExpiry(dueDate) ?? 0
    const { subject, html } = buildDueAlertEmail(
      {
        client_name: String(sample?.client_name || 'Sample Recurring Client'),
        service_description: String(sample?.service_description || 'Website Maintenance'),
        amount: Number(sample?.amount || 30000),
        billing_cycle: String(sample?.billing_cycle || 'monthly'),
        next_due_date: dueDate,
      },
      daysLeft,
      daysLeft === 0 ? 0 : 2,
      portalUrl,
      true,
    )

    const results: { to: string; ok: boolean; error?: string }[] = []
    for (const to of recipients) {
      const result = await sendFinanceTransactionalEmail({ to, subject, html })
      results.push({ to, ok: result.ok, error: result.ok ? undefined : result.error })
    }

    return NextResponse.json({
      ok: true,
      test: true,
      recipients,
      results,
      sampleClient: sample?.client_name || 'Sample Recurring Client',
    })
  }

  let sent = 0

  for (const row of rows || []) {
    const dueDate = String(row.next_due_date || '')
    const daysLeft = daysUntilExpiry(dueDate)
    if (daysLeft == null) continue

    const thresholds = alertThresholds(daysLeft)
    if (thresholds.length === 0) continue

    for (const threshold of thresholds) {
      const { data: existing } = await supabase
        .from('recurring_revenue_due_alerts')
        .select('id')
        .eq('recurring_id', row.id)
        .eq('due_date', dueDate)
        .eq('days_before_alert', threshold)
        .maybeSingle()

      if (existing) continue

      const subject = alertSubject(String(row.client_name), daysLeft, threshold)
      const { html } = buildDueAlertEmail(
        {
          client_name: String(row.client_name),
          service_description: String(row.service_description || ''),
          amount: Number(row.amount || 0),
          billing_cycle: String(row.billing_cycle || 'monthly'),
          next_due_date: dueDate,
        },
        daysLeft,
        threshold,
        portalUrl,
      )

      for (const to of recipients) {
        await sendFinanceTransactionalEmail({ to, subject, html })
      }

      const { error: insertError } = await supabase.from('recurring_revenue_due_alerts').insert({
        recurring_id: row.id,
        due_date: dueDate,
        days_before_alert: threshold,
        alert_sent_at: new Date().toISOString(),
      })

      if (insertError && insertError.code !== '42P01') {
        console.error('[recurring-revenue-due] alert log insert failed:', insertError)
      }

      sent += 1
    }
  }

  return NextResponse.json({ ok: true, alertsSent: sent, recipients })
}
