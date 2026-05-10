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
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setProjects((data || []) as any)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return { projects, loading, error, refetch: fetchProjects }
}
