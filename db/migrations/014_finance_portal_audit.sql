-- ==========================================
-- 014: WebAura Finance Portal — Audit Trail
-- ==========================================
-- Auto-inserts into `finance_audit_log` on every create/update/delete.
--
-- Usage (from app server actions before a write):
--   select set_config('webaura.action_by', '<founder-email>', true);

create or replace function public.current_action_by()
returns text
language sql
as $$
  select coalesce(nullif(current_setting('webaura.action_by', true), ''), 'unknown');
$$;

create or replace function public.tg_finance_audit()
returns trigger
language plpgsql
as $$
declare
  action text;
  who text;
  rtype text;
  rid uuid;
begin
  who := public.current_action_by();
  rtype := tg_table_name;
  if (tg_op = 'INSERT') then
    action := 'create';
    rid := new.id;
    insert into public.finance_audit_log(action_by, action_type, record_type, record_id, old_value, new_value)
    values (who, action, rtype, rid, null, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    action := 'update';
    rid := new.id;
    insert into public.finance_audit_log(action_by, action_type, record_type, record_id, old_value, new_value)
    values (who, action, rtype, rid, to_jsonb(old), to_jsonb(new));
    return new;
  else
    action := 'delete';
    rid := old.id;
    insert into public.finance_audit_log(action_by, action_type, record_type, record_id, old_value, new_value)
    values (who, action, rtype, rid, to_jsonb(old), null);
    return old;
  end if;
end;
$$;

drop trigger if exists trg_projects_audit on public.projects;
create trigger trg_projects_audit
after insert or update or delete on public.projects
for each row execute function public.tg_finance_audit();

drop trigger if exists trg_payments_audit on public.payments_received;
create trigger trg_payments_audit
after insert or update or delete on public.payments_received
for each row execute function public.tg_finance_audit();

drop trigger if exists trg_expenses_audit on public.expense_requests;
create trigger trg_expenses_audit
after insert or update or delete on public.expense_requests
for each row execute function public.tg_finance_audit();

drop trigger if exists trg_recurring_audit on public.recurring_subscriptions;
create trigger trg_recurring_audit
after insert or update or delete on public.recurring_subscriptions
for each row execute function public.tg_finance_audit();

