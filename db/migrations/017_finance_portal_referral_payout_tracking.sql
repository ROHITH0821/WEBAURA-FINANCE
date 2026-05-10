-- FINANCE PORTAL MIGRATION 017
-- Purpose: Add payout tracking fields to existing referral reward tables
-- so Finance Portal can settle referral payouts with proof (txn ref)
-- and keep a consistent audit trail.

do $$
begin
  if to_regclass('public.referral_leads') is not null then
    alter table public.referral_leads
      add column if not exists payout_transaction_ref text,
      add column if not exists payout_paid_by text,
      add column if not exists reward_rejection_reason text,
      add column if not exists reward_approved_by text,
      add column if not exists reward_approved_at timestamptz;
  end if;

  if to_regclass('public.recruitment_rewards') is not null then
    alter table public.recruitment_rewards
      add column if not exists payout_transaction_ref text,
      add column if not exists payout_paid_by text,
      add column if not exists rejection_reason text;
  end if;
end $$;

