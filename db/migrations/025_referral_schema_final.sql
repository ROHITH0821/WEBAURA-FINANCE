-- ==========================================
-- 026: WebAura — Separate Referral Schema
-- ==========================================
-- This migration ensures that all referral-related tables are moved to a dedicated
-- 'referrals' schema, keeping the 'finance' schema strictly for financial data.

-- 1) Create referrals schema
create schema if not exists referrals;

-- 2) Move tables to referrals (from finance or public)
do $$
declare
  t text;
  s text;
  tables_to_move text[] := array['referrers', 'referrer_sessions', 'referral_visits', 'referral_leads', 'onboarding_otps', 'recruitment_rewards', 'referral_login_tokens', 'referral_reward_logs', 'referrer_deletion_log'];
begin
  foreach t in array tables_to_move
  loop
    -- Only move if the table DOES NOT exist in 'referrals' yet
    if not exists (select 1 from information_schema.tables where table_schema = 'referrals' and table_name = t) then
      -- Check finance schema first
      if exists (select 1 from information_schema.tables where table_schema = 'finance' and table_name = t) then
        execute format('alter table finance.%I set schema referrals', t);
      -- Then check public schema
      elsif exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
        execute format('alter table public.%I set schema referrals', t);
      end if;
    end if;
  end loop;
end
$$;

-- 2.1) Ensure critical tables exist (fallback if not moved)
create table if not exists referrals.referrers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  referral_code text unique,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists referrals.onboarding_otps (
  email text primary key,
  otp_code text not null,
  expires_at timestamptz not null,
  attempts integer default 0,
  created_at timestamptz default now()
);

create table if not exists referrals.referrer_sessions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references referrals.referrers(id),
  session_token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);


-- 3) Update Trigger Functions for Referrals
create or replace function referrals.increment_referrer_clicks()
returns trigger as $$
begin
  update referrals.referrers
  set total_clicks = total_clicks + 1
  where id = new.referrer_id;
  return new;
end;
$$ language plpgsql;

-- Re-attach trigger
drop trigger if exists on_referral_visit on referrals.referral_visits;
create trigger on_referral_visit
after insert on referrals.referral_visits
for each row execute function referrals.increment_referrer_clicks();

-- 4) Update Foreign Keys in Finance (if projects pointed to contact_submissions)
do $$
begin
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'projects_lead_id_fkey' and table_schema = 'finance') then
    alter table finance.projects drop constraint projects_lead_id_fkey;
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'contact_submissions' and table_schema = 'referrals') then
    alter table finance.projects 
      add constraint projects_lead_id_fkey 
      foreign key (lead_id) references referrals.contact_submissions(id) on delete set null;
  end if;
end
$$;
-- 5) Referral RPCs
create or replace function referrals.increment_referrer_login(r_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update referrals.referrers
  set last_login = now()
  where id = r_id;
end;
$$;
-- 6) Permission Grants (Crucial for API access)
grant usage on schema referrals to anon, authenticated, service_role;
grant all privileges on all tables in schema referrals to anon, authenticated, service_role;
grant all privileges on all sequences in schema referrals to anon, authenticated, service_role;
grant all privileges on all functions in schema referrals to anon, authenticated, service_role;

-- Ensure RLS is handled (either disable for internal tools or set appropriate policies)
-- For now, we allow the service role full access (which the Proxy uses).
-- If you need public access, you must add RLS policies to these tables.
alter table referrals.onboarding_otps disable row level security;
alter table referrals.referrer_sessions disable row level security;
alter table referrals.referrers disable row level security;
alter table referrals.referral_leads disable row level security;
alter table referrals.referral_visits disable row level security;
alter table referrals.recruitment_rewards disable row level security;
alter table referrals.recruitment_rewards disable row level security;
alter table referrals.referral_login_tokens disable row level security;
alter table referrals.referral_reward_logs disable row level security;
alter table referrals.referrer_deletion_log disable row level security;
