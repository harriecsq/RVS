-- 0003_trucking_forms.sql
-- Phase 0.3 — Trucking & forms
-- Tables: trucking_bookings, trucking_legs, trucking_records, form_e_documents, fsi_documents.

-- ---------------------------------------------------------------------------
-- trucking_bookings  (standalone trucking jobs; counter-based number TRK-YYYY-NNN)
-- ---------------------------------------------------------------------------
create table trucking_bookings (
  id              uuid primary key default gen_random_uuid(),
  booking_number  text not null unique,                        -- TRK-YYYY-NNN
  client_id       uuid references clients(id) on delete restrict,
  client_name     text,
  status          text not null default 'Draft',
  origin          text,
  destination     text,
  data            jsonb,                                       -- passthrough fields
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trucking_bookings_set_updated_at
before update on trucking_bookings
for each row execute function set_updated_at();

create index trucking_bookings_status_idx on trucking_bookings (status);
create index trucking_bookings_client_idx on trucking_bookings (client_id);

-- ---------------------------------------------------------------------------
-- trucking_legs  (legs attached to a parent booking — Import/Export/Trucking)
--   parent_booking_id is polymorphic; we store both type and id, plus a real FK
--   into bookings(id) when parent_booking_type in ('IMPORT','EXPORT'), and a
--   FK into trucking_bookings(id) when type='TRUCKING'. Enforced in app layer
--   for now (deferred until Phase 1 cleans up).
-- ---------------------------------------------------------------------------
create table trucking_legs (
  id                    uuid primary key default gen_random_uuid(),
  leg_number            text not null unique,                  -- TLEG-YYYY-NNN
  parent_booking_type   text not null check (parent_booking_type in ('IMPORT','EXPORT','TRUCKING')),
  parent_booking_id     uuid not null,                         -- references bookings.id OR trucking_bookings.id
  leg_order             int,
  origin                text,
  destination           text,
  status                text,
  data                  jsonb,
  created_by            uuid references users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trucking_legs_set_updated_at
before update on trucking_legs
for each row execute function set_updated_at();

create index trucking_legs_parent_idx on trucking_legs (parent_booking_type, parent_booking_id);

-- ---------------------------------------------------------------------------
-- trucking_records  (TRK YYYY-NNN — operational records linked to a booking + segment)
-- ---------------------------------------------------------------------------
create table trucking_records (
  id                  uuid primary key default gen_random_uuid(),
  record_number       text not null unique,                    -- TRK YYYY-NNN
  linked_booking_id   uuid references bookings(id) on delete set null,
  linked_segment_id   uuid references booking_segments(id) on delete set null,
  container_no        text,
  containers          jsonb,                                   -- legacy [{containerNo}] array
  remarks             text[],
  data                jsonb,
  created_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trucking_records_set_updated_at
before update on trucking_records
for each row execute function set_updated_at();

create index trucking_records_booking_idx on trucking_records (linked_booking_id);
create index trucking_records_segment_idx on trucking_records (linked_segment_id);

-- ---------------------------------------------------------------------------
-- form_e_documents  (Form E filings; one per export booking)
-- ---------------------------------------------------------------------------
create table form_e_documents (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  ref_no      text,
  status      text,
  data        jsonb not null default '{}'::jsonb,              -- form-E specific fields (passthrough)
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (booking_id)
);

create trigger form_e_documents_set_updated_at
before update on form_e_documents
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- fsi_documents  (Formal Statement of Importation; one per import booking)
-- ---------------------------------------------------------------------------
create table fsi_documents (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  ref_no      text,
  status      text,
  data        jsonb not null default '{}'::jsonb,              -- FSI specific fields (passthrough)
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (booking_id)
);

create trigger fsi_documents_set_updated_at
before update on fsi_documents
for each row execute function set_updated_at();
