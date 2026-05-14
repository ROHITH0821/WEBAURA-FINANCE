/**
 * Counts items that should surface in notifications / badges (aligned with /requests visibility rules).
 * Super admin: org-wide pending + payable referral/recruitment queues.
 * Everyone else: only rows tied to the signed-in user.
 */
export type RequestAttention = {
  expenses: number
  referrals: number
  recruitment: number
  total: number
}

export function computeRequestAttention(input: {
  myEmail: string
  role: string | null | undefined
  isActive: boolean | null | undefined
  expenses: unknown[] | null | undefined
  referralLeadRewards: unknown[] | null | undefined
  recruitmentRewards: unknown[] | null | undefined
  referrers: unknown[] | null | undefined
}): RequestAttention {
  const myEmail = String(input.myEmail || '')
    .trim()
    .toLowerCase()
  const role = String(input.role || '')
  const isActive = input.isActive === true
  const canApprovePayouts = isActive && role === 'super_admin'

  const refMap = new Map(
    (input.referrers || []).map((r: any) => [String(r.id), r]),
  )

  const expenseN = canApprovePayouts
    ? (input.expenses || []).filter((r: any) => String(r.status || '').toLowerCase() === 'pending').length
    : (input.expenses || []).filter(
        (r: any) =>
          String(r.requested_by || '')
            .trim()
            .toLowerCase() === myEmail && String(r.status || '').toLowerCase() === 'pending',
      ).length

  const referralRows = (input.referralLeadRewards || []).map((row: any) => {
    const ref = row.referrer_id ? refMap.get(String(row.referrer_id)) : null
    return {
      referrer_email: String(ref?.email || '')
        .trim()
        .toLowerCase(),
      reward_status: String(row.reward_status || '').toLowerCase(),
    }
  })

  const refN = canApprovePayouts
    ? referralRows.filter((r) => r.reward_status === 'pending' || r.reward_status === 'approved').length
    : referralRows.filter(
        (r) =>
          r.referrer_email === myEmail &&
          (r.reward_status === 'pending' || r.reward_status === 'approved'),
      ).length

  const recruitmentRows = (input.recruitmentRewards || []).map((r: any) => {
    const ref = r.recruiter_id ? refMap.get(String(r.recruiter_id)) : null
    return {
      recruiter_email: String(ref?.email || '')
        .trim()
        .toLowerCase(),
      status: String(r.status || '').toLowerCase(),
    }
  })

  const recN = canApprovePayouts
    ? recruitmentRows.filter((r) => r.status === 'pending' || r.status === 'approved').length
    : recruitmentRows.filter(
        (r) =>
          r.recruiter_email === myEmail &&
          (r.status === 'pending' || r.status === 'approved'),
      ).length

  const expenses = expenseN
  const referrals = refN
  const recruitment = recN
  return {
    expenses,
    referrals,
    recruitment,
    total: expenses + referrals + recruitment,
  }
}
