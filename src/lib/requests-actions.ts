'use server'

import { revalidateTag } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'

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

export async function approveExpenseRequestAction(expenseId: string, adminEmail: string, paymentTransactionRef: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  if (!String(paymentTransactionRef || '').trim()) return { ok: false, error: 'Payment transaction reference is required.' }

  const { data: before } = await supabase.from('expense_requests').select('*').eq('id', expenseId).single()

  const { data, error } = await supabase
    .from('expense_requests')
    .update({
      status: 'paid',
      approved_by: adminEmail || null,
      approved_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      payment_transaction_ref: paymentTransactionRef.trim(),
    })
    .eq('id', expenseId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: adminEmail,
    action_type: 'PAY',
    record_type: 'expense_requests',
    record_id: expenseId,
    old_value: before,
    new_value: data,
    notes: `Paid with txn ${paymentTransactionRef.trim()}`,
  })

  revalidate('finance-summary')
  revalidate('projects')
  revalidate('audit')
  return { ok: true }
}

export async function rejectExpenseRequestAction(expenseId: string, adminEmail: string, reason: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  const why = String(reason || '').trim()
  if (!why) return { ok: false, error: 'Rejection reason is required.' }

  const { data: before } = await supabase.from('expense_requests').select('*').eq('id', expenseId).single()

  const { data, error } = await supabase
    .from('expense_requests')
    .update({
      status: 'rejected',
      approved_by: adminEmail || null,
      approved_at: new Date().toISOString(),
      rejection_reason: why,
    })
    .eq('id', expenseId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: adminEmail,
    action_type: 'REJECT',
    record_type: 'expense_requests',
    record_id: expenseId,
    old_value: before,
    new_value: data,
    notes: why,
  })

  revalidate('audit')
  return { ok: true }
}

export async function approveReferralLeadRewardAction(leadId: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  const { data: before } = await supabase.from('referral_leads').select('*').eq('id', leadId).single()

  const { data, error } = await supabase
    .from('referral_leads')
    .update({ reward_status: 'approved', reward_approved_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: 'system',
    action_type: 'APPROVE',
    record_type: 'referral_leads',
    record_id: leadId,
    old_value: before,
    new_value: data,
  })

  revalidate('audit')
  return { ok: true }
}

export async function payReferralLeadRewardAction(leadId: string, paymentTransactionRef: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  if (!String(paymentTransactionRef || '').trim()) return { ok: false, error: 'Payment transaction reference is required.' }

  const { data: before } = await supabase.from('referral_leads').select('*').eq('id', leadId).single()

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
    action_by: 'system',
    action_type: 'PAY',
    record_type: 'referral_leads',
    record_id: leadId,
    old_value: before,
    new_value: data,
    notes: `Paid with txn ${paymentTransactionRef.trim()}`,
  })

  revalidate('audit')
  return { ok: true }
}

export async function rejectReferralLeadRewardAction(leadId: string, reason: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  const why = String(reason || '').trim()
  if (!why) return { ok: false, error: 'Rejection reason is required.' }

  const { data: before } = await supabase.from('referral_leads').select('*').eq('id', leadId).single()

  const { data, error } = await supabase
    .from('referral_leads')
    .update({ reward_status: 'rejected', reward_rejection_reason: why })
    .eq('id', leadId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: 'system',
    action_type: 'REJECT',
    record_type: 'referral_leads',
    record_id: leadId,
    old_value: before,
    new_value: data,
    notes: why,
  })

  revalidate('audit')
  return { ok: true }
}

export async function approveRecruitmentRewardAction(rewardId: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  const { data: before } = await supabase.from('recruitment_rewards').select('*').eq('id', rewardId).single()

  const { data, error } = await supabase
    .from('recruitment_rewards')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', rewardId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: 'system',
    action_type: 'APPROVE',
    record_type: 'recruitment_rewards',
    record_id: rewardId,
    old_value: before,
    new_value: data,
  })

  revalidate('audit')
  return { ok: true }
}

export async function payRecruitmentRewardAction(rewardId: string, paymentTransactionRef: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  if (!String(paymentTransactionRef || '').trim()) return { ok: false, error: 'Payment transaction reference is required.' }

  const { data: before } = await supabase.from('recruitment_rewards').select('*').eq('id', rewardId).single()

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
    action_by: 'system',
    action_type: 'PAY',
    record_type: 'recruitment_rewards',
    record_id: rewardId,
    old_value: before,
    new_value: data,
    notes: `Paid with txn ${paymentTransactionRef.trim()}`,
  })

  revalidate('audit')
  return { ok: true }
}

export async function rejectRecruitmentRewardAction(rewardId: string, reason: string): Promise<ActionResult> {
  const supabase = createStaticClient()
  const why = String(reason || '').trim()
  if (!why) return { ok: false, error: 'Rejection reason is required.' }

  const { data: before } = await supabase.from('recruitment_rewards').select('*').eq('id', rewardId).single()

  const { data, error } = await supabase
    .from('recruitment_rewards')
    .update({ status: 'rejected', rejection_reason: why })
    .eq('id', rewardId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await logAction({
    action_by: 'system',
    action_type: 'REJECT',
    record_type: 'recruitment_rewards',
    record_id: rewardId,
    old_value: before,
    new_value: data,
    notes: why,
  })

  revalidate('audit')
  return { ok: true }
}

