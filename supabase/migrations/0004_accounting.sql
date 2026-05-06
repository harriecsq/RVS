-- 0004_accounting.sql
-- Phase 0.4 — Accounting
-- Tables: expenses + expense_particulars, vouchers + voucher_line_items,
--         billings + billing_particulars, collections + collection_allocations.
--
-- Money: NUMERIC(18,2). Currency: CHAR(3) (PHP, USD, RMB).
-- Financial parents use ON DELETE RESTRICT; child line items use CASCADE.

-- ---------------------------------------------------------------------------
-- expenses  (one expense per booking; charges live in expense_particulars)
-- ---------------------------------------------------------------------------
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references bookings(id) on delete restrict,
  segment_id   uuid references booking_segments(id) on delete set null,
  amount       numeric(18,2) not null default 0,               -- header total (matches sum of particulars)
  currency     char(3) not null default 'PHP',
  status       text not null default 'Pending'
    check (status in ('Pending','Approved','Invoiced','Voided')),
  notes        text,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger expenses_set_updated_at
before update on expenses
for each row execute function set_updated_at();

create index expenses_booking_idx on expenses (booking_id);
create index expenses_status_idx  on expenses (status);

-- ---------------------------------------------------------------------------
-- expense_particulars  (the `charges` array on an expense)
-- ---------------------------------------------------------------------------
create table expense_particulars (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references expenses(id) on delete cascade,
  description  text not null,
  amount       numeric(18,2) not null default 0,
  currency     char(3) not null default 'PHP',
  data         jsonb,                                          -- catch-all for category, tax flags, etc.
  position     int,                                            -- ordering within an expense
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger expense_particulars_set_updated_at
before update on expense_particulars
for each row execute function set_updated_at();

create index expense_particulars_expense_idx on expense_particulars (expense_id);

-- ---------------------------------------------------------------------------
-- vouchers  (RVS CV YYYY-NNN; one voucher per supplier authorization)
-- ---------------------------------------------------------------------------
create table vouchers (
  id              uuid primary key default gen_random_uuid(),
  voucher_number  text not null unique,                        -- "RVS CV 2025-001"
  voucher_type    text not null default 'CV'
    check (voucher_type in ('CV','PV','JV','RV')),
  voucher_year    int  not null,
  company_code    text,
  payee           text not null,
  category        text,
  bank            text,
  check_no        text,
  voucher_date    timestamptz not null,
  amount          numeric(18,2) not null default 0,
  currency        char(3) not null default 'PHP',
  status          text not null default 'Draft'
    check (status in ('Draft','Submitted','Approved','Rejected','Voided','Released')),
  booking_id      uuid references bookings(id) on delete restrict,
  expense_id      uuid references expenses(id) on delete restrict,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger vouchers_set_updated_at
before update on vouchers
for each row execute function set_updated_at();

create index vouchers_status_idx        on vouchers (status);
create index vouchers_year_idx          on vouchers (voucher_year);
create index vouchers_booking_idx       on vouchers (booking_id);
create index vouchers_expense_idx       on vouchers (expense_id);
create index vouchers_voucher_date_idx  on vouchers (voucher_date desc);

-- ---------------------------------------------------------------------------
-- voucher_line_items  (one row per expense charge being settled by this voucher)
-- ---------------------------------------------------------------------------
create table voucher_line_items (
  id            uuid primary key default gen_random_uuid(),
  voucher_id    uuid not null references vouchers(id) on delete cascade,
  expense_particular_id uuid references expense_particulars(id) on delete set null,
  description   text not null,
  amount        numeric(18,2) not null default 0,
  currency      char(3) not null default 'PHP',
  data          jsonb,
  position      int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger voucher_line_items_set_updated_at
before update on voucher_line_items
for each row execute function set_updated_at();

create index voucher_line_items_voucher_idx  on voucher_line_items (voucher_id);
create index voucher_line_items_particular_idx on voucher_line_items (expense_particular_id);

-- ---------------------------------------------------------------------------
-- billings  ("{companyCode} {year}-{number}" — invoice to client)
-- ---------------------------------------------------------------------------
create table billings (
  id                   uuid primary key default gen_random_uuid(),
  billing_number       text not null unique,                   -- "RVS 2025-001"
  billing_company_code text not null,
  billing_year         int  not null,
  client_id            uuid not null references clients(id) on delete restrict,
  client_name          text not null,
  company_name         text,

  voucher_id           uuid references vouchers(id) on delete set null,
  expense_amount       numeric(18,2) not null default 0,
  total_expenses       numeric(18,2) not null default 0,
  margin               numeric(18,2) not null default 0,
  total_amount         numeric(18,2) not null default 0,
  currency             char(3) not null default 'PHP',
  exchange_rate        numeric(18,6),

  status               text not null default 'Draft'
    check (status in ('Draft','Submitted','Approved','Partially Collected','Completed','Voided')),
  billing_date         timestamptz not null,

  -- shipment details snapshot (denormalized for invoice rendering)
  shipment             jsonb,                                  -- vessel, blNumber, containerNumbers, origin, destination, shipper, consignee, volume, commodity, contractNumber

  created_by           uuid references users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger billings_set_updated_at
before update on billings
for each row execute function set_updated_at();

create index billings_client_status_idx on billings (client_id, status);
create index billings_status_idx        on billings (status);
create index billings_year_idx          on billings (billing_year);
create index billings_voucher_idx       on billings (voucher_id);
create index billings_date_idx          on billings (billing_date desc);

-- ---------------------------------------------------------------------------
-- billing_bookings / billing_expenses  (many-to-many junctions —
-- one billing can roll up multiple bookings/expenses)
-- ---------------------------------------------------------------------------
create table billing_bookings (
  billing_id  uuid not null references billings(id) on delete cascade,
  booking_id  uuid not null references bookings(id) on delete restrict,
  primary key (billing_id, booking_id)
);

create index billing_bookings_booking_idx on billing_bookings (booking_id);

create table billing_expenses (
  billing_id  uuid not null references billings(id) on delete cascade,
  expense_id  uuid not null references expenses(id) on delete restrict,
  primary key (billing_id, expense_id)
);

create index billing_expenses_expense_idx on billing_expenses (expense_id);

-- ---------------------------------------------------------------------------
-- billing_particulars  (line items on the invoice)
-- ---------------------------------------------------------------------------
create table billing_particulars (
  id           uuid primary key default gen_random_uuid(),
  billing_id   uuid not null references billings(id) on delete cascade,
  description  text not null,
  quantity     numeric(18,4) not null default 1,
  rate         numeric(18,4) not null default 0,
  amount       numeric(18,2) not null default 0,
  currency     char(3) not null default 'PHP',
  data         jsonb,
  position     int,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger billing_particulars_set_updated_at
before update on billing_particulars
for each row execute function set_updated_at();

create index billing_particulars_billing_idx on billing_particulars (billing_id);

-- ---------------------------------------------------------------------------
-- collections  (one payment from a client; can cover multiple billings via allocations)
-- ---------------------------------------------------------------------------
create table collections (
  id                  uuid primary key default gen_random_uuid(),
  collection_number   text not null unique,
  client_id           uuid not null references clients(id) on delete restrict,
  client_name         text not null,
  amount              numeric(18,2) not null default 0,
  currency            char(3) not null default 'PHP',
  status              text not null default 'Collected'
    check (status in ('Pending','Collected','Cleared','Bounced','Voided')),
  collection_date     timestamptz not null,
  payment_method      text,                                    -- 'Check'|'Bank Transfer'|'Cash'|'Online'
  reference_number    text,
  bank_name           text,
  check_number        text,
  notes               text,
  created_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger collections_set_updated_at
before update on collections
for each row execute function set_updated_at();

create index collections_client_idx       on collections (client_id);
create index collections_date_idx         on collections (collection_date desc);
create index collections_status_idx       on collections (status);

-- ---------------------------------------------------------------------------
-- collection_allocations  (payment split across one or more billings)
-- Each row reduces the outstanding balance of a single billing.
-- ---------------------------------------------------------------------------
create table collection_allocations (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references collections(id) on delete cascade,
  billing_id     uuid not null references billings(id)    on delete restrict,
  amount         numeric(18,2) not null check (amount >= 0),
  currency       char(3) not null default 'PHP',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger collection_allocations_set_updated_at
before update on collection_allocations
for each row execute function set_updated_at();

create index collection_allocations_billing_idx    on collection_allocations (billing_id);
create index collection_allocations_collection_idx on collection_allocations (collection_id);

-- ---------------------------------------------------------------------------
-- v_billing_balances  (computed AR balance per billing — replaces in-app reduce)
-- ---------------------------------------------------------------------------
create or replace view v_billing_balances as
select
  b.id                                                          as billing_id,
  b.billing_number,
  b.client_id,
  b.total_amount,
  coalesce(sum(ca.amount), 0)::numeric(18,2)                    as collected,
  (b.total_amount - coalesce(sum(ca.amount), 0))::numeric(18,2) as outstanding_balance
from billings b
left join collection_allocations ca on ca.billing_id = b.id
group by b.id;
