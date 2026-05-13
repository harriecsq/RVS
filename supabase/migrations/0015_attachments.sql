-- 0015_attachments.sql
-- Ports the KV-based /attachments endpoints from the legacy server to a real table.
-- file_data is the data-URL base64 string the frontend already produces; selected
-- only on the download endpoint to keep list payloads small.

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null,
  entity_id    text not null,
  file_name    text not null,
  file_size    bigint not null default 0,
  file_type    text not null default 'application/octet-stream',
  file_data    text,
  uploaded_at  timestamptz not null default now()
);

create index attachments_entity_idx on attachments (entity_type, entity_id);
