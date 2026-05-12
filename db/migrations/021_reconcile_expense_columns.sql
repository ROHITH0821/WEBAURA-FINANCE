-- Reconcile finance.projects columns
alter table finance.projects add column if not exists total_received integer not null default 0;
alter table finance.projects add column if not exists total_expenses integer not null default 0;

-- Reconcile finance.expense_requests columns
alter table finance.expense_requests add column if not exists approved_at timestamptz;
alter table finance.expense_requests add column if not exists paid_at timestamptz;
alter table finance.expense_requests add column if not exists approved_by text;
alter table finance.expense_requests add column if not exists client_name_manual text;
alter table finance.expense_requests add column if not exists receipt_url text;
alter table finance.expense_requests add column if not exists rejection_reason text;
alter table finance.expense_requests add column if not exists payment_transaction_ref text;

-- Ensure status check includes rejected
alter table finance.expense_requests drop constraint if exists expense_requests_status_check;
alter table finance.expense_requests add constraint expense_requests_status_check check (status in ('pending','approved','paid','rejected'));

-- Ensure category check
alter table finance.expense_requests drop constraint if exists expense_requests_category_check;
alter table finance.expense_requests add constraint expense_requests_category_check check (category in ('infrastructure','tools','marketing','travel','client_work','team','subscriptions','miscellaneous'));
