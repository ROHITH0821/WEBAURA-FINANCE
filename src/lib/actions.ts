'use server'

import { revalidateTag, revalidatePath } from 'next/cache'

import { createStaticClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import { requireActiveAdmin, requireSuperAdmin, type GateOk } from '@/lib/admin-gates'
import { formatCurrency } from '@/lib/utils'
import { escapeHtml, sendFinanceTransactionalEmail } from '@/lib/send-finance-email'

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
  revalidate('expenses')
  revalidate('referrals')
  revalidate('recruitment')
  revalidate('credentials')
  revalidatePath('/requests')
  revalidatePath('/requests', 'page')
  revalidatePath('/expenses')
  revalidatePath('/')
  revalidatePath('/', 'layout')
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

export type ExpenseFormProjectOption = { id: string; label: string }

function mapProjectsForExpenseForm(rows: any[]): ExpenseFormProjectOption[] {
  return (rows || []).map((p: any) => {
    const title = String(p.project_name || p.name || '').trim()
    const parts = [p.project_code, p.client_name, title].filter(Boolean)
    return {
      id: String(p.id),
      label: parts.length ? parts.join(' · ') : 'Project',
    }
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

/** Projects list + role for the expense request form (any active admin/founder). */
export async function getProjectsForExpenseForm(): Promise<
  | { ok: true; role: GateOk['role']; projects: ExpenseFormProjectOption[] }
  | { ok: false; error: string; role?: undefined; projects: [] }
> {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { ok: false, error: gate.error, projects: [] }

  try {
    const supabase = createStaticClient()
    const primary = await supabase
      .from('projects')
      .select('id, project_code, client_name, project_name, name')
      .order('created_at', { ascending: false })

    let rows: any[] = primary.data || []
    let loadError = primary.error

    if (loadError) {
      const retry = await supabase
        .from('projects')
        .select('id, project_code, client_name')
        .order('created_at', { ascending: false })
      rows = retry.data || []
      loadError = retry.error
    }

    if (loadError) {
      console.error('getProjectsForExpenseForm:', loadError)
      return { ok: false, error: loadError.message, projects: [] }
    }

    return { ok: true, role: gate.role, projects: mapProjectsForExpenseForm(rows) }
  } catch (e: any) {
    console.error('getProjectsForExpenseForm:', e)
    return { ok: false, error: e?.message || 'Could not load projects', projects: [] }
  }
}

export async function createExpense(formData: any) {
  const gate = await requireActiveAdmin()
  if (!gate.ok) return { error: gate.error }
  const supabase = createStaticClient()

  const amount = Number(formData.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount must be a positive number.' }
  }
  const spentOn = String(formData.spent_on || '').trim()
  if (!spentOn) {
    return { error: 'Please describe what you spent on.' }
  }
  const proofRef = String(formData.transaction_ref || '').trim()
  if (!proofRef) {
    return { error: 'Proof / transaction reference is required.' }
  }

  const isSuper = gate.role === 'super_admin'
  // Super admin: record straight to the paid ledger (same table as expenses UI). Admins/founders stay pending for super approval.
  // Always attribute to the signed-in user (client form cannot spoof).
  const projectIdRaw = String(formData.project_id || '').trim()

  const { data, error } = await supabase
    .from('expense_requests')
    .insert({
      requested_by: gate.email,
      amount,
      spent_on: spentOn,
      category: formData.category,
      project_id: projectIdRaw || null,
      client_name_manual: formData.client_name_manual || null,
      transaction_ref: proofRef,
      receipt_url: formData.receipt_url || null,
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
    console.error('Create Expense Error:', error)
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

  await refreshFinanceData()
  return {
    ok: true as const,
    redirect: isSuper ? '/expenses' : '/requests#expenses',
    message: isSuper
      ? 'Expense recorded on the paid ledger.'
      : 'Request submitted — super admin will review and reimburse.',
  }
}

export async function approveExpense(expenseId: string, adminEmail?: string, paymentTransactionRef?: string) {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { error: gate.error }
  const supabase = createStaticClient()
  
  const { data: before } = await supabase.from('expense_requests').select('*').eq('id', expenseId).maybeSingle()
  if (!before || String((before as any).status || '').toLowerCase() !== 'pending') {
    return { error: 'This request is not pending or was already processed.' }
  }

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
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) {
    console.error('Approve Expense Error:', error)
    return { error: error.message }
  }
  if (!data) {
    return { error: 'Could not approve: request may have been updated by someone else. Refresh and try again.' }
  }

  const paidProjectId = (data as any).project_id as string | null | undefined
  if (paidProjectId) {
    const { data: rows, error: sumErr } = await supabase
      .from('expense_requests')
      .select('amount')
      .eq('project_id', paidProjectId)
      .eq('status', 'paid')
    if (!sumErr) {
      const nextTotal = (rows || []).reduce((s, r: any) => s + Number(r.amount || 0), 0)
      await supabase.from('projects').update({ total_expenses: nextTotal }).eq('id', paidProjectId)
    }
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

  const requester = String((before as any).requested_by || '')
    .trim()
    .toLowerCase()
  const payRef = String(paymentTransactionRef || '').trim()
  if (requester && payRef) {
    const spent = escapeHtml(String((before as any).spent_on || ''))
    const amt = formatCurrency(Number((before as any).amount || 0))
    const refOut = escapeHtml(payRef)
    await sendFinanceTransactionalEmail({
      to: requester,
      subject: 'WebAura Finance — reimbursement paid',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
          <p style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Reimbursement confirmed</p>
          <p style="font-size:16px;margin:12px 0;">Your expense request has been <strong>marked paid</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;">What you spent on</td><td style="padding:8px 0;font-weight:700;">${spent}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:800;font-size:18px;">${escapeHtml(amt)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Reimbursement reference (UTR / UPI)</td><td style="padding:8px 0;font-family:monospace;font-weight:700;">${refOut}</td></tr>
          </table>
          <p style="font-size:12px;color:#64748b;">Keep this email for your records.</p>
        </div>`,
    })
  }

  await refreshFinanceData()
  return { ok: true, data }
}

export async function deleteExpense(expenseId: string) {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { error: gate.error }

  const id = String(expenseId || '').trim()
  if (!id) return { error: 'Invalid expense id.' }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('expense_requests').select('*').eq('id', id).maybeSingle()
  if (!before) return { error: 'Expense not found.' }

  await logAudit({
    action_by: gate.email,
    action_type: 'DELETE',
    record_type: 'expense_requests',
    record_id: id,
    old_value: before,
    new_value: null,
    notes: 'Removed from expense ledger by super admin',
  })

  const projectId = (before as { project_id?: string | null }).project_id
  const wasPaid = String((before as { status?: string }).status || '').toLowerCase() === 'paid'

  const { data: removed, error } = await supabase
    .from('expense_requests')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Delete Expense Error:', error)
    return { error: error.message }
  }
  if (!removed) return { error: 'Could not delete expense. Refresh and try again.' }

  if (wasPaid && projectId) {
    await syncProjectPaidExpenses(supabase, projectId)
  }

  await refreshFinanceData()
  return { ok: true as const }
}
