-- ==========================================
-- 036: Tag expenses with an agency
-- ==========================================
-- Lets any expense request (salaries, infrastructure, agency payout, etc.) be attributed to a
-- specific agency, so agency-relationship expenses no longer need to be entered per-payment —
-- they flow through the normal expense ledger and get summed by agency on the Revenue page.
-- Nullable/additive, no existing row touched.

alter table finance.expense_requests
  add column if not exists agency_id uuid;

alter table finance.expense_requests
  drop constraint if exists expense_requests_agency_id_fkey;

alter table finance.expense_requests
  add constraint expense_requests_agency_id_fkey
  foreign key (agency_id) references finance.agencies(id) on delete set null;

create index if not exists idx_expense_requests_agency_id on finance.expense_requests(agency_id);
