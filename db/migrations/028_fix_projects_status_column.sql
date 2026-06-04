-- ==========================================
-- 028: Fix "column status does not exist" when re-running 012
-- ==========================================
-- Production often already has public.projects (admin portfolio) without finance columns.
-- 012 uses CREATE TABLE IF NOT EXISTS (skipped) then CREATE INDEX on status (fails).
--
-- Run this in Supabase SQL Editor if 012 failed with: 42703 column "status" does not exist
-- Then use finance schema migrations (020+) — do NOT re-run full 012 unless on a fresh DB.

create schema if not exists finance;

-- If finance.projects exists, ensure finance columns (idempotent)
do $$
begin
  if to_regclass('finance.projects') is not null then
    alter table finance.projects add column if not exists status text;
    alter table finance.projects add column if not exists client_name text;
    alter table finance.projects add column if not exists project_code text;
    alter table finance.projects add column if not exists project_lead text;
    alter table finance.projects add column if not exists agreed_value integer;
    alter table finance.projects add column if not exists payment_structure text;
    alter table finance.projects add column if not exists total_received integer not null default 0;
    alter table finance.projects add column if not exists total_expenses integer not null default 0;
    update finance.projects set status = 'active' where status is null;
    execute 'create index if not exists projects_status_idx on finance.projects(status)';
  end if;
end
$$;

-- Legacy public.projects (admin portfolio) — add status only if table is used for finance
do $$
begin
  if to_regclass('public.projects') is not null
     and to_regclass('finance.projects') is null then
    alter table public.projects add column if not exists status text;
    update public.projects set status = 'active' where status is null;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'projects' and column_name = 'status'
    ) then
      execute 'create index if not exists projects_status_idx on public.projects(status)';
    end if;
  end if;
end
$$;

-- expense_requests index (same failure mode if table existed without status)
do $$
begin
  if to_regclass('finance.expense_requests') is not null then
    alter table finance.expense_requests add column if not exists status text default 'pending';
    update finance.expense_requests set status = 'pending' where status is null;
    execute 'create index if not exists expense_status_idx on finance.expense_requests(status, request_date desc)';
  elsif to_regclass('public.expense_requests') is not null then
    alter table public.expense_requests add column if not exists status text default 'pending';
    update public.expense_requests set status = 'pending' where status is null;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'expense_requests' and column_name = 'status'
    ) then
      execute 'create index if not exists expense_status_idx on public.expense_requests(status, request_date desc)';
    end if;
  end if;
end
$$;

-- Finance audit log indexes (finish what 012 started at the end)
do $$
begin
  if to_regclass('finance.finance_audit_log') is not null then
    execute 'create index if not exists finance_audit_created_idx on finance.finance_audit_log(created_at desc)';
    execute 'create index if not exists finance_audit_record_idx on finance.finance_audit_log(record_type, record_id)';
  elsif to_regclass('public.finance_audit_log') is not null then
    execute 'create index if not exists finance_audit_created_idx on public.finance_audit_log(created_at desc)';
    execute 'create index if not exists finance_audit_record_idx on public.finance_audit_log(record_type, record_id)';
  end if;
end
$$;
