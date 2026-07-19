import type { createStaticClient } from '@/lib/supabaseServer'
import { isRevenueAddonsUnavailableError } from '@/lib/revenue-addons/errors'

type AdminClient = ReturnType<typeof createStaticClient>

function toAmount(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function eventDate(value: unknown): string {
  const raw = String(value || '').trim()
  if (!raw) return '9999-12-31'
  return raw.slice(0, 10)
}

/** Live portal remaining = all-time revenue − all paid expenses (same idea as dashboard net profit). */
export async function fetchLiveNetProfitRemaining(supabase: AdminClient): Promise<number> {
  const [paymentsRes, expensesRes, recurringRes, addonsRes] = await Promise.all([
    supabase.from('payments_received').select('amount'),
    supabase.from('expense_requests').select('amount,status'),
    supabase.from('recurring_payments_log').select('amount_received'),
    supabase.from('revenue_addons').select('amount'),
  ])

  if (paymentsRes.error) {
    throw new Error(`payments_received query failed: ${paymentsRes.error.message}`)
  }
  if (expensesRes.error) {
    throw new Error(`expense_requests query failed: ${expensesRes.error.message}`)
  }

  let revenue = (paymentsRes.data || []).reduce((sum, row) => sum + toAmount(row.amount), 0)

  if (recurringRes.error) {
    if (recurringRes.error.code !== '42P01') {
      throw new Error(`recurring_payments_log query failed: ${recurringRes.error.message}`)
    }
  } else {
    revenue += (recurringRes.data || []).reduce((sum, row) => sum + toAmount(row.amount_received), 0)
  }

  if (addonsRes.error) {
    if (!isRevenueAddonsUnavailableError(addonsRes.error)) {
      throw new Error(`revenue_addons query failed: ${addonsRes.error.message}`)
    }
  } else {
    revenue += (addonsRes.data || []).reduce((sum, row) => sum + toAmount(row.amount), 0)
  }

  const expenses = (expensesRes.data || [])
    .filter((row) => String(row.status || '').toLowerCase() === 'paid')
    .reduce((sum, row) => sum + toAmount(row.amount), 0)

  return revenue - expenses
}

/**
 * One-shot chronological backfill for paid rows missing net_profit_snapshot.
 * Not called from hot read paths — invoke from an admin/migration job if needed.
 */
export async function backfillMissingNetProfitSnapshots(supabase: AdminClient): Promise<void> {
  const { data: missing, error: missingError } = await supabase
    .from('expense_requests')
    .select('id')
    .eq('status', 'paid')
    .is('net_profit_snapshot', null)
    .limit(200)

  if (missingError || !missing?.length) return

  const missingIds = new Set(missing.map((row) => String(row.id)))

  const [paymentsRes, recurringRes, addonsRes, expensesRes] = await Promise.all([
    supabase.from('payments_received').select('amount,payment_date'),
    supabase.from('recurring_payments_log').select('amount_received,payment_date'),
    supabase.from('revenue_addons').select('amount,received_date,logged_at'),
    supabase
      .from('expense_requests')
      .select('id,amount,status,paid_at,request_date,created_at')
      .eq('status', 'paid'),
  ])

  if (paymentsRes.error || expensesRes.error) return

  type Ev = { sort: string; kind: 'revenue' | 'expense'; amount: number; id?: string }
  const events: Ev[] = []

  for (const row of paymentsRes.data || []) {
    events.push({
      sort: `${eventDate(row.payment_date)}T00:00:00.000Z`,
      kind: 'revenue',
      amount: toAmount(row.amount),
    })
  }
  if (!recurringRes.error) {
    for (const row of recurringRes.data || []) {
      events.push({
        sort: `${eventDate(row.payment_date)}T00:00:00.000Z`,
        kind: 'revenue',
        amount: toAmount(row.amount_received),
      })
    }
  }
  if (!addonsRes.error) {
    for (const row of addonsRes.data || []) {
      const logged = String(row.logged_at || '').trim()
      events.push({
        sort: logged || `${eventDate(row.received_date)}T00:00:00.000Z`,
        kind: 'revenue',
        amount: toAmount(row.amount),
      })
    }
  }

  for (const row of expensesRes.data || []) {
    const paidAt = String(row.paid_at || '').trim()
    const fallback = `${eventDate(row.request_date || row.created_at)}T12:00:00.000Z`
    events.push({
      sort: paidAt || fallback,
      kind: 'expense',
      amount: toAmount(row.amount),
      id: String(row.id),
    })
  }

  events.sort((a, b) => {
    if (a.sort < b.sort) return -1
    if (a.sort > b.sort) return 1
    if (a.kind === b.kind) return 0
    return a.kind === 'revenue' ? -1 : 1
  })

  let revenue = 0
  let expenses = 0
  const snapshots = new Map<string, number>()

  for (const ev of events) {
    if (ev.kind === 'revenue') {
      revenue += ev.amount
      continue
    }
    expenses += ev.amount
    if (ev.id && missingIds.has(ev.id)) snapshots.set(ev.id, revenue - expenses)
  }

  for (const [id, snapshot] of snapshots) {
    await supabase
      .from('expense_requests')
      .update({ net_profit_snapshot: snapshot })
      .eq('id', id)
      .is('net_profit_snapshot', null)
  }
}
