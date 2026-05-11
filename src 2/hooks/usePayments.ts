'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PaymentEntry } from '@/types/finance'

export function usePayments(projectId?: string) {
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchPayments = async () => {
    if (!projectId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('payment_entries')
      .select('*')
      .eq('project_id', projectId)
      .order('received_date', { ascending: false })

    if (!error) setPayments(data)
    setLoading(false)
  }

  const addPayment = async (payment: Omit<PaymentEntry, 'id' | 'created_at' | 'created_by'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data, error } = await supabase
      .from('payment_entries')
      .insert([{ ...payment, created_by: user.id }])
      .select()

    if (!error) await fetchPayments()
    return { data, error }
  }

  return { payments, loading, fetchPayments, addPayment }
}
