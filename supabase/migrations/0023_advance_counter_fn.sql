-- 0023_advance_counter_fn.sql
-- Fast-forward a counter to at least p_to_value. Used by endpoints that accept
-- a client-supplied ref# (bypassing next_counter) so the counter stays in sync
-- with the highest issued number and future peeks return the correct +1.

create or replace function advance_counter(p_scope text, p_year int, p_to_value int)
returns int
language plpgsql
as $$
declare
  v int;
begin
  insert into id_counters (scope, year, value)
  values (p_scope, p_year, p_to_value)
  on conflict (scope, year) do update
    set value      = greatest(id_counters.value, p_to_value),
        updated_at = now()
  returning value into v;
  return v;
end;
$$;

grant execute on function advance_counter(text, int, int) to service_role;
