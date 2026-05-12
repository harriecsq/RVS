-- 0010_drop_booking_doc_type_check.sql
-- The frontend uses kebab-case doc types ("sales-contract", "commercial-invoice", ...)
-- not the camelCase values the original CHECK constraint listed. Doc type is a
-- descriptive label, not a domain enum — drop the constraint.

alter table booking_documents drop constraint if exists booking_documents_doc_type_check;
