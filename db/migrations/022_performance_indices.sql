-- Performance Optimization: Composite Indices for Sorting
-- Newest items should be indexed for fast retrieval in descending order.

-- Projects: Sort by created_at desc
create index if not exists idx_projects_created_at_desc on finance.projects(created_at desc);

-- Payments: Sort by payment_date desc, created_at desc
create index if not exists idx_payments_date_desc on finance.payments_received(payment_date desc, created_at desc);

-- Expenses: Sort by request_date desc, created_at desc
create index if not exists idx_expenses_date_desc on finance.expense_requests(request_date desc, created_at desc);

-- Audit Logs: Sort by created_at desc
create index if not exists idx_audit_created_at_desc on finance.finance_audit_log(created_at desc);
