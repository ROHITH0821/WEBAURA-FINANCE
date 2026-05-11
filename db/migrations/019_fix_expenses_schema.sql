-- Fix missing columns in expense_requests
alter table public.expense_requests add column if not exists created_at timestamptz not null default now();
alter table public.expense_requests add column if not exists request_date date not null default (now()::date);
alter table public.expense_requests add column if not exists category text not null default 'miscellaneous';
