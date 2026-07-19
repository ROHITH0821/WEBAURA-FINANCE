'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireActiveAdmin } from '@/lib/admin-gates'
import { createStaticClient } from '@/lib/supabaseServer'
import {
  advanceDueDate,
  rollbackDueDate,
  todayIsoDate,
  type BillingCycle,
} from '@/lib/recurring-revenue/utils'
import { REVENUE_TYPES, type RevenueType } from '@/types/finance'

type ActionResult = { ok: true } | { ok: false; error: string }

const revalidate = (tag: string) => (revalidateTag as any)(tag)

function refreshRecurringModule() {
  revalidate('recurring-revenue')
  revalidate('finance-summary')
  revalidatePath('/recurring')
}

function parseBillingCycle(value: string): BillingCycle {
  const cycle = String(value || 'monthly').toLowerCase()
  if (cycle === 'quarterly' || cycle === 'annual') return cycle
  return 'monthly'
}

function parseRevenueType(value: string | undefined | null): RevenueType {
  return REVENUE_TYPES.includes(value as RevenueType) ? (value as RevenueType) : 'direct_client'
}

export async function createRecurringClientAction(input: {
  clientName: string
  projectId?: string | null
  serviceDescription: string
  amount: number
  billingCycle: string
  nextDueDate: string
  revenueType?: string
  agencyId?: string | null
}): Promise<ActionResult> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const clientName = String(input.clientName || '').trim()
  const serviceDescription = String(input.serviceDescription || '').trim()
  const nextDueDate = String(input.nextDueDate || '').trim()
  const amount = Math.max(0, Math.round(Number(input.amount)))
  const billingCycle = parseBillingCycle(input.billingCycle)
  const projectId = String(input.projectId || '').trim() || null
  const revenueType = parseRevenueType(input.revenueType)
  const agencyId = revenueType === 'agency_digital_marketing' ? String(input.agencyId || '').trim() || null : null

  if (!clientName) return { ok: false, error: 'Client name is required.' }
  if (!serviceDescription) return { ok: false, error: 'Service description is required.' }
  if (!nextDueDate) return { ok: false, error: 'Next due date is required.' }
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Amount must be greater than 0.' }

  const supabase = createStaticClient()
  const { error } = await supabase.from('recurring_revenue').insert({
    client_name: clientName,
    client_email: null,
    project_id: projectId,
    service_description: serviceDescription,
    amount,
    billing_cycle: billingCycle,
    next_due_date: nextDueDate,
    start_date: todayIsoDate(),
    end_date: null,
    is_active: true,
    added_by: gate.email,
    revenue_type: revenueType,
    agency_id: agencyId,
    notes: null,
  })

  if (error) return { ok: false, error: error.message }

  refreshRecurringModule()
  return { ok: true }
}

export async function updateRecurringClientAction(input: {
  id: string
  clientName: string
  projectId?: string | null
  serviceDescription: string
  amount: number
  billingCycle: string
  nextDueDate: string
  revenueType?: string
  agencyId?: string | null
}): Promise<ActionResult> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const id = String(input.id || '').trim()
  const clientName = String(input.clientName || '').trim()
  const serviceDescription = String(input.serviceDescription || '').trim()
  const nextDueDate = String(input.nextDueDate || '').trim()
  const amount = Math.max(0, Math.round(Number(input.amount)))
  const billingCycle = parseBillingCycle(input.billingCycle)
  const projectId = String(input.projectId || '').trim() || null
  const revenueType = parseRevenueType(input.revenueType)
  const agencyId = revenueType === 'agency_digital_marketing' ? String(input.agencyId || '').trim() || null : null

  if (!id) return { ok: false, error: 'Missing recurring client id.' }
  if (!clientName) return { ok: false, error: 'Client name is required.' }
  if (!serviceDescription) return { ok: false, error: 'Service description is required.' }
  if (!nextDueDate) return { ok: false, error: 'Next due date is required.' }
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Amount must be greater than 0.' }

  const supabase = createStaticClient()
  const { error } = await supabase
    .from('recurring_revenue')
    .update({
      client_name: clientName,
      project_id: projectId,
      service_description: serviceDescription,
      amount,
      billing_cycle: billingCycle,
      next_due_date: nextDueDate,
      revenue_type: revenueType,
      agency_id: agencyId,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  refreshRecurringModule()
  return { ok: true }
}

export async function toggleRecurringActiveAction(input: {
  id: string
  isActive: boolean
}): Promise<ActionResult> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const id = String(input.id || '').trim()
  if (!id) return { ok: false, error: 'Missing recurring client id.' }

  const supabase = createStaticClient()
  const { error } = await supabase
    .from('recurring_revenue')
    .update({ is_active: Boolean(input.isActive) })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  refreshRecurringModule()
  return { ok: true }
}

export async function logRecurringPaymentAction(input: {
  recurringId: string
  amountReceived: number
  paymentDate: string
  transactionRef: string
  receivedBy: string
  notes?: string
}): Promise<ActionResult> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const recurringId = String(input.recurringId || '').trim()
  const paymentDate = String(input.paymentDate || '').trim()
  const transactionRef = String(input.transactionRef || '').trim()
  const receivedBy = String(input.receivedBy || '').trim()
  const amountReceived = Math.max(0, Math.round(Number(input.amountReceived)))
  const notes = String(input.notes || '').trim()

  if (!recurringId) return { ok: false, error: 'Missing recurring client id.' }
  if (!paymentDate) return { ok: false, error: 'Payment date is required.' }
  if (!transactionRef) return { ok: false, error: 'Transaction reference is required.' }
  if (!receivedBy) return { ok: false, error: 'Received by is required.' }
  if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
    return { ok: false, error: 'Amount received must be greater than 0.' }
  }

  const supabase = createStaticClient()

  const { data: recurring, error: recurringError } = await supabase
    .from('recurring_revenue')
    .select('id,billing_cycle,next_due_date')
    .eq('id', recurringId)
    .maybeSingle()

  if (recurringError) return { ok: false, error: recurringError.message }
  if (!recurring) return { ok: false, error: 'Recurring client not found.' }

  const { error: insertError } = await supabase.from('recurring_payments_log').insert({
    recurring_id: recurringId,
    amount_received: amountReceived,
    payment_date: paymentDate,
    received_by: receivedBy,
    transaction_ref: transactionRef,
    notes: notes.length ? notes : null,
  })

  if (insertError) return { ok: false, error: insertError.message }

  const nextDueDate = advanceDueDate(
    String(recurring.next_due_date),
    parseBillingCycle(String(recurring.billing_cycle)),
  )

  const { error: updateError } = await supabase
    .from('recurring_revenue')
    .update({ next_due_date: nextDueDate })
    .eq('id', recurringId)

  if (updateError) return { ok: false, error: updateError.message }

  refreshRecurringModule()
  return { ok: true }
}

export async function deleteRecurringPaymentLogAction(input: {
  logId: string
}): Promise<ActionResult> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const logId = String(input.logId || '').trim()
  if (!logId) return { ok: false, error: 'Missing payment log id.' }

  const supabase = createStaticClient()

  const { data: logRow, error: logError } = await supabase
    .from('recurring_payments_log')
    .select('id,recurring_id,created_at')
    .eq('id', logId)
    .maybeSingle()

  if (logError) return { ok: false, error: logError.message }
  if (!logRow) return { ok: false, error: 'Payment log not found.' }

  const recurringId = String(logRow.recurring_id)

  const [{ data: allLogs }, { data: recurring }] = await Promise.all([
    supabase
      .from('recurring_payments_log')
      .select('id,created_at')
      .eq('recurring_id', recurringId)
      .order('created_at', { ascending: false }),
    supabase
      .from('recurring_revenue')
      .select('id,billing_cycle,next_due_date')
      .eq('id', recurringId)
      .maybeSingle(),
  ])

  const isLatestLog = allLogs?.length === 1 || allLogs?.[0]?.id === logId

  const { error: deleteError } = await supabase.from('recurring_payments_log').delete().eq('id', logId)
  if (deleteError) return { ok: false, error: deleteError.message }

  if (isLatestLog && recurring) {
    const nextDueDate = rollbackDueDate(
      String(recurring.next_due_date),
      parseBillingCycle(String(recurring.billing_cycle)),
    )
    await supabase.from('recurring_revenue').update({ next_due_date: nextDueDate }).eq('id', recurringId)
  }

  refreshRecurringModule()
  return { ok: true }
}
