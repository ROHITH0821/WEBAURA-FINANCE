import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { auditDashboardStats, computeDashboardStats } from '@/lib/dashboard-stats'
import { createStaticClient } from '@/lib/supabaseServer'
import { currentMonthBounds } from '@/lib/recurring-revenue/utils'

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
  { revalidate: 60, tags: ['founders'] }
)

// 2. Get Dashboard Stats — all-time ledger totals (cached 30s)
export const getDashboardStats = unstable_cache(
  async () => {
    const supabase = createStaticClient()

    const [{ data: payments, error: paymentsError }, { data: expenses, error: expensesError }, { data: projects, error: projectsError }] =
      await Promise.all([
        supabase.from('payments_received').select('amount,payment_date'),
        supabase.from('expense_requests').select('amount,status'),
        supabase.from('projects').select('agreed_value,total_received,status'),
      ])

    // Audit fix: Supabase errors were swallowed — empty arrays made the dashboard show ₹0 instead of surfacing failure.
    if (paymentsError) console.error('[getDashboardStats] payments_received query failed:', paymentsError)
    if (expensesError) console.error('[getDashboardStats] expense_requests query failed:', expensesError)
    if (projectsError) console.error('[getDashboardStats] projects query failed:', projectsError)

    const stats = computeDashboardStats({
      payments: payments || [],
      expenses: expenses || [],
      projects: projects || [],
    })

    // Dashboard integration: add collected recurring payments to totals (logged amounts only, not MRR).
    const { start, end } = currentMonthBounds()
    const { data: recurringPayments, error: recurringError } = await supabase
      .from('recurring_payments_log')
      .select('amount_received,payment_date')

    if (recurringError) {
      // Table may not exist until migration 029 is applied — do not break the rest of the dashboard.
      if (recurringError.code !== '42P01') {
        console.error('[getDashboardStats] recurring_payments_log query failed:', recurringError)
      }
    } else {
      let recurringAllTime = 0
      let recurringThisMonth = 0
      for (const row of recurringPayments || []) {
        const amount = Number(row.amount_received || 0)
        recurringAllTime += amount
        const date = String(row.payment_date || '').slice(0, 10)
        if (date >= start && date <= end) recurringThisMonth += amount
      }
      stats.totalRevenue += recurringAllTime
      stats.revenueThisMonth += recurringThisMonth
      stats.netProfit = stats.totalRevenue - stats.totalExpenses
    }

    const audit = auditDashboardStats(stats)
    if (!audit.ok) {
      console.error('[getDashboardStats] integrity audit failed:', audit.issues)
    }

    return stats
  },
  ['dashboard-stats-all-time'],
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
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    // Audit fix: log project archive failures instead of silently returning an empty list.
    if (error) {
      console.error('[getProjectsArchive] projects query failed:', error)
      return []
    }
    
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

// 5. Get Single Project Detail (Cached per id; key includes id so entries never collide)
export function getProjectDetail(id: string) {
  return unstable_cache(
    async () => {
      if (!id) return null
      const supabase = createStaticClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      // Audit fix: failed project lookups returned null with no server log, hiding transient DB errors.
      if (error) console.error('[getProjectDetail] projects query failed:', error)
      return data
    },
    ['project-detail', id],
    { revalidate: 60, tags: ['projects'] }
  )()
}

// 6b. Get Project Expenses (paid + pending linked to project)
export function getProjectExpenses(projectId: string) {
  return unstable_cache(
    async () => {
      if (!projectId) return []
      const supabase = createStaticClient()
      const { data } = await supabase
        .from('expense_requests')
        .select('*')
        .eq('project_id', projectId)
        .neq('status', 'rejected')
        .order('request_date', { ascending: false })
      return data || []
    },
    ['project-expenses', projectId],
    { revalidate: 30, tags: ['expenses', 'projects'] },
  )()
}

export function getCredentialsMetadata(projectId: string) {
  return unstable_cache(
    async () => {
      if (!projectId) return null
      const supabase = createStaticClient()
      const { data } = await supabase
        .from('client_credentials')
        .select(
          'id,project_id,client_name,website_url,domain_name,domain_expiry_date,hosting_provider,hosting_expiry_date,cms_type,updated_at',
        )
        .eq('project_id', projectId)
        .maybeSingle()
      return data
    },
    ['credentials-meta', projectId],
    { revalidate: 30, tags: ['credentials', 'projects'] },
  )()
}

// 6. Get Project Payments (Cached per project; key includes projectId)
export function getProjectPayments(projectId: string) {
  return unstable_cache(
    async () => {
      if (!projectId) return []
      const supabase = createStaticClient()
      const { data } = await supabase
        .from('payments_received')
        .select('*')
        .eq('project_id', projectId)
        .order('payment_date', { ascending: false })
      return data || []
    },
    ['project-payments', projectId],
    { revalidate: 30, tags: ['projects', 'payments'] }
  )()
}

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

// 8. Expense ledger — `unstable_cache` speeds repeat navigations; tag `expenses` is revalidated on writes
//    (see `revalidateRequestDomains` / expense actions). Same function backs layout + expenses page.
export const getExpenseRequests = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('expense_requests')
      .select('*')
      .neq('status', 'rejected')
      .order('request_date', { ascending: false })

    if (error) {
      console.error('getExpenseRequests error:', error)
      return []
    }
    return data || []
  },
  ['finance-expense-requests'],
  { revalidate: 15, tags: ['expenses'] }
)

// 9. Get Revenue Summary Data (Cached for 30 seconds)
export const getRevenueData = unstable_cache(
  async () => {
    const supabase = createStaticClient()
    const [founders, projects, payments, expenses, recurringRevenue, recurringPayments, agencies] = await Promise.all([
      // Audit fix: inactive founders were included in profit-share math, skewing per-founder splits.
      supabase.from('admin_users').select('id, email, full_name').eq('is_active', true),
      supabase.from('projects').select('id, project_lead, revenue_type, share_percentage, agency_id'),
      supabase.from('payments_received').select('amount, project_id, gross_amount, share_percentage, deal_expenses'),
      supabase.from('expense_requests').select('amount, requested_by, status, project_id, agency_id'),
      // Revenue-by-type / by-agency breakdown: recurring clients don't flow through `payments`/`projects` above.
      supabase.from('recurring_revenue').select('id, revenue_type, share_percentage, agency_id'),
      supabase
        .from('recurring_payments_log')
        .select('recurring_id, amount_received, gross_amount, share_percentage, deal_expenses'),
      supabase.from('agencies').select('id, name').eq('is_active', true),
    ])

    if (founders.error) console.error('[getRevenueData] admin_users query failed:', founders.error)
    if (projects.error) console.error('[getRevenueData] projects query failed:', projects.error)
    if (payments.error) console.error('[getRevenueData] payments_received query failed:', payments.error)
    if (expenses.error) console.error('[getRevenueData] expense_requests query failed:', expenses.error)
    if (recurringRevenue.error && recurringRevenue.error.code !== '42P01')
      console.error('[getRevenueData] recurring_revenue query failed:', recurringRevenue.error)
    if (recurringPayments.error && recurringPayments.error.code !== '42P01')
      console.error('[getRevenueData] recurring_payments_log query failed:', recurringPayments.error)
    if (agencies.error && agencies.error.code !== '42P01')
      console.error('[getRevenueData] agencies query failed:', agencies.error)

    return {
      founders: founders.data || [],
      projects: projects.data || [],
      payments: payments.data || [],
      expenses: expenses.data || [],
      recurringRevenue: recurringRevenue.data || [],
      recurringPayments: recurringPayments.data || [],
      agencies: agencies.data || [],
    }
  },
  ['revenue-full'],
  { revalidate: 30, tags: ['finance-summary', 'payments', 'expenses', 'recurring-revenue', 'agencies'] }
)

// 10. Requests hub — shares cached expense rows with `getExpenseRequests()` (single DB hit per cache window).
//    Tags align with `revalidateRequestDomains` so approvals/submits still invalidate immediately.
export const getRequestsData = unstable_cache(
  async () => {
    const admin = createStaticClient()
    const [expenses, referralLeadRewards, recruitmentRewards] = await Promise.all([
      getExpenseRequests(),
      admin.from('referral_leads').select('*').eq('stage', 'converted').order('created_at', { ascending: false }),
      admin.from('recruitment_rewards').select('*').order('created_at', { ascending: false }),
    ])

    if (referralLeadRewards.error) console.error('DB Error (referrals):', JSON.stringify(referralLeadRewards.error))
    if (recruitmentRewards.error) console.error('DB Error (recruitment):', JSON.stringify(recruitmentRewards.error))

    return {
      expenses,
      referralLeadRewards: referralLeadRewards.data || [],
      recruitmentRewards: recruitmentRewards.data || [],
    }
  },
  ['finance-requests-data'],
  { revalidate: 15, tags: ['expenses', 'referrals', 'recruitment'] }
)

// 10b. Get Agencies (Cached for 5 minutes) — for tagging expenses/projects/recurring clients by agency.
export const getAgencies = unstable_cache(
  async () => {
    const admin = createStaticClient()
    const { data, error } = await admin
      .from('agencies')
      .select('id,name,default_share_percentage,is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error && error.code !== '42P01') console.error('[getAgencies] agencies query failed:', error)
    return data || []
  },
  ['agencies-list'],
  { revalidate: 300, tags: ['agencies'] }
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

// 12. Pending expense count for super-admin dashboard banner — per-request cache for up-to-date totals.
export const getPendingExpenseRequestCount = cache(async () => {
  const admin = createStaticClient()
  const { count, error } = await admin
    .from('expense_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) {
    console.error('getPendingExpenseRequestCount:', error)
    return 0
  }
  return count ?? 0
})
