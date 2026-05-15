'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import { requireActiveAdmin } from '@/lib/admin-gates'

const revalidate = (tag: string) => (revalidateTag as any)(tag)

async function logAudit(params: {
  action_by: string
  action_type: string
  record_type: string
  record_id: string
  notes?: string | null
  old_value?: any
  new_value?: any
}): Promise<void> {
  const supabase = createStaticClient()
  await supabase.from('finance_audit_log').insert({
    action_by: params.action_by,
    action_type: params.action_type,
    record_type: params.record_type,
    record_id: params.record_id,
    notes: params.notes ?? null,
    old_value: params.old_value ?? null,
    new_value: params.new_value ?? null,
  })
}

async function syncProjectPaidExpenses(supabase: ReturnType<typeof createStaticClient>, projectId: string) {
  const { data: rows, error } = await supabase
    .from('expense_requests')
    .select('amount')
    .eq('project_id', projectId)
    .eq('status', 'paid')
  if (error) {
    console.error('syncProjectPaidExpenses:', error)
    return
  }
  const nextTotal = (rows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
  await supabase.from('projects').update({ total_expenses: nextTotal }).eq('id', projectId)
}

function refreshAfterExpense() {
  revalidate('finance-summary')
  revalidate('projects')
  revalidate('audit')
  revalidate('expenses')
  revalidate('referrals')
  revalidate('recruitment')
  revalidatePath('/requests')
  revalidatePath('/requests', 'page')
  revalidatePath('/expenses')
  revalidatePath('/expenses/new')
  revalidatePath('/', 'layout')
}

/** Submit expense request — isolated module so the form page does not import the full actions bundle. */
export async function submitExpenseRequest(formData: {
  amount: string
  spent_on: string
  category: string
  transaction_ref: string
  project_id?: string | null
}) {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { error: gate.error }

  const supabase = createStaticClient()
  const amount = Number(formData.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount must be a positive number.' }
  }
  const spentOn = String(formData.spent_on || '').trim()
  if (!spentOn) return { error: 'Please describe what you spent on.' }
  const proofRef = String(formData.transaction_ref || '').trim()
  if (!proofRef) return { error: 'Proof / transaction reference is required.' }

  const isSuper = gate.role === 'super_admin'
  const projectIdRaw = String(formData.project_id || '').trim()

  const { data, error } = await supabase
    .from('expense_requests')
    .insert({
      requested_by: gate.email,
      amount,
      spent_on: spentOn,
      category: formData.category,
      project_id: projectIdRaw || null,
      transaction_ref: proofRef,
      request_date: new Date().toISOString().slice(0, 10),
      status: isSuper ? 'paid' : 'pending',
      approved_by: isSuper ? gate.email : null,
      approved_at: isSuper ? new Date().toISOString() : null,
      paid_at: isSuper ? new Date().toISOString() : null,
      payment_transaction_ref: isSuper ? proofRef : null,
    })
    .select()
    .single()

  if (error) {
    console.error('submitExpenseRequest:', error)
    return { error: error.message }
  }

  if (isSuper && projectIdRaw) {
    await syncProjectPaidExpenses(supabase, projectIdRaw)
  }

  await logAudit({
    action_by: gate.email,
    action_type: isSuper ? 'PAY' : 'CREATE',
    record_type: 'expense_requests',
    record_id: String((data as any)?.id || ''),
    old_value: null,
    new_value: data,
    notes: isSuper ? 'Super admin logged paid expense (auto-approved)' : 'Expense request created',
  })

  refreshAfterExpense()
  return {
    ok: true as const,
    fallbackPath: isSuper ? '/expenses' : '/requests',
  }
}
