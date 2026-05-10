import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'

function startOfMonthISO() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return start.toISOString().slice(0, 10)
}

function endOfMonthISO() {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return end.toISOString().slice(0, 10)
}

// 1. Get Founder Identity (Cached for 1 hour)
export const getFounders = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('admin_users')
      .select('email, full_name, role, is_active')
      .eq('is_active', true)
      .order('role', { ascending: true })
    return data || []
  },
  ['founders-list'],
  { revalidate: 3600, tags: ['founders'] }
)

// 2. Get Dashboard Stats (Cached for 30 seconds)
export const getDashboardStats = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const start = startOfMonthISO()
    const end = endOfMonthISO()

    const [{ data: payments }, { data: expenses }, { data: projects }] = await Promise.all([
      supabase.from('payments_received').select('amount,payment_date').gte('payment_date', start).lte('payment_date', end),
      supabase.from('expense_requests').select('amount,request_date,status').eq('status', 'paid').gte('request_date', start).lte('request_date', end),
      supabase.from('projects').select('agreed_value,total_received,status').eq('status', 'active'),
    ])

    const totalRevenue = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)
    const orderBookValue = (projects || []).reduce((sum, p) => sum + Number(p.agreed_value || 0), 0)
    const outstanding = (projects || []).reduce((sum, p) => {
      const agreed = Number(p.agreed_value || 0)
      const received = Number(p.total_received || 0)
      return sum + Math.max(0, agreed - received)
    }, 0)

    return {
      totalRevenue,
      totalExpenses,
      orderBookValue,
      outstanding,
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
      .from('finance_audit_log')
      .select('id,created_at,action_by,action_type,record_type,record_id')
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
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    return (data || []).map(project => {
      const received = Number(project.total_received || 0)
      return {
        ...project,
        received,
        outstanding: Math.max(0, Number(project.agreed_value || 0) - received)
      }
    })
  },
  ['projects-archive'],
  { revalidate: 60, tags: ['projects'] }
)
