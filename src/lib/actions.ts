'use server'

import { revalidateTag } from 'next/cache'

import { createStaticClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import { requireActiveAdmin, requireSuperAdmin } from '@/lib/admin-gates'

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

export async function refreshFinanceData() {
  revalidate('finance-summary')
  revalidate('projects')
  revalidate('audit')
}

export async function refreshFounders() {
  revalidate('founders')
}

export async function createProject(formData: any) {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { error: gate.error }
  const supabase = createStaticClient()
  
  const { data, error } = await supabase
    .from('projects')
    .insert({
      project_name: formData.project_name || null,
      client_name: formData.client_name,
      client_email: formData.client_email || null,
      client_phone: formData.client_phone || null,
      lead_id: formData.lead_id || null,
      project_type: formData.project_type,
      agreed_value: Number(formData.agreed_value),
      payment_structure: formData.payment_structure,
      advance_amount: formData.advance_amount != null && String(formData.advance_amount) !== '' ? Number(formData.advance_amount) : null,
      status: formData.status || 'active',
      project_lead: formData.project_lead,
      notes: formData.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Create Project Error:', error)
    return { error: error.message }
  }

  await refreshFinanceData()
  redirect(`/projects/${data.id}`)
}

export async function createExpense(formData: any) {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { error: gate.error }
  const supabase = createStaticClient()
  
  const isSuper = gate.role === 'super_admin'
  const { data, error } = await supabase
    .from('expense_requests')
    .insert({
      requested_by: isSuper ? gate.email : formData.requested_by,
      amount: Number(formData.amount),
      spent_on: formData.spent_on,
      category: formData.category,
      project_id: formData.project_id || null,
      client_name_manual: formData.client_name_manual || null,
      transaction_ref: formData.transaction_ref,
      receipt_url: formData.receipt_url || null,
      request_date: formData.request_date || new Date().toISOString().slice(0, 10),
      status: isSuper ? 'paid' : 'pending',
      approved_by: isSuper ? gate.email : null,
      approved_at: isSuper ? new Date().toISOString() : null,
      paid_at: isSuper ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    console.error('Create Expense Error:', error)
    return { error: error.message }
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

  await refreshFinanceData()
  redirect('/expenses')
}

export async function approveExpense(expenseId: string, adminEmail?: string, paymentTransactionRef?: string) {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { error: gate.error }
  const supabase = createStaticClient()
  
  const { data: before } = await supabase.from('expense_requests').select('*').eq('id', expenseId).maybeSingle()
  const { data, error } = await supabase
    .from('expense_requests')
    .update({ 
      status: 'paid',
      approved_by: gate.email || adminEmail || null,
      approved_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      payment_transaction_ref: paymentTransactionRef || null,
    })
    .eq('id', expenseId)
    .select()
    .single()

  if (error) {
    console.error('Approve Expense Error:', error)
    return { error: error.message }
  }

  await logAudit({
    action_by: gate.email,
    action_type: 'PAY',
    record_type: 'expense_requests',
    record_id: expenseId,
    old_value: before ?? null,
    new_value: data,
    notes: paymentTransactionRef ? `Paid with txn ${String(paymentTransactionRef)}` : null,
  })

  await refreshFinanceData()
  return { ok: true, data }
}

export async function deleteExpense(expenseId: string) {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { error: gate.error }
  const supabase = createStaticClient()

  const { data: before, error: beforeErr } = await supabase
    .from('expense_requests')
    .select('*')
    .eq('id', expenseId)
    .maybeSingle()
  if (beforeErr) return { error: beforeErr.message }
  if (!before) return { error: 'Expense not found.' }

  const { error: delErr } = await supabase.from('expense_requests').delete().eq('id', expenseId)
  if (delErr) return { error: delErr.message }

  // If this expense was paid and linked to a project, re-sync that project's total_expenses.
  const status = String((before as any).status || '').toLowerCase()
  const projectId = (before as any).project_id as string | null
  if (projectId && status === 'paid') {
    const { data: rows, error: sumErr } = await supabase
      .from('expense_requests')
      .select('amount')
      .eq('project_id', projectId)
      .eq('status', 'paid')
    if (!sumErr) {
      const nextTotal = (rows || []).reduce((s, r: any) => s + Number(r.amount || 0), 0)
      await supabase.from('projects').update({ total_expenses: nextTotal }).eq('id', projectId)
    }
  }

  await logAudit({
    action_by: gate.email,
    action_type: 'DELETE',
    record_type: 'expense_requests',
    record_id: expenseId,
    old_value: before,
    new_value: null,
    notes: 'Deleted expense entry',
  })

  await refreshFinanceData()
  return { ok: true }
}
