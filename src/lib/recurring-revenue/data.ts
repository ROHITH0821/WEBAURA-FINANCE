import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabaseServer'
import { currentMonthBounds, monthlyEquivalentAmount, type BillingCycle } from '@/lib/recurring-revenue/utils'
import type { RevenueType } from '@/types/finance'

export type RecurringRevenueRow = {
  id: string
  created_at: string
  client_name: string
  client_email: string | null
  project_id: string | null
  service_description: string
  amount: number
  billing_cycle: BillingCycle
  next_due_date: string
  start_date: string
  end_date: string | null
  is_active: boolean
  added_by: string
  notes: string | null
  revenue_type: RevenueType
  share_percentage: number
  agency_id: string | null
}

export type RecurringAgencyOption = {
  id: string
  name: string
  default_share_percentage: number
}

export type RecurringProjectOption = {
  id: string
  label: string
}

export type RecurringFounderOption = {
  email: string
  name: string
}

export type RecurringPaymentLogRow = {
  id: string
  recurring_id: string
  amount_received: number
  payment_date: string
  received_by: string
  transaction_ref: string
  notes: string | null
  created_at: string
  gross_amount?: number | null
  share_percentage?: number | null
  deal_expenses?: number | null
}

export type RecurringPageMetrics = {
  activeClientCount: number
  monthlyRecurringRevenue: number
  collectedThisMonth: number
}

export type RecurringPageData = {
  metrics: RecurringPageMetrics
  activeRows: RecurringRevenueRow[]
  inactiveRows: RecurringRevenueRow[]
  paymentLogsByRecurringId: Record<string, RecurringPaymentLogRow[]>
  projects: RecurringProjectOption[]
  founders: RecurringFounderOption[]
  agencies: RecurringAgencyOption[]
  loadError: string | null
}

function mapProjectOption(row: {
  id: string
  project_code?: string | null
  client_name?: string | null
  project_name?: string | null
}): RecurringProjectOption {
  const parts = [row.project_code, row.client_name, row.project_name].filter(Boolean)
  return {
    id: String(row.id),
    label: parts.length ? parts.join(' · ') : 'Project',
  }
}

/** Isolated data loader for /recurring — does not touch other finance queries. */
export const getRecurringRevenuePageData = unstable_cache(
  async (): Promise<RecurringPageData> => {
    const supabase = createStaticClient()
    const { start, end } = currentMonthBounds()

    const [recurringRes, paymentsRes, allLogsRes, projectsRes, foundersRes, agenciesRes] = await Promise.all([
      supabase
        .from('recurring_revenue')
        .select('*')
        .order('next_due_date', { ascending: true }),
      supabase
        .from('recurring_payments_log')
        .select('amount_received,payment_date')
        .gte('payment_date', start)
        .lte('payment_date', end),
      supabase
        .from('recurring_payments_log')
        .select('id,recurring_id,amount_received,payment_date,received_by,transaction_ref,notes,created_at')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('projects')
        .select('id,project_code,client_name,project_name')
        .order('created_at', { ascending: false }),
      supabase
        .from('admin_users')
        .select('email,full_name')
        .eq('is_active', true)
        .order('full_name', { ascending: true }),
      supabase
        .from('agencies')
        .select('id,name,default_share_percentage')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])

    if (agenciesRes.error && agenciesRes.error.code !== '42P01') {
      console.error('[getRecurringRevenuePageData] agencies query failed:', agenciesRes.error)
    }

    const agencies: RecurringAgencyOption[] = (agenciesRes.data || []).map((a: any) => ({
      id: String(a.id),
      name: String(a.name),
      default_share_percentage: Number(a.default_share_percentage ?? 100),
    }))

    if (recurringRes.error) {
      const message =
        recurringRes.error.code === '42P01'
          ? 'Recurring revenue tables are not installed yet. Run migration 029_recurring_revenue.sql in Supabase.'
          : recurringRes.error.message
      return {
        metrics: { activeClientCount: 0, monthlyRecurringRevenue: 0, collectedThisMonth: 0 },
        activeRows: [],
        inactiveRows: [],
        paymentLogsByRecurringId: {},
        projects: (projectsRes.data || []).map(mapProjectOption),
        founders: (foundersRes.data || []).map((f) => ({
          email: String(f.email),
          name: String(f.full_name || f.email),
        })),
        agencies,
        loadError: message,
      }
    }

    const rows = (recurringRes.data || []) as RecurringRevenueRow[]
    const activeRows = rows.filter((row) => row.is_active)
    const inactiveRows = rows.filter((row) => !row.is_active)

    const monthlyRecurringRevenue = activeRows.reduce((sum, row) => {
      return sum + monthlyEquivalentAmount(Number(row.amount), row.billing_cycle)
    }, 0)

    const collectedThisMonth = (paymentsRes.data || []).reduce(
      (sum, row) => sum + Number(row.amount_received || 0),
      0,
    )

    const paymentLogsByRecurringId: Record<string, RecurringPaymentLogRow[]> = {}
    for (const log of (allLogsRes.data || []) as RecurringPaymentLogRow[]) {
      const key = String(log.recurring_id)
      if (!paymentLogsByRecurringId[key]) paymentLogsByRecurringId[key] = []
      paymentLogsByRecurringId[key].push(log)
    }

    return {
      metrics: {
        activeClientCount: activeRows.length,
        monthlyRecurringRevenue,
        collectedThisMonth,
      },
      activeRows,
      inactiveRows,
      paymentLogsByRecurringId,
      projects: (projectsRes.data || []).map(mapProjectOption),
      founders: (foundersRes.data || []).map((f) => ({
        email: String(f.email),
        name: String(f.full_name || f.email),
      })),
      agencies,
      loadError: null,
    }
  },
  ['recurring-revenue-page'],
  { revalidate: 20, tags: ['recurring-revenue'] },
)
