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

// 5. Get Single Project Detail (Cached for 1 minute)
export const getProjectDetail = unstable_cache(
  async (id: string) => {
    if (!id) return null
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    return data
  },
  ['project-detail'],
  { revalidate: 60, tags: ['projects'] }
)

// 6. Get Project Payments (Cached for 30 seconds)
export const getProjectPayments = unstable_cache(
  async (projectId: string) => {
    if (!projectId) return []
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('payments_received')
      .select('*')
      .eq('project_id', projectId)
      .order('payment_date', { ascending: false })
    return data || []
  },
  ['project-payments'],
  { revalidate: 30, tags: ['projects', 'payments'] }
)

// 7. Get Full Audit Logs (Cached for 10 seconds)
export const getAuditLogs = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('finance_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
    return data || []
  },
  ['audit-full'],
  { revalidate: 10, tags: ['audit'] }
)

// 8. Get Expense Requests (Cached for 30 seconds)
export const getExpenseRequests = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('expense_requests')
      .select('*')
      .order('request_date', { ascending: false })
    
    if (error) {
      console.error('getExpenseRequests error:', error)
      // Return empty array to prevent page crash, or throw to show error boundary
      return []
    }
    return data || []
  },
  ['expenses-list'],
  { revalidate: 30, tags: ['expenses'] }
)

// 9. Get Revenue Summary Data (Cached for 30 seconds)
export const getRevenueData = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const [founders, projects, payments, expenses] = await Promise.all([
      supabase.from('admin_users').select('id, email, full_name'),
      supabase.from('projects').select('id, project_lead'),
      supabase.from('payments_received').select('amount, project_id'),
      supabase.from('expense_requests').select('amount, requested_by, status')
    ])
    
    return {
      founders: founders.data || [],
      projects: projects.data || [],
      payments: payments.data || [],
      expenses: expenses.data || []
    }
  },
  ['revenue-full'],
  { revalidate: 30, tags: ['finance-summary', 'payments', 'expenses'] }
)

// 10. Get Pending Requests (Cached for 30 seconds)
export const getPendingRequestsData = unstable_cache(
  async () => {
    const admin = createStaticClient()
    const [pendingExpenses, referralLeadRewards, recruitmentRewards] = await Promise.all([
      admin.from('expense_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      admin.from('referral_leads').select('*').eq('stage', 'converted').in('reward_status', ['pending', 'approved']).order('created_at', { ascending: false }),
      admin.from('recruitment_rewards').select('*').in('status', ['pending', 'approved']).order('created_at', { ascending: false }),
    ])
    
    return {
      pendingExpenses: pendingExpenses.data || [],
      referralLeadRewards: referralLeadRewards.data || [],
      recruitmentRewards: recruitmentRewards.data || []
    }
  },
  ['pending-requests'],
  { revalidate: 30, tags: ['expenses', 'referrals', 'recruitment'] }
)

// 11. Get Referrers (Cached for 5 minutes)
export const getReferrers = unstable_cache(
  async () => {
    const admin = createStaticClient()
    const { data } = await admin.from('referrers').select('id,name,email,upi_id')
    return data || []
  },
  ['referrers-list'],
  { revalidate: 300, tags: ['referrals'] }
)
