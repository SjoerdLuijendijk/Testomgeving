-- New stoves continue the web shop's five-digit numbering: the highest five-digit number ever used
-- plus one (26118 -> 26119). Existing six-digit stoves (100001, ...) keep their numbers, and new
-- six-digit numbers are no longer handed out.
--
-- A counter remembers the highest number used, so the number of a deleted stove is never reused
-- (it may still be on invoices and on a trashed shop product). Locking the counter row makes
-- concurrent inserts wait for each other instead of getting the same number. Compatible with the
-- app version before this change: that code inserts stoves without a number.

create table public.stove_number_counter (
  id boolean primary key default true check (id),
  last_number integer not null check (last_number between 9999 and 99999)
);

alter table public.stove_number_counter enable row level security;
-- No policies and no grants: only the trigger function below (security definer) uses it.
revoke all on public.stove_number_counter from public, anon, authenticated;

insert into public.stove_number_counter (last_number)
select coalesce(max(number), 9999) from public.stoves where number < 100000;

drop trigger stoves_check_number on public.stoves;
drop function public.check_stove_number();

alter table public.stoves alter column number drop identity;

-- NOT NULL is checked after BEFORE triggers, so an insert without a number gets one here.
-- Explicit numbers (the web shop import) must be five digits and raise the counter when higher.
create function public.assign_stove_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last integer;
begin
  select last_number into strict v_last from public.stove_number_counter where id for update;

  if new.number is null then
    if v_last >= 99999 then
      raise exception 'No five-digit stove numbers left' using errcode = 'check_violation';
    end if;
    new.number := v_last + 1;
  elsif new.number not between 10000 and 99999 then
    raise exception 'Only five-digit stove numbers can be assigned' using errcode = 'check_violation';
  end if;

  if new.number > v_last then
    update public.stove_number_counter set last_number = new.number where id;
  end if;
  return new;
end;
$$;

revoke execute on function public.assign_stove_number() from public, anon, authenticated;

create trigger stoves_assign_number
  before insert on public.stoves
  for each row execute function public.assign_stove_number();
