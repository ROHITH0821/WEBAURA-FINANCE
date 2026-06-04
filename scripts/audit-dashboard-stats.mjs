/**
 * Quick integrity check for dashboard stat math (no DB).
 * Run: node scripts/audit-dashboard-stats.mjs
 */

function computeDashboardStats(input) {
  const toAmount = (v) => {
    const n = Number(v ?? 0)
    return Number.isFinite(n) ? n : 0
  }

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

  return {
    totalRevenue,
    totalExpenses,
    orderBookValue,
    outstanding,
    netProfit: totalRevenue - totalExpenses,
  }
}

function auditDashboardStats(stats) {
  const issues = []
  if (stats.netProfit !== stats.totalRevenue - stats.totalExpenses) {
    issues.push('netProfit mismatch')
  }
  if (stats.outstanding > stats.orderBookValue && stats.orderBookValue > 0) {
    issues.push('outstanding exceeds order book')
  }
  return { ok: issues.length === 0, issues }
}

const sample = computeDashboardStats({
  payments: [{ amount: 54000 }, { amount: 12000 }],
  expenses: [
    { amount: 2475, status: 'paid' },
    { amount: 500, status: 'pending' },
  ],
  projects: [
    { agreed_value: 200000, total_received: 54000, status: 'active' },
    { agreed_value: 316000, total_received: 0, status: 'active' },
    { agreed_value: 50000, total_received: 50000, status: 'completed' },
  ],
})

const audit = auditDashboardStats(sample)

console.log('Sample stats:', sample)
console.log('Audit:', audit.ok ? 'PASS' : 'FAIL', audit.issues)

if (sample.totalRevenue !== 66000) throw new Error('expected totalRevenue 66000')
if (sample.totalExpenses !== 2475) throw new Error('expected totalExpenses 2475 (paid only)')
if (sample.netProfit !== 63525) throw new Error('expected netProfit 63525')
if (sample.orderBookValue !== 516000) throw new Error('expected orderBookValue 516000')
if (sample.outstanding !== 462000) throw new Error('expected outstanding 462000')
if (!audit.ok) throw new Error('audit failed')

console.log('All checks passed.')
