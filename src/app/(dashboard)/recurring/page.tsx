import { createClient } from '@/lib/supabaseServer'
import { getRecurringRevenuePageData } from '@/lib/recurring-revenue/data'
import RecurringRevenueClient from './recurring-revenue-client'

export const dynamic = 'force-dynamic'

export default async function RecurringRevenuePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const data = await getRecurringRevenuePageData()
  const defaultReceivedBy = String(user?.email || '')

  return <RecurringRevenueClient data={data} defaultReceivedBy={defaultReceivedBy} />
}
