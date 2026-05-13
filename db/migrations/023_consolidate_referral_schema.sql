-- ==========================================
-- 023: WebAura Referral & Onboarding — Schema Consolidation
-- ==========================================
-- This migration ensures ALL referral-related tables are in the 'finance' schema
-- to align with the unified database architecture.

-- 1) Ensure schema exists
create schema if not exists finance;

-- 2) Move tables from public to finance
do $$
begin
  -- Move referrers
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'referrers') then
    alter table public.referrers set schema finance;
  end if;

  -- Move referrer_sessions
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'referrer_sessions') then
    alter table public.referrer_sessions set schema finance;
  end if;

  -- Move referral_visits
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'referral_visits') then
    alter table public.referral_visits set schema finance;
  end if;

  -- Move referral_leads
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'referral_leads') then
    alter table public.referral_leads set schema finance;
  end if;

  -- Move onboarding_otps
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'onboarding_otps') then
    alter table public.onboarding_otps set schema finance;
  end if;

  -- Move recruitment_rewards
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'recruitment_rewards') then
    alter table public.recruitment_rewards set schema finance;
  end if;

  -- Move contact_submissions
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'contact_submissions') then
    alter table public.contact_submissions set schema finance;
  end if;
end
$$;

-- 3) Re-create Triggers for Referrers (Clicks)
create or replace function finance.increment_referrer_clicks()
returns trigger as $$
begin
  update finance.referrers
  set total_clicks = total_clicks + 1
  where id = new.referrer_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_referral_visit on finance.referral_visits;
create trigger on_referral_visit
after insert on finance.referral_visits
for each row execute function finance.increment_referrer_clicks();
