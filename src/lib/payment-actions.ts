'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createStaticClient } from '@/lib/supabaseServer'
import { requireActiveAdmin } from '@/lib/admin-gates'

type ActionResult = { ok: true } | { ok: false; error: string }
const revalidate = (tag: string) => (revalidateTag as any)(tag)

export async function recordPaymentAction(input: {
  projectId: string
  amount: number
  paymentDate: string
  receivedBy: string
  paymentMethod: 'upi' | 'bank_transfer' | 'cash' | 'cheque'
  paymentStage: 'advance' | 'milestone_1' | 'milestone_2' | 'milestone_3' | 'final' | 'full'
  transactionRef: string
  notes?: string
}): Promise<ActionResult> {
  console.log('recordPaymentAction started', { projectId: input.projectId })
  
  try {
    console.log('Performing gate check...')
    const gate = await requireActiveAdmin()
    if (!gate.ok) {
      console.log('Gate check failed:', gate.error)
      return { ok: false, error: gate.error }
    }
    console.log('Gate check passed for:', gate.email)

    const projectId = String(input.projectId || '').trim()
    const amount = Math.max(0, Math.round(Number(input.amount)))
    const paymentDate = String(input.paymentDate || '').trim()
    const receivedBy = String(input.receivedBy || '').trim()
    const paymentMethod = input.paymentMethod
    const paymentStage = input.paymentStage
    const transactionRef = String(input.transactionRef || '').trim()
    const notes = String(input.notes || '').trim()

    if (!projectId) return { ok: false, error: 'Missing project id.' }
    if (!paymentDate) return { ok: false, error: 'Missing payment date.' }
    if (!receivedBy) return { ok: false, error: 'Missing recipient founder.' }
    if (!transactionRef) return { ok: false, error: 'Transaction reference is required.' }
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Amount must be greater than 0.' }

    const admin = createStaticClient()
    console.log('Inserting payment into finance.payments_received...')
    
    const { error } = await admin.from('payments_received').insert({
      project_id: projectId,
      amount,
      payment_date: paymentDate,
      received_by: receivedBy,
      payment_method: paymentMethod,
      payment_stage: paymentStage,
      transaction_ref: transactionRef,
      notes: notes.length ? notes : null,
      verified: false,
      verified_by: null,
    })

    if (error) {
      console.error('Payment insertion error:', error)
      return { ok: false, error: `Database Error: ${error.message} (Code: ${error.code})` }
    }

    console.log('Payment inserted successfully. Revalidating tags...')
    try {
      revalidate('projects')
      revalidate('finance-summary')
      revalidate('audit')
    } catch (revalidateErr) {
      console.warn('Revalidation warning:', revalidateErr)
    }

    console.log('recordPaymentAction completed successfully')
  } catch (err: any) {
    if (err?.digest?.includes('NEXT_REDIRECT')) throw err
    console.error('CRITICAL ERROR in recordPaymentAction:', err)
    return { ok: false, error: `System Failure: ${err?.message || 'Unknown error'}` }
  }

  // Redirect outside try-catch
  redirect(`/projects/${input.projectId}`)
}

