import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'

// 1. Get Founder Identity (Cached for 1 hour)
export const getFounders = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const { data } = await supabase.from('founder_profiles').select('id, user_id, name')
    return data || []
  },
  ['founders-list'],
  { revalidate: 3600, tags: ['founders'] }
)

// 2. Get Dashboard Stats (Cached for 30 seconds)
export const getDashboardStats = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const [
      { data: payments },
      { data: expenses },
      { data: projects }
    ] = await Promise.all([
      supabase.from('payment_entries').select('amount'),
      supabase.from('expenses').select('amount'),
      supabase.from('finance_projects').select('agreed_value')
    ])

    const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)
    const totalAgreedValue = (projects || []).reduce((sum, p) => sum + Number(p.agreed_value), 0)

    return {
      totalRevenue,
      totalExpenses,
      totalAgreedValue,
      outstanding: Math.max(0, totalAgreedValue - totalRevenue),
      netProfit: totalRevenue - totalExpenses
    }
  },
  ['dashboard-stats'],
  { revalidate: 30, tags: ['finance-summary'] }
)

// 3. Get Recent Audit Logs (Cached for 10 seconds)
export const getRecentAuditLogs = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    return data || []
  },
  ['audit-recent'],
  { revalidate: 10, tags: ['audit'] }
)

// 4. Get Project Archive (Cached for 1 minute)
export const getProjectsArchive = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('finance_projects')
      .select('*, payment_entries(amount)')
      .order('created_at', { ascending: false })
    
    return (data || []).map(project => {
      const received = (project.payment_entries || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      return {
        ...project,
        received,
        outstanding: Math.max(0, Number(project.agreed_value) - received)
      }
    })
  },
  ['projects-archive'],
  { revalidate: 60, tags: ['projects'] }
)
