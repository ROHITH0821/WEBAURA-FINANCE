-- ==========================================
-- 013: WebAura Finance Portal — Rollups
-- ==========================================
-- Keeps `projects.total_received` and `projects.total_expenses` correct.

create or replace function public.recalc_project_totals(p_project_id uuid)
returns void
language plpgsql
as $$
declare
  recv int;
  exp int;
begin
  select coalesce(sum(amount), 0) into recv
  from public.payments_received
  where project_id = p_project_id;

  select coalesce(sum(amount), 0) into exp
  from public.expense_requests
  where project_id = p_project_id
    and status = 'paid';

  update public.projects
  set total_received = recv,
      total_expenses = exp
  where id = p_project_id;
end;
$$;

create or replace function public.tg_payments_rollup()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recalc_project_totals(old.project_id);
    return old;
  end if;
  perform public.recalc_project_totals(new.project_id);
  if (tg_op = 'UPDATE' and old.project_id is distinct from new.project_id) then
    perform public.recalc_project_totals(old.project_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_rollup on public.payments_received;
create trigger trg_payments_rollup
after insert or update or delete on public.payments_received
for each row
execute function public.tg_payments_rollup();

create or replace function public.tg_expenses_rollup()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    if (new.project_id is not null and new.status = 'paid') then
      perform public.recalc_project_totals(new.project_id);
    end if;
    return new;
  end if;

  if (tg_op = 'DELETE') then
    if (old.project_id is not null and old.status = 'paid') then
      perform public.recalc_project_totals(old.project_id);
    end if;
    return old;
  end if;

  if (new.project_id is not null and (new.status = 'paid' or old.project_id is distinct from new.project_id)) then
    perform public.recalc_project_totals(new.project_id);
  end if;
  if (old.project_id is not null and old.status = 'paid' and old.project_id is distinct from new.project_id) then
    perform public.recalc_project_totals(old.project_id);
  end if;
  if (old.project_id is not null and old.status is distinct from new.status and (old.status = 'paid' or new.status = 'paid')) then
    perform public.recalc_project_totals(coalesce(new.project_id, old.project_id));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_expenses_rollup on public.expense_requests;
create trigger trg_expenses_rollup
after insert or update or delete on public.expense_requests
for each row
execute function public.tg_expenses_rollup();

