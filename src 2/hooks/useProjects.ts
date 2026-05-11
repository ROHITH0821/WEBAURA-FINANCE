'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { FinanceProject } from '@/types/finance'

export function useProjects() {
  const [projects, setProjects] = useState<FinanceProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_projects')
      .select(`
        *,
        payment_entries(amount)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      const formatted = data.map((p: any) => ({
        ...p,
        total_received: p.payment_entries?.reduce((sum: number, entry: any) => sum + entry.amount, 0) || 0,
        outstanding_balance: p.agreed_value - (p.payment_entries?.reduce((sum: number, entry: any) => sum + entry.amount, 0) || 0)
      }))
      setProjects(formatted)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return { projects, loading, error, refetch: fetchProjects }
}
