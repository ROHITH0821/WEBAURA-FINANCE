'use server'

import { revalidateTag } from 'next/cache'

import { createStaticClient } from '@/lib/supabaseServer'

export async function refreshFinanceData() {
  revalidateTag('finance-summary')
  revalidateTag('projects')
  revalidateTag('audit')
}

export async function refreshFounders() {
  revalidateTag('founders')
}

export async function createProject(formData: any) {
  const supabase = createStaticClient()
  
  // Note: We bypass RLS here because we are on the server and have already
  // verified the founder via our custom OTP/Cookie flow.
  const { data, error } = await supabase
    .from('finance_projects')
    .insert({
      client_name: formData.client_name,
      project_type: formData.project_type,
      agreed_value: parseFloat(formData.agreed_value),
      lead_founder_id: formData.lead_founder_id,
      payment_structure: formData.payment_structure,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('Create Project Error:', error)
    return { error: error.message }
  }

  await refreshFinanceData()
  return { ok: true, data }
}

export async function createExpense(formData: any) {
  const supabase = createStaticClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      amount: parseFloat(formData.amount),
      description: formData.description,
      expense_date: formData.expense_date,
      category: formData.category,
      founder_id: formData.founder_id,
      status: 'pending', 
      reimbursement_requested: true
    })
    .select()
    .single()

  if (error) {
    console.error('Create Expense Error:', error)
    return { error: error.message }
  }

  await refreshFinanceData()
  return { ok: true, data }
}

export async function approveExpense(expenseId: string, adminUserId?: string) {
  const supabase = createStaticClient()
  
  const { data, error } = await supabase
    .from('expenses')
    .update({ 
      status: 'paid',
      approved_by: adminUserId,
      approved_at: new Date().toISOString()
    })
    .eq('id', expenseId)
    .select()
    .single()

  if (error) {
    console.error('Approve Expense Error:', error)
    return { error: error.message }
  }

  await refreshFinanceData()
  return { ok: true, data }
}
