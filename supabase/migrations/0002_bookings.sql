-- 0002_bookings.sql
-- Phase 0.2 — Operations bookings
-- One unified `bookings` table for Import + Export, distinguished by movement.
-- Child tables: booking_segments, booking_documents, booking_shipment_tags, booking_tag_history, booking_shipment_events.

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table bookings (
  id                 uuid primary key default gen_random_uuid(),
  booking_number     text not null unique,                     -- IMP YYYY-NNN / EXP YYYY-NNN
  movement           text not null check (movement in ('IMPORT','EXPORT')),
  client_id          uuid not null references clients(id) on delete restrict,
  client_name        text not null,                            -- denormalized snapshot

  status             text not null default 'Draft',
  origin             text,                                     -- POL/AOL
  destination        text,                                     -- POD/AOD
  commodity          text,
  incoterm           text check (incoterm in ('FOB','CIF','CFR','DAP','EXW','DDP','FCA','CPT','CIP','FAS','DPU')),
  mode               text check (mode in ('Sea','Air','Land')),
  carrier            text,

  etd                date,
  eta                date,
  ata                date,

  has_trucking       boolean not null default false,
  trucking_status    text,

  linked_booking_id  uuid references bookings(id) on delete set null,  -- import↔export cross-link

  created_by         uuid references users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger bookings_set_updated_at
before update on bookings
for each row execute function set_updated_at();

create index bookings_movement_status_idx on bookings (movement, status);
create index bookings_client_idx          on bookings (client_id);
create index bookings_etd_idx             on bookings (etd);
create index bookings_linked_idx          on bookings (linked_booking_id);

-- ---------------------------------------------------------------------------
-- booking_segments  (multi-leg routes; legOrder is 1-based)
-- ---------------------------------------------------------------------------
create table booking_segments (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  leg_order       int  not null,
  origin          text,
  destination     text,
  volume          text,
  mode            text,
  carrier         text,
  etd             date,
  eta             date,
  data            jsonb,                                       -- catch-all for leg-specific fields
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (booking_id, leg_order)
);

create trigger booking_segments_set_updated_at
before update on booking_segments
for each row execute function set_updated_at();

create index booking_segments_booking_idx on booking_segments (booking_id);

-- ---------------------------------------------------------------------------
-- booking_documents  (export-side document slots: salesContract, commercialInvoice, packingList, declaration, formE, processingFee, heartOfExport)
-- One row per (booking, doc_type).
-- ---------------------------------------------------------------------------
create table booking_documents (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  doc_type    text not null
    check (doc_type in (
      'salesContract','commercialInvoice','packingList','declaration',
      'formE','processingFee','heartOfExport','billOfLading','airwayBill',
      'certificateOfOrigin','insurance','other'
    )),
  ref_no      text,                                            -- refNo / invoiceNo / docNo
  status      text,
  file_url    text,
  data        jsonb,                                           -- full document object (refNo, invoiceNo, etc.)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (booking_id, doc_type)
);

create trigger booking_documents_set_updated_at
before update on booking_documents
for each row execute function set_updated_at();

create index booking_documents_booking_idx on booking_documents (booking_id);

-- ---------------------------------------------------------------------------
-- booking_shipment_tags  (current set of tags on a booking; one row per tag)
-- ---------------------------------------------------------------------------
create table booking_shipment_tags (
  booking_id  uuid not null references bookings(id) on delete cascade,
  tag         text not null,
  set_at      timestamptz not null default now(),
  set_by      uuid references users(id) on delete set null,
  primary key (booking_id, tag)
);

create index booking_shipment_tags_tag_idx on booking_shipment_tags (tag);

-- ---------------------------------------------------------------------------
-- booking_tag_history  (immutable audit of tag changes)
-- ---------------------------------------------------------------------------
create table booking_tag_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  old_tags    text[] not null default '{}',
  new_tags    text[] not null default '{}',
  change_type text,                                            -- 'add'|'remove'|'replace'
  user_id     uuid references users(id) on delete set null,
  user_name   text,
  timestamp   timestamptz not null default now()
);

create index booking_tag_history_booking_idx on booking_tag_history (booking_id, timestamp desc);

-- ---------------------------------------------------------------------------
-- booking_shipment_events  (timeline events on a booking)
-- ---------------------------------------------------------------------------
create table booking_shipment_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  event_type  text not null,
  event_date  timestamptz not null,
  description text,
  data        jsonb,
  created_at  timestamptz not null default now()
);

create index booking_shipment_events_booking_idx on booking_shipment_events (booking_id, event_date desc);
