'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import { requireSuperAdmin } from '@/lib/admin-gates'
import { formatCurrency } from '@/lib/utils'
import { escapeHtml, sendFinanceTransactionalEmail } from '@/lib/send-finance-email'

type ActionResult = { ok: true } | { ok: false; error: string }

const revalidate = (tag: string) => (revalidateTag as any)(tag)

async function logAction(params: {
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
    old_value: params.old_value ?? null,
    new_value: params.new_value ?? null,
    notes: params.notes ?? null,
  })
}

function revalidateRequestDomains() {
  revalidate('finance-summary')
  revalidate('expenses')
  revalidate('referrals')
  revalidate('recruitment')
  revalidate('audit')
  revalidate('projects')
  revalidatePath('/requests')
  revalidatePath('/requests', 'page')
  revalidatePath('/expenses')
  revalidatePath('/')
  revalidatePath('/', 'layout')
}

async function syncProjectTotalPaidExpenses(supabase: ReturnType<typeof createStaticClient>, projectId: string | null | undefined) {
  if (!projectId) return
  const { data: rows, error } = await supabase
    .from('expense_requests')
    .select('amount')
    .eq('project_id', projectId)
    .eq('status', 'paid')
  if (error) {
    console.error('syncProjectTotalPaidExpenses:', error)
    return
  }
  const nextTotal = (rows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
  await supabase.from('projects').update({ total_expenses: nextTotal }).eq('id', projectId)
}

export async function approveExpenseRequestAction(
  expenseId: string,
  _adminEmail: string,
  paymentTransactionRef: string,
): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!String(paymentTransactionRef || '').trim()) return { ok: false, error: 'Payment transaction reference is required.' }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('expense_requests').select('*').eq('id', expenseId).maybeSingle()
  if (!before || String((before as any).status || '').toLowerCase() !== 'pending') {
    return { ok: false, error: 'This request is not pending or was already processed.' }
  }

  const { data, error } = await supabase
    .from('expense_requests')
    .update({
      status: 'paid',
      approved_by: gate.email,
      approved_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      payment_transaction_ref: paymentTransactionRef.trim(),
    })
    .eq('id', expenseId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) {
    return { ok: false, error: 'Could not update: it may have been processed already. Refresh the page.' }
  }

  await syncProjectTotalPaidExpenses(supabase, (data as any).project_id)

  await logAction({
    action_by: gate.email,
    action_type: 'PAY',
    record_type: 'expense_requests',
    record_id: expenseId,
    old_value: before,
    new_value: data,
    notes: `Paid with txn ${paymentTransactionRef.trim()}`,
  })

  const requester = String((before as any).requested_by || '')
    .trim()
    .toLowerCase()
  if (requester) {
    const spent = escapeHtml(String((before as any).spent_on || ''))
    const amt = formatCurrency(Number((before as any).amount || 0))
    const refOut = escapeHtml(paymentTransactionRef.trim())
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
          <p style="font-size:12px;color:#64748b;">Keep this email for your records. If anything looks wrong, reply to your finance contact.</p>
        </div>`,
    })
  }

  revalidateRequestDomains()
  return { ok: true }
}

export async function rejectExpenseRequestAction(expenseId: string, _adminEmail: string, reason: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const why = String(reason || '').trim()
  if (!why) return { ok: false, error: 'Rejection reason is required.' }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('expense_requests').select('*').eq('id', expenseId).maybeSingle()
  if (!before || String((before as any).status || '').toLowerCase() !== 'pending') {
    return { ok: false, error: 'This request is not pending or was already processed.' }
  }

  const rejectedAt = new Date().toISOString()
  const rejectedSnapshot = {
    ...(before as Record<string, unknown>),
    status: 'rejected',
    approved_by: gate.email,
    approved_at: rejectedAt,
    rejection_reason: why,
  }

  await logAction({
    action_by: gate.email,
    action_type: 'REJECT',
    record_type: 'expense_requests',
    record_id: expenseId,
    old_value: before,
    new_value: rejectedSnapshot,
    notes: why,
  })

  const { data: removed, error } = await supabase
    .from('expense_requests')
    .delete()
    .eq('id', expenseId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!removed) {
    return { ok: false, error: 'Could not reject: it may have been updated already. Refresh the page.' }
  }

  const requester = String((before as any).requested_by || '')
    .trim()
    .toLowerCase()
  if (requester) {
    const spent = escapeHtml(String((before as any).spent_on || ''))
    const amt = formatCurrency(Number((before as any).amount || 0))
    const reasonHtml = escapeHtml(why)
    await sendFinanceTransactionalEmail({
      to: requester,
      subject: 'WebAura Finance — expense request not approved',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
          <p style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Update on your request</p>
          <p style="font-size:16px;margin:12px 0;">Your expense request could <strong>not be approved</strong> at this time.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;">What you spent on</td><td style="padding:8px 0;font-weight:700;">${spent}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(amt)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;vertical-align:top;">Reason</td><td style="padding:8px 0;">${reasonHtml}</td></tr>
          </table>
          <p style="font-size:12px;color:#64748b;">Questions? Reply to your finance contact.</p>
        </div>`,
    })
  }

  revalidateRequestDomains()
  return { ok: true }
}

export async function approveReferralLeadRewardAction(leadId: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('referral_leads').select('*').eq('id', leadId).maybeSingle()

  const { data, error } = await supabase
    .from('referral_leads')
    .update({ reward_status: 'approved', reward_approved_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: gate.email,
    action_type: 'APPROVE',
    record_type: 'referral_leads',
    record_id: leadId,
    old_value: before,
    new_value: data,
  })

  revalidateRequestDomains()
  return { ok: true }
}

export async function payReferralLeadRewardAction(leadId: string, paymentTransactionRef: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!String(paymentTransactionRef || '').trim()) return { ok: false, error: 'Payment transaction reference is required.' }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('referral_leads').select('*').eq('id', leadId).maybeSingle()

  const { data, error } = await supabase
    .from('referral_leads')
    .update({
      reward_status: 'paid',
      paid_at: new Date().toISOString(),
      payout_transaction_ref: paymentTransactionRef.trim(),
    })
    .eq('id', leadId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: gate.email,
    action_type: 'PAY',
    record_type: 'referral_leads',
    record_id: leadId,
    old_value: before,
    new_value: data,
    notes: `Paid with txn ${paymentTransactionRef.trim()}`,
  })

  revalidateRequestDomains()
  return { ok: true }
}

export async function rejectReferralLeadRewardAction(leadId: string, reason: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const why = String(reason || '').trim()
  if (!why) return { ok: false, error: 'Rejection reason is required.' }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('referral_leads').select('*').eq('id', leadId).maybeSingle()

  const { data, error } = await supabase
    .from('referral_leads')
    .update({ reward_status: 'rejected', reward_rejection_reason: why })
    .eq('id', leadId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: gate.email,
    action_type: 'REJECT',
    record_type: 'referral_leads',
    record_id: leadId,
    old_value: before,
    new_value: data,
    notes: why,
  })

  revalidateRequestDomains()
  return { ok: true }
}

export async function approveRecruitmentRewardAction(rewardId: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('recruitment_rewards').select('*').eq('id', rewardId).maybeSingle()

  const { data, error } = await supabase
    .from('recruitment_rewards')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', rewardId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: gate.email,
    action_type: 'APPROVE',
    record_type: 'recruitment_rewards',
    record_id: rewardId,
    old_value: before,
    new_value: data,
  })

  revalidateRequestDomains()
  return { ok: true }
}

export async function payRecruitmentRewardAction(rewardId: string, paymentTransactionRef: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  if (!String(paymentTransactionRef || '').trim()) return { ok: false, error: 'Payment transaction reference is required.' }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('recruitment_rewards').select('*').eq('id', rewardId).maybeSingle()

  const { data, error } = await supabase
    .from('recruitment_rewards')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_transaction_ref: paymentTransactionRef.trim(),
    })
    .eq('id', rewardId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: gate.email,
    action_type: 'PAY',
    record_type: 'recruitment_rewards',
    record_id: rewardId,
    old_value: before,
    new_value: data,
    notes: `Paid with txn ${paymentTransactionRef.trim()}`,
  })

  revalidateRequestDomains()
  return { ok: true }
}

export async function rejectRecruitmentRewardAction(rewardId: string, reason: string): Promise<ActionResult> {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const why = String(reason || '').trim()
  if (!why) return { ok: false, error: 'Rejection reason is required.' }

  const supabase = createStaticClient()
  const { data: before } = await supabase.from('recruitment_rewards').select('*').eq('id', rewardId).maybeSingle()

  const { data, error } = await supabase
    .from('recruitment_rewards')
    .update({ status: 'rejected', rejection_reason: why })
    .eq('id', rewardId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: gate.email,
    action_type: 'REJECT',
    record_type: 'recruitment_rewards',
    record_id: rewardId,
    old_value: before,
    new_value: data,
    notes: why,
  })

  revalidateRequestDomains()
  return { ok: true }
}
