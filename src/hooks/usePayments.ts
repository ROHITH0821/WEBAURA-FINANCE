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
      .from('payments_received')
      .select('*')
      .eq('project_id', projectId)
      .order('payment_date', { ascending: false })

    if (!error) setPayments((data || []) as any)
    setLoading(false)
  }

  const addPayment = async (payment: Omit<PaymentEntry, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('payments_received')
      .insert([{ ...payment } as any])
      .select()

    if (!error) await fetchPayments()
    return { data, error }
  }

  return { payments, loading, fetchPayments, addPayment }
}
