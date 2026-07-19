-- ==========================================
-- 033: Expanded expense categories + free-text "Other"
-- ==========================================
-- Existing category values are NOT renamed or migrated — every historical row keeps its exact
-- current value ('infrastructure','tools','marketing','travel','client_work','team',
-- 'subscriptions','miscellaneous'). This migration only ADDS new allowed literals to the CHECK
-- constraint ('salaries','agency_payout','office','other') and a new nullable column
-- (custom_category_label) used only when category = 'other'. No data is touched. Safe to re-run.

alter table finance.expense_requests
  add column if not exists custom_category_label text;

alter table finance.expense_requests
  drop constraint if exists expense_requests_category_check;

alter table finance.expense_requests
  add constraint expense_requests_category_check
  check (category in (
    'infrastructure',
    'tools',
    'marketing',
    'travel',
    'client_work',
    'team',
    'subscriptions',
    'salaries',
    'agency_payout',
    'office',
    'miscellaneous',
    'other'
  ));

-- Defense in depth: custom_category_label must be set when category = 'other', and must be
-- empty for every other category (keeps display logic unambiguous).
alter table finance.expense_requests
  drop constraint if exists expense_requests_custom_category_label_check;

alter table finance.expense_requests
  add constraint expense_requests_custom_category_label_check
  check (
    (category = 'other' and custom_category_label is not null and length(trim(custom_category_label)) > 0)
    or (category <> 'other' and custom_category_label is null)
  );
