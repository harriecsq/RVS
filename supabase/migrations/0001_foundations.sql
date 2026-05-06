-- 0001_foundations.sql
-- Phase 0.1 — Foundations
-- Tables: users, clients, contacts, app_settings, id_counters, activity_log
-- All tables use UUID surrogate PKs; human-readable numbers (booking_number, etc.)
-- live on later tables as TEXT UNIQUE.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger helper (reused across all migrations)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users  (mirrors current KV shape; replaced by auth.users + user_profiles in Phase 1)
-- ---------------------------------------------------------------------------
create table users (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  password     text not null,                    -- temporary; dropped in Phase 1
  department   text not null,
  role         text not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

create index users_department_idx on users (department);
create index users_role_idx on users (role);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table clients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  company_name        text not null,
  client_name         text,
  industry            text,
  status              text not null default 'Prospect'
    check (status in ('Active', 'Prospect', 'Inactive')),
  registered_address  text,
  address             text,
  lead_source         text,
  credit_terms        text,
  phone               text,
  email               text,
  notes               text,
  owner_id            uuid references users(id) on delete set null,
  created_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger clients_set_updated_at
before update on clients
for each row execute function set_updated_at();

create index clients_status_idx on clients (status);
create index clients_owner_idx  on clients (owner_id);
create index clients_name_idx   on clients (name);

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create table contacts (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid references clients(id) on delete set null,
  first_name        text not null,
  last_name         text not null,
  title             text,
  email             text,
  phone             text,
  company           text,
  lifecycle_stage   text check (lifecycle_stage in ('Lead','Prospect','Customer')),
  lead_status       text check (lead_status in ('New','Contacted','Qualified','Unqualified')),
  status            text,
  last_activity     timestamptz,
  notes             text,
  created_by        uuid references users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger contacts_set_updated_at
before update on contacts
for each row execute function set_updated_at();

create index contacts_client_idx on contacts (client_id);
create index contacts_email_idx  on contacts (email);

-- ---------------------------------------------------------------------------
-- app_settings (singletons: document_settings, master_templates, packing_list_metrics, custom_pod_options, system:seeded)
-- ---------------------------------------------------------------------------
create table app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create trigger app_settings_set_updated_at
before update on app_settings
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- id_counters
--   scope examples: 'booking:Import', 'booking:Export', 'request', 'trucking_booking',
--                   'trucking_leg', 'voucher:CV', 'billing:RVS', 'collection'
--   year = 0 for non-year-scoped counters (trucking_booking, trucking_leg, etc.)
-- ---------------------------------------------------------------------------
create table id_counters (
  scope       text   not null,
  year        int    not null default 0,
  value       int    not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (scope, year)
);

create trigger id_counters_set_updated_at
before update on id_counters
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------------
create table activity_log (
  id               uuid primary key default gen_random_uuid(),
  entity_type      text not null,
  entity_id        text not null,
  entity_name      text,
  action_type      text not null
    check (action_type in ('created','updated','deleted','commented','approved','rejected','linked','unlinked')),
  user_id          uuid references users(id) on delete set null,
  user_name        text,
  user_department  text,
  old_value        text,
  new_value        text,
  metadata         jsonb,
  timestamp        timestamptz not null default now()
);

create index activity_log_entity_idx     on activity_log (entity_type, entity_id);
create index activity_log_timestamp_idx  on activity_log (timestamp desc);
create index activity_log_user_idx       on activity_log (user_id);
