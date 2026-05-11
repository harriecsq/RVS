-- 0009_bookings_data_column.sql
-- Frontend sends many passthrough fields on bookings (shipper, consignee, blNumber,
-- volume, commodity, costs, contact metadata, ...). Rather than denying them, store
-- them in a single jsonb catch-all so they round-trip without lossy mapping.

alter table bookings add column if not exists data jsonb;
