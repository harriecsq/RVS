-- 0016_payees.sql
-- Adds a payees lookup table backing the PayeeSelector dropdown in vouchers.
-- Ports the KV-based /payees endpoints from the legacy server.

create table payees (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null default '',
  status       text not null default 'Active',
  created_at   timestamptz not null default now()
);

create unique index payees_name_unique on payees (lower(name));
create index payees_status_idx on payees (status);
