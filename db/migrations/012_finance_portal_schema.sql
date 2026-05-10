-- ==========================================
-- 012: WebAura Finance Portal — Core Schema
-- ==========================================
-- Run in Supabase SQL editor.
--
-- Creates:
-- - project_code_counters
-- - projects
-- - payments_received
-- - expense_requests
-- - recurring_subscriptions
-- - finance_audit_log
--
-- NOTE ON LEADS TABLE:
-- This migration can attach to ONE existing leads table:
-- - Prefer `public.contact_submissions`, else
-- - fall back to `public.leads`.

create extension if not exists "uuid-ossp";

-- 0) Optional helper column on leads table (for "who converted")
do $$
begin
  if to_regclass('public.contact_submissions') is not null then
    execute 'alter table public.contact_submissions add column if not exists status_updated_by text';
  elsif to_regclass('public.leads') is not null then
    execute 'alter table public.leads add column if not exists status_updated_by text';
  else
    raise notice 'Finance: leads table not found (expected public.contact_submissions or public.leads). Lead->project trigger will be installed in 015 only if a table exists.';
  end if;
end
$$;

-- 1) Project code counter (WA-YYYY-NNN)
create table if not exists public.project_code_counters (
  year int primary key,
  seq int not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.next_project_seq(p_year int)
returns int
language plpgsql
as $$
declare
  v int;
begin
  insert into public.project_code_counters(year, seq)
  values (p_year, 1)
  on conflict (year)
  do update set
    seq = public.project_code_counters.seq + 1,
    updated_at = now()
  returning seq into v;
  return v;
end;
$$;

-- 2) Projects
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  project_code text unique,
  client_name text not null,
  client_email text,
  client_phone text,
  -- Optional link to the originating lead (FK attached conditionally below).
  lead_id uuid,
  project_type text not null check (project_type in ('basic','business','ecommerce','saas','custom')),
  agreed_value integer not null,
  payment_structure text not null check (payment_structure in ('full_upfront','fifty_fifty','milestone','custom')),
  advance_amount integer,
  total_received integer not null default 0,
  total_expenses integer not null default 0,
  net_profit integer generated always as (total_received - total_expenses) stored,
  status text not null default 'active' check (status in ('active','completed','on_hold','cancelled')),
  project_lead text not null,
  notes text
);

create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_lead_idx on public.projects(project_lead);
create index if not exists projects_lead_id_idx on public.projects(lead_id);

-- Attach FK to whichever leads table exists in this Supabase project.
do $$
begin
  if to_regclass('public.contact_submissions') is not null then
    execute $sql$
      alter table public.projects
      drop constraint if exists projects_lead_id_fkey;
    $sql$;
    execute $sql$
      alter table public.projects
      add constraint projects_lead_id_fkey
      foreign key (lead_id) references public.contact_submissions(id) on delete set null;
    $sql$;
  elsif to_regclass('public.leads') is not null then
    execute $sql$
      alter table public.projects
      drop constraint if exists projects_lead_id_fkey;
    $sql$;
    execute $sql$
      alter table public.projects
      add constraint projects_lead_id_fkey
      foreign key (lead_id) references public.leads(id) on delete set null;
    $sql$;
  else
    raise notice 'Finance: skipping projects.lead_id foreign key because no leads table was detected.';
  end if;
end
$$;

create or replace function public.projects_set_code()
returns trigger
language plpgsql
as $$
declare
  y int;
  n int;
begin
  if new.project_code is null or length(trim(new.project_code)) = 0 then
    y := extract(year from now())::int;
    n := public.next_project_seq(y);
    new.project_code := 'WA-' || y::text || '-' || lpad(n::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projects_set_code on public.projects;
create trigger trg_projects_set_code
before insert on public.projects
for each row
execute function public.projects_set_code();

-- 3) Payments received
create table if not exists public.payments_received (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  amount integer not null,
  payment_date date not null,
  received_by text not null,
  payment_method text not null check (payment_method in ('upi','bank_transfer','cash','cheque')),
  payment_stage text not null check (payment_stage in ('advance','milestone_1','milestone_2','milestone_3','final','full')),
  transaction_ref text not null check (length(trim(transaction_ref)) > 0),
  receipt_url text,
  notes text,
  verified boolean not null default false,
  verified_by text
);

create index if not exists payments_project_idx on public.payments_received(project_id, payment_date desc);

-- 4) Expense requests
create table if not exists public.expense_requests (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  requested_by text not null,
  amount integer not null,
  spent_on text not null,
  category text not null check (category in ('infrastructure','tools','marketing','travel','client_work','team','subscriptions','miscellaneous')),
  project_id uuid references public.projects(id) on delete set null,
  client_name_manual text,
  transaction_ref text not null check (length(trim(transaction_ref)) > 0),
  receipt_url text,
  request_date date not null default (now()::date),
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  approved_by text,
  approved_at timestamptz,
  paid_at timestamptz,
  rejection_reason text,
  payment_transaction_ref text
);

create index if not exists expense_status_idx on public.expense_requests(status, request_date desc);
create index if not exists expense_project_idx on public.expense_requests(project_id);
create index if not exists expense_requested_by_idx on public.expense_requests(requested_by);

-- 5) Recurring subscriptions
create table if not exists public.recurring_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  service_name text not null,
  monthly_cost integer not null,
  billing_cycle text not null check (billing_cycle in ('monthly','annual')),
  next_renewal_date date not null,
  currently_paid_by text not null,
  auto_alert_days integer not null default 7,
  is_active boolean not null default true,
  category text not null check (category in ('infrastructure','tools','design','ai','marketing')),
  notes text,
  last_alert_sent date
);

create index if not exists recurring_next_renewal_idx on public.recurring_subscriptions(next_renewal_date);

-- 6) Audit log
create table if not exists public.finance_audit_log (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  action_by text not null,
  action_type text not null,
  record_type text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  notes text
);

create index if not exists finance_audit_created_idx on public.finance_audit_log(created_at desc);
create index if not exists finance_audit_record_idx on public.finance_audit_log(record_type, record_id);

