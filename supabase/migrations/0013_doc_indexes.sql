-- 0013_doc_indexes.sql
-- Speed up the Documents sub-tab fetch:
--   SELECT * FROM booking_documents WHERE booking_id = $1
-- and the FSI/Form-E per-booking lookups.

create index if not exists booking_documents_booking_id_idx
  on booking_documents (booking_id);

create index if not exists fsi_documents_booking_id_idx
  on fsi_documents (booking_id);

create index if not exists form_e_documents_booking_id_idx
  on form_e_documents (booking_id);
