'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Expense } from '@/types/finance'

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchExpenses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })

    if (!error) setExpenses(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const addExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'created_by'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, created_by: user.id }])
      .select()

    if (!error) await fetchExpenses()
    return { data, error }
  }

  return { expenses, loading, refetch: fetchExpenses, addExpense }
}
