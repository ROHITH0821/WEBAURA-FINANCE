-- ==========================================
-- 029: Recurring Revenue (isolated module)
-- ==========================================
-- Run in Supabase SQL editor after finance schema is in place.
-- Does not modify any existing finance tables beyond optional FK to projects.

create extension if not exists "uuid-ossp";

create schema if not exists finance;

create table if not exists finance.recurring_revenue (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  client_name text not null,
  client_email text,
  project_id uuid references finance.projects(id) on delete set null,
  service_description text not null,
  amount integer not null check (amount > 0),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'quarterly', 'annual')),
  next_due_date date not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  added_by text not null,
  notes text
);

create index if not exists idx_recurring_revenue_active
  on finance.recurring_revenue (is_active, next_due_date);

create index if not exists idx_recurring_revenue_project
  on finance.recurring_revenue (project_id);

create table if not exists finance.recurring_payments_log (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  recurring_id uuid not null references finance.recurring_revenue(id) on delete cascade,
  amount_received integer not null check (amount_received > 0),
  payment_date date not null,
  received_by text not null,
  transaction_ref text not null,
  notes text
);

create index if not exists idx_recurring_payments_log_recurring
  on finance.recurring_payments_log (recurring_id, payment_date desc);

create index if not exists idx_recurring_payments_log_payment_date
  on finance.recurring_payments_log (payment_date);
