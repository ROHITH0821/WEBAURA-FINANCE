-- ==========================================
-- 020: WebAura Finance Portal — Schema Sync & Rollup Fix
-- ==========================================
-- This migration ensures ALL finance tables are in the 'finance' schema
-- and that all triggers/functions are updated to reference 'finance' correctly.
-- This resolves silent loading/hanging issues caused by cross-schema mismatches.

-- 1) Ensure schema exists
create schema if not exists finance;

-- 2) Move tables from public to finance (if they are still in public)
do $$
begin
  -- Move project_code_counters
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'project_code_counters') then
    alter table public.project_code_counters set schema finance;
  end if;
  
  -- Move projects
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'projects') then
    alter table public.projects set schema finance;
  end if;
  
  -- Move payments_received
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'payments_received') then
    alter table public.payments_received set schema finance;
  end if;
  
  -- Move expense_requests
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'expense_requests') then
    alter table public.expense_requests set schema finance;
  end if;
  
  -- Move recurring_subscriptions
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'recurring_subscriptions') then
    alter table public.recurring_subscriptions set schema finance;
  end if;
  
  -- Move finance_audit_log
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'finance_audit_log') then
    alter table public.finance_audit_log set schema finance;
  end if;

  -- Move admin_users
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'admin_users') then
    alter table public.admin_users set schema finance;
  end if;

  -- Move finance_otp_requests
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'finance_otp_requests') then
    alter table public.finance_otp_requests set schema finance;
  end if;
end
$$;

-- 3) Update Rollup Functions (Now in 'finance' schema)
create or replace function finance.recalc_project_totals(p_project_id uuid)
returns void
language plpgsql
as $$
declare
  recv int;
  exp int;
begin
  select coalesce(sum(amount), 0) into recv
  from finance.payments_received
  where project_id = p_project_id;

  select coalesce(sum(amount), 0) into exp
  from finance.expense_requests
  where project_id = p_project_id
    and status = 'paid';

  update finance.projects
  set total_received = recv,
      total_expenses = exp
  where id = p_project_id;
end;
$$;

-- 4) Update Trigger Functions
create or replace function finance.tg_payments_rollup()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform finance.recalc_project_totals(old.project_id);
    return old;
  end if;
  perform finance.recalc_project_totals(new.project_id);
  if (tg_op = 'UPDATE' and old.project_id is distinct from new.project_id) then
    perform finance.recalc_project_totals(old.project_id);
  end if;
  return new;
end;
$$;

create or replace function finance.tg_expenses_rollup()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    if (new.project_id is not null and new.status = 'paid') then
      perform finance.recalc_project_totals(new.project_id);
    end if;
    return new;
  end if;

  if (tg_op = 'DELETE') then
    if (old.project_id is not null and old.status = 'paid') then
      perform finance.recalc_project_totals(old.project_id);
    end if;
    return old;
  end if;

  if (new.project_id is not null and (new.status = 'paid' or old.project_id is distinct from new.project_id)) then
    perform finance.recalc_project_totals(new.project_id);
  end if;
  if (old.project_id is not null and old.status = 'paid' and old.project_id is distinct from new.project_id) then
    perform finance.recalc_project_totals(old.project_id);
  end if;
  if (old.project_id is not null and old.status is distinct from new.status and (old.status = 'paid' or new.status = 'paid')) then
    perform finance.recalc_project_totals(coalesce(new.project_id, old.project_id));
  end if;
  return new;
end;
$$;

-- 5) Re-attach Triggers to 'finance' tables
drop trigger if exists trg_payments_rollup on finance.payments_received;
create trigger trg_payments_rollup
after insert or update or delete on finance.payments_received
for each row
execute function finance.tg_payments_rollup();

drop trigger if exists trg_expenses_rollup on finance.expense_requests;
create trigger trg_expenses_rollup
after insert or update or delete on finance.expense_requests
for each row
execute function finance.tg_expenses_rollup();

-- 6) Fix Project Code Trigger
create or replace function finance.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create or replace function finance.next_project_seq(p_year int)
returns int
language plpgsql
as $$
declare
  v int;
begin
  insert into finance.project_code_counters(year, seq)
  values (p_year, 1)
  on conflict (year)
  do update set
    seq = finance.project_code_counters.seq + 1,
    updated_at = now()
  returning seq into v;
  return v;
end;
$$;

create or replace function finance.projects_set_code()
returns trigger
language plpgsql
as $$
declare
  y int;
  n int;
begin
  if new.project_code is null or length(trim(new.project_code)) = 0 then
    y := extract(year from now())::int;
    n := finance.next_project_seq(y);
    new.project_code := 'WA-' || y::text || '-' || lpad(n::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projects_set_code on finance.projects;
create trigger trg_projects_set_code
before insert on finance.projects
for each row
execute function finance.projects_set_code();

-- 7) Cleanup old public functions (Optional but recommended)
-- drop function if exists public.recalc_project_totals(uuid);
-- drop function if exists public.tg_payments_rollup();
-- drop function if exists public.tg_expenses_rollup();
-- drop function if exists public.next_project_seq(int);
-- drop function if exists public.projects_set_code();
-- drop function if exists public.handle_updated_at();
