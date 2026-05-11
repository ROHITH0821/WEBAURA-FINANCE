'use client'

import { useMemo } from 'react'
import { Expense, PaymentEntry, Founder, FounderBalance } from '@/types/finance'

export function useRevenueBalance(
  founders: Founder[],
  payments: PaymentEntry[],
  expenses: Expense[]
) {
  const balances = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const fairShare = totalExpenses / (founders.length || 5)

    return founders.map(founder => {
      const received = payments
        .filter(p => p.received_by === founder.id)
        .reduce((sum, p) => sum + p.amount, 0)
      
      const paid = expenses
        .filter(e => e.paid_by === founder.id)
        .reduce((sum, e) => sum + e.amount, 0)

      return {
        founder_id: founder.id,
        founder_name: founder.name,
        total_received: received,
        total_expenses: paid,
        company_liability: received - paid,
        fair_share_expenses: fairShare,
        reimbursement_owed: paid - fairShare // Positive means others owe this founder
      } as FounderBalance
    })
  }, [founders, payments, expenses])

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalRevenue - totalExpenses

  return { balances, totalRevenue, totalExpenses, netProfit }
}
