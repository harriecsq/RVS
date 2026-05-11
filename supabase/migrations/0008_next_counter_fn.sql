-- 0008_next_counter_fn.sql
-- Atomic counter increment: returns the next integer for a given (scope, year).
-- Race-safe alternative to read-then-upsert from application code.

create or replace function next_counter(p_scope text, p_year int default 0)
returns int
language plpgsql
as $$
declare
  v int;
begin
  insert into id_counters (scope, year, value)
  values (p_scope, p_year, 1)
  on conflict (scope, year) do update
    set value      = id_counters.value + 1,
        updated_at = now()
  returning value into v;
  return v;
end;
$$;

grant execute on function next_counter(text, int) to service_role;
