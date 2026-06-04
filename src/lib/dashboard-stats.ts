/** All-time financial summary for the dashboard (not filtered by month). */

export type DashboardStatsInput = {
  payments: { amount: number | string | null }[]
  expenses: { amount: number | string | null; status?: string | null }[]
  projects: {
    agreed_value?: number | string | null
    total_received?: number | string | null
    status?: string | null
  }[]
}

export type DashboardStats = {
  totalRevenue: number
  totalExpenses: number
  orderBookValue: number
  outstanding: number
  netProfit: number
}

export type DashboardStatsAudit = {
  ok: boolean
  issues: string[]
}

function toAmount(value: number | string | null | undefined): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Sum all payments and paid expenses in the ledger (lifetime). */
export function computeDashboardStats(input: DashboardStatsInput): DashboardStats {
  const totalRevenue = (input.payments || []).reduce((sum, row) => sum + toAmount(row.amount), 0)

  const totalExpenses = (input.expenses || [])
    .filter((row) => String(row.status || '').toLowerCase() === 'paid')
    .reduce((sum, row) => sum + toAmount(row.amount), 0)

  const activeProjects = (input.projects || []).filter(
    (row) => String(row.status || '').toLowerCase() === 'active',
  )

  const orderBookValue = activeProjects.reduce((sum, row) => sum + toAmount(row.agreed_value), 0)

  const outstanding = activeProjects.reduce((sum, row) => {
    const agreed = toAmount(row.agreed_value)
    const received = toAmount(row.total_received)
    return sum + Math.max(0, agreed - received)
  }, 0)

  const netProfit = totalRevenue - totalExpenses

  return {
    totalRevenue,
    totalExpenses,
    orderBookValue,
    outstanding,
    netProfit,
  }
}

/** Sanity checks so dashboard figures stay internally consistent. */
export function auditDashboardStats(stats: DashboardStats): DashboardStatsAudit {
  const issues: string[] = []

  if (stats.netProfit !== stats.totalRevenue - stats.totalExpenses) {
    issues.push('netProfit does not equal totalRevenue minus totalExpenses')
  }

  for (const [label, value] of [
    ['totalRevenue', stats.totalRevenue],
    ['totalExpenses', stats.totalExpenses],
    ['orderBookValue', stats.orderBookValue],
    ['outstanding', stats.outstanding],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      issues.push(`${label} is not a valid non-negative number`)
    }
  }

  if (stats.outstanding > stats.orderBookValue && stats.orderBookValue > 0) {
    issues.push('outstanding exceeds order book on active projects')
  }

  return { ok: issues.length === 0, issues }
}
